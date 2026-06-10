import { useState, useEffect } from "react";
import { Loader2, Save, Zap, Shield, Hash, Settings2, Plus, Trash2, X, Mic, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TagSelection } from "./components/TagSelection";
export function LevellingConfigView({ guildId, siteLang, onDirtyChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [config, setConfig] = useState({
    enabled: true,
    commandChannels: [],
    restrictedRoles: [],
    levelUpChannelId: "",
    levelUpMessage: "\u{1F389} مبروك {user}! لقد انتقلت من المستوى {oldLevel} إلى المستوى {newLevel}!",
    chat: {
      enabled: true,
      xpMode: "scaling",
      staticLevels: [],
      baseXp: 300,
      incrementXp: 150,
      everyNLevels: 1,
      intervals: [],
      rewards: [],
      earnRate: 20,
      earnIncrease: 0,
      earnIncreaseInterval: 5,
      cooldown: 10
    },
    voice: {
      enabled: true,
      xpMode: "scaling",
      staticLevels: [],
      baseXp: 300,
      incrementXp: 150,
      everyNLevels: 1,
      intervals: [],
      rewards: [],
      earnRate: 15,
      earnIncrease: 0,
      earnIncreaseInterval: 60
    }
  });
  const [activeSection, setActiveSection] = useState("general");
  useEffect(() => {
    Promise.all([
      fetch(`/api/guilds/${guildId}/levelling`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json())
    ]).then(([levellingData, structureData]) => {
      if (!levellingData.error) {
        setConfig((prev) => ({ ...prev, ...levellingData }));
      }
      if (structureData.roles) setRoles(structureData.roles);
      if (structureData.channels) setChannels(structureData.channels);
      setLoading(false);
    }).catch(console.error);
  }, [guildId]);
  const [toast, setToast] = useState(null);
  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/guilds/${guildId}/levelling`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      setToast({ message: isAr ? "تم الحفظ بنجاح!" : "Saved successfully!", type: "success" });
      if (onDirtyChange) onDirtyChange(false);
      setTimeout(() => setToast(null), 3e3);
    } catch (e) {
      console.error(e);
      setToast({ message: isAr ? "حدث خطأ أثناء الحفظ" : "Error saving changes", type: "error" });
      setTimeout(() => setToast(null), 3e3);
    }
    setSaving(false);
  };

  useEffect(() => {
    const handleTriggerSave = () => {
      handleSave();
    };
    const handleTriggerCancel = () => {
      setLoading(true);
      Promise.all([
        fetch(`/api/guilds/${guildId}/levelling`).then((res) => res.json()),
        fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json())
      ]).then(([levellingData, structureData]) => {
        if (!levellingData.error) {
          setConfig((prev) => ({ ...prev, ...levellingData }));
        }
        if (structureData.roles) setRoles(structureData.roles);
        if (structureData.channels) setChannels(structureData.channels);
        setLoading(false);
        if (onDirtyChange) onDirtyChange(false);
      }).catch(console.error);
    };
    window.addEventListener("trigger-save", handleTriggerSave);
    window.addEventListener("trigger-cancel", handleTriggerCancel);
    return () => {
      window.removeEventListener("trigger-save", handleTriggerSave);
      window.removeEventListener("trigger-cancel", handleTriggerCancel);
    };
  }, [config, guildId]);
  const toggleChannel = (id) => {
    setConfig((prev) => ({
      ...prev,
      commandChannels: prev.commandChannels.includes(id) ? prev.commandChannels.filter((c) => c !== id) : [...prev.commandChannels, id]
    }));
    if (onDirtyChange) onDirtyChange(true);
  };
  const toggleRestrictedRole = (id) => {
    setConfig((prev) => ({
      ...prev,
      restrictedRoles: prev.restrictedRoles.includes(id) ? prev.restrictedRoles.filter((r) => r !== id) : [...prev.restrictedRoles, id]
    }));
    if (onDirtyChange) onDirtyChange(true);
  };
  const addInterval = (type) => {
    const newInterval = { from: 1, to: 10, baseXp: 1e3, incrementXp: 1e3, everyNLevels: 1 };
    setConfig({
      ...config,
      [type]: {
        ...config[type],
        intervals: [...config[type].intervals, newInterval]
      }
    });
    if (onDirtyChange) onDirtyChange(true);
  };
  const removeInterval = (type, index) => {
    const ivs = [...config[type].intervals];
    ivs.splice(index, 1);
    setConfig({
      ...config,
      [type]: { ...config[type], intervals: ivs }
    });
    if (onDirtyChange) onDirtyChange(true);
  };
  const addReward = (type) => {
    setConfig({
      ...config,
      [type]: {
        ...config[type],
        rewards: [...config[type].rewards, { level: 10, roleId: "" }]
      }
    });
    if (onDirtyChange) onDirtyChange(true);
  };
  const addStaticLevel = (type) => {
    setConfig({
      ...config,
      [type]: {
        ...config[type],
        staticLevels: [...config[type].staticLevels, { level: config[type].staticLevels.length + 1, xp: 1e3 }]
      }
    });
    if (onDirtyChange) onDirtyChange(true);
  };
  const removeStaticLevel = (type, index) => {
    const sls = [...config[type].staticLevels];
    sls.splice(index, 1);
    setConfig({
      ...config,
      [type]: { ...config[type], staticLevels: sls }
    });
    if (onDirtyChange) onDirtyChange(true);
  };
  const removeReward = (type, index) => {
    const rs = [...config[type].rewards];
    rs.splice(index, 1);
    setConfig({
      ...config,
      [type]: { ...config[type], rewards: rs }
    });
    if (onDirtyChange) onDirtyChange(true);
  };
  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-amber-500 w-8 h-8" /></div>;
  }
  const isAr = siteLang === "ar";
  const renderEarnRates = (type) => {
    const typeConfig = config[type];
    return <div className="space-y-8">
        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{isAr ? "معدل كسب الـ XP" : "XP Earn Rate"}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">{isAr ? `تحديد الـ XP المكتسب لكل ${type === "chat" ? "رسالة" : "دقيقة"}` : `Define XP earned per ${type === "chat" ? "message" : "minute"}`}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-3">
             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{isAr ? "مقدار الـ XP الأساسي" : "Base XP Earned"}</label>
             <input
      type="number"
      className="w-full bg-black/40 border-2 border-white/5 focus:border-purple-500/50 rounded-2xl px-6 py-4 text-white font-black text-lg text-center outline-none transition-all placeholder:text-white/10"
      value={typeConfig.earnRate ?? (type === "chat" ? 15 : 10)}
      onChange={(e) => {
        const parsed = parseInt(e.target.value);
        setConfig({ ...config, [type]: { ...typeConfig, earnRate: isNaN(parsed) ? "" : parsed } });
        if (onDirtyChange) onDirtyChange(true);
      }}
    />
          </div>
          <div className="space-y-3">
             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{isAr ? "مقدار الازدياد (اختياري)" : "XP Increase Rate"}</label>
             <input
      type="number"
      className="w-full bg-black/40 border-2 border-white/5 focus:border-purple-500/50 rounded-2xl px-6 py-4 text-white font-black text-lg text-center outline-none transition-all placeholder:text-white/10"
      value={typeConfig.earnIncrease ?? 0}
      onChange={(e) => {
        const parsed = parseInt(e.target.value);
        setConfig({ ...config, [type]: { ...typeConfig, earnIncrease: isNaN(parsed) ? "" : parsed } });
        if (onDirtyChange) onDirtyChange(true);
      }}
    />
          </div>
          <div className="space-y-3">
             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{isAr ? `كل كم ${type === "chat" ? "رسالة" : "دقيقة"}؟` : `Every N ${type === "chat" ? "Messages" : "Minutes"}`}</label>
             <input
      type="number"
      min="1"
      className="w-full bg-black/40 border-2 border-white/5 focus:border-purple-500/50 rounded-2xl px-6 py-4 text-white font-black text-lg text-center outline-none transition-all placeholder:text-white/10"
      value={typeConfig.earnIncreaseInterval ?? (type === "chat" ? 5 : 60)}
      onBlur={(e) => {
        let val = parseInt(e.target.value) || 1;
        if (val < 1) val = 1;
        setConfig({ ...config, [type]: { ...typeConfig, earnIncreaseInterval: val } });
      }}
      onChange={(e) => {
        const parsed = parseInt(e.target.value);
        setConfig({ ...config, [type]: { ...typeConfig, earnIncreaseInterval: isNaN(parsed) ? "" : parsed } });
        if (onDirtyChange) onDirtyChange(true);
      }}
    />
             <p className="text-[9px] text-purple-400/60 font-bold uppercase px-2">{isAr ? "يجب ألا يكون صفر" : "Cannot be zero"}</p>
          </div>
          {type === "chat" && <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">{isAr ? "تبريد (ثواني)" : "Cooldown (Secs)"}</label>
                <input
      type="number"
      min="0"
      className="w-full bg-black/40 border-2 border-white/5 focus:border-purple-500/50 rounded-2xl px-6 py-4 text-white font-black text-lg text-center outline-none transition-all placeholder:text-white/10"
      value={typeConfig.cooldown !== void 0 ? typeConfig.cooldown : 60}
      onChange={(e) => {
        const parsed = parseInt(e.target.value);
        setConfig({ ...config, [type]: { ...typeConfig, cooldown: isNaN(parsed) ? "" : parsed } });
        if (onDirtyChange) onDirtyChange(true);
      }}
    />
             </div>}
        </div>
      </div>;
  };
  const renderIntervals = (type) => {
    const typeConfig = config[type];
    const isStatic = typeConfig.xpMode === "static";
    return <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <h4 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-amber-500" />
              {isAr ? "نظام احتساب الخبرة" : "XP Calculation System"}
            </h4>
            <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{isAr ? "اختر الطريقة التي تفضلها لتحديد متطلبات الليفل" : "Choose your preferred way to define level requirements"}</p>
          </div>
          
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 w-full sm:w-auto">
            <button
      onClick={() => {
        setConfig({ ...config, [type]: { ...typeConfig, xpMode: "static" } });
        if (onDirtyChange) onDirtyChange(true);
      }}
      className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isStatic ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-600 hover:text-slate-300"}`}
    >
              {isAr ? "يدوي (Static)" : "Static Mode"}
            </button>
            <button
      onClick={() => {
        setConfig({ ...config, [type]: { ...typeConfig, xpMode: "scaling" } });
        if (onDirtyChange) onDirtyChange(true);
      }}
      className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${!isStatic ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-600 hover:text-slate-300"}`}
    >
              {isAr ? "نطاقات (Intervals)" : "Scaling Mode"}
            </button>
          </div>
        </div>

        {isStatic ? <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                  <Plus className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <h5 className="text-sm font-black text-white uppercase tracking-widest">{isAr ? "المستويات المحددة" : "Static Levels"}</h5>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{isAr ? "حدد مقدار الـ XP المطلوب لكل لفل بدقة" : "Define exact XP needed for each specific level"}</p>
                </div>
              </div>
              <button
      onClick={() => addStaticLevel(type)}
      className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 rounded-xl text-[10px] font-black text-sky-500 transition-all border border-sky-500/20"
    >
                <Plus className="w-4 h-4" />
                {isAr ? "إضافة لفل" : "Add Level"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeConfig.staticLevels.map((sl, idx) => <div key={idx} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center gap-4 group relative">
                  <button
      onClick={() => removeStaticLevel(type, idx)}
      className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xl z-10 hover:scale-110 active:scale-95 transition-all"
      title={isAr ? "إزالة هذا المستوى" : "Remove this level"}
    >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex-1 space-y-1">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">{isAr ? "اللفل" : "Level"}</label>
                    <input
      type="number"
      value={sl.level}
      onChange={(e) => {
        const newSls = [...typeConfig.staticLevels];
        newSls[idx].level = parseInt(e.target.value) || 0;
        setConfig({ ...config, [type]: { ...typeConfig, staticLevels: newSls } });
        if (onDirtyChange) onDirtyChange(true);
      }}
      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-bold focus:border-sky-500 transition-colors"
    />
                  </div>
                  <div className="flex-[2] space-y-1">
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">{isAr ? "XP المطلوب" : "XP Required"}</label>
                    <input
      type="number"
      value={sl.xp}
      onChange={(e) => {
        const newSls = [...typeConfig.staticLevels];
        newSls[idx].xp = parseInt(e.target.value) || 0;
        setConfig({ ...config, [type]: { ...typeConfig, staticLevels: newSls } });
        if (onDirtyChange) onDirtyChange(true);
      }}
      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white font-bold focus:border-sky-500 transition-colors"
    />
                  </div>
                </div>)}
              
              <button
      onClick={() => addStaticLevel(type)}
      className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 border-dashed hover:border-sky-500/50 hover:bg-sky-500/5 transition-all group min-h-[80px]"
    >
                <Plus className="w-6 h-6 text-slate-600 group-hover:text-sky-500 mb-1" />
                <span className="text-[10px] font-black text-slate-500 group-hover:text-sky-500 uppercase tracking-widest">{isAr ? "إضافة مستوى جديد" : "Add New Level"}</span>
              </button>
            </div>
          </div> : <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{isAr ? "XP الأساسي" : "Base XP"}</label>
                <input
      type="number"
      value={typeConfig.baseXp}
      onChange={(e) => {
        setConfig({ ...config, [type]: { ...typeConfig, baseXp: parseInt(e.target.value) || 0 } });
        if (onDirtyChange) onDirtyChange(true);
      }}
      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-white font-black text-lg focus:border-amber-500 transition-colors"
    />
              </div>
              <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">{isAr ? "مقدار الزيادة" : "Increment XP"}</label>
                <input
      type="number"
      value={typeConfig.incrementXp}
      onChange={(e) => {
        setConfig({ ...config, [type]: { ...typeConfig, incrementXp: parseInt(e.target.value) || 0 } });
        if (onDirtyChange) onDirtyChange(true);
      }}
      className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-white font-black text-lg focus:border-amber-500 transition-colors"
    />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-white uppercase tracking-widest">{isAr ? "تخصيص النطاقات" : "Interval Customization"}</h5>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{isAr ? "تغيير قوانين الحساب لمستويات معينة" : "Override scaling rules for specific level ranges"}</p>
                  </div>
                </div>
                <button
      onClick={() => addInterval(type)}
      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white transition-all border border-white/5"
    >
                  <Plus className="w-4 h-4" />
                  {isAr ? "إضافة نطاق" : "Add Interval"}
                </button>
              </div>

              <div className="space-y-4">
                {typeConfig.intervals.map((inv, idx) => <div key={idx} className="bg-black/30 p-6 rounded-3xl border border-white/5 grid grid-cols-2 lg:grid-cols-4 gap-6 relative group hover:border-amber-500/30 transition-colors">
                    <button
      onClick={() => removeInterval(type, idx)}
      className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
    >
                      <X className="w-5 h-5" />
                    </button>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase text-center tracking-widest">{isAr ? "من لفل" : "From"}</label>
                      <input type="number" value={inv.from} onChange={(e) => {
      const newIvs = [...typeConfig.intervals];
      newIvs[idx].from = parseInt(e.target.value) || 0;
      setConfig({ ...config, [type]: { ...typeConfig, intervals: newIvs } });
      if (onDirtyChange) onDirtyChange(true);
    }} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-black text-center" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase text-center tracking-widest">{isAr ? "إلى لفل" : "To"}</label>
                      <input type="number" value={inv.to} onChange={(e) => {
      const newIvs = [...typeConfig.intervals];
      newIvs[idx].to = parseInt(e.target.value) || 0;
      setConfig({ ...config, [type]: { ...typeConfig, intervals: newIvs } });
      if (onDirtyChange) onDirtyChange(true);
    }} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-black text-center" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase text-center tracking-widest">{isAr ? "XP الأساسي" : "Base XP"}</label>
                      <input type="number" value={inv.baseXp} onChange={(e) => {
      const newIvs = [...typeConfig.intervals];
      newIvs[idx].baseXp = parseInt(e.target.value) || 0;
      setConfig({ ...config, [type]: { ...typeConfig, intervals: newIvs } });
      if (onDirtyChange) onDirtyChange(true);
    }} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-black text-center" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-2 uppercase text-center tracking-widest">{isAr ? "الزيادة" : "Increment"}</label>
                      <input type="number" value={inv.incrementXp} onChange={(e) => {
      const newIvs = [...typeConfig.intervals];
      newIvs[idx].incrementXp = parseInt(e.target.value) || 0;
      setConfig({ ...config, [type]: { ...typeConfig, intervals: newIvs } });
      if (onDirtyChange) onDirtyChange(true);
    }} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-black text-center" />
                    </div>
                  </div>)}
              </div>
            </div>
          </div>}
      </div>;
  };
  const renderRewards = (type) => {
    const typeConfig = config[type];
    return <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            {isAr ? "مكافآت الرتب" : "Rank Rewards"}
          </h4>
          <button
      onClick={() => addReward(type)}
      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl text-xs font-black text-emerald-500 transition-all border border-emerald-500/20"
    >
            <Plus className="w-3.5 h-3.5" />
            {isAr ? "إضافة مكافأة" : "Add Reward"}
          </button>
        </div>
        <div className="space-y-3">
          {typeConfig.rewards.length === 0 ? <p className="text-center py-4 text-slate-600 text-xs font-bold italic">{isAr ? "لا توجد مكافآت مضافة." : "No rewards added yet."}</p> : typeConfig.rewards.map((reward, i) => <div key={i} className="flex flex-col sm:flex-row items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">{isAr ? "لفل" : "LVL"}</span>
                  <input type="number" value={reward.level} onChange={(e) => {
      const newArr = [...typeConfig.rewards];
      newArr[i].level = parseInt(e.target.value) || 1;
      setConfig({ ...config, [type]: { ...typeConfig, rewards: newArr } });
    }} className="w-14 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-white text-center font-bold" />
                </div>
                <select
      value={reward.roleId}
      onChange={(e) => {
        const newArr = [...typeConfig.rewards];
        newArr[i].roleId = e.target.value;
        setConfig({ ...config, [type]: { ...typeConfig, rewards: newArr } });
      }}
      className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white font-bold"
    >
                  <option value="">{isAr ? "اختر الرتبة..." : "Select Role..."}</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>@{r.name}</option>)}
                </select>
                <button onClick={() => removeReward(type, i)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>)}
        </div>
      </div>;
  };
  return <div className="space-y-8 animate-in fade-in duration-700 relative">
      <AnimatePresence>
        {toast && <motion.div
    initial={{ opacity: 0, x: -100 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -100 }}
    className="fixed top-6 left-6 z-[100] flex flex-col items-start gap-2"
  >
            <div className={`bg-[#0c0f16] border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4 min-w-[280px] ${toast.type === "error" ? "ring-1 ring-rose-500/50" : "ring-1 ring-emerald-500/50"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${toast.type === "error" ? "bg-rose-500/20 text-rose-500 border-rose-500/30" : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"}`}>
                <Save className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-black text-sm">{toast.message}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{isAr ? "تزامن البيانات بنجاح" : "System synced"}</p>
              </div>
            </div>
            <motion.div
    initial={{ scaleX: 1 }}
    animate={{ scaleX: 0 }}
    transition={{ duration: 3, ease: "linear" }}
    className={`h-1 rounded-full w-full origin-left ${toast.type === "error" ? "bg-rose-500" : "bg-gradient-to-r from-emerald-500 to-amber-500"}`}
  />
          </motion.div>}
      </AnimatePresence>

      <div className="flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-400 flex items-center justify-center shadow-[0_0_30px_rgba(217,119,6,0.3)] shrink-0">
             <Zap className="w-8 h-8 text-white" />
           </div>
           <div>
             <h2 className="text-3xl font-black text-white tracking-tight">{isAr ? "نظام المستويات المطور" : "Advanced Levelling System"}</h2>
             <p className="text-slate-400 mt-1 font-medium">{isAr ? "إدارة شاملة لنقاط الخبرة والرتب لغرف الكتابة والصوت." : "Manage XP scaling and rewards for Chat and Voice."}</p>
           </div>
        </div>
        <button
    onClick={handleSave}
    disabled={saving}
    className="flex items-center gap-3 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black transition-all disabled:opacity-50 shadow-lg shadow-amber-900/20 group hover:-translate-y-0.5 active:translate-y-0"
  >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
          <span>{isAr ? "حفظ التغييرات" : "Save Config"}</span>
        </button>
      </div>

      <div className="bg-[#0c0f16]/80 p-2 rounded-[2.5rem] border border-white/5 backdrop-blur-xl">
        <div className="flex flex-wrap p-2 gap-2">
           {[
    { id: "general", label: isAr ? "إعدادات عامة" : "General", icon: <Settings2 className="w-4 h-4" /> },
    { id: "chat", label: isAr ? "نظام الكتابة" : "Chat System", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "voice", label: isAr ? "نظام الصوت" : "Voice System", icon: <Mic className="w-4 h-4" /> }
  ].map((tab) => <button
    key={tab.id}
    onClick={() => setActiveSection(tab.id)}
    className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeSection === tab.id ? "bg-amber-500 text-white shadow-xl shadow-amber-500/20" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}
  >
               {tab.icon}
               {tab.label}
             </button>)}
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
    key={activeSection}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
  >
              {activeSection === "general" && <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-xl font-black text-white">{isAr ? "تفعيل النظام" : "Toggle System"}</h3>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
    type="checkbox"
    checked={config.enabled}
    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
    className="sr-only peer"
  />
                          <div className="w-14 h-7 bg-white/10 peer-focus:outline-none ring-4 ring-transparent peer-focus:ring-amber-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] rtl:after:right-[4px] rtl:after:left-auto after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 relative" />
                        </label>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-4">
                           <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                             <Hash className="w-4 h-4 text-amber-500" />
                             {isAr ? "غرف الأوامر المسموحة" : "Allowed Command Channels"}
                           </h4>
                           <TagSelection
    items={channels}
    selectedIds={config.commandChannels}
    onToggle={toggleChannel}
    placeholder={isAr ? "اختر الغرف المسموحة..." : "Select allowed channels..."}
    type="channel"
  />
                         </div>

                         <div className="space-y-4 pt-4 border-t border-white/5">
                           <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                             <Shield className="w-4 h-4 text-emerald-500" />
                             {isAr ? "الرتب المسموحة (اختياري)" : "Allowed Roles (Optional)"}
                           </h4>
                           <TagSelection
    items={roles}
    selectedIds={config.restrictedRoles}
    onToggle={toggleRestrictedRole}
    placeholder={isAr ? "اختر الرتب المسموحة..." : "Select allowed roles..."}
    type="role"
  />
                         </div>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <h3 className="text-xl font-black text-white border-b border-white/5 pb-4">{isAr ? "تنبيهات الترقية" : "Level Up Alerts"}</h3>
                      <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isAr ? "غرفة التنبيه" : "Alert Channel"}</label>
                           <select
    value={config.levelUpChannelId}
    onChange={(e) => {
      setConfig({ ...config, levelUpChannelId: e.target.value });
      if (onDirtyChange) onDirtyChange(true);
    }}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-amber-500 appearance-none"
  >
                             <option value="">{isAr ? "إرسال في نفس القناة" : "Same Channel"}</option>
                             {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                           </select>
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isAr ? "نوع رسالة الترقية" : "Level Up Message Type"}</label>
                           <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
                             <button
                               onClick={() => { setConfig({ ...config, levelUpMessageType: "text" }); if (onDirtyChange) onDirtyChange(true); }}
                               className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${config.levelUpMessageType !== "embed" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-600 hover:text-slate-300"}`}
                             >
                               {isAr ? "رسالة عادية" : "Plain Text"}
                             </button>
                             <button
                               onClick={() => { setConfig({ ...config, levelUpMessageType: "embed" }); if (onDirtyChange) onDirtyChange(true); }}
                               className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${config.levelUpMessageType === "embed" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-600 hover:text-slate-300"}`}
                             >
                               {isAr ? "Embed" : "Embed"}
                             </button>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                             {isAr ? (config.levelUpMessageType === "embed" ? "وصف الإيمبد" : "رسالة الترقية") : (config.levelUpMessageType === "embed" ? "Embed Description" : "Alert Message")}
                           </label>
                           <textarea
                             value={config.levelUpMessageType === "embed" ? (config.levelUpEmbedDescription || "") : config.levelUpMessage}
                             onChange={(e) => {
                               if (config.levelUpMessageType === "embed") {
                                 setConfig({ ...config, levelUpEmbedDescription: e.target.value });
                               } else {
                                 setConfig({ ...config, levelUpMessage: e.target.value });
                               }
                               if (onDirtyChange) onDirtyChange(true);
                             }}
                             rows={4}
                             className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:border-amber-500 custom-scrollbar"
                           />
                           {config.levelUpMessageType === "embed" && (
                             <div className="space-y-2 mt-4">
                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isAr ? "رابط الصورة (اختياري)" : "Image URL (Optional)"}</label>
                               <input
                                 type="text"
                                 value={config.levelUpEmbedImageUrl || ""}
                                 onChange={(e) => { setConfig({ ...config, levelUpEmbedImageUrl: e.target.value }); if (onDirtyChange) onDirtyChange(true); }}
                                 className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white font-medium focus:border-amber-500"
                                 placeholder="https://example.com/image.png"
                               />
                             </div>
                           )}
                           <div className="flex flex-wrap gap-2 pt-2">
                              {["{user}", "{oldLevel}", "{newLevel}", "{next_level}"].map((tag) => <span key={tag} className="px-2 py-1 bg-white/5 rounded border border-white/5 text-[9px] font-mono text-amber-500 font-black">{tag}</span>)}
                           </div>
                        </div>
                      </div>
                   </div>
                </div>}

              {(activeSection === "chat" || activeSection === "voice") && <div className="space-y-12 max-w-5xl mx-auto">
                   <div className="flex items-center justify-between bg-amber-500/5 p-8 rounded-[2.5rem] border border-amber-500/10">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            {activeSection === "chat" ? <MessageSquare className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-white">{activeSection === "chat" ? isAr ? "نظام مستويات الكتابة" : "Chat Levelling" : isAr ? "نظام مستويات الصوت" : "Voice Levelling"}</h3>
                            <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-1">{isAr ? "تخصيص كامل للأوزان والمكافآت والاسم." : "Customize weights, rewards and aliases."}</p>
                         </div>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
    type="checkbox"
    checked={config[activeSection].enabled}
    onChange={(e) => setConfig({ ...config, [activeSection]: { ...config[activeSection], enabled: e.target.checked } })}
    className="sr-only peer"
  />
                        <div className="w-14 h-7 bg-white/10 peer-focus:outline-none ring-4 ring-transparent peer-focus:ring-amber-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] rtl:after:right-[4px] rtl:after:left-auto after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 relative shadow-inner" />
                      </label>
                   </div>

                   {config[activeSection].enabled ? <div className="space-y-12">
                        <section className="bg-black/20 p-8 rounded-[2.5rem] border border-white/5">
                           {renderEarnRates(activeSection)}
                        </section>
                        <section className="bg-black/20 p-8 rounded-[2.5rem] border border-white/5">
                           {renderIntervals(activeSection)}
                        </section>
                        <div className="grid grid-cols-1 gap-8">
                           <section className="bg-black/20 p-8 rounded-[2.5rem] border border-white/5 h-fit">
                              {renderRewards(activeSection)}
                           </section>
                        </div>
                     </div> : <div className="py-24 text-center bg-white/5 rounded-[3rem] border border-white/5 border-dashed">
                        <Zap className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                        <h4 className="text-xl font-black text-slate-500">{isAr ? "نظام هذا القسم معطل حالياً" : "This section is currently disabled"}</h4>
                        <p className="text-sm text-slate-600 mt-2">{isAr ? "قم بتفعيل المفتاح أعلاه للبدء بالتخصيص." : "Toggle the switch above to enable customization."}</p>
                     </div>}
                </div>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>;
}
