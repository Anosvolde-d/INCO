"use client";

import { useState, useEffect } from "react";
import { Search, Globe, Save, Loader2, Check } from "lucide-react";

export default function SearchConfigPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Search Agent Model Config
  const [agentEndpoint, setAgentEndpoint] = useState("https://api.openai.com/v1");
  const [agentModelId, setAgentModelId] = useState("gpt-4o-mini");
  const [agentApiKey, setAgentApiKey] = useState("");
  
  // Exa Config
  const [exaApiKey, setExaApiKey] = useState("");
  const [exaCorePrompt, setExaCorePrompt] = useState("");
  
  // Tavily Config
  const [tavilyApiKeys, setTavilyApiKeys] = useState("");
  const [tavilyCorePrompt, setTavilyCorePrompt] = useState("");

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/search", { cache: "no-store" });
      const data = await response.json();
      if (data.success && data.configs) {
        // Load existing configs
        const exaConfig = data.configs.find((c: any) => c.provider === "exa");
        const agentConfig = data.configs.find((c: any) => c.provider === "agent");
        const tavilyConfig = data.configs.find((c: any) => c.provider === "tavily");
        
        if (exaConfig) {
          setExaApiKey(exaConfig.apiKeys[0] || "");
          setExaCorePrompt(exaConfig.agentCorePrompt || "");
        }
        
        if (tavilyConfig) {
          setTavilyApiKeys(tavilyConfig.apiKeys.join(","));
          setTavilyCorePrompt(tavilyConfig.agentCorePrompt || "");
        }
        
        if (agentConfig) {
            setAgentApiKey(agentConfig.apiKeys[0] || "");
            try {
                const parsed = JSON.parse(agentConfig.agentCorePrompt);
                setAgentEndpoint(parsed.endpoint || "");
                setAgentModelId(parsed.modelId || "");
            } catch (e) {}
        }
      }
    } catch (error) {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Save Agent config
      // Save Agent config
      await fetch("/api/admin/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "agent",
          apiKeys: [agentApiKey || ""],
          agentCorePrompt: JSON.stringify({ endpoint: agentEndpoint, modelId: agentModelId }),
          isActive: true
        })
      });
      
      // Save Exa config
      // Save Exa config
      await fetch("/api/admin/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "exa",
          apiKeys: [exaApiKey || ""],
          agentCorePrompt: exaCorePrompt || "You are a search agent with access to Exa neural search.",
          isActive: true
        })
      });
      
      // Save Tavily config
      // Save Tavily config
      await fetch("/api/admin/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "tavily",
          apiKeys: tavilyApiKeys ? tavilyApiKeys.split(",").map(k => k.trim()) : [],
          agentCorePrompt: tavilyCorePrompt || "You are a search agent with access to Tavily web search.",
          isActive: true
        })
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      alert("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-medium tracking-tight text-white">Search Configuration</h2>
          <p className="text-zinc-500 mt-2 text-sm">Configure Exa and Tavily web search integration and search agent model.</p>
        </div>
      </header>

      {/* Search Agent Model Selection */}
      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-medium text-white mb-4">Search Agent Model</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Select a lightweight, fast model to act as the search router. This model analyzes user queries, 
          determines canon/timeline, and generates search queries before passing control to the main model.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Model Endpoint (OpenAI-compatible)</label>
            <input 
              type="text"
              value={agentEndpoint}
              onChange={(e) => setAgentEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Model ID</label>
            <input 
              type="text"
              value={agentModelId}
              onChange={(e) => setAgentModelId(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">API Key</label>
            <input 
              type="password"
              value={agentApiKey}
              onChange={(e) => setAgentApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Exa Configuration */}
      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-medium text-white">Exa Configuration</h3>
            <p className="text-xs text-zinc-500 mt-1">Neural search for high-quality, relevant results</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">Status:</span>
            <span className="text-xs text-emerald-400">{exaApiKey ? "Active" : "Inactive"}</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">API Key</label>
            <input 
              type="password"
              value={exaApiKey}
              onChange={(e) => setExaApiKey(e.target.value)}
              placeholder="Enter Exa API key"
              className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Core Prompt (Exa-specific)</label>
            <textarea 
              value={exaCorePrompt}
              onChange={(e) => setExaCorePrompt(e.target.value)}
              placeholder="You are a search agent with access to Exa neural search..."
              className="w-full h-32 bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Tavily Configuration */}
      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-medium text-white">Tavily Configuration</h3>
            <p className="text-xs text-zinc-500 mt-1">Multi-key rotation for high-volume searches</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">Status:</span>
            <span className="text-xs text-emerald-400">{tavilyApiKeys ? "Active" : "Inactive"}</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">API Keys (comma-separated for rotation)</label>
            <textarea 
              value={tavilyApiKeys}
              onChange={(e) => setTavilyApiKeys(e.target.value)}
              placeholder="key1,key2,key3"
              className="w-full h-24 bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors resize-none font-mono"
            />
            <p className="text-[10px] text-zinc-600 mt-1">
              {tavilyApiKeys.split(",").filter(k => k.trim()).length} keys configured for automatic rotation
            </p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Core Prompt (Tavily-specific)</label>
            <textarea 
              value={tavilyCorePrompt}
              onChange={(e) => setTavilyCorePrompt(e.target.value)}
              placeholder="You are a search agent with access to Tavily web search..."
              className="w-full h-32 bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isSaving || saveSuccess}
          className="bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 font-medium rounded-lg px-6 py-2.5 text-sm transition-colors flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Saved Successfully
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save All Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
