import { useState, useEffect } from "react";
import { Loader2, Save, BookOpen, Hash } from "lucide-react";
import { gT } from "./i18n";

export function AzkarConfigView({ guildId, siteLang, onDirtyChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [config, setConfig] = useState({
    enabled: false,
    channelId: "",
    mentionType: "none",
    mentionRoleId: "",
    intervalMinutes: 15
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/guilds/${guildId}/azkar`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json())
    ]).then(([azkarData, structureData]) => {
      if (azkarData && !azkarData.error) {
        setConfig((prev) => ({
          ...prev,
          enabled: azkarData.enabled ?? false,
          channelId: azkarData.channelId ?? "",
          mentionType: azkarData.mentionType ?? "none",
          mentionRoleId: azkarData.mentionRoleId ?? "",
          intervalMinutes: azkarData.intervalMinutes ?? 15
        }));
      }
      if (structureData.channels) setChannels(structureData.channels);
      if (structureData.roles) setRoles(structureData.roles);
      setLoading(false);
    });
  }, [guildId]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/guilds/${guildId}/azkar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    window.dispatchEvent(new CustomEvent("show-toast", {
      detail: { message: siteLang === "ar" ? "تم حفظ إعدادات الأذكار!" : "Azkar settings saved!", type: "success" }
    }));
    if (onDirtyChange) onDirtyChange(false);
    setTimeout(() => setSaving(false), 500);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-black/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/20 rounded-xl border border-emerald-500/20">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-lg font-black text-white leading-tight">
              {siteLang === "ar" ? "نظام الأذكار" : "Azkar System"}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">
               {siteLang === "ar" ? "إعدادات نظام الأذكار التلقائي" : "Automatic Azkar system configuration"}
            </p>
          </div>
        </div>

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
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:right-[2px] rtl:after:left-auto after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative transition-colors" />
              <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                {siteLang === "ar" ? "تفعيل نظام الأذكار" : "Enable Azkar System"}
              </span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {siteLang === "ar" ? "روم الأذكار" : "Azkar Channel"}
                </label>
                <select
                  value={config.channelId}
                  onChange={(e) => {
                    setConfig({ ...config, channelId: e.target.value });
                    if (onDirtyChange) onDirtyChange(true);
                  }}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">{siteLang === "ar" ? "اختر روم..." : "Select channel..."}</option>
                  {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {siteLang === "ar" ? "وقت إرسال الذكر (كل كم دقيقة)" : "Send Interval"}
                </label>
                <select
                  value={config.intervalMinutes}
                  onChange={(e) => {
                    setConfig({ ...config, intervalMinutes: parseInt(e.target.value) || 15 });
                    if (onDirtyChange) onDirtyChange(true);
                  }}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value={1}>{siteLang === "ar" ? "كل دقيقة" : "Every 1 minute"}</option>
                  <option value={3}>{siteLang === "ar" ? "كل 3 دقائق" : "Every 3 minutes"}</option>
                  <option value={5}>{siteLang === "ar" ? "كل 5 دقائق" : "Every 5 minutes"}</option>
                  <option value={10}>{siteLang === "ar" ? "كل 10 دقائق" : "Every 10 minutes"}</option>
                  <option value={15}>{siteLang === "ar" ? "كل 15 دقيقة" : "Every 15 minutes"}</option>
                  <option value={30}>{siteLang === "ar" ? "كل 30 دقيقة" : "Every 30 minutes"}</option>
                  <option value={60}>{siteLang === "ar" ? "كل ساعة" : "Every 1 hour"}</option>
                  <option value={120}>{siteLang === "ar" ? "كل ساعتين" : "Every 2 hours"}</option>
                  <option value={180}>{siteLang === "ar" ? "كل 3 ساعات" : "Every 3 hours"}</option>
                  <option value={360}>{siteLang === "ar" ? "كل 6 ساعات" : "Every 6 hours"}</option>
                  <option value={720}>{siteLang === "ar" ? "كل 12 ساعة" : "Every 12 hours"}</option>
                  <option value={1440}>{siteLang === "ar" ? "كل يوم (24 ساعة)" : "Every day (24 hours)"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {siteLang === "ar" ? "نوع المنشن" : "Mention Type"}
                </label>
                <select
                  value={config.mentionType}
                  onChange={(e) => {
                    setConfig({ ...config, mentionType: e.target.value });
                    if (onDirtyChange) onDirtyChange(true);
                  }}
                  className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="none">{siteLang === "ar" ? "لا يوجد منشن" : "No mention"}</option>
                  <option value="everyone">{siteLang === "ar" ? "@everyone للكل" : "@everyone"}</option>
                  <option value="here">{siteLang === "ar" ? "@here للمتواجدين" : "@here"}</option>
                  <option value="role">{siteLang === "ar" ? "رتبة محددة" : "Specific Role"}</option>
                </select>
              </div>

              {config.mentionType === "role" && (
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {siteLang === "ar" ? "اختر الرتبة للمنشن" : "Role to Mention"}
                  </label>
                  <select
                    value={config.mentionRoleId}
                    onChange={(e) => {
                      setConfig({ ...config, mentionRoleId: e.target.value });
                      if (onDirtyChange) onDirtyChange(true);
                    }}
                    className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="">{siteLang === "ar" ? "اختر رتبة..." : "Select role..."}</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl font-black shadow-lg transition-all text-sm uppercase tracking-wide"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? (siteLang === "ar" ? "جاري الحفظ..." : "Saving...") : (siteLang === "ar" ? "حفظ الإعدادات" : "Save Settings")}
          </button>
        </div>
      </div>
    </div>
  );
}
