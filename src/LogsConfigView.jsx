import { useState, useEffect } from "react";
import {
  Loader2,
  Save,
  Shield,
  Trash2,
  Pencil,
  Clock,
  CheckCircle,
  UserX,
  UserCheck,
  FolderPlus,
  Folder,
  FolderMinus,
  Layers,
  Sparkles,
  ArrowLeftRight
} from "lucide-react";
import { motion } from "motion/react";
const localT = {
  ar: {
    title: "نظام السجلات واللوقات الشامل (Server Logs Core)",
    desc: "راقب ووثق كل صغيرة وكبيرة تحدث في سيرفرك بالتفصيل والتوقيت المناسب والفاعل للحفاظ على أمان خادمك.",
    saving: "جاري حفظ إعدادات السجلات...",
    saveBtn: "حفظ إعدادات السجلات",
    noChannel: "-- اختر قناة اللوق --",
    statusActivated: "نظام السجلات نشط ومراقب",
    statusDeactivated: "نظام السجلات معطل ومقفل",
    premiumFeature: "ميزة الحماية والبريميوم اللانهائية",
    premiumDesc: "إذا قام أي عضو بحذف رسالة تسجيل (Log) لإخفاء أثره، سيقوم البوت باستعادتها فوراً، والاشارة إليه، مع إرسال إشعار مباشر لخاص صاحب السيرفر!",
    premiumBadge: "ميزة بريميوم نشطة ⭐️",
    premiumLockedBadge: "تتطلب بريميوم \u{1F451}",
    // Categories
    messagesGroup: "\u{1F4DD} سجل الرسائل والمحادثات",
    membersGroup: "\u{1F465} سجل الأعضاء والرقابة الإدارية",
    channelsGroup: "⚙️ سجل الغرف والرومات",
    rolesGroup: "\u{1F6E1}️ سجل الرتب والصلاحيات",
    // Logging actions
    messageDelete: "لوق الرسائل المحذوفة",
    messageDeleteDesc: "يسجل الرسائل التي يتم حذفها ومكانها وصاحبها.",
    messageUpdate: "لوق الرسائل المعدلة",
    messageUpdateDesc: "يسجل الرسالة القديمة والجديدة والمسؤول مبرمجاً.",
    timeoutAdd: "لوق إعطاء تايم أوت",
    timeoutAddDesc: "يسجل حظر الأعضاء مؤقتاً والمدة والمسؤول.",
    timeoutRemove: "لوق إزالة تايم أوت",
    timeoutRemoveDesc: "يسجل فك كتم الصوت أو التايم أوت مبكراً.",
    banAdd: "لوق الحظر (Ban)",
    banAddDesc: "يسجل الأعضاء المطرودين نهائياً والسبب والفاعل.",
    banRemove: "لوق فك الحظر (Unban)",
    banRemoveDesc: "يسجل إزالة الحظر عن الأعضاء والمسؤول.",
    nicknameChange: "لوق تعديل ألقاب الأعضاء",
    nicknameChangeDesc: "يسجل الألقاب والأسماء المستعارة القديمة والحديثة.",
    channelCreate: "لوق إنشاء الغرف",
    channelCreateDesc: "يسجل الغرف والقنوات المنشأة ونوعها والفاعل.",
    channelUpdate: "لوق تعديل الغرف",
    channelUpdateDesc: "يسجل تغيير الأسماء والصلاحيات والمواقع للرومات.",
    channelDelete: "لوق حذف الغرف",
    channelDeleteDesc: "يسجل القنوات المحذوفة والمسؤول عن مسحها.",
    roleCreate: "لوق إنشاء الرتب",
    roleCreateDesc: "يسجل الرتب والدرجات الجديدة المنشأة وصانعها.",
    roleUpdate: "لوق تعديل الرتب",
    roleUpdateDesc: "يسجل تعديل الصلاحيات أو ألوان الرتب لتفادي الثغرات.",
    roleDelete: "لوق حذف الرتب",
    roleDeleteDesc: "يسجل الرتب المحذوفة والفاعل لحفظ الهيكل التنظيمي."
  },
  en: {
    title: "Comprehensive Logging Suite",
    desc: "Track and log every action across your server with accurate metadata, executors, timestamps, and target components of each transaction.",
    saving: "Saving log configuration...",
    saveBtn: "Save Logging Options",
    noChannel: "-- Choose Log Channel --",
    statusActivated: "Logs Center Active",
    statusDeactivated: "Logs Center Deactivated",
    premiumFeature: "Anti-Log-Bypass (Premium Feature)",
    premiumDesc: "If a user attempts to delete a logged transaction to erase their tracks, the bot instantly re-posts it, mentions them, and flags the server owner via DM!",
    premiumBadge: "Premium Active ⭐️",
    premiumLockedBadge: "Requires Premium \u{1F451}",
    messagesGroup: "\u{1F4DD} Message & Chat Logs",
    membersGroup: "\u{1F465} Member Management & Audit Logs",
    channelsGroup: "⚙️ Guild Channels Logs",
    rolesGroup: "\u{1F6E1}️ Guild Roles Logs",
    messageDelete: "Message Deleted",
    messageDeleteDesc: "Logs deleted text, author, channel, and executive details.",
    messageUpdate: "Message Updated",
    messageUpdateDesc: "Logs original versus updated text in text-channels.",
    timeoutAdd: "Timeout / Mute Issued",
    timeoutAddDesc: "Logs temporal silence punishment, duration, and staff.",
    timeoutRemove: "Timeout / Mute Removed",
    timeoutRemoveDesc: "Logs early lifting of temporal communications ban.",
    banAdd: "Member Banned",
    banAddDesc: "Logs permanent guild bans with reason and audit author.",
    banRemove: "Member Unbanned",
    banRemoveDesc: "Logs unbans and administrative pardons accurately.",
    nicknameChange: "Nickname Changed",
    nicknameChangeDesc: "Logs community nickname transformations and author.",
    channelCreate: "Channel Created",
    channelCreateDesc: "Logs new text/voice channel additions and author.",
    channelUpdate: "Channel Modified",
    channelUpdateDesc: "Logs structural permission overwrite adjustments and renames.",
    channelDelete: "Channel Deleted",
    channelDeleteDesc: "Logs channel deletions for extreme structural safety.",
    roleCreate: "Role Created",
    roleCreateDesc: "Logs new roles, initial configuration, and creator.",
    roleUpdate: "Role Modified",
    roleUpdateDesc: "Logs administrative permission updates on existing roles.",
    roleDelete: "Role Deleted",
    roleDeleteDesc: "Logs role deletion events to track authority degradation."
  }
};
export function LogsConfigView({ guildId, siteLang }) {
  const lang = siteLang === "fr" ? "en" : siteLang;
  const t = localT[lang] || localT.ar;
  const isAr = lang === "ar";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [logs, setLogs] = useState({
    enabled: false,
    messageDeleteChannel: "",
    messageUpdateChannel: "",
    timeoutAddChannel: "",
    timeoutRemoveChannel: "",
    banAddChannel: "",
    banRemoveChannel: "",
    nicknameChangeChannel: "",
    channelCreateChannel: "",
    channelUpdateChannel: "",
    channelDeleteChannel: "",
    roleCreateChannel: "",
    roleUpdateChannel: "",
    roleDeleteChannel: ""
  });
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/guilds/${guildId}/config`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json())
    ]).then(([configData, structureData]) => {
      if (configData) {
        setIsPremium(!!configData.premiumExpiry && configData.premiumExpiry > Date.now());
        if (configData.logs) {
          setLogs({
            enabled: !!configData.logs.enabled,
            messageDeleteChannel: configData.logs.messageDeleteChannel || "",
            messageUpdateChannel: configData.logs.messageUpdateChannel || "",
            timeoutAddChannel: configData.logs.timeoutAddChannel || "",
            timeoutRemoveChannel: configData.logs.timeoutRemoveChannel || "",
            banAddChannel: configData.logs.banAddChannel || "",
            banRemoveChannel: configData.logs.banRemoveChannel || "",
            nicknameChangeChannel: configData.logs.nicknameChangeChannel || "",
            channelCreateChannel: configData.logs.channelCreateChannel || "",
            channelUpdateChannel: configData.logs.channelUpdateChannel || "",
            channelDeleteChannel: configData.logs.channelDeleteChannel || "",
            roleCreateChannel: configData.logs.roleCreateChannel || "",
            roleUpdateChannel: configData.logs.roleUpdateChannel || "",
            roleDeleteChannel: configData.logs.roleDeleteChannel || ""
          });
        }
      }
      if (structureData && Array.isArray(structureData.channels)) {
        setChannels(structureData.channels);
      }
    }).catch((err) => {
      console.error("Failed to load logs configuration:", err);
    }).finally(() => {
      setLoading(false);
    });
  }, [guildId]);
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: {
            message: isAr ? "تم حفظ إعدادات السجلات واللوقات بنجاح!" : "Logging configuration saved successfully!",
            type: "success"
          }
        }));
      } else {
        throw new Error();
      }
    } catch {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? "عذراً! فشل حفظ التعديلات." : "Error saving preferences. Try again.",
          type: "error"
        }
      }));
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-bold">{isAr ? "جاري تحميل لوحات وهياكل السجلات..." : "Syncing Logs Interface..."}</p>
      </div>;
  }
  const InputRow = ({
    icon: Icon,
    label,
    desc,
    valueKey
  }) => {
    return <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white/[0.01] border border-white/[0.03] hover:border-indigo-500/20 rounded-xl transition-all duration-300">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-500/10 p-2.5 rounded-lg shrink-0 mt-0.5 border border-indigo-500/10">
            <Icon className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">{label}</h4>
            <p className="text-xs text-slate-400 leading-normal max-w-lg mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="w-full md:w-64">
          <select
      disabled={!logs.enabled}
      value={logs[valueKey] || ""}
      onChange={(e) => {
        setLogs((prev) => ({ ...prev, [valueKey]: e.target.value }));
      }}
      className="w-full text-xs font-bold font-sans bg-[#06080e] border border-white/10 text-slate-300 hover:text-white px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
            <option value="">{t.noChannel}</option>
            {channels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </select>
        </div>
      </div>;
  };
  return <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="space-y-6"
  >
      {
    /* Header Panel */
  }
      <div className="p-6 bg-[#0E121E]/80 backdrop-blur-xl border border-white/5 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[300px] h-[150px] bg-indigo-500/5 blur-[50px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-indigo-400" />
              {t.title}
            </h2>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed mt-1.5">{t.desc}</p>
          </div>
          
          <button
    onClick={() => setLogs((p) => ({ ...p, enabled: !p.enabled }))}
    className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all border outline-none cursor-pointer flex items-center gap-2 ${logs.enabled ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"}`}
  >
            <span className={`w-2 h-2 rounded-full ${logs.enabled ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
            {logs.enabled ? t.statusActivated : t.statusDeactivated}
          </button>
        </div>
      </div>

      {
    /* Premium Spotlight Banner */
  }
      <div className="p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[40px] rounded-full pointer-events-none" />
        <div className="flex items-start gap-3.5 relative z-10">
          <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30 text-indigo-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-sm">{t.premiumFeature}</h3>
              <span className={`px-2 py-0.5 text-[9px] font-black tracking-wider uppercase rounded-full ${isPremium ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-purple-600 text-white"}`}>
                {isPremium ? t.premiumBadge : t.premiumLockedBadge}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl mt-1">{t.premiumDesc}</p>
          </div>
        </div>
      </div>

      {
    /* Accordion Categories */
  }
      <div className="space-y-6">
        
        {
    /* CATEGORY 1: Messages Logs */
  }
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <h3 className="text-xs font-black uppercase text-indigo-300 tracking-wider font-sans">{t.messagesGroup}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <InputRow
    icon={Trash2}
    label={t.messageDelete}
    desc={t.messageDeleteDesc}
    valueKey="messageDeleteChannel"
  />
            <InputRow
    icon={Pencil}
    label={t.messageUpdate}
    desc={t.messageUpdateDesc}
    valueKey="messageUpdateChannel"
  />
          </div>
        </div>

        {
    /* CATEGORY 2: Members Logs */
  }
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <h3 className="text-xs font-black uppercase text-indigo-300 tracking-wider font-sans">{t.membersGroup}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <InputRow
    icon={Clock}
    label={t.timeoutAdd}
    desc={t.timeoutAddDesc}
    valueKey="timeoutAddChannel"
  />
            <InputRow
    icon={CheckCircle}
    label={t.timeoutRemove}
    desc={t.timeoutRemoveDesc}
    valueKey="timeoutRemoveChannel"
  />
            <InputRow
    icon={UserX}
    label={t.banAdd}
    desc={t.banAddDesc}
    valueKey="banAddChannel"
  />
            <InputRow
    icon={UserCheck}
    label={t.banRemove}
    desc={t.banRemoveDesc}
    valueKey="banRemoveChannel"
  />
            <InputRow
    icon={ArrowLeftRight}
    label={t.nicknameChange}
    desc={t.nicknameChangeDesc}
    valueKey="nicknameChangeChannel"
  />
          </div>
        </div>

        {
    /* CATEGORY 3: Channels Logs */
  }
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <h3 className="text-xs font-black uppercase text-indigo-300 tracking-wider font-sans">{t.channelsGroup}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <InputRow
    icon={FolderPlus}
    label={t.channelCreate}
    desc={t.channelCreateDesc}
    valueKey="channelCreateChannel"
  />
            <InputRow
    icon={Folder}
    label={t.channelUpdate}
    desc={t.channelUpdateDesc}
    valueKey="channelUpdateChannel"
  />
            <InputRow
    icon={FolderMinus}
    label={t.channelDelete}
    desc={t.channelDeleteDesc}
    valueKey="channelDeleteChannel"
  />
          </div>
        </div>

        {
    /* CATEGORY 4: Roles Logs */
  }
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <h3 className="text-xs font-black uppercase text-indigo-300 tracking-wider font-sans">{t.rolesGroup}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <InputRow
    icon={Layers}
    label={t.roleCreate}
    desc={t.roleCreateDesc}
    valueKey="roleCreateChannel"
  />
            <InputRow
    icon={Layers}
    label={t.roleUpdate}
    desc={t.roleUpdateDesc}
    valueKey="roleUpdateChannel"
  />
            <InputRow
    icon={Layers}
    label={t.roleDelete}
    desc={t.roleDeleteDesc}
    valueKey="roleDeleteChannel"
  />
          </div>
        </div>

      </div>

      {
    /* Floating Control Save Bar */
  }
      <div className="pt-4 border-t border-white/5 flex items-center justify-end">
        <button
    onClick={handleSave}
    disabled={saving}
    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-6 py-3 rounded-xl shadow-lg transition disabled:opacity-50 select-none cursor-pointer text-xs"
  >
          {saving ? <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t.saving}</span>
            </> : <>
              <Save className="w-4 h-4" />
              <span>{t.saveBtn}</span>
            </>}
        </button>
      </div>

    </motion.div>;
}
