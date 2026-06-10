import { useState, useEffect } from "react";
import { Loader2, Save, Moon, MessageSquare, ShieldCheck, Layers } from "lucide-react";
import { gT } from "./i18n";

export function AfkConfigView({ guildId, siteLang, onDirtyChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [config, setConfig] = useState({
    enabled: false,
    abbreviation: "!afk",
    allowedRoles: [], // empty = all
    allowedChannels: [], // empty = all
    reason: ""
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/guilds/${guildId}/afk`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json())
    ]).then(([afkData, structureData]) => {
      if (afkData) setConfig((prev) => ({ ...prev, ...afkData }));
      if (structureData.channels) setChannels(structureData.channels);
      if (structureData.roles) setAllRoles(structureData.roles.filter((r) => r.name !== "@everyone"));
      setLoading(false);
    });
  }, [guildId]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/guilds/${guildId}/afk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    window.dispatchEvent(new CustomEvent("show-toast", {
      detail: { message: siteLang === "ar" ? "تم حفظ إعدادات الـ AFK!" : "AFK settings saved!", type: "success" }
    }));
    if (onDirtyChange) onDirtyChange(false);
    setTimeout(() => setSaving(false), 500);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-black/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center bg-indigo-500/20 rounded-xl border border-indigo-500/20">
            <Moon className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-lg font-black text-white leading-tight">
              {siteLang === "ar" ? "نظام الـ AFK" : "AFK System"}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">
               {siteLang === "ar" ? "إعدادات وضع عدم التواجد (AFK)" : "Away From Keyboard system configuration"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => {
                  setConfig({ ...config, enabled: e.target.checked });
                  if (onDirtyChange) onDirtyChange(true);
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:right-[2px] rtl:after:left-auto after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 relative transition-colors" />
              <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                {siteLang === "ar" ? "تفعيل نظام الـ AFK" : "Enable AFK System"}
              </span>
            </label>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {siteLang === "ar" ? "اختصار تفعيل الـ AFK" : "AFK Trigger Abbreviation"}
              </label>
              <input
                type="text"
                value={config.abbreviation}
                onChange={(e) => {
                  setConfig({ ...config, abbreviation: e.target.value });
                  if (onDirtyChange) onDirtyChange(true);
                }}
                className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {siteLang === "ar" ? "الرتب المسموح لها" : "Allowed Roles"}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1 bg-[#0A0D14] border border-white/10 rounded-xl p-2">
                {allRoles.map((r) => {
                  const isSelected = config.allowedRoles.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        const updated = isSelected ? config.allowedRoles.filter((id) => id !== r.id) : [...config.allowedRoles, r.id];
                        setConfig({ ...config, allowedRoles: updated });
                        if (onDirtyChange) onDirtyChange(true);
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs font-semibold border transition-all text-left ${isSelected ? "bg-indigo-600/10 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/5 text-slate-400"}`}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{siteLang === "ar" ? "*تركها فارغة تعني إتاحة النظام للجميع." : "*Leave empty to allow everyone."}</p>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {siteLang === "ar" ? "الرومات المسموح فيها" : "Allowed Channels"}
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1 bg-[#0A0D14] border border-white/10 rounded-xl p-2">
                {channels.map((ch) => {
                  const isSelected = config.allowedChannels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        const updated = isSelected ? config.allowedChannels.filter((id) => id !== ch.id) : [...config.allowedChannels, ch.id];
                        setConfig({ ...config, allowedChannels: updated });
                        if (onDirtyChange) onDirtyChange(true);
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs font-semibold border transition-all text-left ${isSelected ? "bg-indigo-600/10 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/5 text-slate-400"}`}
                    >
                      #{ch.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{siteLang === "ar" ? "*تركها فارغة تعني إتاحة النظام في كل الرومات." : "*Leave empty to allow in all channels."}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl font-black shadow-lg transition-all text-sm uppercase tracking-wide"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? (siteLang === "ar" ? "جاري الحفظ..." : "Saving...") : (siteLang === "ar" ? "حفظ الإعدادات" : "Save Settings")}
          </button>
        </div>
      </div>
    </div>
  );
}
