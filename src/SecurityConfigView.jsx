import { useState, useEffect, useRef } from "react";
import { Loader2, ShieldCheck, ShieldAlert, Plus, Trash2, Ban, ShieldX, Sparkles, Check, Save } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
const localT = {
  ar: {
    title: "نظام حماية السيرفر والرقابة المحكم",
    desc: "قم بتفعيل خوارزميات الحماية الدقيقة والروابط والتحكم بالصلاحيات لردع التخريب",
    saving: "جاري حفظ إعدادات الحصن الجيد...",
    saveBtn: "حفظ إعدادات الحماية الفريدة",
    purityLabel: "درع الحماية المتكامل - NTL Active Shield",
    // AutoMod
    autoModTitle: "نظام الرقابة الآلي الذكي (Discord AutoMod Words)",
    autoModDesc: "امنع استخدام كلمات أو عبارات غير لائقة؛ سيقوم محرك البوت الرسمي في ديسكورد (Discord Native AutoMod) بحجب وحظر الكلمات تلقائياً قبل إرسالها أو ظهورها للعيان بالقناة فوراً!",
    addWordPlaceholder: "اكتب الكلمة أو العبارة المحظورة...",
    addWordBtn: "إضافة للمنع",
    noWords: "لا توجد كلمات محظورة حالياً. السيرفر نظيف آمن!",
    blockedLabel: "الكلمات المحظورة نشطة",
    // Link Protection
    linkTitle: "حماية الروابط والسبام الفورية",
    linkDesc: "منع الأعضاء غير الإداريين من نشر الروابط الإعلانية بجميع أنواعها. يُفعل حماية ديسكورد الرسمية المباشرة لمنع إرسال الرسالة نهائياً.",
    linkStatus: "حالة حماية الروابط",
    active: "نشط ومسؤول",
    inactive: "معطل ومفتوح",
    // Anti-Spam System
    spamTitle: "نظام منع وحظر السبام وتكرار الرسائل (Anti-Spam Filter)",
    spamDesc: "امنع تدفق وإغراق غرف الدردشة بالرسائل المزعجة المتتالية؛ سيقوم البوت بمراقبة سرعة إرسال الرسائل وحظر أو كتم منسقي السبام فوراً مع خاصية حذف كامل رسائل السبام السابقة لضمان بيئة نظيفة ومريحة.",
    spamStatus: "حالة نظام مكافحة السبام",
    spamLimitLabel: "الحد الأقصى للرسائل المتتالية المسموحة:",
    spamIntervalLabel: "المدة الزمنية للفحص (ثواني):",
    spamPunishLabel: "⚠️ عقوبة إرسال السبام والإزعاج:",
    spamDeleteLabel: "\u{1F5D1}️ حذف كامل رسائل السبام السابقة من بداية المخالفة فوراً",
    // Anti-Raid / Server Protection
    antiRaidTitle: "جدار حماية السيرفر المضاد للتخريب (Anti-Raid Dashboard)",
    antiRaidDesc: "حماية كاملة ومقاومة للهاكرز وحسابات المنسقين المخترقة مع خاصية استرجاع وتصليح الضرر فوراً ودون تدخل بشري.",
    // Configurable specific sub protections
    chCreateLabel: "منع إنشاء وتعديل الرومات وصلاحياتها",
    chCreateDesc: "يمنع تزييف غرف جديدة أو التلاعب بصلاحية أي روم لإظهارها للعامة عن طريق الخطأ.",
    chDeleteLabel: "منع حذف الرومات (مع خاصية الاسترجاع التلقائي)",
    chDeleteDesc: "إذا حذف أي منسق روم بالخطأ أو العمد، يعيد البوت الروم فوراً بنفس الاسم والموقع والنوع وبكل الصلاحيات السابقة!",
    roleCreateLabel: "منع إنشاء وتعديل الرتب وصلاحياتها",
    roleCreateDesc: "يمنع صنع رتب جديدة تمنح قدرات إدارية، أو التلاعب برتب موجودة لإضافة صلاحيات خطيرة.",
    roleDeleteLabel: "منع حذف الرتب (استرجاع فوري وإعادة التسكين)",
    roleDeleteDesc: "إذا حُذفت أي رتبة، سيعيدها البوت بنفس الألوان والصلاحيات، وسيقوم فوراً بإعادة توزيعها على جميع الأعضاء الذين سُلبت منهم تلقائياً!",
    botInviteLabel: "منع إدخال البوتات المجهولة (Anti-Bots)",
    botInviteDesc: "يمنع أي منسق من إدخال بوتات مجهولة أو ملغمة تخرب الرومات وتدمر البيانات، ويتم طرد البوت الغريب فور دخوله والسيرفر في مأمن.",
    // Punishments
    punishTitle: "عقوبات المخربين وتوجيه الإشعارات لخاص المالك",
    punishDesc: "اختر العقاب الفوري المطبق على مرتكب الفعل؛ علماً بأن الإشعارات والتحذيرات الأمنية ترسل فقط لخاص صاحب السيرفر (Server Owner DMs Only) لحمايتك الكاملة من الفتنة والتشويش:",
    punishSelect: "تنفيذ الإجراء الفوري القاسي المبرمج",
    demote: "سحب الصلاحيات الرتبوية بشكل كامل وفوري",
    kick: "طرد فوري من الخادم (Kick)",
    ban: "حظر نهائي ومؤبد من السيرفر (Ban)",
    none: "تسجيل التحذير والحدث لخاص المالك فقط (Log Only)",
    ownerOnlyWarning: "تعديل إعدادات الحماية المتقدمة متاح فقط لمالك السيرفر الرئيسي",
    ownerOnlyWarningDesc: "بصفتك مسؤولاً إدارياً، يمكنك تعديل كلمات الفلتر (السب) ومنع الروابط فقط. باقي خيارات مكافحة التخريب والسبام وتعديل رتب وقنوات السيرفر مقفلة ومخصصة حصراً لصاحب الخادم لحماية أمن المنشأة."
  },
  en: {
    title: "Granular Server Protection & Security Hub",
    desc: "Deploy specific defense systems to block spans, illegal invitations, unauthorized deletions, and auto-restore server structures.",
    saving: "Applying protection values...",
    saveBtn: "Apply Configured Shield Rules",
    purityLabel: "NTL Active Shield Core",
    // AutoMod
    autoModTitle: "AutoMod Word Filters",
    autoModDesc: "Block forbidden phrases using Discord native engine before they appear on the channel.",
    addWordPlaceholder: "Add new restricted term...",
    addWordBtn: "Filter Word",
    noWords: "No bad words currently filtered.",
    blockedLabel: "Currently Restricted List",
    // Link Protection
    linkTitle: "Instant Link Protector",
    linkDesc: "Prevent non-privileged members from dropping HTTP/HTTPS social invites or advertisement links.",
    linkStatus: "Link Filter State",
    active: "Shield Active",
    inactive: "Shield Inactive",
    // Anti-Spam System
    spamTitle: "Rapid Anti-Spam Shield Protection",
    spamDesc: "Shield text chats from rapid repetitive flooding; monitors message dispatch intervals and auto-applies punishments or timeouts with cleanups for all prior messages.",
    spamStatus: "Anti-Spam Protect State",
    spamLimitLabel: "Maximum sequential messages allowed:",
    spamIntervalLabel: "Time inspection window (seconds):",
    spamPunishLabel: "⚠️ Spam Abuse Punishment Options:",
    spamDeleteLabel: "\u{1F5D1}️ Purge all matching spam messages from starting trigger",
    // Anti-Raid / Server Protection
    antiRaidTitle: "Anti-Raid Dashboard",
    antiRaidDesc: "Defend against hacker groups or rogue managers with instantaneous state restoration backups.",
    chCreateLabel: "Block Channel Creation & Adjustments",
    chCreateDesc: "Block any attempt to craft new rooms or tamper with visibility parameters.",
    chDeleteLabel: "Block Channel Deletion (Auto-Recreation Rollback)",
    chDeleteDesc: "If a channel is deleted, NTL dashboard recreates it instantly retaining its configuration, category, and exact permission overwrites!",
    roleCreateLabel: "Block Role Creation & Edits",
    roleCreateDesc: "Block anyone from creating ranks with administration scopes or bypassing hierarchy permissions.",
    roleDeleteLabel: "Block Role Deletion (Auto-Restore Roles & Members)",
    roleDeleteDesc: "If a role is deleted, NTL recreates the role with original permissions/colors and immediately re-assigns them to all members!",
    botInviteLabel: "Block Rogue Bots Integrations (Anti-Bots Invite)",
    botInviteDesc: "Instantly kicks or bans any strange bots brought in by unauthorized players.",
    // Punishments
    punishTitle: "Violators Discipline & Private Owner Warnings",
    punishDesc: "Pick how the bot immediately treats violating staff. All safety reports and details are communicated to the Server Owner's DMs ONLY:",
    punishSelect: "Scheduled Retaliation Action",
    demote: "Strip Roles / Demote and Remove All Staff Ranks",
    kick: "Kick Violator Instantly",
    ban: "Ban Violator Permanently",
    none: "Send reports directly to Owner DM without punishment",
    ownerOnlyWarning: "Advanced protection settings are restricted to the Server Owner",
    ownerOnlyWarningDesc: "As an administrator, you are allowed to modify word filters & link protections only. Anti-raid, anti-spam, punishments, and structural safeguards are restricted exclusively to the primary server owner."
  }
};
export function SecurityConfigView({ guildId, siteLang, isOwner, onDirtyChange }) {
  const lang = siteLang === "fr" ? "en" : siteLang;
  const isAr = lang === "ar";
  const text = localT[lang] || localT.ar;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [security, setSecurity] = useState({
    blockedWords: [],
    linkProtection: false,
    channelsCreateProtection: false,
    channelsDeleteProtection: false,
    rolesCreateProtection: false,
    rolesDeleteProtection: false,
    botsProtection: false,
    punishment: "none",
    wordPunishment: "none",
    wordPunishmentDuration: 5,
    wordPunishmentUnit: "minutes",
    linkPunishment: "none",
    linkPunishmentDuration: 5,
    linkPunishmentUnit: "minutes",
    spamProtection: false,
    spamLimit: 5,
    spamInterval: 5,
    spamPunishment: "none",
    spamPunishmentDuration: 5,
    spamPunishmentUnit: "minutes",
    spamDeleteAllComments: true
  });
  useEffect(() => {
    fetch(`/api/guilds/${guildId}/config`).then((res) => res.json()).then((data) => {
      if (data && data.security) {
        setSecurity({
          blockedWords: data.security.blockedWords || [],
          linkProtection: !!data.security.linkProtection,
          channelsCreateProtection: !!data.security.channelsCreateProtection,
          channelsDeleteProtection: !!data.security.channelsDeleteProtection,
          rolesCreateProtection: !!data.security.rolesCreateProtection,
          rolesDeleteProtection: !!data.security.rolesDeleteProtection,
          botsProtection: !!data.security.botsProtection,
          punishment: data.security.punishment || "none",
          wordPunishment: data.security.wordPunishment || "none",
          wordPunishmentDuration: data.security.wordPunishmentDuration || 5,
          wordPunishmentUnit: data.security.wordPunishmentUnit || "minutes",
          linkPunishment: data.security.linkPunishment || "none",
          linkPunishmentDuration: data.security.linkPunishmentDuration || 5,
          linkPunishmentUnit: data.security.linkPunishmentUnit || "minutes",
          spamProtection: !!data.security.spamProtection,
          spamLimit: data.security.spamLimit || 5,
          spamInterval: data.security.spamInterval || 5,
          spamPunishment: data.security.spamPunishment || "none",
          spamPunishmentDuration: data.security.spamPunishmentDuration || 5,
          spamPunishmentUnit: data.security.spamPunishmentUnit || "minutes",
          spamDeleteAllComments: data.security.spamDeleteAllComments !== false
        });
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [guildId]);

  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (loading) {
      isInitialLoad.current = true;
      return;
    }
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (onDirtyChange) onDirtyChange(true);
  }, [security, loading]);

  const handleRestrictedClick = (actionName) => {
    if (!isOwner) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? `❌ خيار مغلق: إجراء "${actionName}" متاح فقط لمالك السيرفر الأساسي!` : `❌ Locked option: "${actionName}" is only available to the main server owner!`,
          type: "error"
        }
      }));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullConfigRes = await fetch(`/api/guilds/${guildId}/config`);
      const fullConfig = await fullConfigRes.json();
      let finalSecurity = security;
      if (!isOwner) {
        const dbSecurity = fullConfig.security || {};
        finalSecurity = {
          ...security,
          channelsCreateProtection: !!dbSecurity.channelsCreateProtection,
          channelsDeleteProtection: !!dbSecurity.channelsDeleteProtection,
          rolesCreateProtection: !!dbSecurity.rolesCreateProtection,
          rolesDeleteProtection: !!dbSecurity.rolesDeleteProtection,
          botsProtection: !!dbSecurity.botsProtection,
          spamProtection: !!dbSecurity.spamProtection,
          spamLimit: dbSecurity.spamLimit || 5,
          spamInterval: dbSecurity.spamInterval || 5,
          spamPunishment: dbSecurity.spamPunishment || "none",
          spamPunishmentDuration: dbSecurity.spamPunishmentDuration || 5,
          spamPunishmentUnit: dbSecurity.spamPunishmentUnit || "minutes",
          spamDeleteAllComments: dbSecurity.spamDeleteAllComments !== false,
          punishment: dbSecurity.punishment || "none"
        };
      }
      const updatedConfig = {
        ...fullConfig,
        security: finalSecurity
      };
      const response = await fetch(`/api/guilds/${guildId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      const resData = await response.json();
      if (response.status >= 400 || (resData && resData.success === false)) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: `❌ ${resData?.error || "Failed to save configuration"}`, type: "error" }
        }));
        return;
      }
      if (!isOwner) {
        setSecurity(finalSecurity);
      }
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: isAr ? "تم تحديث جدار الحماية وتفعيل أنظمة الغرف والعودة التلقائية! \u{1F6E1}️" : "Granular security backup settings applied successfully with rollbacks active! \u{1F6E1}️", type: "success" }
      }));
      if (onDirtyChange) onDirtyChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  useEffect(() => {
    const handleTriggerSave = () => {
      handleSave();
    };
    const handleTriggerCancel = () => {
      setLoading(true);
      fetch(`/api/guilds/${guildId}/config`).then((res) => res.json()).then((data) => {
        if (data && data.security) {
          setSecurity({
            blockedWords: data.security.blockedWords || [],
            linkProtection: !!data.security.linkProtection,
            channelsCreateProtection: !!data.security.channelsCreateProtection,
            channelsDeleteProtection: !!data.security.channelsDeleteProtection,
            rolesCreateProtection: !!data.security.rolesCreateProtection,
            rolesDeleteProtection: !!data.security.rolesDeleteProtection,
            botsProtection: !!data.security.botsProtection,
            punishment: data.security.punishment || "none",
            wordPunishment: data.security.wordPunishment || "none",
            wordPunishmentDuration: data.security.wordPunishmentDuration || 5,
            wordPunishmentUnit: data.security.wordPunishmentUnit || "minutes",
            linkPunishment: data.security.linkPunishment || "none",
            linkPunishmentDuration: data.security.linkPunishmentDuration || 5,
            linkPunishmentUnit: data.security.linkPunishmentUnit || "minutes",
            spamProtection: !!data.security.spamProtection,
            spamLimit: data.security.spamLimit || 5,
            spamInterval: data.security.spamInterval || 5,
            spamPunishment: data.security.spamPunishment || "none",
            spamPunishmentDuration: data.security.spamPunishmentDuration || 5,
            spamPunishmentUnit: data.security.spamPunishmentUnit || "minutes",
            spamDeleteAllComments: data.security.spamDeleteAllComments !== false
          });
        }
        setLoading(false);
        if (onDirtyChange) onDirtyChange(false);
      }).catch(() => {
        setLoading(false);
      });
    };
    window.addEventListener("trigger-save", handleTriggerSave);
    window.addEventListener("trigger-cancel", handleTriggerCancel);
    return () => {
      window.removeEventListener("trigger-save", handleTriggerSave);
      window.removeEventListener("trigger-cancel", handleTriggerCancel);
    };
  }, [security, guildId]);
  const addWord = () => {
    const word = newWord.trim();
    if (!word) return;
    if (security.blockedWords.includes(word)) {
      setNewWord("");
      return;
    }
    setSecurity((prev) => ({
      ...prev,
      blockedWords: [...prev.blockedWords, word]
    }));
    setNewWord("");
  };
  const removeWord = (wordToRemove) => {
    setSecurity((prev) => ({
      ...prev,
      blockedWords: prev.blockedWords.filter((w) => w !== wordToRemove)
    }));
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addWord();
    }
  };
  if (loading) {
    return <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-rose-500 w-8 h-8" />
      </div>;
  }
  const isProtectionActive = security.channelsCreateProtection || security.channelsDeleteProtection || security.rolesCreateProtection || security.rolesDeleteProtection || security.botsProtection || security.linkProtection || security.blockedWords.length > 0;
  return <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {
    /* Intro Header */
  }
      <div className="bg-black/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center md:justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4 text-center md:text-right">
            <div className={`w-14 h-14 flex items-center justify-center rounded-2xl border transition-all duration-300 ${isProtectionActive ? "bg-rose-500/20 border-rose-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-amber-500/20 border-amber-500/20"}`}>
              <ShieldCheck className={`w-8 h-8 ${isProtectionActive ? "text-rose-400" : "text-amber-400"}`} />
            </div>
            <div>
              <h4 className="text-xl font-black text-white leading-tight flex items-center justify-center md:justify-start gap-2">
                {text.title}
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              </h4>
              <p className="text-xs text-slate-400 mt-1">{text.desc}</p>
            </div>
          </div>
          
          <div className="text-xs font-bold text-slate-400 font-mono tracking-widest bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 uppercase select-none">
            {text.purityLabel}
          </div>
        </div>
      </div>

      {
    /* AutoMod Guards */
  }
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {
    /* Anti-Spam Link Guard */
  }
        <div className="bg-black/25 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center bg-rose-500/20 rounded-xl border border-rose-500/20">
                <ShieldX className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h5 className="text-base font-black text-white">{text.linkTitle}</h5>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase font-bold mt-0.5">{text.linkStatus}</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed mb-6">{text.linkDesc}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <span className="text-xs text-white font-bold">{isAr ? "درع منع الروابط" : "Prevent links"}</span>
              <button
    onClick={() => setSecurity((prev) => ({ ...prev, linkProtection: !prev.linkProtection }))}
    className={`font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${security.linkProtection ? "bg-rose-500 border border-rose-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]" : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400"}`}
  >
                <div className={`w-2.5 h-2.5 rounded-full ${security.linkProtection ? "bg-white animate-pulse" : "bg-slate-500"}`} />
                {security.linkProtection ? text.active : text.inactive}
              </button>
            </div>

            {security.linkProtection && <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                <span className="text-xs font-bold text-rose-300 block">
                  {isAr ? "⚠️ عقوبة نشر الروابط:" : "⚠️ Link Posting Punishment:"}
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <select
    value={security.linkPunishment || "none"}
    onChange={(e) => setSecurity((prev) => ({ ...prev, linkPunishment: e.target.value }))}
    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none"
  >
                    <option value="none" className="bg-slate-900">{isAr ? "منع مع حذف الكلمة فقط" : "Block & Delete Only"}</option>
                    <option value="warn" className="bg-slate-900">{isAr ? "تحذير وتنبيه" : "Warn Member"}</option>
                    <option value="timeout" className="bg-slate-900">{isAr ? "كتم / تايم أوت (Timeout)" : "Mute / Timeout member"}</option>
                    <option value="kick" className="bg-slate-900">{isAr ? "طرد فوري (Kick)" : "Instant Kick"}</option>
                    <option value="ban" className="bg-slate-900">{isAr ? "حظر نهائي (Ban)" : "Permanent Ban"}</option>
                  </select>

                  {security.linkPunishment === "timeout" && <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                      <input
    type="number"
    min="1"
    value={security.linkPunishmentDuration || 5}
    onChange={(e) => setSecurity((prev) => ({ ...prev, linkPunishmentDuration: Math.max(1, parseInt(e.target.value) || 1) }))}
    className="bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none w-16 text-center"
  />
                      <select
    value={security.linkPunishmentUnit || "minutes"}
    onChange={(e) => setSecurity((prev) => ({ ...prev, linkPunishmentUnit: e.target.value }))}
    className="bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none flex-1"
  >
                        <option value="minutes" className="bg-slate-900">{isAr ? "دقائق" : "Minutes"}</option>
                        <option value="hours" className="bg-slate-900">{isAr ? "ساعات" : "Hours"}</option>
                        <option value="days" className="bg-slate-900">{isAr ? "أيام" : "Days"}</option>
                      </select>
                    </div>}
                </div>
              </div>}
          </div>
        </div>

        {
    /* Word AutoMod Section */
  }
        <div className="bg-black/25 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 flex items-center justify-center bg-amber-500/20 rounded-xl border border-amber-500/20 font-mono text-xl font-bold text-amber-300">
                #
              </div>
              <div>
                <h5 className="text-base font-black text-white">{text.autoModTitle}</h5>
                <p className="text-[10px] text-slate-400 tracking-wider uppercase font-bold mt-0.5">{text.blockedLabel}</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed mb-6">{text.autoModDesc}</p>
          </div>

          {
    /* Quick Input */
  }
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
    type="text"
    value={newWord}
    onChange={(e) => setNewWord(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder={text.addWordPlaceholder}
    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-right md:text-left"
  />
              <button
    onClick={addWord}
    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer"
  >
                <Plus className="w-4 h-4" />
                {text.addWordBtn}
              </button>
            </div>

            {
    /* Configured banned words */
  }
            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-2 bg-black/30 rounded-xl border border-white/5">
              <AnimatePresence>
                {security.blockedWords.length === 0 ? <div className="w-full text-center py-4 text-xs text-slate-500 italic">
                    {text.noWords}
                  </div> : security.blockedWords.map((w) => <motion.span
    key={w}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.8, opacity: 0 }}
    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-slate-200 rounded-lg text-xs transition-all font-mono"
  >
                      <span>{w}</span>
                      <button
    onClick={() => removeWord(w)}
    className="text-slate-400 hover:text-red-400 transition-colors"
  >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.span>)}
              </AnimatePresence>
            </div>

            {security.blockedWords.length > 0 && <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 mt-4">
                <span className="text-xs font-bold text-amber-300 block">
                  {isAr ? "⚠️ عقوبة استخدام الكلمات المسيئة:" : "⚠️ Bad Words Abuse Punishment:"}
                </span>
                <div className="grid grid-cols-1 gap-2">
                  <select
    value={security.wordPunishment || "none"}
    onChange={(e) => setSecurity((prev) => ({ ...prev, wordPunishment: e.target.value }))}
    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none"
  >
                    <option value="none" className="bg-slate-900">{isAr ? "حجب مع حذف الكلمة فقط" : "Block & Delete Only"}</option>
                    <option value="warn" className="bg-slate-900">{isAr ? "تحذير وتنبيه" : "Warn Member"}</option>
                    <option value="timeout" className="bg-slate-900">{isAr ? "كتم / تايم أوت (Timeout)" : "Mute / Timeout member"}</option>
                    <option value="kick" className="bg-slate-900">{isAr ? "طرد فوري (Kick)" : "Instant Kick"}</option>
                    <option value="ban" className="bg-slate-900">{isAr ? "حظر نهائي (Ban)" : "Permanent Ban"}</option>
                  </select>

                  {security.wordPunishment === "timeout" && <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                      <input
    type="number"
    min="1"
    value={security.wordPunishmentDuration || 5}
    onChange={(e) => setSecurity((prev) => ({ ...prev, wordPunishmentDuration: Math.max(1, parseInt(e.target.value) || 1) }))}
    className="bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none w-16 text-center"
  />
                      <select
    value={security.wordPunishmentUnit || "minutes"}
    onChange={(e) => setSecurity((prev) => ({ ...prev, wordPunishmentUnit: e.target.value }))}
    className="bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none flex-1"
  >
                        <option value="minutes" className="bg-slate-900">{isAr ? "دقائق" : "Minutes"}</option>
                        <option value="hours" className="bg-slate-900">{isAr ? "ساعات" : "Hours"}</option>
                        <option value="days" className="bg-slate-900">{isAr ? "أيام" : "Days"}</option>
                      </select>
                    </div>}
                </div>
              </div>}
          </div>
        </div>

      </div>

      {
    /* Warning if not owner */
  }
      {!isOwner && <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 backdrop-blur-sm shadow-md flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-10 h-10 flex items-center justify-center bg-amber-500/20 rounded-xl border border-amber-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div className="space-y-1">
            <h5 className="text-sm font-black text-amber-300 leading-snug">{text.ownerOnlyWarning}</h5>
            <p className="text-xs text-slate-400 leading-relaxed">{text.ownerOnlyWarningDesc}</p>
          </div>
        </div>}

      {
    /* Anti-Spam Shield View */
  }
      <div className={`bg-black/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl ${!isOwner ? "opacity-85" : ""}`}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-rose-500/20 rounded-xl border border-rose-500/20">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h4 className="text-lg font-black text-white leading-tight">{text.spamTitle}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">{text.spamDesc}</p>
            </div>
          </div>

          <button
    onClick={() => {
      if (handleRestrictedClick(isAr ? "مكافحة السبام" : "Anti-Spam Shield")) {
        setSecurity((prev) => ({ ...prev, spamProtection: !prev.spamProtection }));
      }
    }}
    className={`font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${!isOwner ? "opacity-60 cursor-not-allowed" : ""} ${security.spamProtection ? "bg-rose-500 border border-rose-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]" : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400"}`}
  >
            <div className={`w-2.5 h-2.5 rounded-full ${security.spamProtection ? "bg-white animate-pulse" : "bg-slate-500"}`} />
            {security.spamProtection ? text.active : text.inactive}
          </button>
        </div>

        {security.spamProtection && <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {
    /* Spam count limits */
  }
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-300 block">{text.spamLimitLabel}</label>
                <input
    type="number"
    min="3"
    max="15"
    disabled={!isOwner}
    value={security.spamLimit || 5}
    onChange={(e) => setSecurity((prev) => ({ ...prev, spamLimit: Math.max(3, parseInt(e.target.value) || 3) }))}
    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
  />
              </div>

              {
    /* Spam time interval */
  }
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-300 block">{text.spamIntervalLabel}</label>
                <input
    type="number"
    min="2"
    max="20"
    disabled={!isOwner}
    value={security.spamInterval || 5}
    onChange={(e) => setSecurity((prev) => ({ ...prev, spamInterval: Math.max(2, parseInt(e.target.value) || 2) }))}
    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
  />
              </div>
            </div>

            {
    /* Delete all messages option */
  }
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <span className="text-xs text-white font-bold">{text.spamDeleteLabel}</span>
              <button
    disabled={!isOwner}
    onClick={() => setSecurity((prev) => ({ ...prev, spamDeleteAllComments: !prev.spamDeleteAllComments }))}
    className={`font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${!isOwner ? "opacity-50 cursor-not-allowed" : ""} ${security.spamDeleteAllComments ? "bg-rose-500/20 border border-rose-500/30 text-rose-300" : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400"}`}
  >
                {security.spamDeleteAllComments ? isAr ? "نعم، مسح فوري" : "Yes, purge" : isAr ? "لا، كتم فقط" : "No, retain"}
              </button>
            </div>

            {
    /* Spam punishment selection */
  }
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
              <span className="text-xs font-bold text-rose-300 block">
                {text.spamPunishLabel}
              </span>
              <div className="grid grid-cols-1 gap-2">
                <select
    disabled={!isOwner}
    value={security.spamPunishment || "none"}
    onChange={(e) => setSecurity((prev) => ({ ...prev, spamPunishment: e.target.value }))}
    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
  >
                  <option value="none" className="bg-slate-900">{isAr ? "تحذير ومسح رسائله فقط" : "Warn & Clear messages only"}</option>
                  <option value="timeout" className="bg-slate-900">{isAr ? "كتم / تايم أوت (Timeout)" : "Mute / Timeout member"}</option>
                  <option value="kick" className="bg-slate-900">{isAr ? "طرد فوري من الخادم (Kick)" : "Instant Kick"}</option>
                  <option value="ban" className="bg-slate-900">{isAr ? "حظر نهائي تام (Ban)" : "Permanent Ban"}</option>
                </select>

                {security.spamPunishment === "timeout" && <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                    <input
    type="number"
    min="1"
    value={security.spamPunishmentDuration || 5}
    onChange={(e) => setSecurity((prev) => ({ ...prev, spamPunishmentDuration: Math.max(1, parseInt(e.target.value) || 1) }))}
    className="bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none w-16 text-center"
  />
                    <select
    value={security.spamPunishmentUnit || "minutes"}
    onChange={(e) => setSecurity((prev) => ({ ...prev, spamPunishmentUnit: e.target.value }))}
    className="bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none flex-1"
  >
                      <option value="minutes" className="bg-slate-900">{isAr ? "دقائق" : "Minutes"}</option>
                      <option value="hours" className="bg-slate-900">{isAr ? "ساعات" : "Hours"}</option>
                      <option value="days" className="bg-slate-900">{isAr ? "أيام" : "Days"}</option>
                    </select>
                  </div>}
              </div>
            </div>
          </div>}
      </div>

      {
    /* Expanded Shield Safeguards (Channels, Roles, Bots fully split) */
  }
      <div className={`bg-black/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm shadow-xl ${!isOwner ? "opacity-85" : ""}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center bg-rose-500/20 rounded-xl border border-rose-500/20">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h4 className="text-lg font-black text-white leading-tight">{text.antiRaidTitle}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">{text.antiRaidDesc}</p>
          </div>
        </div>

        <div className="space-y-4">
          
          {
    /* 1. Channel creation / edit protect */
  }
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="space-y-0.5">
              <h5 className="text-sm font-bold text-white">{text.chCreateLabel}</h5>
              <p className="text-xs text-slate-500 leading-tight max-w-xl">{text.chCreateDesc}</p>
            </div>
            
            <button
    onClick={() => {
      if (handleRestrictedClick(isAr ? "منع إنشاء القنوات" : "Block Channel Creation")) {
        setSecurity((prev) => ({ ...prev, channelsCreateProtection: !prev.channelsCreateProtection }));
      }
    }}
    className={`font-black text-xs px-4 py-2 rounded-lg transition-all shrink-0 flex items-center gap-2 cursor-pointer ${!isOwner ? "opacity-60 cursor-not-allowed" : ""} ${security.channelsCreateProtection ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md" : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400"}`}
  >
              <Check className={`w-3.5 h-3.5 transition-transform ${security.channelsCreateProtection ? "scale-100" : "scale-0"}`} />
              {security.channelsCreateProtection ? text.active : text.inactive}
            </button>
          </div>

          {
    /* 2. Channel deletion protect */
  }
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="space-y-0.5">
              <h5 className="text-sm font-bold text-rose-300 leading-snug">{text.chDeleteLabel}</h5>
              <p className="text-xs text-slate-500 leading-tight max-w-xl">{text.chDeleteDesc}</p>
            </div>
            
            <button
    onClick={() => {
      if (handleRestrictedClick(isAr ? "منع حذف القنوات" : "Block Channel Deletion")) {
        setSecurity((prev) => ({ ...prev, channelsDeleteProtection: !prev.channelsDeleteProtection }));
      }
    }}
    className={`font-black text-xs px-4 py-2 rounded-lg transition-all shrink-0 flex items-center gap-2 cursor-pointer ${!isOwner ? "opacity-60 cursor-not-allowed" : ""} ${security.channelsDeleteProtection ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md" : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400"}`}
  >
              <Check className={`w-3.5 h-3.5 transition-transform ${security.channelsDeleteProtection ? "scale-100" : "scale-0"}`} />
              {security.channelsDeleteProtection ? text.active : text.inactive}
            </button>
          </div>

          {
    /* 3. Role creation / edit protect */
  }
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="space-y-0.5">
              <h5 className="text-sm font-bold text-white">{text.roleCreateLabel}</h5>
              <p className="text-xs text-slate-500 leading-tight max-w-xl">{text.roleCreateDesc}</p>
            </div>
            
            <button
    onClick={() => {
      if (handleRestrictedClick(isAr ? "منع إنشاء الرتب" : "Block Role Creation")) {
        setSecurity((prev) => ({ ...prev, rolesCreateProtection: !prev.rolesCreateProtection }));
      }
    }}
    className={`font-black text-xs px-4 py-2 rounded-lg transition-all shrink-0 flex items-center gap-2 cursor-pointer ${!isOwner ? "opacity-60 cursor-not-allowed" : ""} ${security.rolesCreateProtection ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md" : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400"}`}
  >
              <Check className={`w-3.5 h-3.5 transition-transform ${security.rolesCreateProtection ? "scale-100" : "scale-0"}`} />
              {security.rolesCreateProtection ? text.active : text.inactive}
            </button>
          </div>

          {
    /* 4. Role deletion protect */
  }
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="space-y-0.5">
              <h5 className="text-sm font-bold text-rose-300 leading-snug">{text.roleDeleteLabel}</h5>
              <p className="text-xs text-slate-500 leading-tight max-w-xl">{text.roleDeleteDesc}</p>
            </div>
            
            <button
    onClick={() => {
      if (handleRestrictedClick(isAr ? "منع حذف الرتب" : "Block Role Deletion")) {
        setSecurity((prev) => ({ ...prev, rolesDeleteProtection: !prev.rolesDeleteProtection }));
      }
    }}
    className={`font-black text-xs px-4 py-2 rounded-lg transition-all shrink-0 flex items-center gap-2 cursor-pointer ${!isOwner ? "opacity-60 cursor-not-allowed" : ""} ${security.rolesDeleteProtection ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md" : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400"}`}
  >
              <Check className={`w-3.5 h-3.5 transition-transform ${security.rolesDeleteProtection ? "scale-100" : "scale-0"}`} />
              {security.rolesDeleteProtection ? text.active : text.inactive}
            </button>
          </div>

          {
    /* 5. Bots Addition Blocker */
  }
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="space-y-0.5">
              <h5 className="text-sm font-bold text-rose-400 leading-snug">{text.botInviteLabel}</h5>
              <p className="text-xs text-slate-500 leading-tight max-w-xl">{text.botInviteDesc}</p>
            </div>
            
            <button
    onClick={() => {
      if (handleRestrictedClick(isAr ? "منع إدخال البوتات" : "Block Rogue Bots Invite")) {
        setSecurity((prev) => ({ ...prev, botsProtection: !prev.botsProtection }));
      }
    }}
    className={`font-black text-xs px-4 py-2 rounded-lg transition-all shrink-0 flex items-center gap-2 cursor-pointer ${!isOwner ? "opacity-60 cursor-not-allowed" : ""} ${security.botsProtection ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md" : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400"}`}
  >
              <Check className={`w-3.5 h-3.5 transition-transform ${security.botsProtection ? "scale-100" : "scale-0"}`} />
              {security.botsProtection ? text.active : text.inactive}
            </button>
          </div>

        </div>

        {
    /* Violator Punishment configuration */
  }
        <div className="mt-8 border-t border-white/5 pt-6">
          <h5 className="text-base font-bold text-white flex items-center gap-2 mb-2">
            <Ban className="w-4 h-4 text-rose-500" />
            {text.punishTitle}
          </h5>
          <p className="text-xs text-slate-400 mb-4">{text.punishDesc}</p>

          <div className="max-w-md">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{text.punishSelect}</label>
            <select
    disabled={!isOwner}
    value={security.punishment}
    onChange={(e) => setSecurity((prev) => ({ ...prev, punishment: e.target.value }))}
    className={`w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 cursor-pointer ${!isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
  >
              <option value="none" className="bg-slate-900 text-white">{text.none}</option>
              <option value="demote" className="bg-slate-900 text-white">{text.demote}</option>
              <option value="kick" className="bg-slate-900 text-white">{text.kick}</option>
              <option value="ban" className="bg-slate-900 text-white">{text.ban}</option>
            </select>
          </div>
        </div>

        {
    /* Save button */
  }
        <div className="mt-8 flex justify-end">
          <button
    onClick={handleSave}
    disabled={saving}
    className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/50 text-white rounded-xl font-black shadow-lg transition-all text-sm uppercase tracking-wide cursor-pointer"
  >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? text.saving : text.saveBtn}
          </button>
        </div>

      </div>

    </div>;
}
