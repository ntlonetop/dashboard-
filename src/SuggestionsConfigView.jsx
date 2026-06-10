import { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Save,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Info,
  Upload,
  Type,
  Share2,
  Send,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StudioImageUploader } from "./components/StudioImageUploader";
export function SuggestionsConfigView({ guildId, siteLang }) {
  const isAr = siteLang === "ar";
  const [panels, setPanels] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePanelId, setActivePanelId] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, dataRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/config`),
          fetch(`/api/guilds/${guildId}/roles-channels`)
        ]);
        const config = await configRes.json();
        const data = await dataRes.json();
        setPanels(config.suggestionPanels || []);
        setChannels(data.channels || []);
      } catch (err) {
        console.error("Failed to fetch suggestions data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [guildId]);
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionPanels: panels })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: isAr ? "تم حفظ إعدادات نظام الاقتراحات بنجاح!" : "Suggestions system settings saved successfully!", type: "success" }
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  const addPanel = () => {
    const newPanel = {
      id: "sp_" + Date.now(),
      title: isAr ? "نظام الاقتراحات" : "Suggestions System",
      description: isAr ? "اضغط على الزر أدناه لإرسال اقتراحك الجديد." : "Click the button below to submit your new suggestion.",
      channelId: "",
      targetChannelId: "",
      imageUrl: "",
      useServerIcon: false,
      buttonLabel: isAr ? "نشر إقتراح \u{1F4A1}" : "Publish Suggestion \u{1F4A1}"
    };
    setPanels([...panels, newPanel]);
    setActivePanelId(newPanel.id);
  };
  const removePanel = (id) => {
    setPanels(panels.filter((p) => p.id !== id));
    if (activePanelId === id) setActivePanelId(null);
  };
  const updatePanel = (id, data) => {
    setPanels(panels.map((p) => p.id === id ? { ...p, ...data } : p));
  };
  const postPanel = async (panel) => {
    if (!panel.channelId) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: isAr ? "يرجى اختيار القناة لإرسال البانل" : "Please select a channel to post the panel", type: "error" }
      }));
      return;
    }
    try {
      const res = await fetch(`/api/guilds/${guildId}/post-suggestion-panel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelId: panel.id })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: isAr ? "تم إرسال بانل الاقتراحات بنجاح!" : "Suggestion panel posted successfully!", type: "success" }
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };
  if (loading) return <div className="flex h-64 items-center justify-center">
      <Zap className="animate-pulse text-indigo-500" size={32} />
    </div>;
  return <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Sparkles className="text-indigo-400 w-8 h-8" />
            {isAr ? "نظام الاقتراحات المتطور" : "Advanced Suggestions System"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isAr ? "تخصيص لوحات الاقتراحات وتحديد قنوات النشر والتفاعل." : "Customize suggestion panels and define publish & interact channels."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
    onClick={addPanel}
    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 px-6 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
  >
            <Plus size={18} />
            {isAr ? "إنشاء بانل جديد" : "Create New Panel"}
          </button>
          <button
    onClick={handleSave}
    disabled={saving}
    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-6 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
  >
            {saving ? <Plus className="animate-spin" size={18} /> : <Save size={18} />}
            {isAr ? "حفظ كافة التغييرات" : "Save All Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {panels.length === 0 ? <div className="bg-[#0b0f17] border border-dashed border-white/10 rounded-[2.5rem] p-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-500">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{isAr ? "لا توجد لوحات اقتراحات حالياً" : "No Suggestion Panels Yet"}</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              {isAr ? "قم بإنشاء أول لوحة لتلقي اقتراحات الأعضاء وزيادة التفاعل في مجتمعك." : "Create your first panel to receive member suggestions and increase community engagement."}
            </p>
          </div> : panels.map((panel) => <motion.div
    key={panel.id}
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#0b101a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl"
  >
              <div
    className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
    onClick={() => setActivePanelId(activePanelId === panel.id ? null : panel.id)}
  >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{panel.title}</h3>
                    <p className="text-xs text-slate-500">{isAr ? "اضغط لتعديل إعدادات الاقتراحات" : "Click to edit suggestions settings"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
    onClick={(e) => {
      e.stopPropagation();
      postPanel(panel);
    }}
    className="hidden sm:flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-4 py-2 rounded-xl transition-all border border-indigo-500/20 text-[10px] font-black uppercase tracking-tighter"
  >
                    <Upload size={14} />
                    {isAr ? "نشر البانل" : "Post Panel"}
                  </button>
                  <button
    onClick={(e) => {
      e.stopPropagation();
      postPanel(panel);
    }}
    className="sm:hidden bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 p-2.5 rounded-xl transition-all border border-indigo-500/20"
  >
                    <Upload size={18} />
                  </button>
                  <button
    onClick={(e) => {
      e.stopPropagation();
      removePanel(panel.id);
    }}
    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-2.5 rounded-xl transition-all border border-rose-500/20"
  >
                    <Trash2 size={18} />
                  </button>
                  {activePanelId === panel.id ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                </div>
              </div>

              <AnimatePresence>
                {activePanelId === panel.id && <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: "auto", opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    className="border-t border-white/5"
  >
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                            <Type size={14} />
                            {isAr ? "محتوى الإيمبد" : "EMBED CONTENT"}
                          </h4>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "عنوان البانل" : "Panel Title"}</label>
                            <input
    type="text"
    value={panel.title}
    onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-600 outline-none transition-all"
  />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "الوصف" : "Description"}</label>
                            <textarea
    rows={3}
    value={panel.description}
    onChange={(e) => updatePanel(panel.id, { description: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-600 outline-none transition-all resize-none"
  />
                          </div>
                          <div className="space-y-4">
                             <div>
                                <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "نص الزر" : "Button Label"}</label>
                                <input
    type="text"
    value={panel.buttonLabel}
    onChange={(e) => updatePanel(panel.id, { buttonLabel: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-600 outline-none transition-all"
  />
                             </div>
                             <div>
                                <StudioImageUploader
    value={panel.imageUrl}
    onChange={(url) => updatePanel(panel.id, { imageUrl: url })}
    siteLang={siteLang}
    label={isAr ? "صورة الإيمبد (من الاستوديو)" : "Embed Image (from gallery/studio)"}
    aspectRatio="video"
  />
                             </div>
                          </div>
                          <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                            <input
    type="checkbox"
    checked={panel.useServerIcon}
    onChange={(e) => updatePanel(panel.id, { useServerIcon: e.target.checked })}
    className="w-4 h-4 rounded bg-black/40 border-white/20 text-indigo-600 shrink-0"
  />
                            <p className="text-xs text-slate-300 font-bold">{isAr ? "استخدام أيقونة السيرفر كصورة ثانوية" : "Use server icon as fallback image"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-rose-400 tracking-widest flex items-center gap-2">
                            <Share2 size={14} />
                            {isAr ? "توجيه الاقتراحات" : "SUGGESTIONS ROUTING"}
                          </h4>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "قناة وضع البانل" : "Post Panel Channel"}</label>
                            <select
    value={panel.channelId}
    onChange={(e) => updatePanel(panel.id, { channelId: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-600"
  >
                              <option value="">{isAr ? "اختر القناة..." : "Select channel..."}</option>
                              {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "قناة إرسال الاقتراحات" : "Suggestions Output Channel"}</label>
                            <select
    value={panel.targetChannelId}
    onChange={(e) => updatePanel(panel.id, { targetChannelId: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-600"
  >
                              <option value="">{isAr ? "اختر قناة المخرجات..." : "Select output channel..."}</option>
                              {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>

                         <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-2 text-indigo-400">
                               <Send size={18} />
                               <h5 className="text-xs font-black uppercase tracking-wider">{isAr ? "آلية النشر المعتمدة" : "PUBLISHING METHOD"}</h5>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                               {isAr ? "سيتم إرسال الاقتراحات عبر Webhook باسم وصورة الشخص المنشئ، وسيتم تلقائياً تفعيل Threads للنقاش تحت كل اقتراح." : "Suggestions will be sent via Webhook with the creator's name and avatar. Threads will be automatically enabled for discussion under each post."}
                            </p>
                         </div>

                         <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                            <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">{isAr ? "معاينة المخرجات" : "OUTPUT PREVIEW"}</h5>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-slate-700" />
                                 <span className="text-xs font-bold text-white tracking-tight">John Doe (Webhook)</span>
                                 <span className="bg-indigo-600 text-[8px] font-black uppercase px-1 rounded-sm text-white">Bot</span>
                              </div>
                              <div className="bg-[#111622] rounded-xl p-4 border border-white/5">
                                 <p className="text-xs text-white leading-relaxed">
                                   {isAr ? "إقتراح" : "Suggestion"} {"<:Person:1504602083377287230>:"} <span className="text-indigo-400">@JohnDoe</span>
                                 </p>
                                 <p className="text-[9px] text-slate-500 my-1">~~                                                                                                                                                                   ~~</p>
                                 <p className="text-xs text-slate-300 italic">"هذا مثال على نص الاقتراح الذي سيكتبه المستخدم..."</p>
                              </div>
                              <div className="flex gap-2">
                                 <div className="bg-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-black text-white">{isAr ? "نشر إقتراح" : "Publish Suggestion"}</div>
                                 <div className="bg-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black text-white hover:bg-slate-600 flex items-center justify-center">
                                   <Zap size={12} className="text-amber-400" />
                                 </div>
                              </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </motion.div>}
              </AnimatePresence>
            </motion.div>)}
      </div>

      <div className="bg-[#0b0f17] border border-white/5 rounded-[2rem] p-8">
        <h4 className="text-sm font-black text-white mb-4 flex items-center gap-2">
          <Info className="text-amber-400 w-5 h-5" />
          {isAr ? "معلومات تقنية هامة" : "Important Technical Details"}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-slate-400 leading-loose">
          <div className="space-y-2">
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">1</span>
              {isAr ? "تحت كل اقتراح، سيكون هناك زر لإضافة البوت يوجه المستخدم لرابط الداشبورد فوراً." : "Under each suggestion, a 'Bot' button will redirect users to the dashboard URL instantly."}
            </p>
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">2</span>
              {isAr ? "البوت سيستخدم Webhooks لإظهار هويات المستخدمين الحقيقية في قناة الاقتراحات." : "The system uses Webhooks to display real user identities in the target suggestion channel."}
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">3</span>
              {isAr ? "يتم إنشاء Thread تلقائياً لكل اقتراح للسماح للأعضاء بمناقشة الفكرة والتفاعل معها." : "A discussion Thread is created automatically for each suggestion post."}
            </p>
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">4</span>
              {isAr ? "تأكد من إعطاء البوت صلاحية Manage Webhooks في القناة التي سيتم إرسال الاقتراحات إليها." : "Ensure the bot has 'Manage Webhooks' permission in the target suggestion channel."}
            </p>
          </div>
        </div>
      </div>
    </div>;
}
