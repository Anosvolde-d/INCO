"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Camera, Check, X, Edit2, LogOut, Settings } from "lucide-react";

interface ProfileDropdownProps {
  apiKey: string;
}

export default function ProfileDropdown({ apiKey }: ProfileDropdownProps) {
  const [userName, setUserName] = useState("Anonymous");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [canChangeName, setCanChangeName] = useState(true);
  const [nextChangeDate, setNextChangeDate] = useState<Date | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (apiKey) {
      fetchUserProfile();
    }
  }, [apiKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
        setError("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`/api/profile?apiKey=${apiKey}`);
      const data = await res.json();
      if (data.success) {
        setUserName(data.profile.name || "Anonymous");
        setAvatarUrl(data.profile.avatarUrl || "");
        
        // Check if user can change name
        if (data.profile.lastNameChange) {
          const lastChange = new Date(data.profile.lastNameChange);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          if (lastChange > weekAgo) {
            setCanChangeName(false);
            const nextChange = new Date(lastChange);
            nextChange.setDate(nextChange.getDate() + 7);
            setNextChangeDate(nextChange);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch profile");
    }
  };

  const handleEditName = () => {
    if (!canChangeName) {
      setError(`You can change your name again on ${nextChangeDate?.toLocaleDateString()}`);
      return;
    }
    setTempName(userName);
    setIsEditing(true);
    setError("");
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) {
      setError("Name cannot be empty");
      return;
    }
    
    if (tempName.length > 20) {
      setError("Name must be 20 characters or less");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, name: tempName.trim() })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUserName(tempName.trim());
        setIsEditing(false);
        setCanChangeName(false);
        const nextChange = new Date();
        nextChange.setDate(nextChange.getDate() + 7);
        setNextChangeDate(nextChange);
      } else {
        setError(data.message || "Failed to update name");
      }
    } catch (e) {
      setError("Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

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
          setError("");
        } else {
          setError("Failed to upload avatar");
        }
      } catch (e) {
        setError("Upload failed");
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
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-0.5 hover:scale-110 transition-transform shadow-lg shadow-blue-500/20"
      >
        <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/[0.05]">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-semibold text-white">
                          {getInitials(userName)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <label className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    <Camera className="w-3 h-3 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                        placeholder="Your name"
                        maxLength={20}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveName}
                          disabled={isLoading}
                          className="flex-1 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:scale-105 transition-transform disabled:opacity-50"
                        >
                          {isLoading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setError("");
                          }}
                          className="px-3 py-1.5 bg-white/[0.05] rounded-xl text-xs text-zinc-400 hover:bg-white/[0.1] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-medium text-white">{userName}</h3>
                        <button
                          onClick={handleEditName}
                          className="p-1 text-zinc-500 hover:text-white transition-colors"
                          title={canChangeName ? "Edit name" : "Name change locked"}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">Active User</p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            {/* API Key Info */}
            <div className="p-4 bg-black/40">
              <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold mb-1">Your API Key</div>
              <div className="text-[10px] font-mono text-zinc-500 truncate">
                {apiKey.slice(0, 30)}...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
