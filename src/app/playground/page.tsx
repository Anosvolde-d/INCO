"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap } from "lucide-react";
import ApiPlayground from "@/components/ApiPlayground";
import Cookies from "js-cookie";

export default function PlaygroundPage() {
  const router = useRouter();
  const [models, setModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  useEffect(() => {
    // Fetch Models
    fetch("/v1/models", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setModels(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingModels(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-zinc-300 font-sans">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Header */}
      <header className="z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.03] bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-200">API Playground</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-16 z-10 max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-white mb-2">
              Test Your API
            </h2>
            <p className="text-zinc-400 text-sm">
              Interactive playground with temporary 32k token limit. Test requests with thinking tag parsing and real-time streaming.
            </p>
          </div>

          <div className="bg-[#0f0f0f] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
            {isLoadingModels ? (
              <div className="text-center py-12 text-zinc-500">Loading models...</div>
            ) : (
              <ApiPlayground models={models} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
