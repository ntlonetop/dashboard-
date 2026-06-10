import { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Save,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Settings,
  Shield,
  Send,
  HelpCircle,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StudioImageUploader } from "./components/StudioImageUploader";

export function ApplicationsConfigView({ guildId, siteLang, onDirtyChange }) {
  const isAr = siteLang === "ar";
  const [panels, setPanels] = useState([]);
  const [channels, setChannels] = useState([]);
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
        const config = await configRes.json();
        const data = await dataRes.json();
        setPanels(config.applications?.panels || []);
        setChannels(data.channels || []);
        setRoles(data.roles || []);
      } catch (err) {
        console.error("Failed to fetch applications data:", err);
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
        body: JSON.stringify({
          applications: {
            panels: panels
          }
        })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: {
            message: isAr ? "تم حفظ إعدادات نظام التقديمات بنجاح!" : "Applications system settings saved successfully!",
            type: "success"
          }
        }));
        if (onDirtyChange) onDirtyChange(false);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? "حدث خطأ أثناء حفظ الإعدادات" : "Failed to save settings",
          type: "error"
        }
      }));
    } finally {
      setSaving(false);
    }
  };

  const addPanel = () => {
    const newPanel = {
      id: "app_" + Date.now(),
      title: isAr ? "تقديم طلب انضمام للإدارة" : "Apply for Guild Staff",
      description: isAr ? "اضغط على الزر أدناه لبدء عملية التقديم وسنقوم بطرح بعض الأسئلة عليك." : "Click the button below to start the application process.",
      buttonLabel: isAr ? "تقديم الآن 📝" : "Apply Now 📝",
      imageUrl: "",
      useServerIcon: true,
      channelId: "", // where the panel is posted
      targetChannelId: "", // where submissions go
      allowedRoleId: "", // review authority role
      submitType: "discord_modal", // discord_modal or dm
      questions: [
        isAr ? "الاسم والعمر" : "Name and Age",
        isAr ? "لماذا تريد الانضمام إلينا؟" : "Why do you want to join us?",
        isAr ? "ما الذي يمكنك تقديمه للسيرفر؟" : "What can you offer to the server?"
      ]
    };
    setPanels([...panels, newPanel]);
    setActivePanelId(newPanel.id);
    if (onDirtyChange) onDirtyChange(true);
  };

  const removePanel = (id) => {
    setPanels(panels.filter((p) => p.id !== id));
    if (activePanelId === id) setActivePanelId(null);
    if (onDirtyChange) onDirtyChange(true);
  };

  const updatePanel = (id, data) => {
    setPanels(panels.map((p) => p.id === id ? { ...p, ...data } : p));
    if (onDirtyChange) onDirtyChange(true);
  };

  const addQuestion = (panelId) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    const newQuestions = [...(panel.questions || []), ""];
    updatePanel(panelId, { questions: newQuestions });
  };

  const removeQuestion = (panelId, index) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    const newQuestions = (panel.questions || []).filter((_, i) => i !== index);
    updatePanel(panelId, { questions: newQuestions });
  };

  const updateQuestion = (panelId, index, val) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    const newQuestions = [...(panel.questions || [])];
    newQuestions[index] = val;
    updatePanel(panelId, { questions: newQuestions });
  };

  const postPanelToDiscord = async (panel) => {
    if (!panel.channelId) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? "يرجى تحديد قناة إرسال البانل أولاً" : "Please select channel to post the panel first",
          type: "error"
        }
      }));
      return;
    }
    try {
      const res = await fetch(`/api/guilds/${guildId}/post-application-panel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelId: panel.id })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: {
            message: isAr ? "تم إرسال لوحة التقديم بنجاح!" : "Application panel posted successfully!",
            type: "success"
          }
        }));
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed");
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? `فشل الإرسال: ${err.message}` : `Failed to post: ${err.message}`,
          type: "error"
        }
      }));
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Sparkles className="animate-pulse text-indigo-500" size={32} />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <FileText className="text-indigo-400 w-8 h-8" />
            {isAr ? "نظام التقديمات الذكي" : "Smart Applications System"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isAr ? "أنشئ نماذج تقديم للحصول على طلبات الأعضاء عبر البوت أو قائمة النوافذ." : "Create application forms to receive member requests via DM or Modals."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addPanel}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 px-6 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} />
            {isAr ? "إنشاء بانل تقديم" : "Create New Panel"}
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

      {panels.length === 0 ? (
        <div className="border border-white/5 bg-[#0a0d14]/60 backdrop-blur-xl p-12 text-center rounded-3xl">
          <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-white font-extrabold text-lg mb-2">
            {isAr ? "لا توجد لوحات تقديم حالياً" : "No application panels yet"}
          </h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            {isAr ? "ابدأ بإنشاء أول لوحة تقديم لتمكين الأعضاء من الانضمام لكادر السيرفر بسهولة." : "Start by creating your first application panel to let members apply easily."}
          </p>
          <button
            onClick={addPanel}
            className="bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-black py-2.5 px-6 rounded-xl text-xs"
          >
            {isAr ? "إنشاء بانل جديد" : "Create First Panel"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {panels.map((panel, idx) => {
            const isActive = activePanelId === panel.id;
            return (
              <div
                key={panel.id}
                className="border border-white/5 bg-[#0a0d14]/60 backdrop-blur-xl rounded-2.5xl overflow-hidden transition-all duration-300"
              >
                {/* Header Section */}
                <div
                  onClick={() => setActivePanelId(isActive ? null : panel.id)}
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="text-white font-black text-sm">{panel.title}</h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {panel.submitType === "dm" 
                          ? (isAr ? "التقديم عبر الخاص" : "Submission via DM") 
                          : (isAr ? "التقديم عبر نافذة Discord" : "Submission via Discord Modal")}
                        {" • "}
                        {panel.questions?.length || 0} {isAr ? "سؤال" : "questions"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => postPanelToDiscord(panel)}
                      className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border border-emerald-500/20"
                    >
                      <Send size={14} />
                      {isAr ? "إرسال البانل" : "Post Panel"}
                    </button>
                    <button
                      onClick={() => removePanel(panel.id)}
                      className="p-2 border border-rose-500/20 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => setActivePanelId(isActive ? null : panel.id)}
                      className="p-2 text-slate-400 hover:text-white rounded-xl transition-all"
                    >
                      {isActive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="p-6 space-y-6 bg-black/20">
                        {/* Embed Configuration Panel */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-2">
                              <Settings size={14} />
                              {isAr ? "مظهر إمبيد البانل (اللوحة)" : "Panel Embed Layout"}
                            </h4>

                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                {isAr ? "عنوان الإمبيد" : "Embed Title"}
                              </label>
                              <input
                                type="text"
                                value={panel.title}
                                onChange={(e) => updatePanel(panel.id, { title: e.target.value })}
                                className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                {isAr ? "وصف الإمبيد" : "Embed Description"}
                              </label>
                              <textarea
                                value={panel.description}
                                onChange={(e) => updatePanel(panel.id, { description: e.target.value })}
                                rows={3}
                                className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                {isAr ? "نص زر التقديم" : "Button Label"}
                              </label>
                              <input
                                type="text"
                                value={panel.buttonLabel}
                                onChange={(e) => updatePanel(panel.id, { buttonLabel: e.target.value })}
                                className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-2">
                              <Layers size={14} />
                              {isAr ? "إعداد النظام والقنوات" : "Channels & Method Setup"}
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                  {isAr ? "مكان إرسال البانل" : "Post Channel"}
                                </label>
                                <select
                                  value={panel.channelId}
                                  onChange={(e) => updatePanel(panel.id, { channelId: e.target.value })}
                                  className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                >
                                  <option value="">{isAr ? "اختر روم..." : "Select channel..."}</option>
                                  {channels.map((ch) => (
                                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                  {isAr ? "مكان استقبال التقديمات" : "Log Submissions Channel"}
                                </label>
                                <select
                                  value={panel.targetChannelId}
                                  onChange={(e) => updatePanel(panel.id, { targetChannelId: e.target.value })}
                                  className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                >
                                  <option value="">{isAr ? "اختر روم لتقديم الأوراق" : "Select logs channel..."}</option>
                                  {channels.map((ch) => (
                                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                  {isAr ? "الرتبة المخولة بالقبول والرفض" : "Reviewer Role"}
                                  <Info size={11} className="text-indigo-300" title={isAr ? "الرتبة التي تملك الصلاحية للتحكم بالطلب والمنشن خارج الايمبد" : "Role gets pinged and can approve/deny"} />
                                </label>
                                <select
                                  value={panel.allowedRoleId}
                                  onChange={(e) => updatePanel(panel.id, { allowedRoleId: e.target.value })}
                                  className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                >
                                  <option value="">{isAr ? "اختر رتبة..." : "Select reviewer role..."}</option>
                                  {roles.map((r) => (
                                    <option key={r.id} value={r.id}>@{r.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                  {isAr ? "طريقة تقديم الاسئلة" : "Submission Method"}
                                </label>
                                <select
                                  value={panel.submitType}
                                  onChange={(e) => updatePanel(panel.id, { submitType: e.target.value })}
                                  className="w-full bg-[#07090e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                >
                                  <option value="discord_modal">{isAr ? "نافذة حقول منبثقة (Modal)" : "Discord Dialog Modal"}</option>
                                  <option value="dm">{isAr ? "خطوات في الخاص (DM)" : "Step-by-step in DM"}</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="flex items-center gap-2 cursor-pointer mt-2">
                                <input
                                  type="checkbox"
                                  checked={panel.useServerIcon}
                                  onChange={(e) => updatePanel(panel.id, { useServerIcon: e.target.checked })}
                                  className="rounded border-white/10 text-indigo-500 focus:ring-0 bg-transparent w-4 h-4"
                                />
                                <span className="text-xs text-slate-400 font-bold">
                                  {isAr ? "عرض أيقونة السيرفر كصورة مصغرة" : "Use server icon as thumbnail"}
                                </span>
                              </label>

                              <StudioImageUploader
                                label={isAr ? "صورة البانل الكبيرة (اختياري)" : "Panel Large Background Image (Optional)"}
                                value={panel.imageUrl}
                                onChange={(url) => updatePanel(panel.id, { imageUrl: url })}
                                siteLang={siteLang}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Questions Configuration Panel */}
                        <div className="bg-[#05060a]/50 border border-white/5 rounded-2xl p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-2">
                                <HelpCircle size={14} />
                                {isAr ? "أسئلة نموذج التقديم" : "Model Questions"}
                              </h4>
                              {panel.submitType === "discord_modal" && (
                                <p className="text-[10px] text-amber-500 font-bold mt-1">
                                  ⚠️ {isAr ? "تنبيه: نوافذ ديسكورد تدعم بحد أقصى 5 أسئلة." : "Note: discord modals support a maximum of 5 questions."}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => addQuestion(panel.id)}
                              disabled={panel.submitType === "discord_modal" && (panel.questions || []).length >= 5}
                              className="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 font-black py-1.5 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 disabled:opacity-40"
                            >
                              <Plus size={14} />
                              {isAr ? "إضافة سؤال" : "Add Question"}
                            </button>
                          </div>

                          <div className="space-y-3">
                            {(panel.questions || []).map((q, qidx) => (
                              <div key={qidx} className="flex items-center gap-3">
                                <span className="text-xs font-mono font-bold text-slate-600 w-6">
                                  #{qidx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={q}
                                  placeholder={isAr ? `السؤال رقم ${qidx + 1}...` : `Question ${qidx + 1}...`}
                                  onChange={(e) => updateQuestion(panel.id, qidx, e.target.value)}
                                  className="flex-1 bg-[#07090e] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                />
                                <button
                                  onClick={() => removeQuestion(panel.id, qidx)}
                                  className="p-2 border border-rose-500/15 text-rose-400 bg-rose-500/5 hover:bg-rose-500/15 rounded-xl transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}

                            {(panel.questions || []).length === 0 && (
                              <p className="text-slate-500 text-xs text-center py-4">
                                {isAr ? "يرجى إضافة سؤال واحد على الأقل ليتمكن الأعضاء من الإجابة." : "Please add at least one question for users to answer."}
                              </p>
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
