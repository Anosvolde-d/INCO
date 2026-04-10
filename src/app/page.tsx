"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Key, Activity, Server, Copy, Check, Loader2, Eye, EyeOff, RefreshCw, Layers, ShieldAlert, X, Globe, History, Clock, Zap, PieChart as PieChartIcon, TrendingUp, Gauge, BarChart3, Play } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import PieChart from "@/components/PieChart";
import GaugeChart from "@/components/GaugeChart";
import TrendGraph from "@/components/TrendGraph";
import ProfileDropdown from "@/components/ProfileDropdown";

export default function Home() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [copied, setCopied] = useState("");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [useSearchParam, setUseSearchParam] = useState(true);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 }
    }
  };
  
  // Real usage state
  const [usage, setUsage] = useState({
      totalRequests: 0,
      searchesRun: 0,
      lorebooksInjected: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      chartData: [] as any[],
      avgResponseTime: 0,
      successRate: 100,
      usageTrend: [] as any[],
      ttftTrend: [] as any[]
  });
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Admin Modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [origin, setOrigin] = useState("https://[your-domain]");

  useEffect(() => {
    const savedSearchPref = localStorage.getItem("inco_use_search");
    if (savedSearchPref !== null) setUseSearchParam(savedSearchPref === "true");
    setOrigin(window.location.origin);

    // Check if Cloudflare Tunnel is active
    fetch("/api/admin/tunnel", { cache: "no-store" })
        .then(res => res.json())
        .then(data => { if (data.url) setOrigin(data.url); })
        .catch(() => {});

    // 1. Check local storage / cookies for existing API key to remember user
    const existingKey = localStorage.getItem("inco_api_key") || Cookies.get("inco_api_key");
    if (existingKey) {
        setApiKey(existingKey);
    }

    // 2. Fetch Models
    fetch("/v1/models", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setModels(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingModels(false));

    // 3. Fetch Usage Stats
    // Handled by dependency array in new useEffect

    // 4. Admin Keyboard Shortcut (Ctrl+M or Cmd+M)
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            setShowAdminModal(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => { if (apiKey) fetchUsageStats(); }, [apiKey]);

  // Auto-focus input when modal opens
  useEffect(() => {
      if (showAdminModal && passwordInputRef.current) {
          // Small timeout to ensure modal is rendered
          setTimeout(() => {
              passwordInputRef.current?.focus();
          }, 100);
      }
  }, [showAdminModal]);

  const fetchUsageStats = () => {
      setIsLoadingUsage(true);
      fetch(apiKey ? `/api/usage?apiKey=${apiKey}` : "/api/usage", { cache: "no-store" })
      .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
      })
      .then(data => {
          if (data.success) {
              setUsage({
                  totalRequests: data.data.totalRequests || 0,
                  searchesRun: data.data.searchesRun || 0,
                  lorebooksInjected: data.data.lorebooksInjected || 0,
                  totalTokens: data.data.totalTokens || 0,
                  promptTokens: data.data.promptTokens || 0,
                  completionTokens: data.data.completionTokens || 0,
                  chartData: data.data.chartData || [],
                  avgResponseTime: data.data.avgResponseTime || 0,
                  successRate: data.data.successRate || 100,
                  usageTrend: data.data.usageTrend || [],
                  ttftTrend: data.data.ttftTrend || []
              });
          }
      })
      .catch((err) => {
          console.error('Failed to fetch usage stats:', err);
      })
      .finally(() => setIsLoadingUsage(false));
      
      setIsLoadingHistory(true);
      if (apiKey) {
          fetch(`/api/usage/history?apiKey=${apiKey}`, { cache: "no-store" })
          .then(res => {
              if (!res.ok) throw new Error('Network response was not ok');
              return res.json();
          })
          .then(data => { if (data.success) setHistory(data.logs); })
          .catch((err) => {
              console.error('Failed to fetch history:', err);
          })
          .finally(() => setIsLoadingHistory(false));
      } else {
          setHistory([]);
          setIsLoadingHistory(false);
      }
  };

  const generateNewKey = async () => {
      setIsGeneratingKey(true);
      const res = await fetch("/api/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useSearch: useSearchParam })
      });
      const data = await res.json();
      if (data.success && data.apiKey) {
          const newKey = data.apiKey.key;
          setApiKey(newKey);
          if (typeof window !== "undefined") {
              localStorage.setItem("inco_api_key", newKey);
          }
      } else {
          alert("Failed to generate key.");
      }
      setIsGeneratingKey(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const formatTokens = (num: number) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
      return num.toString();
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setAdminError("");
      
      try {
          const res = await fetch("/api/admin/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: adminPassword })
          });
          
          if (res.ok) {
              Cookies.set("inco_admin_auth", "true", { expires: 1 });
              router.push("/admin");
          } else {
              setAdminError("Invalid authorization token.");
              setAdminPassword("");
              passwordInputRef.current?.focus();
          }
      } catch (error) {
          setAdminError("Connection failed.");
      }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-zinc-800">
      
      {/* Background Video Banner */}
      <div className="fixed left-0 right-0 h-[300px] z-0 overflow-hidden" style={{ top: '20px' }}>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover opacity-60"
        >
          <source src="/bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505]"></div>
      </div>
      
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Admin Login Modal */}
      <AnimatePresence>
          {showAdminModal && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
              >
                  <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 10 }}
                      className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl p-8 max-w-sm w-full shadow-2xl relative"
                  >
                      <button 
                          onClick={() => {
                              setShowAdminModal(false);
                              setAdminPassword("");
                              setAdminError("");
                          }}
                          className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
                      >
                          <X className="w-4 h-4" />
                      </button>
                      <div className="mb-6">
                          <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-4">
                              <ShieldAlert className="w-5 h-5 text-zinc-400" />
                          </div>
                          <h2 className="text-lg font-medium text-white">System Access</h2>
                          <p className="text-zinc-500 text-xs mt-1">Authenticate to access INCO control plane.</p>
                      </div>
                      
                      <form onSubmit={handleAdminLogin} className="space-y-4">
                          <div>
                              <input 
                                  ref={passwordInputRef}
                                  type="password" 
                                  value={adminPassword}
                                  onChange={(e) => setAdminPassword(e.target.value)}
                                  placeholder="Authorization token"
                                  autoComplete="new-password"
                                  className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/[0.2] transition-colors placeholder:text-zinc-600"
                              />
                          </div>
                          {adminError && <p className="text-red-400/80 text-[10px] uppercase tracking-wider font-medium">{adminError}</p>}
                          <button 
                              type="submit"
                              className="w-full bg-white text-black hover:bg-zinc-200 font-medium py-2.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                              Unlock
                          </button>
                      </form>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Header */}
      <header className="z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.03] bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
             <Network className="w-3.5 h-3.5 text-zinc-300" />
          </div>
          <h1 className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-200">INCO Proxy</h1>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2 text-zinc-400 bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
            Operational
          </div>
          {apiKey && <ProfileDropdown apiKey={apiKey} />}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 py-16 z-10 space-y-16 max-w-5xl mx-auto w-full">
        
        {/* Intro */}
        <div className="space-y-4 max-w-2xl">
            <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-medium tracking-tight text-white"
            >
                Orchestration Gateway
            </motion.h2>
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-zinc-400 text-sm leading-relaxed"
            >
                Configure your external clients (SillyTavern, Agnai, TypingMind) to route through INCO. This proxy intercepts requests, injects dynamic context (Lorebooks & Web Search), and streams the response directly from the assigned upstream provider.
            </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-6">
            
            {/* Credentials Card - Full Width */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#0f0f0f] border border-white/[0.08] rounded-2xl p-8 shadow-2xl relative overflow-hidden"
            >
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h3 className="text-base font-medium text-white flex items-center gap-2 mb-1">
                            <Key className="w-4 h-4 text-zinc-400"/> Authentication
                        </h3>
                        <p className="text-xs text-zinc-500">Provide these credentials to your client.</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer bg-black border border-white/[0.05] p-2 rounded-lg hover:border-white/[0.1] transition-colors">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Web Search</span>
                        <div className="relative inline-block w-8 h-4">
                            <input type="checkbox" className="sr-only peer" checked={useSearchParam} onChange={(e) => {
                                const checked = e.target.checked;
                                setUseSearchParam(checked);
                                localStorage.setItem("inco_use_search", checked ? "true" : "false");
                                if (apiKey) {
                                    fetch("/api/keys", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ key: apiKey, useSearch: checked })
                                    }).catch(() => {});
                                }
                            }} />
                            <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:bg-emerald-500/80 transition-colors"></div>
                            <div className="absolute left-1 top-1 bg-white w-2 h-2 rounded-full transition-transform peer-checked:translate-x-4"></div>
                        </div>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2 block">Endpoint URL</label>
                        <div className="flex items-center bg-black border border-white/[0.08] rounded-lg p-1 transition-colors hover:border-white/[0.15]">
                            <code className="flex-1 px-3 text-zinc-300 text-xs font-mono">
                                {`${origin}/v1`}
                            </code>
                            <button 
                                onClick={() => copyToClipboard(`${origin}/v1`, 'url')}
                                className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
                            >
                                {copied === "url" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold block">Bearer Token</label>
                            {!apiKey && (
                                <button 
                                    onClick={generateNewKey}
                                    disabled={isGeneratingKey}
                                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors uppercase tracking-wider"
                                >
                                    {isGeneratingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Generate
                                </button>
                            )}
                        </div>
                        
                        {apiKey ? (
                            <div className="flex items-center bg-black border border-white/[0.08] rounded-lg p-1 transition-colors hover:border-white/[0.15]">
                                <code className="flex-1 px-3 text-zinc-300 text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                                    {showApiKey ? apiKey : 'sk-inco-••••••••••••••••••••••••••••••••'}
                                </code>
                                <div className="flex items-center gap-1 border-l border-white/[0.08] pl-1 ml-1">
                                    <button 
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
                                    >
                                        {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button 
                                        onClick={() => copyToClipboard(apiKey, 'key')}
                                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
                                    >
                                        {copied === "key" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-black/50 border border-white/[0.05] border-dashed rounded-lg p-5 text-center">
                                <p className="text-xs text-zinc-500 mb-3">No API key assigned to this session.</p>
                                <button 
                                    onClick={generateNewKey}
                                    disabled={isGeneratingKey}
                                    className="bg-white text-black hover:bg-zinc-200 font-medium rounded-md px-4 py-2 text-xs transition-colors flex items-center gap-2 mx-auto"
                                >
                                    {isGeneratingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                                    Create Key
                                </button>
                            </div>
                        )}
                        
                    </div>
                
                </div>
        </motion.div>

        {/* Available Models List */}
        <motion.div 
            variants={itemVariants}
            className="bg-[#0f0f0f] border border-white/[0.08] rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
            <div className="flex justify-between items-end mb-8 border-b border-white/[0.05] pb-4">
                <div>
                    <h3 className="text-base font-medium text-white flex items-center gap-2 mb-1">
                        <Layers className="w-4 h-4 text-zinc-400"/> Available Endpoints
                    </h3>
                    <p className="text-xs text-zinc-500">Models exposed through the INCO proxy.</p>
                </div>
                <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 flex items-center gap-2">
                    <Loader2 className={`w-3 h-3 text-zinc-400 ${isLoadingModels ? 'animate-spin' : 'hidden'}`} />
                    <span className="text-zinc-300">{models.length}</span> ONLINE
                </div>
            </div>

            <div className="space-y-3">
                {models.length === 0 && !isLoadingModels ? (
                     <div className="text-center py-10 bg-black/30 border border-dashed border-white/[0.05] rounded-xl">
                        <Server className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-400">No public models configured.</p>
                     </div>
                ) : (
                    models.map((model) => (
                        <div key={model.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black border border-white/[0.05] rounded-xl hover:border-white/[0.15] transition-all">
                            <div className="mb-3 sm:mb-0">
                                <div className="text-sm font-medium text-zinc-200">
                                    {model._inco.displayName}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <code className="text-[10px] text-zinc-500 font-mono select-all">
                                        {model.id}
                                    </code>
                                    <button 
                                        onClick={() => copyToClipboard(model.id, `model-${model.id}`)}
                                        className="text-zinc-600 hover:text-zinc-300 transition-colors"
                                        title="Copy Model ID"
                                    >
                                        {copied === `model-${model.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {model._inco.supportsVision && (
                                    <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-1 bg-zinc-900 text-zinc-400 rounded border border-white/[0.05]">Vision</span>
                                )}
                                {model._inco.supportsSearch && (
                                    <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-1 bg-zinc-900 text-zinc-400 rounded border border-white/[0.05]">Web Search</span>
                                )}
                                <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-1 bg-zinc-900 text-zinc-500 rounded border border-white/[0.05]">
                                    {Math.round(model._inco.tokenLimit / 1000)}k ctx
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>

      
        {/* Request History List */}
        <motion.div 
            variants={itemVariants}
            className="bg-[#0f0f0f] border border-white/[0.08] rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
            <div className="flex justify-between items-end mb-8 border-b border-white/[0.05] pb-4">
                <div>
                    <h3 className="text-base font-medium text-white flex items-center gap-2 mb-1">
                        <History className="w-4 h-4 text-zinc-400"/> Personal History
                    </h3>
                    <p className="text-xs text-zinc-500">Your 20 most recent API proxy requests.</p>
                </div>
                <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 flex items-center gap-2">
                    <Loader2 className={`w-3 h-3 text-zinc-400 ${isLoadingHistory ? 'animate-spin' : 'hidden'}`} />
                    <span className="text-zinc-300">{history.length}</span> LOGS
                </div>
            </div>

            <div className="space-y-3">
                {!apiKey ? (
                    <div className="text-center py-10 bg-black/30 border border-dashed border-white/[0.05] rounded-xl">
                        <Key className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-400">Generate an API key to view history.</p>
                    </div>
                ) : history.length === 0 && !isLoadingHistory ? (
                     <div className="text-center py-10 bg-black/30 border border-dashed border-white/[0.05] rounded-xl">
                        <Activity className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-400">No requests made yet.</p>
                     </div>
                ) : (
                    history.map((log) => {
                        let usage: any = {}; try { usage = typeof log.tokenUsageJson === "string" ? JSON.parse(log.tokenUsageJson) : log.tokenUsageJson || {}; } catch(e){}
                        const avgResponseTime = log.executionMs ? Math.round(log.executionMs / 1000 * 10) / 10 : null;
                        return (
                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black border border-white/[0.05] rounded-xl hover:border-white/[0.15] transition-all group">
                            <div className="mb-3 sm:mb-0 flex-1">
                                <div className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                                    {log.modelId}
                                    {log.searchUsed && (
                                        <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 flex items-center gap-1">
                                            <Globe className="w-2.5 h-2.5" />
                                            {log.searchProvider === 'exa' ? 'EXA' : 'Search'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                     {log.executionMs && (
                                        <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                                             <Zap className={`w-3 h-3 ${log.executionMs < 5000 ? 'text-emerald-500/60' : log.executionMs < 15000 ? 'text-amber-500/60' : 'text-red-500/60'}`} /> 
                                             {log.ttftMs ? `${log.ttftMs}ms TTFT` : `${avgResponseTime}s`}
                                         </span>
                                     )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                                <div className="bg-zinc-900/50 border border-white/[0.05] rounded-lg px-3 py-2 group-hover:border-white/[0.1] transition-colors">
                                    <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-0.5 font-semibold">Prompt</div>
                                    <div className="text-xs font-mono text-zinc-300">{(usage.promptTokens || usage.prompt_tokens || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-zinc-900/50 border border-white/[0.05] rounded-lg px-3 py-2 group-hover:border-white/[0.1] transition-colors">
                                    <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-0.5 font-semibold">Completion</div>
                                    <div className="text-xs font-mono text-zinc-300">{(usage.completionTokens || usage.completion_tokens || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 group-hover:border-emerald-500/30 transition-colors">
                                    <div className="text-[9px] uppercase tracking-widest text-emerald-600 mb-0.5 font-semibold">Total</div>
                                    <div className="text-xs font-mono text-emerald-400 font-semibold">{(usage.totalTokens || usage.total_tokens || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                        );
                    })
                )}
            </div>
      </motion.div>
      </div>
    </main>
    </div>
  );
}
