import { useState, useEffect, useRef } from "react";
import { Loader2, Save, Image as ImageIcon, Hexagon, Circle, Square, Triangle, Layers, Check } from "lucide-react";
import { motion } from "motion/react";
import { gT } from "./i18n";
import { StudioImageUploader } from "./components/StudioImageUploader";
export function WelcomeSystemView({ guildId, siteLang, onDirtyChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [autoRoles, setAutoRoles] = useState([]);
  const [autoRolesEnabled, setAutoRolesEnabled] = useState(false);
  const [config, setConfig] = useState({
    channelId: "",
    message: "مرحباً [user] في سيرفر [server]! عدد الأعضاء الآن [membercount]",
    dmEnabled: true,
    dmMessage: "مرحباً بك! نتمنى لك وقتاً ممتعاً. تمت دعوتك بواسطة [Invitedby]",
    bgUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000",
    avatarShape: "circle",
    avatarPos: { x: 0, y: -20 },
    avatarSize: 96,
    textPos: { x: 0, y: 70 },
    textSize: 20
  });
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);
  useEffect(() => {
    Promise.all([
      fetch(`/api/guilds/${guildId}/welcome`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/auto-roles`).then((res) => res.json())
    ]).then(([configData, structureData, autoRolesData]) => {
      if (configData && configData.channelId !== void 0) {
        setConfig((prev) => ({ ...prev, ...configData }));
      }
      if (structureData.channels) setChannels(structureData.channels);
      if (structureData.roles) setAllRoles(structureData.roles.filter((r) => r.name !== "@everyone"));
      if (autoRolesData) {
        setAutoRolesEnabled(autoRolesData.enabled);
        setAutoRoles(autoRolesData.roles || []);
      }
      setLoading(false);
    });
  }, [guildId]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/guilds/${guildId}/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    await fetch(`/api/guilds/${guildId}/auto-roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: autoRolesEnabled,
        roles: autoRoles
      })
    });
    window.dispatchEvent(new CustomEvent("show-toast", {
      detail: { message: "تم الحفظ بنجاح!", type: "success" }
    }));
    if (onDirtyChange) onDirtyChange(false);
    setTimeout(() => setSaving(false), 500);
  };

  useEffect(() => {
    const handleTriggerSave = () => {
      handleSave();
    };
    const handleTriggerCancel = () => {
      setLoading(true);
      Promise.all([
        fetch(`/api/guilds/${guildId}/welcome`).then((res) => res.json()),
        fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json()),
        fetch(`/api/guilds/${guildId}/auto-roles`).then((res) => res.json())
      ]).then(([configData, structureData, autoRolesData]) => {
        if (configData && configData.channelId !== void 0) {
          setConfig((prev) => ({ ...prev, ...configData }));
        }
        if (structureData.channels) setChannels(structureData.channels);
        if (structureData.roles) setAllRoles(structureData.roles.filter((r) => r.name !== "@everyone"));
        if (autoRolesData) {
          setAutoRolesEnabled(autoRolesData.enabled);
          setAutoRoles(autoRolesData.roles || []);
        }
        setLoading(false);
        if (onDirtyChange) onDirtyChange(false);
      });
    };
    window.addEventListener("trigger-save", handleTriggerSave);
    window.addEventListener("trigger-cancel", handleTriggerCancel);
    return () => {
      window.removeEventListener("trigger-save", handleTriggerSave);
      window.removeEventListener("trigger-cancel", handleTriggerCancel);
    };
  }, [config, autoRolesEnabled, autoRoles, guildId]);
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: siteLang === "ar" ? "الملف كبير جداً (الأقصى 10 ميجا)" : "File too large (Max 10MB)", type: "error" }
        }));
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        setConfig({ ...config, bgUrl: base64 });
        if (onDirtyChange) onDirtyChange(true);
      };
      reader.readAsDataURL(file);
    }
  };
  if (loading) {
  }
  const shapes = [
    { id: "circle", icon: <Circle className="w-4 h-4" />, label: gT[siteLang].shapeCircle },
    { id: "square", icon: <Square className="w-4 h-4" />, label: gT[siteLang].shapeSquare },
    { id: "triangle", icon: <Triangle className="w-4 h-4" />, label: gT[siteLang].shapeTriangle },
    { id: "diamond", icon: <Hexagon className="w-4 h-4" />, label: gT[siteLang].shapeDiamond }
  ];
  return <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      <div className="bg-black/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center bg-pink-500/20 rounded-xl border border-pink-500/20">
            <ImageIcon className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h4 className="text-lg font-black text-white leading-tight">{gT[siteLang].welcomeTitle}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">{gT[siteLang].welcomeDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {
    /* Settings Column */
  }
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{gT[siteLang].welcomeChannel}</label>
              <select
    value={config.channelId}
    onChange={(e) => {
      setConfig({ ...config, channelId: e.target.value });
      if (onDirtyChange) onDirtyChange(true);
    }}
    className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all"
  >
                <option value="">-- اختار الروم --</option>
                {channels.map((c) => <option key={c.id} value={c.id}># {c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{gT[siteLang].welcomeMessage}</label>
              <textarea
    value={config.message}
    onChange={(e) => {
      setConfig({ ...config, message: e.target.value });
      if (onDirtyChange) onDirtyChange(true);
    }}
    rows={2}
    className="w-full bg-[#0A0D14] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-all resize-none"
  />
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer group mb-3">
                <input
    type="checkbox"
    checked={config.dmEnabled}
    onChange={(e) => {
      setConfig({ ...config, dmEnabled: e.target.checked });
      if (onDirtyChange) onDirtyChange(true);
    }}
    className="sr-only peer"
  />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:right-[2px] rtl:after:left-auto after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500 relative transition-colors" />
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                  {gT[siteLang].enableDm}
                </span>
              </label>

              {config.dmEnabled && <div className="animate-in fade-in slide-in-from-top-1 px-4 py-3 bg-white/5 rounded-xl border border-white/5 space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{gT[siteLang].welcomeDmMessage}</label>
                  <textarea
    value={config.dmMessage}
    onChange={(e) => {
      setConfig({ ...config, dmMessage: e.target.value });
      if (onDirtyChange) onDirtyChange(true);
    }}
    rows={2}
    className="w-full bg-[#0A0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 transition-all"
  />
                  <p className="text-[10px] text-slate-500 italic">
                    {siteLang === "ar" ? "سيتم إضافة زر باللون الرمادي في رسالة الخاص باسم السيرفر يحمل رابط الدعوة تلقائياً." : "A gray button with server name and invite link will be added automatically."}
                  </p>
                </div>}
            </div>

            <div>
              <StudioImageUploader
    value={config.bgUrl}
    onChange={(url) => {
      setConfig({ ...config, bgUrl: url });
      if (onDirtyChange) onDirtyChange(true);
    }}
    siteLang={siteLang}
    label={gT[siteLang].bgImage}
    aspectRatio="video"
  />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between">
                  <span>{gT[siteLang].avatarSize}</span>
                  <span className="text-pink-400">{config.avatarSize}px</span>
                </label>
                <input
    type="range"
    min="40"
    max="200"
    value={config.avatarSize}
    onChange={(e) => {
      setConfig({ ...config, avatarSize: parseInt(e.target.value) });
      if (onDirtyChange) onDirtyChange(true);
    }}
    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
  />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between">
                  <span>{gT[siteLang].textSize}</span>
                  <span className="text-pink-400">{config.textSize}px</span>
                </label>
                <input
    type="range"
    min="10"
    max="60"
    value={config.textSize}
    onChange={(e) => {
      setConfig({ ...config, textSize: parseInt(e.target.value) });
      if (onDirtyChange) onDirtyChange(true);
    }}
    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
  />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{gT[siteLang].avatarShape}</label>
              <div className="flex gap-2">
                {shapes.map((shape) => <button
    key={shape.id}
    onClick={() => {
      setConfig({ ...config, avatarShape: shape.id });
      if (onDirtyChange) onDirtyChange(true);
    }}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl border flex-1 transition-all ${config.avatarShape === shape.id ? "bg-pink-500/10 border-pink-500 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.1)]" : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"}`}
  >
                    {shape.icon}
                    <span className="text-[9px] font-bold uppercase">{shape.label}</span>
                  </button>)}
              </div>
            </div>

            {
    /* Optional Auto-Roles / Distribution System Section */
  }
            <div className="border border-white/5 bg-white/5 backdrop-blur-sm p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 flex items-center justify-center bg-indigo-500/20 rounded-lg border border-indigo-500/20">
                    <Layers className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black tracking-wide text-white uppercase">
                      {siteLang === "ar" ? "نظام التوزيع التلقائي للرتب" : "Automatic Role Distribution"}
                    </h5>
                    <p className="text-[9px] text-slate-400">
                      {siteLang === "ar" ? "منح رتب تلقائياً للعضو عند الدخول (اختياري)" : "Automatically assign roles on join (Optional)"}
                    </p>
                  </div>
                </div>
                
                <label className="flex items-center gap-3 cursor-pointer group relative">
                  <input
    type="checkbox"
    checked={autoRolesEnabled}
    onChange={(e) => {
      setAutoRolesEnabled(e.target.checked);
      if (onDirtyChange) onDirtyChange(true);
    }}
    className="sr-only peer"
  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:right-[2px] rtl:after:left-auto after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500 relative transition-colors" />
                </label>
              </div>

              {autoRolesEnabled && <div className="animate-in fade-in slide-in-from-top-1 space-y-3 pt-1 border-t border-white/5">
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {siteLang === "ar" ? "قم باختيار وتحديد الرتب التي ترغب بمنحها بشكل تلقائي وبدون تدخل بمجرد دخول العضو:" : "Select the roles that will be automatically assigned to new users right when they join:"}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1">
                    {allRoles.length === 0 ? <span className="text-[10px] text-slate-500 col-span-2 text-center py-2">
                        {siteLang === "ar" ? "لا يوجد رتب متاحة" : "No roles available"}
                      </span> : allRoles.map((r) => {
    const isSelected = autoRoles.includes(r.id);
    return <button
      key={r.id}
      type="button"
      onClick={() => {
        const updated = isSelected ? autoRoles.filter((roleId) => roleId !== r.id) : [...autoRoles, r.id];
        setAutoRoles(updated);
        if (onDirtyChange) onDirtyChange(true);
      }}
      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left ${isSelected ? "bg-pink-600/10 border-pink-500 text-pink-300 shadow-md" : "bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200"}`}
    >
                            <span className="truncate">{r.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0 ml-1.5" />}
                          </button>;
  })}
                  </div>
                </div>}
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-3">
              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{gT[siteLang].placeholdersInfo}</h5>
              <div className="flex flex-wrap gap-1.5 text-[9px] font-mono">
                <span className="bg-black/30 px-1.5 py-0.5 rounded text-pink-300 border border-pink-500/10">[user]</span>
                <span className="bg-black/30 px-1.5 py-0.5 rounded text-pink-300 border border-pink-500/10">[server]</span>
                <span className="bg-black/30 px-1.5 py-0.5 rounded text-pink-300 border border-pink-500/10">[membercount]</span>
                <span className="bg-black/30 px-1.5 py-0.5 rounded text-pink-300 border border-pink-500/10">[Invitedby]</span>
              </div>
            </div>

          </div>

          {
    /* Preview Column */
  }
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">معاينة الصورة (Preview)</label>
              <span className="text-[9px] text-pink-400 bg-pink-500/5 px-2 py-0.5 rounded border border-pink-500/10 font-bold uppercase tracking-widest">{gT[siteLang].dragDropInfo}</span>
            </div>
            
            <div
    ref={previewRef}
    className="w-full aspect-video bg-[#0A0B10] rounded-2xl overflow-hidden relative border border-white/10 flex items-center justify-center cursor-crosshair group select-none shadow-2xl"
  >
              {config.bgUrl ? <img src={config.bgUrl} alt="Background" className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none transition-opacity duration-700" onError={(e) => e.currentTarget.style.display = "none"} /> : null}
              
              {
    /* Avatar Draggable */
  }
              <motion.div
    drag
    dragConstraints={previewRef}
    dragMomentum={false}
    animate={{ x: config.avatarPos.x, y: config.avatarPos.y }}
    onDragEnd={(_, info) => {
      setConfig({ ...config, avatarPos: { x: config.avatarPos.x + info.offset.x, y: config.avatarPos.y + info.offset.y } });
      if (onDirtyChange) onDirtyChange(true);
    }}
    className="absolute z-10 cursor-move hover:ring-2 ring-pink-500 rounded-full transition-shadow duration-300"
    style={{
      width: config.avatarSize,
      height: config.avatarSize,
      borderRadius: config.avatarShape === "circle" ? "50%" : config.avatarShape === "square" ? "0.75rem" : config.avatarShape === "diamond" ? "0.75rem" : "0",
      transform: config.avatarShape === "diamond" ? "rotate(45deg)" : "none",
      clipPath: config.avatarShape === "triangle" ? "polygon(50% 0%, 0% 100%, 100% 100%)" : "none"
    }}
  >
                <div
    className="w-full h-full bg-indigo-500 shadow-[0_0_30px_rgba(0,0,0,0.6)] border-2 border-white isolate overflow-hidden"
    style={{
      borderRadius: config.avatarShape === "circle" ? "50%" : config.avatarShape === "square" ? "0.75rem" : config.avatarShape === "diamond" ? "0.75rem" : "0"
    }}
  >
                  <img draggable={false} src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="avatar" className={`w-full h-full object-cover pointer-events-none ${config.avatarShape === "diamond" ? "-rotate-45 scale-150" : ""}`} />
                </div>
              </motion.div>
              
              {
    /* Username Draggable */
  }
              <motion.div
    drag
    dragConstraints={previewRef}
    dragMomentum={false}
    animate={{ x: config.textPos.x, y: config.textPos.y }}
    onDragEnd={(_, info) => {
      setConfig({ ...config, textPos: { x: config.textPos.x + info.offset.x, y: config.textPos.y + info.offset.y } });
      if (onDirtyChange) onDirtyChange(true);
    }}
    className="absolute z-10 px-4 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10 cursor-move hover:border-pink-500 transition-colors"
  >
                <span className="text-white font-black whitespace-nowrap pointer-events-none" style={{ fontSize: `${config.textSize}px` }}>NexusUser</span>
              </motion.div>
            </div>

            {
    /* DM Preview */
  }
            {config.dmEnabled && <div className="mt-4 animate-in fade-in">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">معاينة الخاص (DM)</label>
                <div className="bg-[#313338] rounded-xl p-3 w-full border border-white/5 shadow-xl">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 overflow-hidden shrink-0">
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs uppercase">B</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-white font-bold text-xs">Bot Name</span>
                        <span className="bg-[#5865F2] text-white text-[9px] px-1 rounded font-bold uppercase transition-transform scale-90">App</span>
                      </div>
                      <p className="text-[#DBDEE1] text-xs whitespace-pre-wrap leading-relaxed">{config.dmMessage.replace(/\[\w+\]/g, "...") || "No message"}</p>
                      
                      <div className="mt-2.5 inline-block">
                        <div className="bg-[#4E5058] hover:bg-[#6D6F78] text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center justify-center border border-white/5 cursor-pointer transition-colors max-w-sm truncate shadow-sm">
                          Server Name
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>}

          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
    onClick={handleSave}
    disabled={saving}
    className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-600/50 text-white rounded-xl font-black shadow-lg transition-all text-sm uppercase tracking-wide"
  >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? gT[siteLang].saving : gT[siteLang].saveBtn}
          </button>
        </div>

      </div>
    </div>;
}
