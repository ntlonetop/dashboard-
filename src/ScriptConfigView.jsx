import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { gT } from "./i18n";
import { Search, Hash, ShieldCheck, Zap, Terminal, Star } from "lucide-react";
export function ScriptConfigView({ guildId, siteLang }) {
  const [config, setConfig] = useState({});
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState(null);
  const fetchData = async () => {
    try {
      const [cRes, chRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/config`),
        fetch(`/api/guild/channels?guildId=${guildId}`)
      ]);
      const cData = await cRes.json();
      const chData = await chRes.json();
      setConfig(cData);
      setChannels(chData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [guildId]);
  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: gT[siteLang].saveSuccess, type: "success" } }));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };
  const handleRedeem = async () => {
    if (!redeemCode) return;
    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode })
      });
      const data = await res.json();
      if (data.success) {
        setRedeemMsg({ text: data.message, type: "success" });
        setRedeemCode("");
        fetchData();
      } else {
        setRedeemMsg({ text: data.message, type: "error" });
      }
    } catch (e) {
      setRedeemMsg({ text: "Error", type: "error" });
    } finally {
      setRedeeming(false);
    }
  };
  if (loading) return <div className="flex h-48 items-center justify-center"><Zap className="animate-spin text-indigo-500" /></div>;
  const isPremium = config.premiumExpiry && config.premiumExpiry > Date.now();
  const sc = config.scriptSearch || { enabled: false, prefix: "!", allowedChannels: [] };
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Search className="text-indigo-400" />
            {gT[siteLang].scriptSearchTitle}
          </h2>
          <p className="text-sm text-slate-400">{gT[siteLang].scriptSearchDesc}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
    onClick={() => setConfig({ ...config, scriptSearch: { ...sc, enabled: !sc.enabled } })}
    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sc.enabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-white/5"}`}
  >
            {sc.enabled ? gT[siteLang].enabled : gT[siteLang].disabled}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#10141e]/50 border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-300 mb-2">
            <Terminal size={18} />
            <h3 className="font-bold">{gT[siteLang].scriptPrefix}</h3>
          </div>
          <div className="relative group">
            <input
    type="text"
    value={sc.prefix || ""}
    onChange={(e) => setConfig({ ...config, scriptSearch: { ...sc, prefix: e.target.value } })}
    placeholder="e.g. !"
    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all font-mono"
  />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-40">
              <span className="text-[10px] font-bold">{gT[siteLang].prefixLabel}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">{gT[siteLang].exampleLabel}: {sc.prefix || "!"}script [map-name]</p>
        </div>

        <div className="bg-[#10141e]/50 border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-300 mb-2">
            <Hash size={18} />
            <h3 className="font-bold">{gT[siteLang].allowedScriptChannels}</h3>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
            {channels.map((ch) => <button
    key={ch.id}
    onClick={() => {
      const current = sc.allowedChannels || [];
      const next = current.includes(ch.id) ? current.filter((id) => id !== ch.id) : [...current, ch.id];
      setConfig({ ...config, scriptSearch: { ...sc, allowedChannels: next } });
    }}
    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${sc.allowedChannels?.includes(ch.id) ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-black/20 border-white/5 text-slate-400 hover:border-white/20"}`}
  >
                #{ch.name}
              </button>)}
          </div>
        </div>
      </div>

      {
    /* Premium Redemtion Table for Guild */
  }
      <div className="bg-gradient-to-br from-[#10141e] to-[#0a0d14] border border-indigo-500/10 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
          <ShieldCheck size={120} className="text-indigo-500" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Zap className={isPremium ? "text-amber-400" : "text-slate-400"} fill={isPremium ? "currentColor" : "none"} size={20} />
                 {gT[siteLang].premiumScriptSearch}
               </h3>
               {isPremium ? <div className="space-y-1">
                   <p className="text-xs text-emerald-400 font-bold">{gT[siteLang].guildPremiumActive}</p>
                   <p className="text-xl font-black text-white tracking-tighter tabular-nums">
                     {new Date(config.premiumExpiry).toLocaleDateString()} at {new Date(config.premiumExpiry).toLocaleTimeString()}
                   </p>
                 </div> : <p className="text-sm text-slate-400">{gT[siteLang].guildNotPremium}</p>}
            </div>
            
            <div className="shrink-0 space-y-4 min-w-[280px]">
              <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
                 <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{gT[siteLang].redeemGuildPremium}</label>
                 <div className="flex gap-2">
                   <input
    type="text"
    value={redeemCode}
    onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
    placeholder={gT[siteLang].enterGuildCode}
    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-indigo-500"
  />
                   <button
    onClick={handleRedeem}
    disabled={redeeming || !redeemCode}
    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0"
  >
                     {redeeming ? <Zap className="animate-spin" size={14} /> : gT[siteLang].redeemBtn}
                   </button>
                 </div>
                 {redeemMsg && <p className={`text-[10px] font-bold ${redeemMsg.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>{redeemMsg.text}</p>}
              </div>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10">
                <div className="flex items-center gap-2 text-indigo-300 mb-2">
                  <Terminal size={14} />
                  <span className="text-xs font-bold">{gT[siteLang].searchForMap}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {gT[siteLang].basicSearchDesc}
                </p>
             </div>
             <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-300 mb-2">
                  <Star size={14} />
                  <span className="text-xs font-bold">{gT[siteLang].searchForScript}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {gT[siteLang].advancedSearchDesc.replace("[prefix]", sc.prefix || "!")}
                </p>
             </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex justify-end">
        <button
    onClick={handleSave}
    disabled={saving}
    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
  >
          {saving ? gT[siteLang].saving : gT[siteLang].saveBtn}
        </button>
      </div>
    </motion.div>;
}
