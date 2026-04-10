"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, Copy, Check, ChevronDown, ChevronRight, Zap, Clock, Plus, Trash2 } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ThinkingBlock {
  content: string;
  collapsed: boolean;
}

export default function ApiPlayground({ models }: { models: any[] }) {
  const [selectedModel, setSelectedModel] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "user", content: "" }]);
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [ttft, setTtft] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [thinkingBlocks, setThinkingBlocks] = useState<ThinkingBlock[]>([]);
  const [playgroundToken, setPlaygroundToken] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    // Generate playground token on mount
    fetch("/api/playground/token", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.token) setPlaygroundToken(data.token);
      })
      .catch(() => {});
  }, []);

  const parseThinkingTags = (text: string) => {
    const blocks: ThinkingBlock[] = [];
    let cleanText = text;

    // Match both <think> and <thinking> tags
    const thinkRegex = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
    let match;

    while ((match = thinkRegex.exec(text)) !== null) {
      blocks.push({
        content: match[1].trim(),
        collapsed: true
      });
    }

    // Remove thinking tags from display text
    cleanText = text.replace(thinkRegex, "").trim();

    return { cleanText, blocks };
  };

  const addMessage = () => {
    setMessages([...messages, { role: "user", content: "" }]);
  };

  const updateMessage = (index: number, field: keyof Message, value: string) => {
    const updated = [...messages];
    updated[index][field] = value as any;
    setMessages(updated);
  };

  const removeMessage = (index: number) => {
    if (messages.length > 1) {
      setMessages(messages.filter((_, i) => i !== index));
    }
  };

  const toggleThinkingBlock = (index: number) => {
    setThinkingBlocks(prev => 
      prev.map((block, i) => 
        i === index ? { ...block, collapsed: !block.collapsed } : block
      )
    );
  };

  const runPlayground = async () => {
    if (!selectedModel || !playgroundToken) return;
    
    const validMessages = messages.filter(m => m.content.trim());
    if (validMessages.length === 0) return;

    setIsLoading(true);
    setError("");
    setResponse("");
    setThinkingBlocks([]);
    setTtft(null);
    setTotalTime(null);

    const startTime = Date.now();
    let firstTokenTime: number | null = null;

    try {
      abortControllerRef.current = new AbortController();

      const res = await fetch(`${window.location.origin}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${playgroundToken}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: validMessages,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Request failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              
              if (content && firstTokenTime === null) {
                firstTokenTime = Date.now() - startTime;
                setTtft(firstTokenTime);
              }

              if (content) {
                setResponse(prev => prev + content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setTotalTime(Date.now() - startTime);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Request failed");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse thinking blocks when response changes
  useEffect(() => {
    if (response) {
      const { cleanText, blocks } = parseThinkingTags(response);
      setThinkingBlocks(blocks);
    }
  }, [response]);

  const { cleanText } = response ? parseThinkingTags(response) : { cleanText: "" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            API Playground
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Test requests with a temporary 32k token limit</p>
        </div>
      </div>

      {/* Model Selection - Bubbly Style */}
      <div>
        <label className="text-xs text-zinc-400 mb-2 block font-medium">Model</label>
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer hover:border-white/[0.15] shadow-lg shadow-black/20"
            style={{ backgroundImage: 'none' }}
          >
            {models.map(model => (
              <option key={model.id} value={model.id} className="bg-[#0a0a0a] text-white">{model.id}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        <label className="text-xs text-zinc-400 font-medium">Messages</label>
        {messages.map((msg, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-2xl p-4 shadow-lg shadow-black/10"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <select
                  value={msg.role}
                  onChange={(e) => updateMessage(idx, "role", e.target.value)}
                  className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/40 transition-all appearance-none cursor-pointer pr-8 font-medium"
                >
                  <option value="user" className="bg-[#0a0a0a]">User</option>
                  <option value="assistant" className="bg-[#0a0a0a]">Assistant</option>
                  <option value="system" className="bg-[#0a0a0a]">System</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 pointer-events-none" />
              </div>
              {messages.length > 1 && (
                <button
                  onClick={() => removeMessage(idx)}
                  className="ml-auto p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Remove message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <textarea
              value={msg.content}
              onChange={(e) => updateMessage(idx, "content", e.target.value)}
              placeholder="Enter message content..."
              className="w-full bg-black/20 border border-white/[0.05] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/30 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
              rows={3}
            />
          </motion.div>
        ))}
      </div>

      <button
        onClick={addMessage}
        className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.12] rounded-xl px-3 py-2 transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Message
      </button>

      {/* Run Button - Bubbly Style */}
      <button
        onClick={isLoading ? stopGeneration : runPlayground}
        disabled={!selectedModel || !playgroundToken || messages.every(m => !m.content.trim())}
        className="w-full bg-gradient-to-br from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-white/[0.03] disabled:to-white/[0.03] disabled:text-zinc-600 disabled:cursor-not-allowed text-white px-4 py-3.5 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Stop Generation
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Run Request
          </>
        )}
      </button>

      {/* Response */}
      {(response || error || isLoading) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Timing Metrics */}
          {(ttft !== null || totalTime !== null) && (
            <div className="flex items-center gap-4 text-xs bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl px-4 py-2.5">
              {ttft !== null && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>TTFT: {ttft}ms</span>
                </div>
              )}
              {totalTime !== null && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span>Total: {totalTime}ms</span>
                </div>
              )}
            </div>
          )}

          {/* Thinking Blocks */}
          {thinkingBlocks.length > 0 && (
            <div className="space-y-2">
              {thinkingBlocks.map((block, idx) => (
                <div key={idx} className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
                  <button
                    onClick={() => toggleThinkingBlock(idx)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-purple-300 hover:text-white hover:bg-purple-500/10 transition-colors font-medium"
                  >
                    {block.collapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    <span className="font-mono">Thinking Block {idx + 1}</span>
                  </button>
                  <AnimatePresence>
                    {!block.collapsed && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <pre className="px-4 py-3 text-xs text-zinc-400 font-mono whitespace-pre-wrap border-t border-purple-500/20 bg-black/20">
                          {block.content}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-sm text-red-400 shadow-lg shadow-red-500/10">
              {error}
            </div>
          )}

          {/* Response Content */}
          {(response || isLoading) && (
            <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.1] rounded-2xl p-5 relative shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Response</span>
                {response && (
                  <button
                    onClick={copyResponse}
                    className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-xl"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {cleanText || (isLoading && "Generating...")}
                {isLoading && <span className="inline-block w-1.5 h-4 bg-blue-400/60 ml-0.5 animate-pulse rounded-full" />}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
