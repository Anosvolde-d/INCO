import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tavily } from "@tavily/core";
import Exa from "exa-js";
import { streamText, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { LRUCache } from "lru-cache";

// --- Global Rate Limiter & Cache Setup ---
// These persist in memory across requests in edge/node environments
const rateLimitCache = new LRUCache<string, any>({
  max: 10000,
  ttl: 1000 * 60 * 60 * 24, // 24h
});

const semanticCache = new LRUCache<string, string>({
  max: 500, // cache up to 500 prompts
  ttl: 1000 * 60 * 60, // 1 hour
});
// -----------------------------------------

// Authenticate user via Authorization header (Bearer API_KEY)
const authenticateUser = async (req: NextRequest) => {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return null;
    }
    const key = authHeader.replace("Bearer ", "");
    
    // Strict Database Validation
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key }
    });

    if (!apiKeyRecord) {
      return null;
    }

    return apiKeyRecord;
};

// Check rate limits for an API key
const checkRateLimit = async (apiKey: string) => {
  const settings = await prisma.settings.findUnique({
    where: { id: "global" }
  });

  // Default limits if not set
  const maxRPD = settings?.rateLimitRPD ?? 500;
  const maxRPM = settings?.rateLimitRPM ?? 5;

  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentMinute = `${now.toISOString().split(':')[0]}:${now.toISOString().split(':')[1]}`;

  let record = rateLimitCache.get(apiKey);

  if (!record || record.lastResetDate !== currentDate) {
    // New day or first request
    record = { requests: 0, lastResetDate: currentDate, lastResetMinute: currentMinute };
  } else if (record.lastResetMinute !== currentMinute) {
    // New minute, reset RPM counter but keep daily
    // For simplicity of this basic implementation, we just reset the whole counter if the minute changes.
    // A proper implementation would track daily and minutely separately.
    record.lastResetMinute = currentMinute;
    // We are resetting RPM counter, but we lose RPD tracking this way. Let's fix that:
    // Actually, tracking RPM and RPD correctly in memory requires two counters.
  }

  // Proper two-counter implementation:
  let limitData = rateLimitCache.get(`limits_${apiKey}`) as { 
    dailyRequests: number, 
    minuteRequests: number, 
    date: string, 
    minute: string 
  } | undefined;

  if (!limitData) {
    limitData = { dailyRequests: 0, minuteRequests: 0, date: currentDate, minute: currentMinute };
  } else {
    if (limitData.date !== currentDate) {
      limitData.dailyRequests = 0;
      limitData.date = currentDate;
    }
    if (limitData.minute !== currentMinute) {
      limitData.minuteRequests = 0;
      limitData.minute = currentMinute;
    }
  }

  limitData.dailyRequests++;
  limitData.minuteRequests++;

  rateLimitCache.set(`limits_${apiKey}`, limitData);

  if (limitData.dailyRequests > maxRPD) {
    return { limited: true, reason: "Daily rate limit exceeded" };
  }
  if (limitData.minuteRequests > maxRPM) {
    return { limited: true, reason: "Minute rate limit exceeded" };
  }

  return { limited: false };
};

