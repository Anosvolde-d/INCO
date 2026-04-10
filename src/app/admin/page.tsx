"use client";

import { useState, useEffect } from "react";
import { Activity, Download, RefreshCw, Loader2, Eye, X, Server, BookOpen, Globe, PowerOff, User, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RequestLog {
  id: string;
  timestamp: Date;
  sessionId: string | null;
  modelId: string;
  providerModelId: string;
  searchUsed: boolean;
  searchProvider: string | null;
  tokenUsageJson: any;
  errorCode: string | null;
  executionMs: number | null;
  model: {
    displayName: string;
  };
  ephemeral?: any;
  userName?: string;
  userAvatar?: string;
  isBlocked?: boolean;
}

export default function AdminDashboard() {
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [isTogglingTunnel, setIsTogglingTunnel] = useState(false);
  const [stats, setStats] = useState({
      providers: 0,
      models: 0,
      lorebooks: 0
  });
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [ephemeralLogs, setEphemeralLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);

  useEffect(() => {
     fetchStats();
     fetchLogs();
     
     // Auto-refresh logs every 5 seconds
     const interval = setInterval(fetchLogs, 5000);
     return () => clearInterval(interval);
  }, []);

  const toggleTunnel = async () => {
    setIsTogglingTunnel(true);
    try {
        const action = tunnelUrl ? "stop" : "start";
        const res = await fetch("/api/admin/tunnel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        setTunnelUrl(action === "start" ? data.url : null);
    } catch (e) {
        alert("Tunnel error");
    } finally {
        setIsTogglingTunnel(false);
    }
  };

  const toggleUserBlock = async (sessionId: string, currentlyBlocked: boolean) => {
    try {
      const res = await fetch("/api/admin/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: sessionId, isBlocked: !currentlyBlocked })
      });
      
      if (res.ok) {
        fetchLogs(); // Refresh logs
      }
    } catch (e) {
      alert("Failed to update user status");
    }
  };

  const fetchStats = async () => {
      // Fetch counts from DB
      setStats({
          providers: 1,
          models: 1,
          lorebooks: 0
      });
  };

  const fetchLogs = async () => {
      setIsLoadingLogs(true);
      try {
          fetch("/api/admin/tunnel", { cache: "no-store" }).then(res => res.json()).then(data => { if (data.url) setTunnelUrl(data.url); }).catch(() => {});
          
          const response = await fetch("/api/admin/logs", { cache: "no-store" });
          const data = await response.json();
          if (data.success) {
              setLogs(data.logs);
              if (data.ephemeralLogs) setEphemeralLogs(data.ephemeralLogs);
          }
      } catch (error) {
          // Silent fail
      } finally {
          setIsLoadingLogs(false);
      }
  };

  const downloadLogs = () => {
      const exportData = logs.map(log => {
          const eLog = ephemeralLogs.find(e => Math.abs(e.timestamp - new Date(log.timestamp).getTime()) < 300000 && e.sessionId === log.sessionId && e.modelId === log.modelId);
          return {
              ...log,
              ...(eLog ? {
                  searchContextInjected: eLog.searchSummary || null,
                  contextProvided: eLog.lastMessages,
                  upstreamResponse: eLog.responseContent
              } : {})
          };
      });
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inco-logs-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto relative pb-20">
      <header>
        <h2 className="text-3xl font-medium tracking-tight text-white">Dashboard</h2>
        <p className="text-zinc-500 mt-2 text-sm">Overview of your INCO orchestration instances.</p>
      </header>
      
      {/* Tunnel Card */}
      <div className="flex items-center justify-between bg-black border border-white/[0.05] p-5 rounded-2xl shadow-xl hover:border-white/[0.1] transition-colors">
            <div className="flex-1">
                <h4 className="text-sm text-white font-medium flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-400" /> Remote Access Tunnel</h4>
                <p className="text-xs text-zinc-500 mt-1">Expose your localhost INCO proxy securely to the web (powered by Localtunnel).</p>
                {tunnelUrl && (
                    <div className="mt-3 flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] px-3 py-1.5 rounded-lg w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                        <a href={tunnelUrl} target="_blank" className="text-xs font-mono text-emerald-400 hover:underline">{tunnelUrl}</a>
                    </div>
                )}
            </div>
            <button 
                onClick={toggleTunnel} 
                disabled={isTogglingTunnel}
                className={`px-4 py-2.5 text-xs font-medium rounded-xl transition-all flex items-center gap-2 ${tunnelUrl ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-white text-black hover:bg-zinc-200'}`}
            >
                {isTogglingTunnel ? <Loader2 className="w-4 h-4 animate-spin" /> : tunnelUrl ? <PowerOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                {tunnelUrl ? 'Stop Tunnel' : 'Launch Tunnel'}
            </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Active Providers</h3>
              <Server className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-4xl font-light text-zinc-200">{stats.providers}</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Models Configured</h3>
              <Activity className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-4xl font-light text-zinc-200">{stats.models}</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
           <div className="flex justify-between items-start mb-4">
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Lorebook Entries</h3>
              <BookOpen className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-4xl font-light text-zinc-200">{stats.lorebooks}</div>
        </div>
      </div>

      {/* Live Request Monitor */}
      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-medium text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-400" />
              Live Request Monitor
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Real-time proxy activity</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={fetchLogs}
              disabled={isLoadingLogs}
              className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={downloadLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.03]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black/50 border-b border-white/[0.05]">
                <th className="px-4 py-3 font-medium text-zinc-500">Timestamp</th>
                <th className="px-4 py-3 font-medium text-zinc-500">User</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Model</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Upstream</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Tokens (In/Out/Total)</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Augmentations</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-zinc-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-600">No requests processed yet.</td>
                </tr>
              ) : (
                logs.map((log) => {
                  let usage: any = {}; try { usage = typeof log.tokenUsageJson === "string" ? JSON.parse(log.tokenUsageJson) : log.tokenUsageJson || {}; } catch(e){}
                  // Find ephemeral match using strict sessionId and close timestamp
                  const eLog = ephemeralLogs.find(e => Math.abs(e.timestamp - new Date(log.timestamp).getTime()) < 300000 && e.sessionId === log.sessionId && e.modelId === log.modelId);
                  
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        {new Date(log.timestamp).toLocaleString()}
                        {eLog && <Eye className="w-3 h-3 inline ml-2 text-emerald-500/50 group-hover:text-emerald-400 transition-colors cursor-pointer" onClick={() => setSelectedLog({ ...log, ephemeral: eLog })} />}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {log.userAvatar ? (
                            <img src={log.userAvatar} alt="" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-semibold text-white">
                              {log.userName ? log.userName.slice(0, 2).toUpperCase() : 'AN'}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-medium text-zinc-300">{log.userName || 'Anonymous'}</div>
                            <div className="text-[10px] font-mono text-zinc-600">{log.sessionId?.substring(0, 12)}...</div>
                          </div>
                          {log.isBlocked && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">Blocked</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-200">{log.model?.displayName || log.providerModelId}</td>
                      <td className="px-4 py-3 text-zinc-400">{log.providerModelId}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        <span className="text-zinc-300">{usage.promptTokens || usage.prompt_tokens || 0}</span> <span className="opacity-40">/</span> <span className="text-zinc-300">{usage.completionTokens || usage.completion_tokens || 0}</span> <span className="opacity-40">/</span> <span className="text-emerald-400/80">{usage.totalTokens || usage.total_tokens || 0}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          {log.searchUsed && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 text-emerald-400 rounded border border-emerald-500/20">{log.searchProvider || 'Search'}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          {log.sessionId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleUserBlock(log.sessionId!, log.isBlocked || false);
                              }}
                              className={`text-[9px] uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
                                log.isBlocked 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                              }`}
                            >
                              <Ban className="w-3 h-3 inline mr-1" />
                              {log.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
      {selectedLog && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedLog(null)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-white/[0.05]">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-400" /> Request Details
                <span className="ml-2 text-xs font-mono text-zinc-500 px-2 py-0.5 bg-black rounded border border-white/[0.05]">{selectedLog.id}</span>
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-zinc-500 hover:text-white transition-colors bg-white/[0.02] p-1.5 rounded hover:bg-white/[0.05]">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
              
              {selectedLog.ephemeral ? (
                <>
                  {selectedLog.ephemeral.searchUsed && selectedLog.ephemeral.searchSummary && (
                    <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mb-3 flex items-center gap-2"><Globe className="w-3.5 h-3.5"/> Web Search Context Injected</h4>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-sm text-emerald-100/80 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                            {selectedLog.ephemeral.searchSummary}
                        </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">Context Provided (Last 5 User Messages)</h4>
                    <div className="space-y-3">
                      {selectedLog.ephemeral.lastMessages && selectedLog.ephemeral.lastMessages.length > 0 ? (
                        selectedLog.ephemeral.lastMessages.map((msg: any, i: number) => (
                          <div key={i} className={`p-4 rounded-xl text-sm ${msg.role === 'user' ? 'bg-white/[0.03] border border-white/[0.05] text-zinc-200' : 'bg-black border border-white/[0.05] text-zinc-400'}`}>
                            <div className="text-[10px] uppercase tracking-widest font-semibold mb-2 opacity-50 flex justify-between items-center">
                                <span>{msg.role}</span>
                                {msg.role === 'user' && <span className="text-[8px] opacity-40 px-1.5 py-0.5 border border-white/[0.1] rounded">USER</span>}
                            </div>
                            <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{msg.content || JSON.stringify(msg)}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-zinc-600 text-sm italic">No message context available</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3 flex items-center justify-between">
                        <span>Upstream Response</span>
                        <span className="text-emerald-400">{selectedLog.tokenUsageJson?.completionTokens || selectedLog.tokenUsageJson?.completion_tokens || 0} tokens generated</span>
                    </h4>
                    <div className="bg-black border border-white/[0.05] rounded-xl p-5 text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed min-h-[100px]">
                      {selectedLog.ephemeral.responseContent || <span className="text-zinc-600 italic">No textual response content recorded (possibly streaming failure or empty response).</span>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-zinc-600 mb-4">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Detailed request/response data not available.</p>
                    <p className="text-xs mt-2 text-zinc-700">Ephemeral logs are only kept for 10 minutes after the request.</p>
                  </div>
                  <div className="mt-6 bg-black border border-white/[0.05] rounded-xl p-4 text-left">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">Basic Metadata</div>
                    <div className="space-y-2 text-xs font-mono text-zinc-400">
                      <div><span className="text-zinc-600">Timestamp:</span> {new Date(selectedLog.timestamp).toLocaleString()}</div>
                      <div><span className="text-zinc-600">Session:</span> {selectedLog.sessionId}</div>
                      <div><span className="text-zinc-600">Model:</span> {selectedLog.modelId}</div>
                      <div><span className="text-zinc-600">Provider:</span> {selectedLog.providerModelId}</div>
                      {selectedLog.executionMs && <div><span className="text-zinc-600">Execution:</span> {selectedLog.executionMs}ms</div>}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
