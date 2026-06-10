import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { gT } from "./i18n";
import { PartyPopper, Terminal, Zap } from "lucide-react";
export function EventsConfigView({ guildId, siteLang }) {
  const [config, setConfig] = useState({});
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fetchData = async () => {
    try {
      const [confRes, structRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/config`),
        fetch(`/api/guilds/${guildId}/roles-channels`)
      ]);
      const confData = await confRes.json();
      const structData = await structRes.json();
      setConfig(confData);
      if (structData.channels) setChannels(structData.channels);
      if (structData.roles) setRoles(structData.roles);
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
      window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: siteLang === "ar" ? "تم حفظ الإعدادات بنجاح!" : "Settings saved successfully!", type: "success" } }));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <div className="flex h-48 items-center justify-center"><Zap className="animate-spin text-indigo-500" /></div>;
  const ev = config.events || { enabled: false, prefix: "!", allowedChannels: [], allowedRoles: [] };
  const allowedChannels = ev.allowedChannels || [];
  const allowedRoles = ev.allowedRoles || [];
  const toggleChannel = (id) => {
    const newChannels = allowedChannels.includes(id) ? allowedChannels.filter((c) => c !== id) : [...allowedChannels, id];
    setConfig({ ...config, events: { ...ev, allowedChannels: newChannels } });
  };
  const toggleRole = (id) => {
    const newRoles = allowedRoles.includes(id) ? allowedRoles.filter((r) => r !== id) : [...allowedRoles, id];
    setConfig({ ...config, events: { ...ev, allowedRoles: newRoles } });
  };
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PartyPopper className="text-indigo-400" />
            {gT[siteLang].eventsTitle}
          </h2>
          <p className="text-sm text-slate-400">{gT[siteLang].eventsDesc}</p>
        </div>
        <button
    onClick={() => setConfig({ ...config, events: { ...ev, enabled: !ev.enabled } })}
    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${ev.enabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-white/5"}`}
  >
          {ev.enabled ? siteLang === "ar" ? "مفعل" : "Enabled" : siteLang === "ar" ? "معطل" : "Disabled"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {
    /* Prefix Section */
  }
        <div className="bg-[#10141e]/50 border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-300 mb-2">
            <Terminal size={18} />
            <h3 className="font-bold">{gT[siteLang].eventPrefix}</h3>
          </div>
          <div className="relative group">
            <input
    type="text"
    value={ev.prefix || ""}
    onChange={(e) => setConfig({ ...config, events: { ...ev, prefix: e.target.value } })}
    placeholder="e.g. !"
    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-all font-mono"
  />
          </div>
          <p className="text-[10px] text-slate-500">Example: {ev.prefix || "!"}replica or {ev.prefix || "!"}ريبلكا</p>
        </div>

        {
    /* Channels Section */
  }
        <div className="bg-[#10141e]/50 border border-white/5 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-indigo-300 flex items-center gap-2">
            <Zap size={18} />
            {gT[siteLang].allowedChs}
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10">
            {channels.map((c) => <button
    key={c.id}
    onClick={() => toggleChannel(c.id)}
    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${allowedChannels.includes(c.id) ? "bg-indigo-500/10 border-indigo-500 text-indigo-300" : "bg-black/20 border-white/5 text-slate-500 hover:border-white/20"}`}
  >
                <span># {c.name}</span>
                {allowedChannels.includes(c.id) && <motion.div layoutId="check-ch" className="w-2 h-2 bg-indigo-500 rounded-full" />}
              </button>)}
          </div>
        </div>

        {
    /* Roles Section */
  }
        <div className="bg-[#10141e]/50 border border-white/5 rounded-2xl p-6 space-y-4 md:col-span-2">
          <h3 className="font-bold text-indigo-300 flex items-center gap-2">
            <PartyPopper size={18} />
            {gT[siteLang].allowedRoles}
          </h3>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => <button
    key={r.id}
    onClick={() => toggleRole(r.id)}
    className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center gap-2 ${allowedRoles.includes(r.id) ? "bg-indigo-500 text-white border-indigo-400" : "bg-black/20 border-white/5 text-slate-500 hover:border-white/20"}`}
    style={{ color: allowedRoles.includes(r.id) ? "white" : r.color === "#000000" ? "#64748b" : r.color }}
  >
                <div
    className="w-2 h-2 rounded-full"
    style={{ backgroundColor: r.color === "#000000" ? "#475569" : r.color }}
  />
                {r.name}
              </button>)}
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