// This is the OpenAI compatible /v1/chat/completions endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // OpenAI format: { model: "...", messages: [...], stream: true, ... }
    const { model: reqModelId, messages, stream = false } = body;
    
    // Optional INCO specific extensions passed in body or headers
    const useSearch = body.use_search === true || req.headers.get("x-inco-use-search") === "true";

    const apiKeyRecord = await authenticateUser(req);
    
    // 1. Strict Validation
    if (!apiKeyRecord) {
      return NextResponse.json(
        { error: "INC-401", message: "Unauthorized. Invalid or missing API Key." },
        { status: 401 }
      );
    }

    // 2. Rate Limiting Check
    const rateLimit = await checkRateLimit(apiKeyRecord.key);
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: "INC-429", message: rateLimit.reason },
        { status: 429 }
      );
    }

    if (!reqModelId) {
      return NextResponse.json(
        { error: "INC-101", message: "Invalid or missing model parameter" },
        { status: 400 }
      );
    }

    // 3. LRU Semantic Caching (Exact match for the last message)
    const lastUserMessageStr = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    // Create a cache key based on model and user message
    const cacheKey = `${reqModelId}_${lastUserMessageStr}`;
    const cachedResponse = semanticCache.get(cacheKey);

    if (cachedResponse && !stream) {
        // Return cached response for non-streaming
        const responsePayload = {
            id: `chatcmpl-cached-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: reqModelId,
            choices: [{
                index: 0,
                message: { role: "assistant", content: cachedResponse },
                finish_reason: "stop"
            }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        };
        return NextResponse.json(responsePayload);
    }

    // Fetch Model, Provider, and Prompt Profile
    const model = await prisma.model.findUnique({
      where: { displayName: reqModelId },
      include: {
        provider: true,
        promptProfile: true,
        lorebooks: {
          include: {
            entries: true,
          },
        },
      },
    });

    if (!model || !model.isPublic) {
      return NextResponse.json(
        { error: "INC-102", message: "Model currently unavailable or inactive" },
        { status: 404 }
      );
    }

    if (!model.provider) {
      return NextResponse.json(
        { error: "INC-103", message: "Missing required configuration: No provider linked" },
        { status: 500 }
      );
    }

    let searchSummary = "";

    // -- SEARCH PHASE (Web Search Agent) --
    if (useSearch && model.supportsSearch && apiKeyRecord.useSearch) {
      const searchConfig = await prisma.searchConfig.findFirst({
        where: { isActive: true },
      });

      if (searchConfig) {
        try {
            const query = lastUserMessageStr || "Latest news";

            if (searchConfig.provider === "tavily" && searchConfig.apiKeys.length > 0) {
               const apiKey = searchConfig.apiKeys[0] || process.env.TAVILY_API_KEYS?.split(',')[0];
               if (!apiKey) throw new Error("Tavily API key not configured");
               const tavilyClient = tavily({ apiKey });
               const response = await tavilyClient.search(query, {
                   searchDepth: "advanced",
                   includeAnswer: "advanced"
               });
               searchSummary = `<external_context_summary>\nSource: Tavily\n${response.answer || response.results.map((r: any) => r.content).join("\n")}\n</external_context_summary>`;

            } else if (searchConfig.provider === "exa") {
               const apiKey = searchConfig.apiKeys[0] || process.env.EXA_API_KEY;
               if (!apiKey) throw new Error("Exa API key not configured");
               const exa = new Exa(apiKey);
               const response = await exa.searchAndContents(query, {
                   type: "auto",
                   numResults: 3,
                   text: { maxCharacters: 4000 }
               });
               searchSummary = `<external_context_summary>\nSource: Exa\n${response.results.map((r: any) => `${r.title}: ${r.text}`).join("\n")}\n</external_context_summary>`;
            }
        } catch (searchError: any) {
            // Search Agent Fallback: Log but don't fail the request
            console.error("Search agent fallback triggered due to error:", searchError.message);
            searchSummary = `<external_context_summary>\nSearch failed, fallback to internal knowledge.\n</external_context_summary>`;
        }
      }
    }

    // -- CONTEXT PHASE (Lorebooks) --
    let lorebookContext = "";
    if (model.lorebooks && model.lorebooks.length > 0) {
        for (const lorebook of model.lorebooks) {
            for (const entry of lorebook.entries) {
                if (entry.isPinned || entry.keys.some(k => lastUserMessageStr.toLowerCase().includes(k.toLowerCase()))) {
                    lorebookContext += `\n[Lore: ${entry.title}]\n${entry.content}`;
                }
            }
        }
    }

    // -- ASSEMBLY PHASE --
    let assembledMessages: any[] = [];
    const profile = model.promptProfile;

    if (profile) {
      let systemContent = profile.mainPrompt;
      if (profile.auxiliaryPrompt) systemContent += `\n${profile.auxiliaryPrompt}`;
      if (profile.enhanceDefinitions) systemContent += `\n${profile.enhanceDefinitions}`;
      
      if (searchSummary) systemContent += `\n\n${searchSummary}`;
      if (lorebookContext) systemContent += `\n\n<lorebook_context>${lorebookContext}</lorebook_context>`;

      if (profile.positivePrompt) systemContent += `\n\nPositive Directives: ${profile.positivePrompt}`;
      if (profile.negativePrompt) systemContent += `\n\nNegative Directives: ${profile.negativePrompt}`;

      if (systemContent.trim()) {
         assembledMessages.push({ role: "system", content: systemContent });
      }
    }

    // Map incoming messages, filtering out their system prompts if we want to override, 
    // or keep them if INCO is just augmenting. For now, we keep them.
    assembledMessages = [...assembledMessages, ...messages];

    if (profile?.postHistory) {
      assembledMessages.push({ role: "system", content: profile.postHistory });
    }

    if (profile?.prefill) {
        assembledMessages.push({ role: "assistant", content: profile.prefill });
    }

    // -- EXECUTION PHASE --
    if (!model.provider.apiKeyEncrypted) {
        return NextResponse.json(
            { error: "INC-103", message: "Provider API key not configured" },
            { status: 500 }
        );
    }

    const customOpenAI = createOpenAI({
        baseURL: model.provider.baseUrl,
        apiKey: model.provider.apiKeyEncrypted,
        headers: model.provider.customHeaders as Record<string, string> || {},
    });

    // We will update the log later with actual tokens for non-streaming
    const requestLogPromise = prisma.requestLog.create({
        data: {
            modelId: model.displayName,
            providerModelId: model.providerModelId,
            searchUsed: !!searchSummary && !searchSummary.includes('Search failed'),
            searchProvider: searchSummary.includes("Tavily") ? "tavily" : (searchSummary.includes("Exa") ? "exa" : null),
            tokenUsageJson: stream ? {} : { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        }
    });

    if (stream) {
        const result = streamText({
            model: customOpenAI(model.providerModelId),
            messages: assembledMessages,
            temperature: body.temperature || (profile?.guidanceJson as any)?.temperature || 0.7,
            onFinish: async ({ usage, text }) => {
                // Save to Cache on finish
                if (text) {
                  semanticCache.set(cacheKey, text);
                }
                // Update Telemetry with actual values provided by onFinish hook
                // This fixes the regex parsing issues by using the SDK's built-in usage tracking
                try {
                    const log = await requestLogPromise;
                    await prisma.requestLog.update({
                        where: { id: log.id },
                        data: {
                            tokenUsageJson: {
                                promptTokens: (usage as any)?.promptTokens || (usage as any)?.prompt_tokens || 0,
                                completionTokens: (usage as any)?.completionTokens || (usage as any)?.completion_tokens || 0,
                                totalTokens: (usage as any)?.totalTokens || (usage as any)?.total_tokens || 0
                            }
                        }
                    });
                } catch(e) {
                   console.error("Telemetry update failed:", e);
                }
            }
        });
        
        return result.toTextStreamResponse();
    } else {
        const result = await generateText({
            model: customOpenAI(model.providerModelId),
            messages: assembledMessages,
            temperature: body.temperature || (profile?.guidanceJson as any)?.temperature || 0.7,
        });

        // Save to cache
        if (result.text) {
          semanticCache.set(cacheKey, result.text);
        }

        // OpenAI compatible non-streaming response
        const responsePayload = {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: reqModelId,
            choices: [{
                index: 0,
                message: {
                    role: "assistant",
                    content: result.text
                },
                finish_reason: "stop"
            }],
            usage: {
                prompt_tokens: (result.usage as any).promptTokens || 0,
                completion_tokens: (result.usage as any).completionTokens || 0,
                total_tokens: (result.usage as any).totalTokens || 0
            }
        };

        // Update the log with actual usage
        try {
            const log = await requestLogPromise;
            await prisma.requestLog.update({
                where: { id: log.id },
                data: {
                    tokenUsageJson: {
                        promptTokens: responsePayload.usage.prompt_tokens,
                        completionTokens: responsePayload.usage.completion_tokens,
                        totalTokens: responsePayload.usage.total_tokens
                    }
                }
            });
        } catch (e) {
           console.error("Telemetry non-stream update failed", e);
        }

        return NextResponse.json(responsePayload);
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: error.message || "Internal Proxy Error" },
      { status: 500 }
    );
  }
}
