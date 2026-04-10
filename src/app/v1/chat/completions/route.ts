import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tavily } from "@tavily/core";
import Exa from "exa-js";
import { streamText, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { addEphemeralLog, appendToResponse } from "@/lib/ephemeralLogs";
import { v4 as uuidv4 } from "uuid";
import { validatePlaygroundToken, incrementPlaygroundTokenUsage } from "@/app/api/playground/token/route";

// Authenticate user via Authorization header (Bearer API_KEY)
const authenticateUser = async (req: NextRequest) => {
    // For now, we accept any key or a specific one, since we don't have a Users table yet.
    // In a full implementation, you'd check `req.headers.get("Authorization")` against a DB.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return null;
    }
    return authHeader.replace("Bearer ", "");
};

// This is the OpenAI compatible /v1/chat/completions endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // OpenAI format: { model: "...", messages: [...], stream: true, ... }
    const { model: reqModelId, messages, stream = false } = body;
    
    // Optional INCO specific extensions passed in body or headers
    const urlSearchParams = new URL(req.url).searchParams;
    const apiKey = await authenticateUser(req);
    let keyDisablesSearch = false;
    let isPlaygroundToken = false;
    
    if (apiKey) {
        // Check if it's a playground token
        if (apiKey.startsWith("sk-playground-")) {
            isPlaygroundToken = true;
            if (!validatePlaygroundToken(apiKey)) {
                return NextResponse.json(
                    { error: "INC-104", message: "Playground token expired or limit exceeded" },
                    { status: 403 }
                );
            }
        } else {
            // Regular API key validation - check if blocked
            if (apiKey.endsWith("-nosearch")) keyDisablesSearch = true;
            const apiKeyRecord = await prisma.apiKey.findUnique({ where: { key: apiKey } });
            if (apiKeyRecord) {
                if (apiKeyRecord.isBlocked) {
                    return NextResponse.json(
                        { error: "INC-105", message: "API key has been blocked" },
                        { status: 403 }
                    );
                }
                if (!apiKeyRecord.useSearch) {
                    keyDisablesSearch = true;
                }
            }
        }
    }
        
    const explicitlyDisabled = body.use_search === false || req.headers.get("x-inco-use-search") === "false" || urlSearchParams.get("search") === "false" || keyDisablesSearch;
    let useSearch = body.use_search === true || req.headers.get("x-inco-use-search") === "true" || urlSearchParams.get("search") === "true";

    // apiKey validated earlier

    if (!reqModelId) {
      return NextResponse.json(
        { error: "INC-101", message: "Invalid or missing model parameter" },
        { status: 400 }
      );
    }

    // Fetch Model, Provider, and Prompt Profile
    const model = await prisma.model.findUnique({
      where: { displayName: reqModelId } as any,
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
    console.log('[SEARCH] Model supports search:', model.supportsSearch);
    console.log('[SEARCH] Use search flag:', useSearch);
    console.log('[SEARCH] Explicitly disabled:', explicitlyDisabled);
    
    if (model.supportsSearch && !explicitlyDisabled) useSearch = true;
    if (useSearch && model.supportsSearch) {
      console.log('[SEARCH] Starting search orchestrator...');
      const searchConfigs = await prisma.searchConfig.findMany({
        where: { isActive: true },
      });
      const searchConfig = searchConfigs.find(c => c.provider === "tavily" || c.provider === "exa");
      console.log('[SEARCH] Found config:', searchConfig?.provider);
      console.log('[SEARCH] API keys available:', searchConfig?.apiKeys?.length || 0);

      if (searchConfig) {
        try {
            console.log('[SEARCH] Analyzing context and generating queries...');
            // Get full conversation context (up to 32k tokens worth)
            const contextMessages = messages.slice(-10); // Last 10 messages for context
            const fullContext = contextMessages.map((m: any) => `${m.role}: ${m.content}`).join('\n\n');
            
            // Get search API key
            const searchApiKey = searchConfig.apiKeys[0] || 
              (searchConfig.provider === "tavily" ? process.env.TAVILY_API_KEYS?.split(',')[0] : process.env.EXA_API_KEY);
            
            if (!searchApiKey) {
              console.error('[SEARCH] No API key found!');
              throw new Error("Search API key not configured");
            }
            
            console.log('[SEARCH] API key found, length:', searchApiKey.length);
            
            // Use AI to analyze context and generate search queries
            const analysisPrompt = `# MISSION: CONTINUITY ORCHESTRATION
You are the Continuity Engine. Your task is to analyze this RP scene and generate 3-5 targeted web search queries to retrieve canon information.

CURRENT RP SCENE:
${fullContext.substring(0, 8000)}

Your goal: Generate search queries that will help you build a complete MCF-V3 State Packet with hard facts about:

1. TEMPORAL & CANON ANCHORS
   - Franchise identification (show/book/game/anime name)
   - Continuity type (TV/Manga/Game/AU)
   - Era/Saga/Arc identification
   - Specific episode/chapter number
   - Exact chronological timestamp in the story

2. NARRATIVE SEQUENCING
   - Previous episode/chapter summary
   - Current episode/chapter full plot
   - Immediate preceding action (what just happened)
   - Next immediate action (what happens next)
   - Next episode preview

3. EPISODE-WIDE ENTITY LEDGER
   - All characters active in current episode
   - Their locations, physical/mental states
   - Their immediate and episode-wide objectives

4. OBJECT & ENTITY DEFINITIONS
   - Referenced entities (people, groups, factions)
   - Active objects (weapons, artifacts, tech)
   - Mechanical functions (how powers/tech work)

5. EPISTEMIC BOUNDARIES
   - Ground truth (objective reality)
   - What each character knows/suspects/is wrong about
   - Information no character possesses yet

6. OPERATIONAL INTEL
   - Villain/antagonist current status and location
   - Mechanical rules (power limits, world laws)
   - Environmental hazards

Generate 3-5 search queries that will retrieve this information. Be SPECIFIC with episode numbers, character names, and arc titles.

Return ONLY a JSON array: ["query1", "query2", "query3", "query4", "query5"]

Example: ["Supernatural Season 7 Episode 9 plot summary", "Leviathan abilities and weaknesses Supernatural", "Dick Roman character background Supernatural", "Sam and Dean Winchester Season 7 status", "Turducken investigation Supernatural episode"]`;

            // Create search orchestrator using the model itself
            const searchOrchestrator = createOpenAI({
              apiKey: model.provider.apiKeyEncrypted || '',
              baseURL: model.provider.baseUrl
            });

            const { text: queriesJson } = await generateText({
              model: searchOrchestrator(model.providerModelId),
              prompt: analysisPrompt,
              temperature: 0.3
            });

            let searchQueries: string[] = [];
            try {
              // Extract JSON from response
              const jsonMatch = queriesJson.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                searchQueries = JSON.parse(jsonMatch[0]);
              }
            } catch (e) {
              // Fallback to simple query extraction
              const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user");
              searchQueries = [lastUserMessage?.content?.substring(0, 100) || "Latest news"];
            }
            
            console.log('[SEARCH] Generated queries:', searchQueries);

            // Perform multiple searches
            const searchResults: string[] = [];

            if (searchConfig.provider === "tavily") {
               const tavilyClient = tavily({ apiKey: searchApiKey });
               
               for (const query of searchQueries.slice(0, 5)) {
                 try {
                   const response = await tavilyClient.search(query, {
                     searchDepth: "basic",
                     includeAnswer: true,
                     maxResults: 2
                   });
                   
                   const result = response.answer || 
                     response.results.slice(0, 2).map((r: any) => 
                       `${r.title}: ${r.content.substring(0, 400)}`
                     ).join('\n');
                   
                   if (result) {
                     searchResults.push(`**Query: ${query}**\n${result}`);
                   }
                 } catch (e) {
                   // Skip failed queries
                 }
               }

            } else if (searchConfig.provider === "exa") {
               const exa = new Exa(searchApiKey);
               
               for (const query of searchQueries.slice(0, 5)) {
                 try {
                   const response = await exa.searchAndContents(query, {
                     type: "auto",
                     numResults: 2,
                     text: { maxCharacters: 800 }
                   });
                   
                   const cleanResults = response.results
                     .map((r: any) => {
                       let text = r.text || '';
                       text = text.replace(/Sign Up|Log In|Continue with|Subscribe|Cookie Policy|Terms of Service|Privacy Policy|Advertisement/gi, '');
                       text = text.replace(/\*\*|\*|##+/g, '');
                       text = text.replace(/\s+/g, ' ');
                       text = text.trim().substring(0, 400);
                       return text ? `${r.title}:\n${text}` : '';
                     })
                     .filter(t => t.length > 50)
                     .join('\n');
                   
                   if (cleanResults) {
                     searchResults.push(`**Query: ${query}**\n${cleanResults}`);
                   }
                 } catch (e) {
                   // Skip failed queries
                 }
               }
            }

            // Synthesize results into comprehensive summary
            if (searchResults.length > 0) {
              const synthesisPrompt = `# MISSION: CONTINUITY ORCHESTRATION
You are the Continuity Engine. Generate a high-density "State of the World" packet for the Main RP Model. Provide hard facts of canon so the model never has to guess or hallucinate.

CURRENT RP SCENE:
${fullContext.substring(0, 4000)}

RETRIEVED CANON INFORMATION:
${searchResults.join('\n\n---\n\n')}

Generate the MCF-V3 SCHEMA. No prose, no narrative advice, just raw information:

# MCF-V3 STATE PACKET

## 1.0 TEMPORAL & CANON ANCHORS
1.1 Franchise: [Name]
1.2 Continuity Type: [TV Canon/Manga Canon/Game Canon/AU/Mixed]
1.3 Era/Saga: [Major story arc]
1.4 Specific Arc: [Current arc name]
1.5 Episode/Chapter ID: [Season X, Episode Y / Chapter Z]
1.6 Chronological Timestamp: [Exact point in episode where scene occurs]

## 2.0 NARRATIVE SEQUENCING
2.1 Past Episode Summary: [Major events and consequences of previous episode]
2.2 Current Episode Summary: [Full plot summary of current episode as it happens in canon]
2.3 Immediate Preceding Action: [The specific canon beat that happened seconds before this RP scene]
2.4 Target Action/Goal: [The immediate objective characters are currently pursuing]
2.5 Next Immediate Action: [The very next canon beat that occurs after this scene]
2.6 Next Episode Preview: [Summary of upcoming episode's plot and themes]

## 3.0 EPISODE-WIDE ENTITY LEDGER
(List ALL characters active in current episode, whether in scene or not)

### 3.1 Entity: [Character Name]
- Current Location: [Specific room/city/coordinate]
- Physical State: [Health, injuries, exhaustion, chemical/magical influences]
- Mental State: [Psychological trauma, hallucinations, emotional stability]
- Immediate Objective: [What they're trying to do in this exact scene]
- Global Episode Objective: [What they need to achieve by episode end]

### 3.2 Entity: [Character Name 2]
[Repeat structure]

## 4.0 OBJECT & ENTITY DEFINITIONS

### 4.1 Referenced Entities
[Detailed definitions of people, groups, factions mentioned]

### 4.2 Active Objects
- Object: [Name]
  - Description: [What it is]
  - Mechanical Function: [How it works - magic rules, tech specs, chemical properties]
  - Current State: [Active/broken/hidden/possessed by X]

## 5.0 EPISTEMIC BOUNDARIES (THE WALLS)

### 5.1 Ground Truth
[Objective meta-knowledge truth of what is happening in the world]

### 5.2 Knowledge Matrix
- **[Character Name]**
  - Knows: [Facts they possess]
  - Suspects: [What they guess/theorize]
  - Wrong About: [Critical misunderstandings]

### 5.3 Information Lockdown
[Facts that NO character in the scene currently possesses]

## 6.0 OPERATIONAL INTEL

### 6.1 Villain/Antagonist Status
[Where is the villain? Current progress toward their goal?]

### 6.2 Mechanical Rules
[Hard "laws" for this episode - how powers work, virus spread mechanics, ability limits]

### 6.3 Environmental Hazards
[Status of current location - surrounded by enemies, drugged food supply, etc.]

## 7.0 REFERENCE REGISTRY
(For terms/names that don't exist in canon or are ambiguous)

### 7.1 Unresolved Term: [Name]
- Hypothesis: [OC? Crossover? Misspelling? Canon character with different name?]
- Power Scale: [Threat/power level relative to canon world]

## 8.0 CONTINUITY PRESSURE ANALYSIS (ADDED INTELLIGENCE)

### 8.1 Canon Divergence Level
[None/Minor/Major/Complete AU - how has RP diverged from canon timeline?]

### 8.2 Divergence Details
[Specific changes user has made to canon events]

### 8.3 Canon Forward Pressure
[What canon events/forces will likely crash into the scene next based on timeline?]

### 8.4 Dramatic Irony Opportunities
[What the "audience" knows that characters don't - future events, hidden betrayals, etc.]

## 9.0 RELATIONSHIP WEB (ADDED INTELLIGENCE)

### 9.1 Active Relationships
[Character A ↔ Character B: Current relationship status, tensions, alliances, romantic status]

### 9.2 Relationship Trajectory
[How relationships are expected to evolve based on canon]

## 10.0 THEMATIC CONTEXT (ADDED INTELLIGENCE)

### 10.1 Episode Theme
[The thematic focus of this episode - betrayal, sacrifice, discovery, etc.]

### 10.2 Character Arc Position
[Where each main character is in their personal growth arc]

### 10.3 Foreshadowing Elements
[Canon elements in this episode that foreshadow future events]

CRITICAL: Be specific with episode numbers, exact character states, and mechanical rules. The Main Model needs HARD FACTS, not vague summaries.`;

              const { text: synthesis } = await generateText({
                model: searchOrchestrator(model.providerModelId),
                prompt: synthesisPrompt,
                temperature: 0.5
              });

              searchSummary = `<continuity_state_packet>
Source: ${searchConfig.provider === 'tavily' ? 'Tavily' : 'Exa'} Web Search (Multi-Query Canon Analysis)
Generated: ${new Date().toISOString()}

${synthesis}
</continuity_state_packet>`;
            }

        } catch (searchError: any) {
             console.error('Search orchestrator error:', searchError.message);
             console.error('Full error:', searchError);
             // Don't fail the request, just skip search
             searchSummary = "";
        }
      }
    }

    // -- CONTEXT PHASE (Lorebooks) --
    let lorebookContext = "";
    if (model.lorebooks && model.lorebooks.length > 0) {
        const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content?.toLowerCase() || "";
        
        for (const lorebook of model.lorebooks) {
            for (const entry of lorebook.entries) {
                if (entry.isPinned || entry.keys.some(k => lastUserMessage.includes(k.toLowerCase()))) {
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
            { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
        );
    }



    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    const ephemeralId = uuidv4();
    addEphemeralLog({
        id: ephemeralId,
        sessionId: apiKey || "anonymous",
        modelId: model.displayName,
        searchUsed: !!searchSummary,
        searchSummary: searchSummary || undefined,
        lastMessages: messages.slice(-5), // keep last 5 from user
        responseContent: ""
    });

    // Direct proxy to upstream provider
    const upstreamUrl = `${model.provider.baseUrl.endsWith("/") ? model.provider.baseUrl.slice(0, -1) : model.provider.baseUrl}/chat/completions`;
    const upstreamBody = {
        ...body,
        model: model.providerModelId,
        messages: assembledMessages,
        ...(stream && { stream_options: { include_usage: true } }),
    };
    
    // Inject guidance params if set
    if (profile?.guidanceJson) {
        const params = typeof profile.guidanceJson === 'string' ? JSON.parse(profile.guidanceJson) : profile.guidanceJson;
        for (const [key, val] of Object.entries(params)) {
            if (upstreamBody[key] === undefined) upstreamBody[key] = val;
        }
    }
    
    let customHeaders = {};
    try {
        if (model.provider.customHeaders) {
            customHeaders = typeof model.provider.customHeaders === 'string' 
                ? JSON.parse(model.provider.customHeaders) 
                : model.provider.customHeaders;
        }
    } catch (e) {}

    const response = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${model.provider.apiKeyEncrypted}`,
            ...customHeaders
        },
        body: JSON.stringify(upstreamBody)
    });

    // Proxy the response directly back to client
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", req.headers.get("origin") || "*");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-inco-use-search");
    
    if (!response.body) throw new Error("No response body");
    const [clientStream, serverStream] = response.body.tee();
    
    // Process server stream for telemetry asynchronously
        (async () => {
        try {
            const reader = serverStream.getReader();
            const decoder = new TextDecoder();
            let promptTokens = 0;
            let completionTokens = 0;
            let totalTokens = 0;
            let buffer = "";
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunkStr = decoder.decode(value, { stream: true });
                buffer += chunkStr;
                
                // Parse lines for ephemeral logs
                const lines = chunkStr.split("\n");
                for (const line of lines) {
                    if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                        try {
                            const chunk = JSON.parse(line.substring(6));
                            if (chunk.choices && chunk.choices[0]?.delta?.content) {
                                // Track Time To First Token (TTFT)
                                if (firstTokenTime === null && chunk.choices[0].delta.content) {
                                    firstTokenTime = Date.now() - startTime;
                                }
                                appendToResponse(ephemeralId, chunk.choices[0].delta.content);
                            }
                            // Some providers send usage in standard chunks
                            if (chunk.usage) {
                                if (chunk.usage.prompt_tokens) promptTokens = chunk.usage.prompt_tokens;
                                if (chunk.usage.completion_tokens) completionTokens = chunk.usage.completion_tokens;
                                if (chunk.usage.total_tokens) totalTokens = chunk.usage.total_tokens;
                            }
                        } catch (e) {}
                    }
                }
                
                // Keep buffer size manageable to catch final usage block safely
                if (buffer.length > 8000) {
                    buffer = buffer.slice(buffer.length - 4000);
                }
                
                // Extract tokens using regex to catch trailing usage block if it's malformed JSON
                const promptMatch = buffer.match(/"prompt_tokens"\s*:\s*(\d+)/);
                const completionMatch = buffer.match(/"completion_tokens"\s*:\s*(\d+)/);
                const totalMatch = buffer.match(/"total_tokens"\s*:\s*(\d+)/);
                
                if (promptMatch) promptTokens = parseInt(promptMatch[1], 10);
                if (completionMatch) completionTokens = parseInt(completionMatch[1], 10);
                if (totalMatch) totalTokens = parseInt(totalMatch[1], 10);
            }
            
            // If the provider returned non-streamed JSON directly
            if (!stream) {
                try {
                    const parsed = JSON.parse(buffer);
                    if (parsed.choices && parsed.choices[0]?.message?.content) {
                        if (firstTokenTime === null) {
                            firstTokenTime = Date.now() - startTime;
                        }
                        appendToResponse(ephemeralId, parsed.choices[0].message.content);
                    }
                    if (parsed.usage) {
                        promptTokens = parsed.usage.prompt_tokens || 0;
                        completionTokens = parsed.usage.completion_tokens || 0;
                        totalTokens = parsed.usage.total_tokens || 0;
                    }
                } catch(e) {}
            }

            // Update playground token usage if applicable
            if (isPlaygroundToken && apiKey) {
                incrementPlaygroundTokenUsage(apiKey, totalTokens);
            }

            await prisma.requestLog.create({
                data: {
                    sessionId: apiKey || "anonymous",
                    modelId: model.displayName,
                    providerModelId: model.providerModelId,
                    searchUsed: !!searchSummary,
                    searchProvider: searchSummary.includes("Tavily") ? "tavily" : (searchSummary.includes("Exa") ? "exa" : null),
                    tokenUsageJson: { promptTokens, completionTokens, totalTokens },
                    executionMs: Date.now() - startTime,
                    ttftMs: firstTokenTime
                }
            });
        } catch (e) {}
    })();

    return new Response(clientStream, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: error.message || "Internal Proxy Error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get("origin") || "*";
    const requestedHeaders = req.headers.get("Access-Control-Request-Headers") || "*";
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": requestedHeaders,
            "Access-Control-Max-Age": "86400",
        },
    });
}