"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Camera, Check, X, Edit2, Shield } from "lucide-react";
import Cookies from "js-cookie";

interface UserProfileSidebarProps {
  apiKey: string;
}

export default function UserProfileSidebar({ apiKey }: UserProfileSidebarProps) {
  const [userName, setUserName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (apiKey) {
      fetchUserProfile();
    }
  }, [apiKey]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`/api/profile?apiKey=${apiKey}`);
      const data = await res.json();
      if (data.success) {
        setUserName(data.profile.name || "Anonymous User");
        setDisplayName(data.profile.name || "Anonymous User");
        setAvatarUrl(data.profile.avatarUrl || "");
      }
    } catch (e) {
      setUserName("Anonymous User");
      setDisplayName("Anonymous User");
    }
  };

  const handleEditName = () => {
    setTempName(userName);
    setIsEditing(true);
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, name: tempName.trim() })
      });
      
      if (res.ok) {
        setUserName(tempName.trim());
        setDisplayName(tempName.trim());
        setIsEditing(false);
      }
    } catch (e) {
      console.error("Failed to update name");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      
      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, avatarUrl: base64 })
        });
        
        if (res.ok) {
          setAvatarUrl(base64);
        }
      } catch (e) {
        console.error("Failed to upload avatar");
      }
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative overflow-hidden"
    >
      {/* Decorative gradient orb */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-white">
                    {getInitials(displayName)}
                  </span>
                )}
              </div>
            </div>
            
            {/* Upload button */}
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Name Section */}
          <div className="mt-4 w-full">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-2xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="Your name"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={isLoading}
                  className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Check className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-8 h-8 bg-white/[0.05] rounded-full flex items-center justify-center hover:bg-white/[0.1] transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={handleEditName}>
                <h3 className="text-base font-medium text-white text-center">
                  {displayName}
                </h3>
                <Edit2 className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Status</div>
                <div className="text-sm font-medium text-white mt-0.5">Active User</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Access</div>
                <div className="text-sm font-medium text-white mt-0.5">Full Access</div>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Preview */}
        <div className="mt-4 p-3 bg-black/40 border border-white/[0.05] rounded-2xl">
          <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold mb-1">Your API Key</div>
          <div className="text-[10px] font-mono text-zinc-500 truncate">
            {apiKey.slice(0, 20)}...
          </div>
        </div>
      </div>
    </motion.div>
  );
}
