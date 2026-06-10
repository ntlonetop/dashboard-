import { useState, useEffect } from "react";
import {
  Briefcase,
  Plus,
  Save,
  Trash2,
  Layout,
  Settings2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Upload,
  Terminal,
  ShieldAlert,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StudioImageUploader } from "./components/StudioImageUploader";
import { TagSelection } from "./components/TagSelection";
export function BrokersConfigView({ guildId, siteLang }) {
  const isAr = siteLang === "ar";
  const [panels, setPanels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
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
        setPanels(config.brokerPanels || []);
        setRoles(data.roles || []);
        setChannels(data.channels || []);
        setCategories(data.categories || []);
      } catch (err) {
        console.error("Failed to fetch brokers data:", err);
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
        body: JSON.stringify({ brokerPanels: panels })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: isAr ? "تم حفظ إعدادات نظام الوسطاء بنجاح!" : "Brokers system settings saved successfully!", type: "success" }
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
      id: "bp_" + Date.now(),
      title: isAr ? "نظام الوساطة المعتمد" : "Certified Broker System",
      description: isAr ? "اضغط على الزر أدناه لفتح تذكرة وساطة جديدة." : "Click the button below to open a new broker ticket.",
      channelId: "",
      categoryId: "",
      brokerRoleIds: [],
      reviewsChannelId: "",
      imageUrl: "",
      buttonLabel: isAr ? "طلب وسيط \u{1F91D}" : "Request Broker \u{1F91D}"
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
      await fetch(`/api/guilds/${guildId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokerPanels: panels })
      });
      const res = await fetch(`/api/guilds/${guildId}/post-broker-panel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelId: panel.id })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: isAr ? "تم إرسال ونشر بانل الوساطة بنجاح! \u{1F680}" : "Broker panel posted successfully! \u{1F680}", type: "success" }
        }));
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to post");
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: isAr ? `خطأ أثناء نشر البانل: ${err.message}` : `Error posting panel: ${err.message}`, type: "error" }
      }));
    }
  };
  if (loading) return <div className="flex h-64 items-center justify-center">
      <Zap className="animate-pulse text-indigo-500" size={32} />
    </div>;
  return <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Briefcase className="text-indigo-500 w-8 h-8" />
            {isAr ? "نظام الوسطاء والتبادل الآمن" : "Secure Broker & Exchange System"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isAr ? "إدارة طلبات الوساطة، تقييم الوسطاء، وتوثيق الصفقات." : "Manage broker requests, rate brokers, and document trades."}
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
              <Briefcase size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{isAr ? "لا توجد لوحات وساطة حالياً" : "No Broker Panels Yet"}</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              {isAr ? "قم بإنشاء أول لوحة لتفعيل نظام الوسطاء المعتمدين في سيرفرك وتسهيل عمليات التبادل." : "Create your first panel to activate the certified broker system in your server and facilitate exchanges."}
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
                    <Layout size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{panel.title}</h3>
                    <p className="text-xs text-slate-500">{isAr ? "اضغط لتعديل إعدادات هذا البانل" : "Click to edit this panel settings"}</p>
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
    transition={{ duration: 0.3 }}
    className="border-t border-white/5"
  >
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                            <Settings2 size={14} />
                            {isAr ? "الإعدادات الأساسية" : "BASIC CONTENT"}
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
                        </div>

                        <div className="space-y-4 pt-4">
                          <h4 className="text-[10px] font-black uppercase text-amber-400 tracking-widest flex items-center gap-2">
                            <ShieldCheck size={14} />
                            {isAr ? "رتب الوسطاء والتحكم" : "BROKER ROLES & CONTROL"}
                          </h4>
                          <div>
                             <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "اختيار الوسطاء (Roles)" : "Select Broker Roles"}</label>
                             <TagSelection
                                items={roles}
                                selectedIds={panel.brokerRoleIds || []}
                                onToggle={(roleId) => {
                                  const current = panel.brokerRoleIds || [];
                                  if (current.includes(roleId)) {
                                    updatePanel(panel.id, { brokerRoleIds: current.filter((rid) => rid !== roleId) });
                                  } else {
                                    updatePanel(panel.id, { brokerRoleIds: [...current, roleId] });
                                  }
                                }}
                                placeholder={isAr ? "اختر رتب الوسطاء..." : "Select broker roles..."}
                                type="role"
                                isAr={isAr}
                             />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-rose-400 tracking-widest flex items-center gap-2">
                              <Terminal size={14} />
                              {isAr ? "توجيه القنوات" : "CHANNEL ROUTING"}
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "قناة إرسال البانل" : "Post Panel In"}</label>
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
                                <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "فئة التذاكر (Category)" : "Tickets Category"}</label>
                                <select
    value={panel.categoryId}
    onChange={(e) => updatePanel(panel.id, { categoryId: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-600"
  >
                                  <option value="">{isAr ? "اختر الفئة..." : "Select category..."}</option>
                                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              </div>
                            </div>

                            <div>
                               <label className="text-xs font-bold text-slate-400 mb-2 block">{isAr ? "قناة سجل التقييمات" : "Reviews Log Channel"}</label>
                               <select
    value={panel.reviewsChannelId}
    onChange={(e) => updatePanel(panel.id, { reviewsChannelId: e.target.value })}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-600"
  >
                                 <option value="">{isAr ? "اختر قناة التقييمات..." : "Select reviews channel..."}</option>
                                 {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                               </select>
                            </div>
                         </div>

                         <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-2 text-amber-400">
                               <ShieldAlert size={18} />
                               <h5 className="text-xs font-black uppercase tracking-wider">{isAr ? "تنبيه النظام الجديد" : "NEW SYSTEM ALERT"}</h5>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                               {isAr ? "سيطلب البوت 'ما السلعة المتبادلة' من العميل قبل فتح التذكرة. سيتم تفعيل أمر $تقييم في هذه التكتات ليتمكن السيط من طلب تقييم العميل مرة واحدة فقط." : "The bot will ask 'What is the trade item' before opening the ticket. The $review command will be enabled in these tickets for the broker to request a review from the client once."}
                            </p>
                         </div>

                         {
    /* Preview Case */
  }
                         <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                            <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">{isAr ? "معاينة البانل" : "PANEL PREVIEW"}</h5>
                            <div className="bg-[#111622] rounded-xl border-l-[4px] border-indigo-500 p-4 shadow-xl">
                               {panel.imageUrl && <img src={panel.imageUrl} className="w-full h-24 object-cover rounded-lg mb-3" alt="Preview" />}
                               <p className="text-sm font-bold text-white mb-1">{panel.title}</p>
                               <p className="text-[11px] text-slate-400 whitespace-pre-wrap">{panel.description}</p>
                               <div className="mt-4">
                                  <div className="bg-indigo-600 inline-flex items-center justify-center px-4 py-2 rounded-lg text-[11px] font-black text-white shadow-lg shadow-indigo-500/20">
                                     {panel.buttonLabel}
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
          <Info className="text-indigo-400 w-5 h-5" />
          {isAr ? "دليل استخدام نظام الوسطاء" : "Broker System Usage Guide"}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-slate-400 leading-loose">
          <div className="space-y-2">
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">1</span>
              {isAr ? "عند فتح التذكرة، سيظهر للمستلم (الوسيط) زر لإغلاق التذكرة أو طلب تقييم." : "Once a ticket is open, the receiver (broker) will see options to close or request review."}
            </p>
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">2</span>
              {isAr ? "لكتابة تقييم، يجب على الوسيط كتابة $تقييم في الشات ليرسل البوت واجهة التقييم للعميل." : "To get a review, the broker must type $review in chat for the bot to send the review UI to the client."}
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold shrink-0">3</span>
              {isAr ? "يمكن للعميل التقييم مرة واحدة فقط لكل تذكرة لضمان نزاهة النتائج." : "The client can only rate once per ticket to ensure result integrity."}
            </p>
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">4</span>
              {isAr ? "سيتم تخزين عدد التذاكر التي سلمها كل وسيط تلقائياً وعرضها في التقييمات." : "The number of tickets handled by each broker will be automatically tracked and shown in reviews."}
            </p>
          </div>
        </div>
      </div>
    </div>;
}
