import { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Save,
  Trash2,
  FolderKanban,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
  Upload,
  Type,
  Shield,
  MessageSquare,
  Bot,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StudioImageUploader } from "./components/StudioImageUploader";
export function TicketsConfigView({ guildId, siteLang }) {
  const isAr = siteLang === "ar";
  const [config, setConfig] = useState({
    autoCloseEnabled: false,
    autoCloseHours: 24,
    evaluationChannelId: "",
    panels: []
  });
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
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
        const guildConfig = await configRes.json();
        const data = await dataRes.json();
        const dbTickets = guildConfig.tickets || {};
        setConfig({
          autoCloseEnabled: dbTickets.autoCloseEnabled !== false && dbTickets.autoCloseEnabled !== void 0,
          autoCloseHours: dbTickets.autoCloseHours || 24,
          evaluationChannelId: dbTickets.evaluationChannelId || "",
          panels: dbTickets.panels || []
        });
        setChannels(data.channels || []);
        setCategories(data.categories || []);
        setRoles(data.roles || []);
      } catch (err) {
        console.error("Failed to fetch tickets configuration:", err);
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
        body: JSON.stringify({ tickets: config })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: {
            message: isAr ? "تم حفظ إعدادات نظام التذاكر بنجاح! ✨" : "Ticket system settings saved successfully! ✨",
            type: "success"
          }
        }));
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? "فشل حفظ التغييرات." : "Failed to save changes.",
          type: "error"
        }
      }));
    } finally {
      setSaving(false);
    }
  };
  const addPanel = () => {
    const newPanel = {
      id: "panel_" + Date.now(),
      embedTitle: isAr ? "نظام الدعم الفني وتذاكر المساعدة" : "Customer Support & Ticket System",
      embedDesc: isAr ? "اضغط على الأزرار بالأسفل لفتح تذكرة جديدة مع الإدارة." : "Click the buttons below to open a new support ticket with the staff.",
      thumbnailUrl: "",
      hideServerIcon: false,
      largeImageUrl: "",
      componentsType: "buttons",
      channelId: "",
      options: [
        {
          id: "opt_" + Date.now() + "_1",
          label: isAr ? "الدعم الفني والشكاوى" : "General Support & Queries",
          question: isAr ? "اكتب سبب فتح التذكرة للتوضيح" : "Briefly state your query",
          welcomeMessage: isAr ? "مرحباً بك! يرجى توضيح طلبك هنا والانتظار لحين رد أحد أعضاء طاقم الدعم المتاحين." : "Welcome! Please state your issue and wait for support staff to assist you.",
          category: "",
          staffRoles: [],
          emoji: "\u{1F4E9}"
        }
      ]
    };
    setConfig({
      ...config,
      panels: [...config.panels, newPanel]
    });
    setActivePanelId(newPanel.id);
  };
  const removePanel = (panelId) => {
    setConfig({
      ...config,
      panels: config.panels.filter((p) => p.id !== panelId)
    });
    if (activePanelId === panelId) setActivePanelId(null);
  };
  const updatePanel = (panelId, data) => {
    setConfig({
      ...config,
      panels: config.panels.map((p) => p.id === panelId ? { ...p, ...data } : p)
    });
  };
  const addOptionToPanel = (panelId) => {
    setConfig({
      ...config,
      panels: config.panels.map((p) => {
        if (p.id !== panelId) return p;
        const newOpt = {
          id: "opt_" + Date.now() + "_" + (p.options.length + 1),
          label: isAr ? "قسم دعم جديد" : "New Support Dept",
          question: "",
          welcomeMessage: isAr ? "مرحباً بك في القسم الجديد بانتظار الإشراف..." : "Welcome to the new ticket category! Please describe your request.",
          category: "",
          staffRoles: [],
          emoji: "\u{1F4C1}"
        };
        return {
          ...p,
          options: [...p.options, newOpt]
        };
      })
    });
  };
  const removeOptionFromPanel = (panelId, optId) => {
    setConfig({
      ...config,
      panels: config.panels.map((p) => {
        if (p.id !== panelId) return p;
        return {
          ...p,
          options: p.options.filter((o) => o.id !== optId)
        };
      })
    });
  };
  const updateOptionInPanel = (panelId, optId, data) => {
    setConfig({
      ...config,
      panels: config.panels.map((p) => {
        if (p.id !== panelId) return p;
        return {
          ...p,
          options: p.options.map((o) => o.id === optId ? { ...o, ...data } : o)
        };
      })
    });
  };
  const postPanelToDiscord = async (panel) => {
    if (!panel.channelId) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? "يرجى تحديد قناة إرسال اللوحة أولاً!" : "Please select a channel to post the panel!",
          type: "error"
        }
      }));
      return;
    }
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickets: config })
      });
      const res = await fetch(`/api/guilds/${guildId}/post-ticket-panel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelId: panel.id })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: {
            message: isAr ? "تم إرسال ونشر لوحة دعم التذاكر بنجاح! \u{1F680}" : "Ticket panel posted successfully! \u{1F680}",
            type: "success"
          }
        }));
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to post panel");
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? `خطأ أثناء النشر: ${err.message}` : `Error posting panel: ${err.message}`,
          type: "error"
        }
      }));
    }
  };
  if (loading) return <div className="flex h-64 items-center justify-center">
      <Bot className="animate-pulse text-indigo-500" size={32} />
    </div>;
  return <div className="space-y-8 animate-in fade-in duration-700">
      {
    /* Top Header */
  }
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Sparkles className="text-indigo-400 w-8 h-8" />
            {isAr ? "نظام التذاكر المتقدم" : "Advanced Support Tickets"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isAr ? "تخصيص لوحات دعم التذاكر وتحديد قنوات تفاعل الإدارة والوسوم التلقائية." : "Configure support ticket categories, staff permissions, auto-close rules, and beautiful panels."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
    onClick={addPanel}
    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 px-6 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
  >
            <Plus size={18} />
            {isAr ? "إنشاء لوحة جديدة" : "Create New Panel"}
          </button>
          <button
    onClick={handleSave}
    disabled={saving}
    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-6 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
  >
            {saving ? <Bot className="animate-spin" size={18} /> : <Save size={18} />}
            {isAr ? "حفظ الإعدادات" : "Save All Configuration"}
          </button>
        </div>
      </div>

      {
    /* General Settings Bar */
  }
      <div className="bg-[#0b101a] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl pointer-events-none rounded-full" />
        <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
          <Settings2Icon className="text-indigo-400 w-4 h-4" />
          {isAr ? "الإعدادات العامة للتذاكر" : "Global Ticket Settings"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl border border-white/5 h-full">
            <input
    type="checkbox"
    id="autoCloseEnabled"
    checked={config.autoCloseEnabled}
    onChange={(e) => setConfig({ ...config, autoCloseEnabled: e.target.checked })}
    className="w-4 h-4 rounded bg-black/40 border-white/20 text-indigo-600 focus:ring-0 focus:ring-offset-0 shrink-0 outline-none"
  />
            <label htmlFor="autoCloseEnabled" className="text-xs cursor-pointer text-slate-300 font-bold leading-tight">
              {isAr ? "تفعيل الإغلاق التلقائي الخامل" : "Enable Auto-Close Inactive Tickets"}
            </label>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "ساعات الانتظار قبل الإغلاق" : "Hours of inactivity"}</label>
            <input
    type="number"
    min={1}
    max={168}
    value={config.autoCloseHours}
    onChange={(e) => setConfig({ ...config, autoCloseHours: parseInt(e.target.value) || 24 })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-indigo-600 outline-none transition-all"
  />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "قناة إرسال التقييمات والسجلات" : "Fallback Log/Evaluation Channel"}</label>
            <select
    value={config.evaluationChannelId}
    onChange={(e) => setConfig({ ...config, evaluationChannelId: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-600 appearance-none bg-no-repeat cursor-pointer"
  >
              <option value="">{isAr ? "اختر القناة من هنا..." : "Select log channel..."}</option>
              {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {
    /* Ticket Panels list */
  }
      <div className="space-y-6">
        {config.panels.length === 0 ? <div className="bg-[#0b0f17] border border-dashed border-white/10 rounded-[2.5rem] p-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-500">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{isAr ? "لا توجد لوحات تذاكر حالياً" : "No Support Panels Configured"}</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              {isAr ? "قم بإنشاء لوحة تذاكر لدعم الأعضاء وتمكينهم من التواصل الآمن والمباشر مع فريق عمل السيرفر." : "Create your first interactive support panel allowing safe channels creation between users & admins."}
            </p>
          </div> : config.panels.map((panel) => <motion.div
    key={panel.id}
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#0b101a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl"
  >
              {
    /* Panel Accordion Top Head */
  }
              <div
    className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
    onClick={() => setActivePanelId(activePanelId === panel.id ? null : panel.id)}
  >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                    <FolderKanban size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{panel.embedTitle || (isAr ? "بدون عنوان" : "No Title")}</h3>
                    <p className="text-xs text-slate-500">{isAr ? "اضغط لإظهار/تعديل خيارات التذاكر داخل اللوحة" : "Click to build support options and styling within this panel"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <button
    onClick={(e) => {
      e.stopPropagation();
      postPanelToDiscord(panel);
    }}
    className="flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-4 py-2 rounded-xl transition-all border border-indigo-500/20 text-[10px] font-black uppercase tracking-tight"
  >
                    <Upload size={14} />
                    {isAr ? "نشر اللوحة" : "Post Panel"}
                  </button>
                  <button
    onClick={(e) => {
      e.stopPropagation();
      removePanel(panel.id);
    }}
    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-2 rounded-xl transition-all border border-rose-500/20 shrink-0"
  >
                    <Trash2 size={16} />
                  </button>
                  {activePanelId === panel.id ? <ChevronUp className="text-slate-500 w-5 h-5" /> : <ChevronDown className="text-slate-500 w-5 h-5" />}
                </div>
              </div>

              {
    /* Panel Details & Form Section */
  }
              <AnimatePresence>
                {activePanelId === panel.id && <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: "auto", opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    className="border-t border-white/5 bg-black/[0.15]"
  >
                    <div className="p-8 space-y-8">
                      {
    /* Grid for Styling & Location */
  }
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {
    /* Section Left: General Info */
  }
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                            <Type size={14} />
                            {isAr ? "تصميم وتنسيق اللوحة (Embed Style)" : "EMBED SPECIFICATIONS"}
                          </h4>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "عنوان الإيمبد الرئيسي" : "Embed Title"}</label>
                            <input
    type="text"
    value={panel.embedTitle}
    onChange={(e) => updatePanel(panel.id, { embedTitle: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-600 outline-none transition-all"
  />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "وصف الإيمبد" : "Embed Description"}</label>
                            <textarea
    rows={3}
    value={panel.embedDesc}
    onChange={(e) => updatePanel(panel.id, { embedDesc: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-600 outline-none transition-all resize-none"
  />
                          </div>
                          <div className="space-y-4">
                            <div>
                              <StudioImageUploader
    value={panel.thumbnailUrl}
    onChange={(url) => updatePanel(panel.id, { thumbnailUrl: url })}
    siteLang={siteLang}
    label={isAr ? "الصورة الرمزية للبانل (من الاستوديو)" : "Thumbnail Image (from gallery/studio)"}
    aspectRatio="square"
  />
                            </div>
                            <div>
                              <StudioImageUploader
    value={panel.largeImageUrl}
    onChange={(url) => updatePanel(panel.id, { largeImageUrl: url })}
    siteLang={siteLang}
    label={isAr ? "الصورة الكبيرة أو البانر (من الاستوديو)" : "Large Banner Image (from gallery/studio)"}
    aspectRatio="video"
  />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                            <input
    type="checkbox"
    id={`hideIcon_${panel.id}`}
    checked={panel.hideServerIcon}
    onChange={(e) => updatePanel(panel.id, { hideServerIcon: e.target.checked })}
    className="w-4 h-4 rounded bg-black/40 border-white/20 text-indigo-600 focus:ring-0 focus:ring-offset-0 shrink-0 outline-none"
  />
                            <label htmlFor={`hideIcon_${panel.id}`} className="text-xs cursor-pointer text-slate-300 font-bold leading-none">
                              {isAr ? "إخفاء لوجو/أيقونة السيرفر من زاوية الإيمبد" : "Hide server icon as fallback thumbnail"}
                            </label>
                          </div>
                        </div>

                        {
    /* Section Right: Routing & Placement */
  }
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                            <Eye size={14} />
                            {isAr ? "قنوات الإرسال وتخطيط الأزرار" : "LAYOUT & PLACEMENT"}
                          </h4>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "قناة إرسال البانل" : "Post Panel Target Channel"}</label>
                            <select
    value={panel.channelId}
    onChange={(e) => updatePanel(panel.id, { channelId: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-600 appearance-none bg-no-repeat cursor-pointer"
  >
                              <option value="">{isAr ? "اختر القناة..." : "Select text channel..."}</option>
                              {channels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "طريقة عرض الخيارات" : "Component Interface Type"}</label>
                            <div className="grid grid-cols-2 gap-4">
                              <button
    type="button"
    onClick={() => updatePanel(panel.id, { componentsType: "buttons" })}
    className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${panel.componentsType === "buttons" ? "bg-indigo-600 text-white border-indigo-500" : "bg-black/30 text-slate-400 border-white/10 hover:bg-white/5"}`}
  >
                                {isAr ? "أزرار دائرية" : "Interactive Buttons"}
                              </button>
                              <button
    type="button"
    onClick={() => updatePanel(panel.id, { componentsType: "select" })}
    className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${panel.componentsType === "select" ? "bg-indigo-600 text-white border-indigo-500" : "bg-black/30 text-slate-400 border-white/10 hover:bg-white/5"}`}
  >
                                {isAr ? "قائمة منسدلة" : "Select Dropdown Menu"}
                              </button>
                            </div>
                          </div>

                          <div className="bg-amber-600/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                            <Info className="text-amber-400 shrink-0 w-5 h-5" />
                            <p className="text-[11px] text-amber-300/80 leading-relaxed font-semibold">
                              {isAr ? "بعد الانتهاء من تخزين الإعدادات، يرجى النقر على زر 'نشر البانل' لكي يقوم البوت بإرسال الإيمبد ومعه الأزرار أو القائمة إلى القناة المحددة ديسكورد." : "When finishes tuning settings, please click 'Post Panel' button so the Discord bot generates and posts the fully functional interaction controls."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {
    /* Ticket Options Builder Area */
  }
                      <div className="border-t border-white/5 pt-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <Users className="text-indigo-400 w-5 h-5" />
                            {isAr ? "تصنيفات التذاكر داخل هذه اللوحة" : "Ticket Sub-Departments (Options)"}
                          </h4>
                          <button
    type="button"
    onClick={() => addOptionToPanel(panel.id)}
    className="bg-zinc-800 hover:bg-zinc-700 text-white py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
  >
                            <Plus size={14} />
                            {isAr ? "إضافة قسم تذاكر" : "Add Ticket Option"}
                          </button>
                        </div>

                        <div className="space-y-6">
                          {panel.options.map((opt, oIdx) => <div
    key={opt.id}
    className="bg-black/40 border border-white/5 hover:border-white/10 rounded-2xl p-6 relative group transition-all"
  >
                              {
    /* Right delete option tab */
  }
                              <div className="absolute top-4 left-4 z-10">
                                <button
    type="button"
    onClick={() => removeOptionFromPanel(panel.id, opt.id)}
    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
    title={isAr ? "حذف القسم" : "Remove Department"}
  >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                {
    /* Option Meta Details (ColSpan: 4) */
  }
                                <div className="md:col-span-4 space-y-4">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-black flex items-center justify-center">
                                      {oIdx + 1}
                                    </span>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{isAr ? "إعدادات المظهر" : "Appearance"}</span>
                                  </div>

                                  <div className="grid grid-cols-4 gap-3">
                                    <div className="col-span-1">
                                      <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">{isAr ? "إيموجي" : "Emoji"}</label>
                                      <input
                                        type="text"
                                        value={opt.emoji}
                                        onChange={(e) => updateOptionInPanel(panel.id, opt.id, { emoji: e.target.value })}
                                        className="w-full text-center bg-black/60 border border-white/10 rounded-xl px-2 py-2.5 text-sm text-white focus:border-indigo-600 outline-none"
                                        placeholder="📩"
                                      />
                                    </div>
                                    <div className="col-span-3">
                                      <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">{isAr ? "اسم الزر / الخيار" : "Button/Option Label"}</label>
                                      <input
    type="text"
    value={opt.label}
    onChange={(e) => updateOptionInPanel(panel.id, opt.id, { label: e.target.value })}
    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-indigo-600 outline-none"
    placeholder={isAr ? "الدعم الفني" : "Help desk"}
  />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">
                                      {isAr ? "سؤال إجباري قبل الفتح (اختياري)" : "Prompt Modal Question (Optional)"}
                                    </label>
                                    <input
    type="text"
    value={opt.question}
    onChange={(e) => updateOptionInPanel(panel.id, opt.id, { question: e.target.value })}
    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-white focus:border-indigo-600 outline-none"
    placeholder={isAr ? "اكتب سبب فتح التذكرة بالتفصيل..." : "Describe your problem briefly..."}
  />
                                    <span className="text-[9px] text-slate-500 mt-1 block leading-tight">
                                      {isAr ? "إذا كتبت سؤالاً، سيظهر نموذج منبثق (Modal) للمستخدم يسأله قبل فتح تذكرته وتوضع إجابته داخل التذكرة." : "If provided, a TextInput modal pops up on Discord before creating the ticket, appending the user's answer."}
                                    </span>
                                  </div>
                                </div>

                                {
    /* Option Access Details (ColSpan: 8) */
  }
                                <div className="md:col-span-8 space-y-4">
                                  <div className="flex items-center gap-2">
                                    <Shield className="text-emerald-400 w-4 h-4" />
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{isAr ? "وجهة التذكرة وصلاحيات التحكم" : "Category & Access Authorization"}</span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">{isAr ? "روم الفئة (Category Channel)" : "Discord Category Target"}</label>
                                      <select
    value={opt.category}
    onChange={(e) => updateOptionInPanel(panel.id, opt.id, { category: e.target.value })}
    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-600 appearance-none bg-no-repeat cursor-pointer"
  >
                                        <option value="">{isAr ? "اختر الفئة..." : "Select category..."}</option>
                                        {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">{isAr ? "رتب الدعم المسموح لها بالتحكم" : "Staff Authorized Roles"}</label>
                                      <div className="max-h-24 overflow-y-auto border border-white/10 rounded-xl p-2 bg-black/40 space-y-1 scrollbar-thin">
                                        {roles.length === 0 ? <p className="text-[10px] text-slate-500 italic p-1">{isAr ? "لا توجد رتب متاحة" : "No roles available"}</p> : roles.map((r) => {
    const stands = opt.staffRoles || [];
    const included = stands.includes(r.id);
    return <label key={r.id} className="flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer text-[10px] transition-colors select-none">
                                                <input
      type="checkbox"
      checked={included}
      onChange={() => {
        const next = included ? stands.filter((id) => id !== r.id) : [...stands, r.id];
        updateOptionInPanel(panel.id, opt.id, { staffRoles: next });
      }}
      className="w-3.5 h-3.5 rounded bg-black/40 border-white/20 text-indigo-600 shrink-0"
    />
                                                <span className="truncate font-medium" style={{ color: r.color ? `#${r.color.toString(16)}` : "#94a3b8" }}>
                                                  {r.name}
                                                </span>
                                              </label>;
  })}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">{isAr ? "الرسالة الافتتاحية للتذكرة" : "Ticket Main Welcome Message"}</label>
                                    <textarea
    rows={2}
    value={opt.welcomeMessage}
    onChange={(e) => updateOptionInPanel(panel.id, opt.id, { welcomeMessage: e.target.value })}
    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-indigo-600 outline-none resize-none"
    placeholder={isAr ? "أهلاً بك! أحد ممثلي الدعم الفني سيكون معك قريباً." : "Let supporting agents check your message detailed inside here."}
  />
                                    <span className="text-[9px] text-slate-500 mt-1 block leading-tight">
                                      {isAr ? "تظهر للإعلام فوراً داخل التذكرة الجديدة التي أنشئت للأعضاء." : "Posted inside the user channel instantly after creation as welcome instructions."}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </div>
                    </div>
                  </motion.div>}
              </AnimatePresence>
            </motion.div>)}
      </div>

      {
    /* Info Warning Alert / Guide help block */
  }
      <div className="bg-[#0b0f17] border border-white/5 rounded-[2rem] p-8">
        <h4 className="text-sm font-black text-white mb-4 flex items-center gap-2">
          <Info className="text-amber-400 w-5 h-5" />
          {isAr ? "طريقة عمل وتفعيل نظام التذاكر" : "How To Enable Ticket Panel Actions"}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-slate-400 leading-loose">
          <div className="space-y-2">
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">1</span>
              {isAr ? "قم بإنشاء وتصميم بانل تذاكر جديد بملء حقول العناوين والصور التوضيحية." : "Create and style a brand new ticket panel with titles and background banners."}
            </p>
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">2</span>
              {isAr ? "أنشئ أحد أقسام تذاكر (مثال: الاستفسارات، الشكاوى) وحدد الروم وصلاحيات الأعضاء." : "Add support categories, specify parent category slots, and configure staff permission tags."}
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">3</span>
              {isAr ? "احفظ الإعدادات بالنقر على زر 'حفظ الإعدادات' الرئيسي لحفظ وتأكيد الهيكلة." : "Commit changes globally using the 'Save All Configuration' button."}
            </p>
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">4</span>
              {isAr ? "رابط البوت سيقوم بمزامنة وحفظ كل شيء بشكل فوري." : "The engine is integrated real-time. Members can open claims flawlessly."}
            </p>
          </div>
        </div>
      </div>
    </div>;
}
function Settings2Icon({ className }) {
  return <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>;
}
