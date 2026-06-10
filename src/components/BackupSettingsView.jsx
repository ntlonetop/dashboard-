import { useState, useEffect } from "react";
import { Download, Copy, Check, FileCode, ShieldCheck, Info, RefreshCw, Server, HelpCircle, Upload, Github, GitBranch, Key, Database, Lock, Unlock, Shield } from "lucide-react";
export function BackupSettingsView({ siteLang }) {
  const isAr = siteLang === "ar";
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [uploadingConfigs, setUploadingConfigs] = useState(false);
  const [uploadingGlobal, setUploadingGlobal] = useState(false);
  const [copyConfigsSuccess, setCopyConfigsSuccess] = useState(false);
  const [copyGlobalSuccess, setCopyGlobalSuccess] = useState(false);
  const [githubConfig, setGithubConfig] = useState({ enabled: false, token: "", repo: "", branch: "main", lastSync: 0 });
  const [savingGithub, setSavingGithub] = useState(false);
  const [syncingTo, setSyncingTo] = useState(false);
  const [syncingFrom, setSyncingFrom] = useState(false);
  const [securityStatus, setSecurityStatus] = useState({ hasPin: false, pinVerified: false, userId: "" });
  const [pinChangeLoading, setPinChangeLoading] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [oldPinInput, setOldPinInput] = useState("");
  const fetchSecurityStatus = async () => {
    try {
      const res = await fetch("/api/security/status");
      const data = await res.json();
      setSecurityStatus(data);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    const fetchGithub = async () => {
      try {
        const res = await fetch("/api/backup/github/config");
        const data = await res.json();
        setGithubConfig(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchGithub();
    fetchSecurityStatus();
  }, []);
  const handleSetupPin = async () => {
    if (!pinInput || pinInput.length < 4) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: isAr ? "يجب أن يتكون رمز الحماية من 4 رموز على الأقل." : "Security PIN must be at least 4 characters.", type: "error" }
      }));
      return;
    }
    setPinChangeLoading(true);
    try {
      const res = await fetch("/api/security/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput, oldPin: oldPinInput })
      });
      const data = await res.json();
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: data.message || (isAr ? "تم إعداد وحفظ رمز الحماية بنجاح! \u{1F512}" : "Security PIN configured successfully! \u{1F512}"), type: "success" }
        }));
        setPinInput("");
        setOldPinInput("");
        fetchSecurityStatus();
      } else {
        throw new Error(data.error || "Failed PIN setup");
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: e.message, type: "error" }
      }));
    } finally {
      setPinChangeLoading(false);
    }
  };
  const handleVerifyPin = async () => {
    if (!pinInput) return;
    setPinChangeLoading(true);
    try {
      const res = await fetch("/api/security/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: isAr ? "تم إلغاء قفل الجلسة بنجاح! \u{1F513}" : "Session unlocked successfully! \u{1F513}", type: "success" }
        }));
        setPinInput("");
        fetchSecurityStatus();
      } else {
        throw new Error(data.error || "Incorrect PIN");
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: e.message, type: "error" }
      }));
    } finally {
      setPinChangeLoading(false);
    }
  };
  const handleLockSession = async () => {
    try {
      const res = await fetch("/api/security/logout", { method: "POST" });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: isAr ? "تم قفل الجلسة الحالية بنجاح." : "Dashboard locked successfully.", type: "success" }
        }));
        fetchSecurityStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };
  const handleSaveGithub = async () => {
    setSavingGithub(true);
    try {
      await fetch("/api/backup/github/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(githubConfig)
      });
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: isAr ? "تم حفظ إعدادات GitHub بنجاح!" : "GitHub integration settings saved!", type: "success" }
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setSavingGithub(false);
    }
  };
  const handleSyncTo = async () => {
    setSyncingTo(true);
    try {
      const res = await fetch("/api/backup/github/sync-to", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: isAr ? "تم رفع كافة البيانات إلى GitHub بنجاح!" : "All data pushed to GitHub successfully!", type: "success" }
        }));
        setGithubConfig((prev) => ({ ...prev, lastSync: Date.now() }));
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: e.message || "Failed sync", type: "error" }
      }));
    } finally {
      setSyncingTo(false);
    }
  };
  const handleSyncFrom = async () => {
    if (!confirm(isAr ? "هل أنت متأكد؟ سيتم استبدال كافة الإعدادات الحالية ببيانات GitHub." : "Are you sure? This will overwrite all local settings with data from GitHub.")) return;
    setSyncingFrom(true);
    try {
      const res = await fetch("/api/backup/github/sync-from", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: isAr ? "تم جلب واستعادة البيانات من GitHub بنجاح!" : "Data pulled and restored from GitHub successfully!", type: "success" }
        }));
        setGithubConfig((prev) => ({ ...prev, lastSync: Date.now() }));
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: e.message || "Failed pull", type: "error" }
      }));
    } finally {
      setSyncingFrom(false);
    }
  };
  const downloadFile = (data, fileName) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };
  const handleDownloadConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const res = await fetch("/api/backup/configs");
      const data = await res.json();
      downloadFile(data, "guildConfigs.json");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConfigs(false);
    }
  };
  const handleDownloadGlobal = async () => {
    setLoadingGlobal(true);
    try {
      const res = await fetch("/api/backup/global-state");
      const data = await res.json();
      downloadFile(data, "globalState.json");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGlobal(false);
    }
  };
  const handleCopyConfigs = async () => {
    try {
      const res = await fetch("/api/backup/configs");
      const data = await res.json();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopyConfigsSuccess(true);
      setTimeout(() => setCopyConfigsSuccess(false), 2e3);
    } catch (e) {
      console.error(e);
    }
  };
  const handleCopyGlobal = async () => {
    try {
      const res = await fetch("/api/backup/global-state");
      const data = await res.json();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopyGlobalSuccess(true);
      setTimeout(() => setCopyGlobalSuccess(false), 2e3);
    } catch (e) {
      console.error(e);
    }
  };
  const handleUploadConfigs = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingConfigs(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result);
          const res = await fetch("/api/backup/restore-configs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(json)
          });
          const result = await res.json();
          if (res.ok && result.success) {
            window.dispatchEvent(new CustomEvent("show-toast", {
              detail: { message: isAr ? `تمت استعادة وبث ${result.count} سيرفر بنجاح!` : `Restored ${result.count} guild configurations successfully!`, type: "success" }
            }));
          } else {
            throw new Error(result.error || "Failed restore");
          }
        } catch (err) {
          window.dispatchEvent(new CustomEvent("show-toast", {
            detail: { message: isAr ? "فشل قراءة أو معالجة ملف JSON المرفوع." : "Failed to parse/process JSON file structure.", type: "error" }
          }));
        } finally {
          setUploadingConfigs(false);
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setUploadingConfigs(false);
    }
  };
  const handleUploadGlobal = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGlobal(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result);
          const res = await fetch("/api/backup/restore-global-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(json)
          });
          const result = await res.json();
          if (res.ok && result.success) {
            window.dispatchEvent(new CustomEvent("show-toast", {
              detail: { message: isAr ? "تم استرجاع التراخيص والبريميوم بنجاح!" : "Restored all premium licenses and administrative records successfully!", type: "success" }
            }));
          } else {
            throw new Error(result.error || "Failed global restore");
          }
        } catch (err) {
          window.dispatchEvent(new CustomEvent("show-toast", {
            detail: { message: isAr ? "فشل قراءة الملف أو تنسيق JSON غير صالح." : "Unable to load state config. Conflicting JSON keys.", type: "error" }
          }));
        } finally {
          setUploadingGlobal(false);
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setUploadingGlobal(false);
    }
  };
  return <div className="space-y-6 text-right" dir={isAr ? "rtl" : "ltr"}>
      {
    /* Header Banner */
  }
      <div className="bg-[#0b0f17]/90 p-6 md:p-8 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
              <Server className="w-6 h-6 text-indigo-400" />
              {isAr ? "مركز قواعد البيانات والنسخ الاحتياطي" : "Database & Backup Control Center"}
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 pb-1">
              {isAr ? "يمكنك تحميل وتصدير نسخ احتياطية كاملة من قاعدة بيانات البوت لاستخدامها في استضافة bot-hosting الخارجية أو للاحتفاظ ببيانات السيرفرات." : "Download and export full database backups of the bot to use on external bot-hosting servers or keep local records."}
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            {isAr ? "جاهز للتصدير" : "Ready for Export"}
          </span>
        </div>
      </div>

      {
    /* Grid of database files */
  }
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {
    /* Guild Configs File */
  }
        <div className="p-6 bg-slate-905 border border-white/5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-indigo-500/20 transition-all relative group overflow-hidden">
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-600/5 rounded-full blur-2xl group-hover:bg-indigo-600/10 transition-colors duration-300" />
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white font-mono">guildConfigs.json</h3>
                <span className="text-[10px] text-indigo-400 uppercase font-bold">{isAr ? "إعدادات السيرفرات والأنظمة" : "Guild Systems & Settings"}</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-normal mb-6">
              {isAr ? "يحتوي هذا الملف على كافة إعدادات السيرفرات المشتركة، مثل أنظمة الترحيب، رومات الدعم والتذاكر، مستويات الـ XP، الخطوط التلقائية، والردود المخصصة." : "Consists of all configurations for join/leave messages, ticket support systems, XP thresholds, custom autoreply commands, and embedded parameters."}
            </p>
          </div>

          <div className="flex gap-2.5">
            <button
    onClick={handleDownloadConfigs}
    disabled={loadingConfigs}
    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
  >
              {loadingConfigs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isAr ? "تحميل ملف التكوينات" : "Download configs.json"}
            </button>
            <button
    onClick={handleCopyConfigs}
    className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-semibold p-2.5 rounded-xl transition-all active:scale-[0.98] relative"
    title={isAr ? "نسخ الكود" : "Copy to Clipboard"}
  >
              {copyConfigsSuccess ? <Check className="w-4 h-4 text-emerald-400 animate-scale" /> : <Copy className="w-4 h-4" />}
            </button>
            <div className="relative">
              <input
    type="file"
    accept=".json"
    onChange={handleUploadConfigs}
    className="hidden"
    id="upload-configs-input"
  />
              <button
    type="button"
    onClick={() => document.getElementById("upload-configs-input")?.click()}
    disabled={uploadingConfigs}
    className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 font-semibold p-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
    title={isAr ? "رفع واستعادة نسخة احتياطية" : "Upload & Restore"}
  >
                {uploadingConfigs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
 
         {
    /* Global State Configs */
  }
         <div className="p-6 bg-slate-905 border border-white/5 rounded-2xl flex flex-col justify-between shadow-lg hover:border-amber-500/20 transition-all relative group overflow-hidden">
           <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-600/5 rounded-full blur-2xl group-hover:bg-amber-600/10 transition-colors duration-300" />
           <div>
             <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/15 flex items-center justify-center text-amber-400">
                 <ShieldCheck className="w-5 h-5" />
               </div>
               <div>
                 <h3 className="font-extrabold text-sm text-white font-mono">globalState.json</h3>
                 <span className="text-[10px] text-amber-400 uppercase font-bold">{isAr ? "البيانات العامة والبريميوم" : "Global State & Licenses"}</span>
               </div>
             </div>
             <p className="text-xs text-slate-400 leading-normal mb-6">
               {isAr ? "يحتوي هذا الملف على البيانات العامة للبوت بالكامل مثل أكواد خصم تفعيل البريميوم المتاحة، حسابات طاقم الإشراف والدعم الفني للموقع، والمستخدمين المشتركين." : "Contains global core metrics like created promo/discount keys, technical administrative role rosters, and overall activated premium subscriptions."}
             </p>
           </div>
 
           <div className="flex gap-2.5">
             <button
    onClick={handleDownloadGlobal}
    disabled={loadingGlobal}
    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
  >
               {loadingGlobal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
               {isAr ? "تحميل ملف الحالة" : "Download globalState.json"}
             </button>
             <button
    onClick={handleCopyGlobal}
    className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-semibold p-2.5 rounded-xl transition-all active:scale-[0.98] relative"
    title={isAr ? "نسخ الكود" : "Copy to Clipboard"}
  >
               {copyGlobalSuccess ? <Check className="w-4 h-4 text-emerald-400 animate-scale" /> : <Copy className="w-4 h-4" />}
             </button>
             <div className="relative">
               <input
    type="file"
    accept=".json"
    onChange={handleUploadGlobal}
    className="hidden"
    id="upload-global-input"
  />
               <button
    type="button"
    onClick={() => document.getElementById("upload-global-input")?.click()}
    disabled={uploadingGlobal}
    className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 font-semibold p-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
    title={isAr ? "رفع واستعادة نسخة احتياطية" : "Upload & Restore"}
  >
                 {uploadingGlobal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
               </button>
             </div>
           </div>
        </div>
      </div>

      {
    /* Security PIN protection system card */
  }
      <div className="bg-[#0b0f17]/90 p-8 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF512F] to-[#DD2476]" />
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Shield size={120} className="text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center text-rose-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{isAr ? "نظام حماية لوحة التحكم (Master Security PIN)" : "Control Panel PIN Protection"}</h3>
                <p className="text-xs text-slate-400">{isAr ? "قم بتعيين رمز حماية (PIN) خاضع للتشفير لتأمين وحظر أي محاولة تعديل لإعدادات البوت." : "Set a cryptographically hashed PIN to lock down modifications and protect bot settings."}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {securityStatus.hasPin ? <>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 shadow-sm flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    {isAr ? "مفعّل" : "Active"}
                  </span>
                  
                  {securityStatus.pinVerified ? <span className="px-3 py-1 bg-indigo-500/15 text-indigo-400 text-xs font-bold rounded-lg border border-indigo-500/20 shadow-sm flex items-center gap-1.5">
                      <Unlock className="w-3.5 h-3.5" />
                      {isAr ? "جلسة مفتوحة" : "Session Unlocked"}
                    </span> : <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20 shadow-sm flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 animate-pulse" />
                      {isAr ? "جلسة مغلقة" : "Session Locked"}
                    </span>}
                </> : <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-lg border border-amber-500/25 shadow-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isAr ? "غير مفعل (غير آمن)" : "Inactive (Unsecured)"}
                </span>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
              <h4 className="text-sm font-black text-rose-400 flex items-center gap-2">
                <Key className="w-4 h-4" />
                {isAr ? "إعداد / تغيير رمز الحماية" : "Setup / Change Security PIN"}
              </h4>
              
              <div className="space-y-4">
                {securityStatus.hasPin && <div>
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 block">
                      {isAr ? "رمز الحماية الحالي" : "Current PIN"}
                    </label>
                    <input
    type="password"
    value={oldPinInput}
    onChange={(e) => setOldPinInput(e.target.value)}
    placeholder="••••"
    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-rose-500 text-center tracking-widest font-mono transition-all"
  />
                  </div>}
                
                <div>
                  <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 block">
                    {securityStatus.hasPin ? isAr ? "رمز الحماية الجديد" : "New PIN" : isAr ? "رمز الحماية المطلوب" : "Desired PIN"}
                  </label>
                  <input
    type="password"
    value={pinInput}
    onChange={(e) => setPinInput(e.target.value)}
    placeholder="••••"
    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-rose-500 text-center tracking-widest font-mono transition-all"
  />
                </div>

                <button
    onClick={handleSetupPin}
    disabled={pinChangeLoading}
    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
  >
                  {pinChangeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {securityStatus.hasPin ? isAr ? "تحديث رمز الحماية وحفظه" : "Update & Store PIN" : isAr ? "تفعيل وحفظ رمز الحماية" : "Activate & Store PIN"}
                </button>
              </div>
            </div>

            {securityStatus.hasPin && <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4 h-full flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black text-rose-400 flex items-center gap-2 mb-2">
                    {securityStatus.pinVerified ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4" />}
                    {isAr ? "التحكم بفتح الجلسة وإغلاقها" : "Session Access Controls"}
                  </h4>
                  <p className="text-xs text-slate-400 leading-normal">
                    {isAr ? "بمجرد تعيين رمز الحماية، ستظل لوحة التحكم مؤمنة ومغلقة في المتصفح. يتطلب أي حفظ للإجراءات فتح الجلسة برمز الـ PIN، وسيتم غلقها تلقائياً عند المغادرة أو الضغط أدناه." : "With a PIN set, any setting modification is strictly forbidden in this browser until unlocked. Session automatically locks upon closing the tab."}
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  {!securityStatus.pinVerified ? <div className="space-y-3">
                      <input
    type="password"
    value={pinInput}
    onChange={(e) => setPinInput(e.target.value)}
    placeholder={isAr ? "أدخل الرمز لفتح الجلسة..." : "Enter PIN to unlock..."}
    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-rose-500 text-center tracking-widest font-mono transition-all"
  />
                      <button
    onClick={handleVerifyPin}
    disabled={pinChangeLoading}
    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
  >
                        {pinChangeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                        {isAr ? "إلغاء قفل الجلسة الحالية" : "Unlock Dashboard Session"}
                      </button>
                    </div> : <button
    onClick={handleLockSession}
    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-white/5"
  >
                      <Lock className="w-4 h-4" />
                      {isAr ? "قفل الجلسة (Lock Now)" : "Lock Session Now"}
                    </button>}
                </div>
              </div>}
          </div>
        </div>
      </div>

      {
    /* GitHub Sync Integration */
  }
      <div className="bg-[#0b0f17]/90 p-8 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Github size={120} className="text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{isAr ? "مزامنة البيانات سحابياً (GitHub)" : "Cloud Data Sync (GitHub)"}</h3>
              <p className="text-xs text-slate-400">{isAr ? "اربط قاعدة بيانات البوت بمستودع GitHub الخاص بك للمزامنة التلقائية والعمل المستقل." : "Connect your bot database to a GitHub repository for automated sync and standalone operation."}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 block">{isAr ? "مفتاح الوصول (Personal Access Token)" : "Personal Access Token"}</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
    type="password"
    value={githubConfig.token}
    onChange={(e) => setGithubConfig({ ...githubConfig, token: e.target.value })}
    placeholder="ghp_xxxxxxxxxxxx"
    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 font-mono transition-all"
  />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 block">{isAr ? "المستودع (Owner/Repo)" : "Repository"}</label>
                    <div className="relative">
                      <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
    type="text"
    value={githubConfig.repo}
    onChange={(e) => setGithubConfig({ ...githubConfig, repo: e.target.value })}
    placeholder="user/bot-database"
    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
  />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5 block">{isAr ? "الفرع (Branch)" : "Branch"}</label>
                    <div className="relative">
                      <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
    type="text"
    value={githubConfig.branch}
    onChange={(e) => setGithubConfig({ ...githubConfig, branch: e.target.value })}
    placeholder="main"
    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500 transition-all"
  />
                    </div>
                 </div>
               </div>

               <div className="pt-2">
                 <button
    onClick={handleSaveGithub}
    disabled={savingGithub}
    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
  >
                   {savingGithub ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                   {isAr ? "حفظ إعدادات الربط" : "Save Integration Settings"}
                 </button>
               </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
               <div>
                  <h4 className="text-sm font-bold text-white mb-2">{isAr ? "التحكم في المزامنة" : "Sync Controls"}</h4>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    {isAr ? "يمكنك الآن رفع قاعدة البيانات الحالية إلى GitHub أو جلب نسخة سابقة وتفعيلها في الداشبورد الحالي." : "Manually trigger a push to sync local files to GitHub, or pull files from a saved repository snapshot."}
                  </p>
                  
                  {githubConfig.lastSync > 0 && <div className="mb-6 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{isAr ? "آخر مزامنة" : "LAST SYNC"}</p>
                      <p className="text-xs text-white font-mono">{new Date(githubConfig.lastSync).toLocaleString()}</p>
                    </div>}
               </div>

               <div className="flex flex-col sm:flex-row gap-3">
                  <button
    onClick={handleSyncTo}
    disabled={syncingTo || !githubConfig.token}
    className="flex-1 bg-white hover:bg-slate-200 text-indigo-900 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
  >
                    {syncingTo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isAr ? "رفع للـ GitHub (Push)" : "Push to GitHub"}
                  </button>
                  <button
    onClick={handleSyncFrom}
    disabled={syncingFrom || !githubConfig.token}
    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all border border-white/5 flex items-center justify-center gap-2 disabled:opacity-50"
  >
                    {syncingFrom ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isAr ? "جلب من الـ GitHub (Pull)" : "Pull from GitHub"}
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>

      {
    /* Guide Cards */
  }
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl leading-relaxed">
        <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          {isAr ? "كيفية نقل الملفات واستخدامها في استضافة bot-hosting" : "How to migrate databases to bot-hosting"}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="bg-[#0b0f17]/40 p-4 rounded-xl border border-white/5">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs mb-3">1</span>
            <p className="font-bold text-white text-xs mb-1.5">{isAr ? "تحميل الملفين" : "Download files"}</p>
            <p>{isAr ? "قم بالضغط على الأزرار الزرقاء والبرتقالية في الأعلى لتحميل ملفي guildConfigs.json و globalState.json على جهازك الشخصي." : "Click on the primary down arrows above to fetch both backup databases directly onto your physical device."}</p>
          </div>

          <div className="bg-[#0b0f17]/40 p-4 rounded-xl border border-white/5">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs mb-3">2</span>
            <p className="font-bold text-white text-xs mb-1.5">{isAr ? "رفع الملفات للاستضافة" : "Upload to root folder"}</p>
            <p>{isAr ? "افتح مدير الملفات (File Manager) الخاص باستضافة bot-hosting وقم برفع الملفات مباشرة في المجلد الرئيسي للبوت (Root)." : "Launch the online file browser of your bot-hosting dashboard and upload these two files straight into the root folder."}</p>
          </div>

          <div className="bg-[#0b0f17]/40 p-4 rounded-xl border border-white/5">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs mb-3">3</span>
            <p className="font-bold text-white text-xs mb-1.5">{isAr ? "تشغيل البوت" : "Start the system"}</p>
            <p>{isAr ? "قم بإعادة تشغيل البوت في الاستضافة، وسيقوم تلقائياً بجلب كافة بيانات السيرفرات والمستويات وقنوات الدعم بدون فقدان أي شيء!" : "Reboot the bot application processes. It will instantaneously read the JSON entries without having to re-configure anything."}</p>
          </div>
        </div>

        <div className="mt-5 p-4.5 bg-indigo-950/20 border border-indigo-500/10 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-300 leading-normal">
            <p className="font-extrabold mb-1">{isAr ? "\u{1F4A1} هل تملك استضافة Singlebase سحابية؟" : "\u{1F4A1} Using Singlebase cloud storage?"}</p>
            <p>{isAr ? "إذا كنت تستخدم مفتاح SINGLEBASE_API_KEY على استضافتك الجديدة، يمكنك تركه وسيتزامن البوت سحابياً، ولكن يُفضل دائماً الاحتفاظ بهذه النسخ المكتوبة بصيغة JSON كدعم واحتياط دائم." : "If you configured SINGLEBASE_API_KEY in your env file on the destination host, the bot automatically syncs with the Cloud DB, but it's always highly recommended to take these JSON snapshots as secure manual backups."}</p>
          </div>
        </div>
      </div>
    </div>;
}
