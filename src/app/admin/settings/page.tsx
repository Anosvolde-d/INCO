"use client";

import { useState, useEffect } from "react";
import { Shield, Globe, Loader2, ExternalLink, Power, PowerOff, Activity } from "lucide-react";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [isTunnelLoading, setIsTunnelLoading] = useState(false);
  const [tunnelError, setTunnelError] = useState("");
  
  // Rate limits
  const [rateLimitRPM, setRateLimitRPM] = useState<number>(5);
  const [rateLimitRPD, setRateLimitRPD] = useState<number>(500);
  const [isLoadingLimits, setIsLoadingLimits] = useState(true);
  const [limitsMessage, setLimitsMessage] = useState("");
  
  useEffect(() => {
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setRateLimitRPM(data.settings.rateLimitRPM);
          setRateLimitRPD(data.settings.rateLimitRPD);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingLimits(false));
  }, []);

  const handleUpdateLimits = async () => {
    setLimitsMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateLimitRPM, rateLimitRPD })
      });
      const data = await res.json();
      if (data.success) {
        setLimitsMessage("Rate limits updated successfully.");
        setTimeout(() => setLimitsMessage(""), 3000);
      } else {
        setLimitsMessage(data.message || "Failed to update limits.");
      }
    } catch (e: any) {
      setLimitsMessage("Network error updating limits.");
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    
    if (!currentPassword || !newPassword) {
      setPasswordError("All fields required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed");
      }
      setPasswordSuccess("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setPasswordError(e.message);
    }
  };

  const handleStartTunnel = async () => {
    setIsTunnelLoading(true);
    setTunnelError("");
    try {
      const res = await fetch("/api/admin/tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" })
      });
      const data = await res.json();
      if (data.success && data.url) {
        setTunnelUrl(data.url);
      } else {
        setTunnelError(data.message || "Failed to start tunnel");
      }
    } catch (e: any) {
      setTunnelError(e.message);
    } finally {
      setIsTunnelLoading(false);
    }
  };

  const handleStopTunnel = async () => {
    setIsTunnelLoading(true);
    try {
      await fetch("/api/admin/tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" })
      });
      setTunnelUrl("");
    } catch (e: any) {
      setTunnelError(e.message);
    } finally {
      setIsTunnelLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header>
        <h2 className="text-3xl font-medium tracking-tight text-white">System Settings</h2>
        <p className="text-zinc-500 mt-2 text-sm">Configure global system defaults.</p>
      </header>

      {/* Cloudflare Tunnel */}
      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-medium text-white flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-zinc-400" /> Remote Access Tunnel
        </h3>
        <p className="text-xs text-zinc-500 mb-6">Expose your local INCO instance via Cloudflare Tunnel.</p>
        
        {tunnelUrl ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mb-2">Tunnel Active</div>
                  <a href={tunnelUrl} target="_blank" rel="noopener noreferrer" 
                    className="text-sm text-emerald-300 hover:text-emerald-200 font-mono flex items-center gap-2">
                    {tunnelUrl} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <button onClick={handleStopTunnel} disabled={isTunnelLoading}
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2">
                  {isTunnelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />}
                  Stop Tunnel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {tunnelError && <p className="text-red-400 text-xs mb-3">{tunnelError}</p>}
            <button onClick={handleStartTunnel} disabled={isTunnelLoading}
              className="bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-white/[0.08] font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2">
              {isTunnelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              {isTunnelLoading ? "Starting Tunnel..." : "Start Cloudflare Tunnel"}
            </button>
          </div>
        )}
      </div>

      {/* Global Rate Limits */}
      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-medium text-white flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-zinc-400" /> Global Rate Limits
        </h3>
        <p className="text-xs text-zinc-500 mb-6">These base limits apply to all API keys that don't have custom overrides.</p>
        
        {isLoadingLimits ? (
          <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1.5 block">Requests Per Minute (RPM)</label>
                <input type="number" min="1" value={rateLimitRPM} onChange={(e) => setRateLimitRPM(parseInt(e.target.value) || 1)}
                  className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1.5 block">Requests Per Day (RPD)</label>
                <input type="number" min="1" value={rateLimitRPD} onChange={(e) => setRateLimitRPD(parseInt(e.target.value) || 1)}
                  className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.05]">
              <p className={`text-xs ${limitsMessage.includes('error') || limitsMessage.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>
                {limitsMessage}
              </p>
              <button onClick={handleUpdateLimits}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2">
                Save Limits
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Password */}
      <div className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-medium text-white flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-zinc-400" /> Admin Password
        </h3>
        <p className="text-xs text-zinc-500 mb-6">Change the admin panel access password.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1.5 block">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1.5 block">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1.5 block">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] transition-colors" />
          </div>
        </div>
        {passwordError && <p className="text-red-400 text-xs mt-3">{passwordError}</p>}
        {passwordSuccess && <p className="text-emerald-400 text-xs mt-3">{passwordSuccess}</p>}
        <button onClick={handleChangePassword}
          className="mt-4 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-white/[0.08] font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2">
          <Shield className="w-4 h-4" /> Update Password
        </button>
      </div>
    </div>
  );
}
