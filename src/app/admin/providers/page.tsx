"use client";

import { useState, useEffect } from "react";
import { Server, Plus, Trash2, Edit2, Save, X, Loader2, Check, ChevronRight, Eye, EyeOff, Upload, Code, Activity, BookOpen, Sliders } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEncrypted: string | null;
  customHeaders: any;
  models: Model[];
}

interface Model {
  id: string;
  displayName: string;
  providerModelId: string;
  isPublic: boolean;
  supportsVision: boolean;
  supportsSearch: boolean;
  tokenLimit: number;
  promptProfile: any;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editProviderId, setEditProviderId] = useState<string | null>(null);
  const [editModelId, setEditModelId] = useState<string | null>(null);
  const [showAddModel, setShowAddModel] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState<string | null>(null);
  const [showPresetImport, setShowPresetImport] = useState(false);
  const [presetJson, setPresetJson] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Add Provider form
  const [provName, setProvName] = useState("");
  const [provUrl, setProvUrl] = useState("");
  const [provKey, setProvKey] = useState("");
  const [provHeaders, setProvHeaders] = useState("");

  // {editModelId ? "Update Model" : "Add Model"} form
  const [modDisplayName, setModDisplayName] = useState("");
  const [modProviderModelId, setModProviderModelId] = useState("");
  const [modVision, setModVision] = useState(false);
  const [modSearch, setModSearch] = useState(false);
  const [modTokenLimit, setModTokenLimit] = useState(128000);

  // Prompt Profile editor
  const [promptData, setPromptData] = useState({
    mainPrompt: "", auxiliaryPrompt: "", postHistory: "", enhanceDefinitions: "",
    contextTemplate: "", storyString: "", instructWrapper: "",
    injectionPosition: "before_history", injectionDepth: 0,
    positivePrompt: "", negativePrompt: "",
    guidanceJson: { temperature: 0.7, top_p: 1, top_k: 0, min_p: 0, repetition_penalty: 1 },
    prefill: ""
  });

  useEffect(() => { fetchProviders(); }, []);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/providers", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setProviders(data.providers);
    } catch (e) {} finally { setIsLoading(false); }
  };

  const flash = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(""), 3000); };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const method = editProviderId ? "PATCH" : "POST";
      const bodyPayload: any = {
        name: provName, baseUrl: provUrl,
        customHeaders: provHeaders ? JSON.parse(provHeaders) : {}
      };
      if (provKey) bodyPayload.apiKeyEncrypted = provKey;
      if (editProviderId) bodyPayload.id = editProviderId;
      
      const res = await fetch("/api/admin/providers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      if (!res.ok) throw new Error("Failed");
      setShowAddProvider(false);
      setProvName(""); setProvUrl(""); setProvKey(""); setProvHeaders("");
      fetchProviders();
      flash(editProviderId ? "Provider updated" : "Provider created");
      setEditProviderId(null);
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm("Delete this provider and all its models?")) return;
    await fetch(`/api/admin/providers?id=${id}`, { method: "DELETE" });
    fetchProviders();
    flash("Provider deleted");
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddModel) return;
    setIsSaving(true);
    try {
      const method = editModelId ? "PATCH" : "POST";
      const res = await fetch("/api/admin/models", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editModelId || undefined,
          providerId: showAddModel, displayName: modDisplayName, providerModelId: modProviderModelId,
          supportsVision: modVision, supportsSearch: modSearch, tokenLimit: modTokenLimit
        })
      });
      if (!res.ok) throw new Error("Failed");
      setShowAddModel(null);
      setModDisplayName(""); setModProviderModelId(""); setModVision(false); setModSearch(false); setModTokenLimit(128000);
      fetchProviders();
      flash(editModelId ? "Model updated" : "Model created");
      setEditModelId(null);
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm("Delete this model?")) return;
    await fetch(`/api/admin/models?id=${id}`, { method: "DELETE" });
    fetchProviders();
    flash("Model deleted");
  };

  const handleTogglePublic = async (model: Model) => {
    await fetch("/api/admin/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: model.displayName, isPublic: !model.isPublic })
    });
    fetchProviders();
  };

  const loadPromptProfile = async (modelId: string) => {
    setShowPromptEditor(modelId);
    try {
      const res = await fetch(`/api/admin/prompts?modelId=${modelId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.profile) {
        setPromptData({
          mainPrompt: data.profile.mainPrompt || "",
          auxiliaryPrompt: data.profile.auxiliaryPrompt || "",
          postHistory: data.profile.postHistory || "",
          enhanceDefinitions: data.profile.enhanceDefinitions || "",
          contextTemplate: data.profile.contextTemplate || "",
          storyString: data.profile.storyString || "",
          instructWrapper: data.profile.instructWrapper || "",
          injectionPosition: data.profile.injectionPosition || "before_history",
          injectionDepth: data.profile.injectionDepth || 0,
          positivePrompt: data.profile.positivePrompt || "",
          negativePrompt: data.profile.negativePrompt || "",
          guidanceJson: data.profile.guidanceJson || { temperature: 0.7, top_p: 1, top_k: 0, min_p: 0, repetition_penalty: 1 },
          prefill: data.profile.prefill || ""
        });
      } else {
        setPromptData({
          mainPrompt: "", auxiliaryPrompt: "", postHistory: "", enhanceDefinitions: "",
          contextTemplate: "", storyString: "", instructWrapper: "",
          injectionPosition: "before_history", injectionDepth: 0,
          positivePrompt: "", negativePrompt: "",
          guidanceJson: { temperature: 0.7, top_p: 1, top_k: 0, min_p: 0, repetition_penalty: 1 },
          prefill: ""
        });
      }
    } catch (e) {}
  };

  
  const openEditProvider = (p: any) => {
    setEditProviderId(p.id);
    setProvName(p.name);
    setProvUrl(p.baseUrl);
    setProvKey(""); // hide key for security, only update if changed
    setProvHeaders(JSON.stringify(p.customHeaders || {}));
    setShowAddProvider(true);
  };

  const openEditModel = (m: any, pId: string) => {
    setEditModelId(m.displayName);
    setModDisplayName(m.displayName);
    setModProviderModelId(m.providerModelId);
    setModVision(m.supportsVision);
    setModSearch(m.supportsSearch);
    setModTokenLimit(m.tokenLimit);
    setShowAddModel(pId);
  };

  const handleSavePrompt = async () => {
    if (!showPromptEditor) return;
    setIsSaving(true);
    
    const formattedGuidance: any = { ...promptData.guidanceJson };
    // Values are now guaranteed to be floats by the GuidanceSlider, no need to parse
    
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: showPromptEditor, ...promptData, guidanceJson: formattedGuidance })
      });
      if (!res.ok) throw new Error("Failed");
      flash("Prompt profile saved");
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  const handleImportPreset = () => {
    try {
      const parsed = JSON.parse(presetJson);
      setPromptData({
        mainPrompt: parsed.mainPrompt || parsed.system_prompt || parsed.main || promptData.mainPrompt,
        auxiliaryPrompt: parsed.auxiliaryPrompt || parsed.auxiliary || promptData.auxiliaryPrompt,
        postHistory: parsed.postHistory || parsed.post_history_instructions || promptData.postHistory,
        enhanceDefinitions: parsed.enhanceDefinitions || parsed.enhance_definitions || promptData.enhanceDefinitions,
        contextTemplate: parsed.contextTemplate || parsed.context_template || promptData.contextTemplate,
        storyString: parsed.storyString || parsed.story_string || promptData.storyString,
        instructWrapper: parsed.instructWrapper || parsed.instruct_wrapper || promptData.instructWrapper,
        injectionPosition: parsed.injectionPosition || parsed.injection_position || promptData.injectionPosition,
        injectionDepth: parsed.injectionDepth || parsed.injection_depth || promptData.injectionDepth,
        positivePrompt: parsed.positivePrompt || parsed.positive || promptData.positivePrompt,
        negativePrompt: parsed.negativePrompt || parsed.negative || promptData.negativePrompt,
        guidanceJson: parsed.guidanceJson || parsed.guidance || parsed.sampling || promptData.guidanceJson,
        prefill: parsed.prefill || parsed.reply_prefix || promptData.prefill
      });
      setShowPresetImport(false);
      setPresetJson("");
      flash("Preset imported into editor");
    } catch (e) {
      alert("Invalid JSON preset format");
    }
  };

  const GuidanceSlider = ({ label, value, onChange, min, max, step }: any) => {
    const [localValue, setLocalValue] = useState<string>(value.toString());

    // Sync local string when parent value changes externally (e.g. from preset import)
    useEffect(() => {
        if (parseFloat(localValue) !== value && localValue !== value.toString() + ".") {
            setLocalValue(value.toString());
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        
        // Prevent update if it's just trailing dot
        if (val.endsWith('.')) return;

        const parsed = parseFloat(val);
        if (!isNaN(parsed)) {
            onChange(parsed);
        }
    };

    const handleBlur = () => {
        const parsed = parseFloat(localValue);
        if (isNaN(parsed)) {
            setLocalValue(min.toString());
            onChange(min);
        } else {
            // Keep bounds
            let finalVal = parsed;
            if (finalVal < min) finalVal = min;
            if (finalVal > max) finalVal = max;
            setLocalValue(finalVal.toString());
            onChange(finalVal);
        }
    };

    return (
        <div className="flex items-center gap-4 bg-[#111] p-3 rounded-xl border border-white/[0.03] hover:border-white/[0.1] transition-colors focus-within:border-emerald-500/50">
            <span className="text-[10px] text-zinc-400 w-32 shrink-0 uppercase tracking-widest truncate">{label}</span>
            <input 
                type="range" 
                min={min} 
                max={max} 
                step={step} 
                value={value}
                onChange={(e) => {
                    const parsed = parseFloat(e.target.value) || 0;
                    setLocalValue(parsed.toString());
                    onChange(parsed);
                }}
                className="flex-1 accent-emerald-500 bg-zinc-800 rounded-lg h-1.5 cursor-pointer" 
            />
            <input 
                type="text" 
                value={localValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className="w-16 bg-black border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 font-mono text-right transition-colors" 
            />
        </div>
    );
};

  const FieldBlock = ({ label, value, onChange, rows = 3, icon: Icon }: { label: string; value: string; onChange: (v: string) => void; rows?: number; icon?: any }) => (
    <div className="group">
      <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-2 flex items-center gap-1.5 group-focus-within:text-emerald-400 transition-colors">
        {Icon && <Icon className="w-3 h-3 opacity-60" />} {label}
      </label>
      <div className="relative">
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
            className="w-full bg-[#050505] border border-white/[0.05] rounded-xl px-4 py-3 text-xs leading-relaxed text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none shadow-inner" />
          <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-white/[0.02]"></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {saveMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-2 rounded-lg">
          <Check className="w-4 h-4 inline mr-2" />{saveMsg}
        </div>
      )}

      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-medium tracking-tight text-white">Providers & Models</h2>
          <p className="text-zinc-500 mt-2 text-sm">Manage upstream providers, model routing, and prompt profiles.</p>
        </div>
        <button onClick={() => setShowAddProvider(true)}
          className="bg-white text-black hover:bg-zinc-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </header>

      {/* Add Provider Modal */}
      <AnimatePresence>
      {showAddProvider && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <button onClick={() => { setShowAddProvider(false); setEditProviderId(null); setProvName(""); setProvUrl(""); setProvKey(""); setProvHeaders(""); }} className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-medium text-white mb-4">Add Provider</h3>
            <form onSubmit={handleAddProvider} className="space-y-4">
              <div><label className="text-xs text-zinc-400 mb-1 block">Name</label>
                <input type="text" value={provName} onChange={(e) => setProvName(e.target.value)} required
                  placeholder="OpenAI" className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2]" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Base URL</label>
                <input type="url" value={provUrl} onChange={(e) => setProvUrl(e.target.value)} required
                  placeholder="https://api.openai.com/v1" className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2]" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">API Key</label>
                <input type="password" value={provKey} onChange={(e) => setProvKey(e.target.value)}
                  placeholder="sk-..." className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2]" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Custom Headers (JSON, optional)</label>
                <input type="text" value={provHeaders} onChange={(e) => setProvHeaders(e.target.value)}
                  placeholder='{"X-Custom": "value"}' className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] font-mono" /></div>
              <button type="submit" disabled={isSaving || !provName || !provUrl}
                className="w-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 font-medium py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editProviderId ? "Update Provider" : "Create Provider"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Add Model Modal */}
      <AnimatePresence>
      {showAddModel && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <button onClick={() => { setShowAddModel(null); setEditModelId(null); setModDisplayName(""); setModProviderModelId(""); setModVision(false); setModSearch(false); setModTokenLimit(128000); }} className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-medium text-white mb-4">Add Model</h3>
            <form onSubmit={handleAddModel} className="space-y-4">
              <div><label className="text-xs text-zinc-400 mb-1 block">Display Name</label>
                <input type="text" value={modDisplayName} onChange={(e) => setModDisplayName(e.target.value)} required
                  placeholder="INCO Narrator" className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2]" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Provider Model ID</label>
                <input type="text" value={modProviderModelId} onChange={(e) => setModProviderModelId(e.target.value)} required
                  placeholder="gpt-4o-mini" className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2] font-mono" /></div>
              <div><label className="text-xs text-zinc-400 mb-1 block">Token Limit</label>
                <input type="number" value={modTokenLimit} onChange={(e) => setModTokenLimit(parseInt(e.target.value))}
                  className="w-full bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/[0.2]" /></div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input type="checkbox" checked={modVision} onChange={(e) => setModVision(e.target.checked)}
                    className="rounded border-zinc-700 bg-black" /> Vision
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input type="checkbox" checked={modSearch} onChange={(e) => setModSearch(e.target.checked)}
                    className="rounded border-zinc-700 bg-black" /> Web Search
                </label>
              </div>
              <button type="submit" disabled={isSaving || !modDisplayName || !modProviderModelId}
                className="w-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 font-medium py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Model
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Prompt Profile Editor Modal */}
      <AnimatePresence>
      {showPromptEditor && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-6 max-w-4xl w-full shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 sticky top-0 bg-[#0a0a0a] pb-4 z-10">
              <div>
                <h3 className="text-lg font-medium text-white">Prompt Profile Editor</h3>
                <p className="text-xs text-emerald-400/80 mt-1 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Context Pipeline Configuration</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPresetImport(true)}
                  className="px-3 py-1.5 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-white/[0.08] rounded-lg text-xs flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Import Preset
                </button>
                <button onClick={handleSavePrompt} disabled={isSaving}
                  className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </button>
                <button onClick={() => setShowPromptEditor(null)} className="p-1.5 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Preset Import Sub-Modal */}
            {showPresetImport && (
              <div className="mb-6 bg-zinc-900 border border-white/[0.08] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2"><Code className="w-4 h-4" /> Import JSON Preset</h4>
                  <button onClick={() => setShowPresetImport(false)} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                </div>
                <textarea value={presetJson} onChange={(e) => setPresetJson(e.target.value)}
                  placeholder='Paste SillyTavern/Agnai/custom prompt preset JSON...'
                  className="w-full h-40 bg-black border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-white/[0.2] resize-none" />
                <button onClick={handleImportPreset} disabled={!presetJson.trim()}
                  className="bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 font-medium px-4 py-2 text-xs rounded-lg flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" /> Apply Preset
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <FieldBlock icon={Server} label="1. Main Prompt (System Profile)" value={promptData.mainPrompt} onChange={(v) => setPromptData({...promptData, mainPrompt: v})} rows={6} />
                  <FieldBlock icon={Code} label="2. Auxiliary Directives (Secondary System)" value={promptData.auxiliaryPrompt} onChange={(v) => setPromptData({...promptData, auxiliaryPrompt: v})} rows={4} />
                  <FieldBlock icon={BookOpen} label="3. Enhance Definitions" value={promptData.enhanceDefinitions} onChange={(v) => setPromptData({...promptData, enhanceDefinitions: v})} rows={3} />
                  <FieldBlock icon={Activity} label="4. Context Template (SillyTavern)" value={promptData.contextTemplate} onChange={(v) => setPromptData({...promptData, contextTemplate: v})} rows={3} />
                  <FieldBlock icon={Code} label="5. Instruct Mode Wrapper" value={promptData.instructWrapper} onChange={(v) => setPromptData({...promptData, instructWrapper: v})} rows={2} />
              </div>
              
              <div className="space-y-4">
                  <FieldBlock icon={Activity} label="6. Post-History Context" value={promptData.postHistory} onChange={(v) => setPromptData({...promptData, postHistory: v})} rows={4} />
                  <FieldBlock icon={Check} label="7. Positive Rules (Enforced Affirmations)" value={promptData.positivePrompt} onChange={(v) => setPromptData({...promptData, positivePrompt: v})} rows={3} />
                  <FieldBlock icon={X} label="8. Negative Rules (Avoidance)" value={promptData.negativePrompt} onChange={(v) => setPromptData({...promptData, negativePrompt: v})} rows={3} />
                  <FieldBlock icon={Edit2} label="9. Assistant Prefill (Reply Start)" value={promptData.prefill} onChange={(v) => setPromptData({...promptData, prefill: v})} rows={2} />
                  <FieldBlock icon={Code} label="10. Story String Wrapper" value={promptData.storyString} onChange={(v) => setPromptData({...promptData, storyString: v})} rows={2} />
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 mt-2 border-t border-white/[0.05]">
                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-2 flex items-center gap-1.5 transition-colors">
                    11. Injection Position
                  </label>
                  <select value={promptData.injectionPosition} onChange={(e) => setPromptData({...promptData, injectionPosition: e.target.value})}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-xl px-4 py-3 text-xs leading-relaxed text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-inner">
                    <option value="before_history">Before History</option>
                    <option value="after_main_prompt">After Main Prompt</option>
                    <option value="after_history">After History</option>
                    <option value="before_last_user">Before Last User Message</option>
                  </select>
                </div>
                <div className="group">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-2 flex items-center gap-1.5 transition-colors">
                    12. Injection Depth
                  </label>
                  <input type="number" value={promptData.injectionDepth} onChange={(e) => setPromptData({...promptData, injectionDepth: parseInt(e.target.value) || 0})}
                    className="w-full bg-[#050505] border border-white/[0.05] rounded-xl px-4 py-3 text-xs leading-relaxed text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-inner" />
                </div>
              </div>
              
              <div className="lg:col-span-2 pt-4 mt-2 border-t border-white/[0.05]">
                <label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-4 block flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> 13. Guidance & Sampling Engine
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.keys(promptData.guidanceJson).map((key) => {
                    const val = (promptData.guidanceJson as any)[key];
                    const min = key === 'repetition_penalty' ? 0.0 : 0;
                    const max = key === 'temperature' ? 2 : key === 'top_k' ? 100 : key === 'repetition_penalty' ? 2 : 1;
                    const step = key === 'top_k' ? 1 : 0.01;
                    return (
                        <GuidanceSlider 
                            key={key}
                            label={key.replace('_', ' ')}
                            value={typeof val === 'number' ? val : parseFloat(val) || 0}
                            min={min}
                            max={max}
                            step={step}
                            onChange={(newVal: number) => setPromptData({...promptData, guidanceJson: {...promptData.guidanceJson, [key]: newVal}})}
                        />
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Provider List */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 bg-[#0a0a0a] border border-dashed border-white/[0.05] rounded-2xl">
          <Server className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">No providers configured yet.</p>
          <p className="text-xs text-zinc-600 mt-1">Click "Add Provider" to get started.</p>
        </div>
      ) : (
        providers.map((provider) => (
          <div key={provider.id} className="bg-[#0a0a0a] border border-white/[0.05] rounded-2xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-white/[0.03]">
              <div>
                <h3 className="text-base font-medium text-white">{provider.name}</h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{provider.baseUrl}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddModel(provider.id)}
                  className="px-3 py-1.5 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-white/[0.08] rounded-lg text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Model
                </button>
                <button onClick={() => openEditProvider(provider)}
                  className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteProvider(provider.id)}
                  className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {provider.models.length === 0 ? (
              <div className="p-6 text-center text-zinc-600 text-xs">No models configured for this provider.</div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {provider.models.map((model) => (
                  <div key={model.displayName} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                    <div>
                      <div className="text-sm text-zinc-200">{model.displayName}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{model.providerModelId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {model.supportsVision && <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded border border-white/[0.05]">Vision</span>}
                      {model.supportsSearch && <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded border border-white/[0.05]">Search</span>}
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-zinc-900 text-zinc-500 rounded border border-white/[0.05]">{Math.round(model.tokenLimit / 1000)}k</span>
                      <button onClick={() => handleTogglePublic(model)} title={model.isPublic ? "Public" : "Hidden"}
                        className={`p-1.5 rounded-lg transition-colors ${model.isPublic ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-600 hover:bg-white/[0.05]'}`}>
                        {model.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => loadPromptProfile(model.displayName)}
                        className="px-2.5 py-1 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/[0.05] rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1">
                        Prompts <ChevronRight className="w-3 h-3" />
                      </button>
                      <button onClick={() => openEditModel(model, provider.id)}
                        className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteModel(model.displayName)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
