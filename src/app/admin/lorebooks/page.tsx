"use client";

import { useState, useRef } from "react";
import { BookOpen, Plus, Upload, Code, FileJson, Loader2, Check, X } from "lucide-react";

export default function LorebooksPage() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMethod, setImportMethod] = useState<"file" | "raw">("file");
  const [rawJson, setRawJson] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        setRawJson(content);
        await processImport(content);
      } catch (error) {
        setImportError("Failed to read file");
      }
    };
    reader.readAsText(file);
  };

  const processImport = async (jsonContent: string) => {
    setIsImporting(true);
    setImportError("");
    setImportSuccess(false);

    try {
      const parsed = JSON.parse(jsonContent);
      
      // Send to backend for processing
      const response = await fetch("/api/admin/lorebooks/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsed }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }

      setImportSuccess(true);
      setTimeout(() => {
        setShowImportModal(false);
        setRawJson("");
        setImportSuccess(false);
      }, 2000);
    } catch (error: any) {
      setImportError(error.message || "Invalid JSON format");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRawImport = () => {
    processImport(rawJson);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-medium tracking-tight text-white">Lorebooks</h2>
          <p className="text-zinc-500 mt-2 text-sm">Manage context injection and world-building data.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowImportModal(true)}
            className="bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border border-white/[0.08] font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button className="bg-white text-black hover:bg-zinc-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Lorebook
          </button>
        </div>
      </header>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative">
            <button 
              onClick={() => {
                setShowImportModal(false);
                setRawJson("");
                setImportError("");
                setImportSuccess(false);
              }}
              className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
              <div className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-4">
                <FileJson className="w-5 h-5 text-zinc-400" />
              </div>
              <h2 className="text-lg font-medium text-white">Import Lorebook</h2>
              <p className="text-zinc-500 text-xs mt-1">Upload a JSON file or paste raw lorebook data.</p>
            </div>

            {/* Method Selector */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setImportMethod("file")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  importMethod === "file"
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.05]"
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload File
              </button>
              <button
                onClick={() => setImportMethod("raw")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  importMethod === "raw"
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.05]"
                }`}
              >
                <Code className="w-4 h-4 inline mr-2" />
                Paste JSON
              </button>
            </div>

            {/* File Upload */}
            {importMethod === "file" && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-zinc-900 border border-white/[0.08] border-dashed rounded-xl p-8 hover:border-white/[0.15] transition-colors flex flex-col items-center justify-center gap-3"
                >
                  <FileJson className="w-8 h-8 text-zinc-500" />
                  <div className="text-sm text-zinc-400">
                    Click to select a JSON file
                  </div>
                  <div className="text-xs text-zinc-600">
                    Supports SillyTavern, Agnai, and custom formats
                  </div>
                </button>
              </div>
            )}

            {/* Raw JSON Input */}
            {importMethod === "raw" && (
              <div className="space-y-4">
                <textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  placeholder='{"name": "My Lorebook", "entries": [...]}'
                  className="w-full h-64 bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono focus:outline-none focus:border-white/[0.2] transition-colors placeholder:text-zinc-700 resize-none"
                />
                <button
                  onClick={handleRawImport}
                  disabled={!rawJson.trim() || isImporting}
                  className="w-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 font-medium py-2.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : importSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      Imported Successfully
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Lorebook
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Error Display */}
            {importError && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs">
                {importError}
              </div>
            )}

            {/* Success Display */}
            {importSuccess && (
              <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                Lorebook imported successfully!
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-[#0a0a0a]/50 border border-white/[0.05] rounded-2xl p-10 flex flex-col items-center justify-center text-zinc-500 border-dashed min-h-[400px]">
        <BookOpen className="w-10 h-10 mb-4 opacity-50" />
        <p className="text-sm">No lorebooks configured yet.</p>
        <p className="text-xs mt-2 opacity-60">Click "Import" or "Create Lorebook" to get started.</p>
      </div>
    </div>
  );
}
