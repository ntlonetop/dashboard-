import { useEffect, useState, useRef } from "react";
import { Loader2, LogIn, LogOut, ServerCog, ShieldAlert, LayoutDashboard, TerminalSquare, AlertTriangle, Zap, Activity, Command, Settings2, ShieldCheck, ChevronLeft, MessageSquare, Star, PartyPopper, Bot, Menu, X, Sparkles, Briefcase, FileText, Lock, Unlock, Download, Moon, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GuildConfigView } from "./GuildConfigView";
import { WelcomeSystemView } from "./WelcomeConfigView";
import { LevellingConfigView } from "./LevellingConfigView";
import { ScriptConfigView } from "./ScriptConfigView";
import { EventsConfigView } from "./EventsConfigView";
import { SecurityConfigView } from "./SecurityConfigView";
import { LogsConfigView } from "./LogsConfigView";
import { AutoFeaturesView } from "./AutoFeaturesView";
import { BrokersConfigView } from "./BrokersConfigView";
import { SuggestionsConfigView } from "./SuggestionsConfigView";
import { TicketsConfigView } from "./TicketsConfigView";
import { AfkConfigView } from "./AfkConfigView";
import { AzkarConfigView } from "./AzkarConfigView";
import { ApplicationsConfigView } from "./ApplicationsConfigView";
import { PremiumView } from "./PremiumView";
import { BackupSettingsView } from "./components/BackupSettingsView";
import { t, gT } from "./i18n";
export default function App() {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [botStatus, setBotStatus] = useState({ ready: false });
  const [loading, setLoading] = useState(true);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [activeGuildTab, setActiveGuildTab] = useState("commands");
  const oauthProcessed = useRef(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [siteLang, setSiteLang] = useState(() => {
    return localStorage.getItem("siteLang") || "ar";
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isShakeActive, setIsShakeActive] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const triggerShake = () => {
    setIsShakeActive(true);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate([100, 50, 100]);
    }
    setTimeout(() => setIsShakeActive(false), 500);
  };
  const confirmNavigation = (type, value) => {
    if (hasUnsavedChanges) {
      setPendingNav({ type, value });
      triggerShake();
      return;
    }
    executeNavigation(type, value);
  };
  const executeNavigation = (type, value) => {
    if (type === "main") setActiveMainTab(value);
    if (type === "guild") setActiveGuildTab(value);
    if (type === "server") setSelectedGuild(value);
    setHasUnsavedChanges(false);
    setPendingNav(null);
  };
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3e3);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    const handleToast = (e) => setToast(e.detail);
    window.addEventListener("show-toast", handleToast);
    return () => window.removeEventListener("show-toast", handleToast);
  }, []);
  useEffect(() => {
    localStorage.setItem("siteLang", siteLang);
  }, [siteLang]);
  const siteLangs = {
    ar: { flag: "\u{1F1F8}\u{1F1E6}", name: "العربية" },
    en: { flag: "\u{1F1FA}\u{1F1F8}", name: "English" },
    fr: { flag: "\u{1F1EB}\u{1F1F7}", name: "Fran\xE7ais" }
  };
  const [botTokenInput, setBotTokenInput] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    }
  };
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [setupStatus, setSetupStatus] = useState({
    configured: false,
    hasToken: false,
    hasClientId: false,
    hasClientSecret: false,
    botReady: false,
    botTag: null
  });
  const [securityStatus, setSecurityStatus] = useState({ hasPin: false, pinVerified: false });
  const [pinUnlockCode, setPinUnlockCode] = useState("");
  const [pinUnlockLoading, setPinUnlockLoading] = useState(false);
  const fetchSecurityStatus = async () => {
    try {
      const res = await fetch("/api/security/status");
      if (res.ok) {
        const data = await res.json();
        setSecurityStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch security status:", e);
    }
  };
  const verifyUnlockPin = async () => {
    if (!pinUnlockCode) return;
    setPinUnlockLoading(true);
    try {
      const res = await fetch("/api/security/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinUnlockCode })
      });
      const data = await res.json();
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: siteLang === "ar" ? "تم إلغاء قفل لوحة التحكم بنجاح! \u{1F513}" : "Control Panel decrypted and unlocked successfully! \u{1F513}", type: "success" }
        }));
        setPinUnlockCode("");
        fetchSecurityStatus();
      } else {
        throw new Error(data.error || "Incorrect PIN");
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: e.message, type: "error" }
      }));
    } finally {
      setPinUnlockLoading(false);
    }
  };
  const fetchSetupStatus = async () => {
    try {
      const res = await fetch("/api/setup/status");
      if (res.ok) {
        const data = await res.json();
        setSetupStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch setup status:", e);
    }
  };
  const fetchBotStatus = async () => {
    try {
      const res = await fetch("/api/bot/status");
      const data = await res.json();
      setBotStatus(data);
    } catch {
    }
    fetchSetupStatus();
  };
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("discordToken");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/auth/me", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          console.error("Auth server returned error:", data.error);
          window.dispatchEvent(new CustomEvent("show-toast", {
            detail: {
              message: siteLang === "ar" ? `فشل التحقق: ${data.error}` : `Verification failed: ${data.error}`,
              type: "error"
            }
          }));
          setUser(null);
          setGuilds([]);
          return;
        }
        if (data.user && data.user.id) {
          setUser(data.user);
          if (Array.isArray(data.guilds)) {
            const adminGuilds = data.guilds.filter((g) => {
              try {
                if (!g || g.permissions === void 0 || g.permissions === null) return false;
                return (BigInt(g.permissions) & BigInt(8)) === BigInt(8);
              } catch {
                return false;
              }
            });
            setGuilds(adminGuilds);
          } else {
            setGuilds([]);
          }
        } else {
          setUser(null);
          setGuilds([]);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        const rawMsg = errorData.error || "";
        if (token && rawMsg) {
          window.dispatchEvent(new CustomEvent("show-toast", {
            detail: {
              message: siteLang === "ar" ? `فشل تسجيل الدخول: ${rawMsg}` : `Login failed: ${rawMsg}`,
              type: "error"
            }
          }));
        }
        setUser(null);
        setGuilds([]);
      }
    } catch (e) {
      console.error("fetchUser catastrophic error:", e);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: siteLang === "ar" ? "حدث خطأ في الاتصال بالخادم للتحقق من هويتك." : "Server error checking user identity.",
          type: "error"
        }
      }));
      setUser(null);
      setGuilds([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    if (code && !oauthProcessed.current) {
      oauthProcessed.current = true;
      setLoading(true);
      fetch(`/api/auth/exchange?code=${code}&redirect_uri=${encodeURIComponent(window.location.origin)}`).then((res) => res.json()).then((data) => {
        if (data.success) {
          if (data.token) {
            localStorage.setItem("discordToken", data.token);
          }
          if (window.opener) {
            window.opener.postMessage({ type: "OAUTH_AUTH_SUCCESS", token: data.token }, "*");
            window.close();
          } else {
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchUser();
            fetchBotStatus();
          }
        } else {
          console.error("Auth exchange failed:", data);
          if (window.opener) {
            window.opener.postMessage({ type: "OAUTH_AUTH_ERROR", message: data.error }, "*");
            window.close();
          } else {
            window.dispatchEvent(new CustomEvent("show-toast", {
              detail: { message: data.error || "Authentication failed.", type: "error" }
            }));
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setLoading(false);
        }
      }).catch((err) => {
        console.error("Auth exchange error:", err);
        if (window.opener) {
          window.opener.postMessage({ type: "OAUTH_AUTH_ERROR", message: err.message }, "*");
          window.close();
        } else {
          window.dispatchEvent(new CustomEvent("show-toast", {
            detail: { message: "Network error during authentication.", type: "error" }
          }));
        }
        setLoading(false);
      });
      return;
    }
    if (error) {
      console.error("OAuth error:", error);
      if (window.opener) window.close();
    }
    fetchUser();
    fetchBotStatus();
    fetchSecurityStatus();
    const handleMessage = (event) => {
      const origin = event.origin;
      if (origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        if (event.data.token) {
          localStorage.setItem("discordToken", event.data.token);
        }
        setLoading(true);
        fetchUser();
      } else if (event.data?.type === "OAUTH_AUTH_ERROR") {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: { message: event.data.message || "Authentication failed.", type: "error" }
        }));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  const handleSaveSetup = async (e) => {
    e.preventDefault();
    if (!botTokenInput || !clientIdInput || !clientSecretInput) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: siteLang === "ar" ? "يرجى ملء جميع الحقول المطلوبة!" : "Please fill in all required fields!",
          type: "error"
        }
      }));
      return;
    }
    setIsSavingKeys(true);
    try {
      const res = await fetch("/api/setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: botTokenInput,
          clientId: clientIdInput,
          clientSecret: clientSecretInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: {
            message: siteLang === "ar" ? "تم حفظ الإعدادات وربط البوت بنجاح!" : "Saved and activated Bot successfully!",
            type: "success"
          }
        }));
        fetchBotStatus();
      } else {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: {
            message: data.error || (siteLang === "ar" ? "فشل حفظ وتفعيل البوت!" : "Failed to activate bot! Please double check values."),
            type: "error"
          }
        }));
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: siteLang === "ar" ? "حدث خطأ أثناء الاتصال بالخادم" : "Server communication error",
          type: "error"
        }
      }));
    } finally {
      setIsSavingKeys(false);
    }
  };
  const handleLogin = async () => {
    try {
      const redirectUri = window.location.origin;
      const res = await fetch(`/api/auth/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const rawErrorMsg = errorData.error || "";
        let finalMsg = siteLang === "ar" ? "تحقق من إعدادات المفاتيح (Secrets)." : "Please check your credentials in Secrets.";
        if (rawErrorMsg.includes("not configured")) {
          finalMsg = siteLang === "ar" ? "الـ Client ID غير مهيأ! يرجى إضافته في إعدادات AI Studio." : "Client ID is not configured! Please add it in project Secrets.";
        }
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: {
            message: finalMsg,
            type: "error"
          }
        }));
        throw new Error(rawErrorMsg || "Failed to get auth URL");
      }
      const { url } = await res.json();
      const authWindow = window.open(url, "oauth_popup", "width=600,height=700");
      if (!authWindow) {
        window.dispatchEvent(new CustomEvent("show-toast", {
          detail: {
            message: siteLang === "ar" ? "يرجى السماح بالنوافذ المنبثقة (Popups) لإكمال تسجيل الدخول." : "Please allow popups for this site to connect your account.",
            type: "error"
          }
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };
  const handleLogout = async () => {
    localStorage.removeItem("discordToken");
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setGuilds([]);
  };
  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#0B0E11] text-white">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>;
  }
  return <div className="bg-[#020202] text-slate-300 h-screen w-full flex overflow-hidden font-sans relative selection:bg-indigo-500/30" dir={siteLang === "ar" ? "rtl" : "ltr"}>
      
      <AnimatePresence>
        {toast && <motion.div
    initial={{ x: -200, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: -200, opacity: 0 }}
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
    className="fixed top-8 left-8 z-[100] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl p-5 min-w-[280px] flex flex-col gap-3 overflow-hidden backdrop-blur-3xl"
    dir="rtl"
  >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-lg tracking-tight">
                  {toast.message}
                </span>
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-widest mt-0.5">System Notification</span>
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>


      {
    /* Mobile Drawer Navigation overlay */
  }
      <AnimatePresence>
        {isMobileMenuOpen && <>
            {
    /* Backdrop */
  }
            <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.5 }}
    exit={{ opacity: 0 }}
    onClick={() => setIsMobileMenuOpen(false)}
    className="fixed inset-0 bg-black z-40 lg:hidden cursor-pointer backdrop-blur-sm"
  />
            
            {
    /* Drawer */
  }
            <motion.aside
    initial={{ x: siteLang === "ar" ? "100%" : "-100%" }}
    animate={{ x: 0 }}
    exit={{ x: siteLang === "ar" ? "100%" : "-100%" }}
    transition={{ type: "spring", damping: 25, stiffness: 220 }}
    className="fixed top-0 bottom-0 left-0 right-auto w-72 bg-[#06080e]/95 backdrop-blur-3xl z-50 flex flex-col p-6 shadow-[5px_0_30px_rgba(0,0,0,0.8)] lg:hidden"
    style={{
      left: siteLang === "ar" ? "auto" : 0,
      right: siteLang === "ar" ? 0 : "auto",
      borderRight: siteLang === "ar" ? "none" : "1px solid rgba(255,255,255,0.1)",
      borderLeft: siteLang === "ar" ? "1px solid rgba(255,255,255,0.1)" : "none"
    }}
  >
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                    {botStatus.ready && botStatus.user ? <img src={botStatus.user.avatarURL} alt="Bot" className="w-full h-full object-cover" /> : <LayoutDashboard className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-black text-white text-sm">
                      {botStatus.ready ? botStatus.user?.tag.split("#")[0] : "NexusBot"}
                    </h3>
                    <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">{t[siteLang].dashboard}</p>
                  </div>
                </div>
                <button
    onClick={() => setIsMobileMenuOpen(false)}
    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white"
  >
                  <X size={16} />
                </button>
              </div>

              <nav className="flex-1 py-6 space-y-2 overflow-y-auto">
                <span className="text-[9px] uppercase tracking-widest text-[#5865f2] font-black block mb-3 px-2">
                  {siteLang === "ar" ? "القائمة الرئيسية" : "MAIN MENU"}
                </span>
                
                <button
    onClick={() => {
      confirmNavigation("server", null);
      confirmNavigation("main", "overview");
      setIsMobileMenuOpen(false);
    }}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeMainTab === "overview" && !selectedGuild ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-md font-bold" : "text-slate-400 hover:bg-white/5"}`}
  >
                  <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                  <span className="font-semibold text-xs text-right">{t[siteLang].overview}</span>
                </button>

                {isInstalled ? (
                  <div className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-emerald-400">
                    <span className="font-semibold text-xs">{siteLang === 'ar' ? 'تم تثبيت التطبيق!' : 'App installed!'}</span>
                     <button onClick={() => window.open('/', '_self')} className="bg-emerald-500/20 px-2 py-1 rounded text-xs hover:bg-emerald-500/30">{siteLang === 'ar' ? 'فتح' : 'Open'}</button>
                  </div>
                ) : deferredPrompt ? (
                  <button
                    onClick={() => {
                        installApp();
                        setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Download className="w-5 h-5" />
                    <span className="font-semibold text-xs text-right">
                        {siteLang === 'ar' ? 'تثبيت كتطبيق' : 'Install as App'}
                    </span>
                  </button>
                ) : null}

                {
    /* Additional info labels */
  }
                {user && <div className="pt-6 border-t border-white/5 mt-6">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-2 block mb-3">
                      {siteLang === "ar" ? "الحساب المتصل" : "Connected Session"}
                    </span>
                    <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                      <img
    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
    className="w-8 h-8 rounded-full border border-white/10"
    alt={user.username}
  />
                      <div className="overflow-hidden text-right">
                        <p className="text-xs font-bold text-white truncate">{user.username}</p>
                        <p className="text-[9px] text-slate-500">Moderator</p>
                      </div>
                    </div>
                  </div>}
              </nav>

              <div className="pt-4 border-t border-white/5 text-center shrink-0">
                <p className="text-[10px] text-rose-500 font-mono font-bold tracking-wider">ntl dashboard v2.0</p>
              </div>
            </motion.aside>
          </>}
      </AnimatePresence>

      {
    /* Sidebar Focus */
  }
      <aside
    className={`w-64 bg-[#0c0f16] border-l border-white/[0.05] flex-col hidden lg:flex z-20 ${isShakeActive ? "animate-shake" : ""}`}
  >
        <div className="p-6 flex items-center gap-3 relative">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-white/10 relative overflow-hidden group shrink-0">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-xl" />
            {botStatus.ready && botStatus.user ? <img src={botStatus.user.avatarURL} alt="Bot" className="w-full h-full rounded-xl object-cover relative z-10" /> : <LayoutDashboard className="w-5 h-5 text-white relative z-10" />}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 truncate leading-tight">
              {botStatus.ready ? botStatus.user?.tag.split("#")[0] : "ntl bot"}
            </span>
            <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">{t[siteLang].dashboard}</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto w-full">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-3 px-2">{siteLang === "ar" ? "القائمة الرئيسية" : siteLang === "fr" ? "Menu Principal" : "Main Menu"}</div>
          <button
    onClick={() => {
      confirmNavigation("server", null);
      confirmNavigation("main", "overview");
    }}
    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[1rem] transition-all ${activeMainTab === "overview" && !selectedGuild ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]" : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"}`}
  >
            <LayoutDashboard className="w-4.5 h-4.5" />
            <span className="font-semibold text-xs">{t[siteLang].overview}</span>
          </button>
          <a href="#" className="flex items-center gap-2.5 px-3 py-2.5 text-slate-400 hover:bg-white/[0.03] hover:text-slate-200 rounded-[1rem] transition-all group">
            <Command className="w-4.5 h-4.5 group-hover:scale-110 transition-transform text-slate-500 group-hover:text-slate-300" />
            <span className="font-semibold text-xs">{t[siteLang].botCmds}</span>
          </a>
          <a href="#" className="flex items-center gap-2.5 px-3 py-2.5 text-slate-400 hover:bg-white/[0.03] hover:text-slate-200 rounded-[1rem] transition-all group">
            <ServerCog className="w-4.5 h-4.5 group-hover:scale-110 transition-transform text-slate-500 group-hover:text-slate-300" />
            <span className="font-semibold text-xs">{t[siteLang].manageServers}</span>
          </a>
          
          <div className="mt-6 mb-3 px-2">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          
          <a href="#" className="flex items-center gap-2.5 px-3 py-2.5 text-slate-400 hover:bg-white/[0.03] hover:text-slate-200 rounded-[1rem] transition-all group">
            <Settings2 className="w-4.5 h-4.5 group-hover:rotate-45 transition-transform text-slate-500 group-hover:text-slate-300" />
            <span className="font-semibold text-xs">{t[siteLang].sysSettings}</span>
          </a>
        </nav>

        <div className="p-4">
          <div className="bg-[#0A0D14]/80 border border-white/5 rounded-xl p-3 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-2">{t[siteLang].connStatus}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-300">{t[siteLang].latency}</span>
              </div>
              <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-emerald-300" dir="ltr">
                  {botStatus.ready && botStatus.ping !== void 0 ? `${botStatus.ping}ms` : "---"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {
    /* Main Workspace */
  }
      <main className="flex-1 flex flex-col bg-transparent overflow-hidden relative z-10 w-full">
        {
    /* Top Navbar */
  }
        <header className="h-[72px] border-b border-white/[0.05] flex items-center justify-between px-6 lg:px-10 bg-[#0A0A0A]/40 backdrop-blur-2xl shrink-0 relative z-50">
          <div className="flex items-center gap-3">
            <button
    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
    className="lg:hidden p-2 text-slate-400 hover:text-white bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
  >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-lg font-bold text-white tracking-tight hidden sm:block">{t[siteLang].sysMgmt}</h2>
            {user && <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full text-[10px] uppercase text-indigo-300 font-bold tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin Access</span>
              </div>}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
    onClick={() => setIsLangOpen(!isLangOpen)}
    className="flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
  >
                <span className="text-xl">{siteLangs[siteLang].flag}</span>
                <span className="text-[10px] font-bold text-slate-300 uppercase">{siteLang}</span>
              </button>
              <AnimatePresence>
                {isLangOpen && <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="absolute top-full mt-2 left-0 w-32 bg-[#0A0D14] border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1 z-50"
  >
                    {Object.keys(siteLangs).map((key) => <button
    key={key}
    onClick={() => {
      setSiteLang(key);
      setIsLangOpen(false);
    }}
    className="w-full text-left px-3 py-1.5 hover:bg-white/5 flex items-center justify-between text-xs text-slate-300 hover:text-white transition group"
  >
                         <span>{siteLangs[key].name}</span>
                         <span className="text-base group-hover:scale-110 transition-transform">{siteLangs[key].flag}</span>
                      </button>)}
                  </motion.div>}
              </AnimatePresence>
            </div>
            
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            
            {user ? <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-white leading-none">{user.username}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Verified User</span>
                </div>
                <div className="relative group cursor-pointer shrink-0">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-[2px] opacity-40 group-hover:opacity-75 transition duration-300" />
                  <div className="w-9 h-9 rounded-full border-2 border-[#121620] relative overflow-hidden bg-[#1a1f2e] z-10 shadow-xl group-hover:scale-105 transition-transform duration-300">
                    <img
    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
    className="w-full h-full object-cover"
    alt={user.username}
  />
                  </div>
                </div>
                <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />
                <button
    onClick={handleLogout}
    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
    title="Logout"
  >
                  <LogOut size={16} />
                </button>
              </div> : <button
    onClick={handleLogin}
    className="flex items-center gap-2 bg-white text-black hover:bg-slate-200 px-4 py-2 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] text-xs"
  >
                <LogIn size={16} />
                <span>{t[siteLang].loginDiscord}</span>
              </button>}
          </div>
        </header>

        {
    /* Dynamic Content Area */
  }
        <div className={`p-4 lg:p-6 flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar ${isShakeActive ? "animate-shake" : ""}`}>
          <div className="max-w-5xl mx-auto w-full">
            
            {botStatus.ready === false && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <div className="bg-amber-500/20 p-1.5 rounded-lg shrink-0">
                  <AlertTriangle className="text-amber-500 w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-400 text-sm mb-0.5">{t[siteLang].botWarnTitle}</h3>
                  <p className="text-xs text-amber-300/80 leading-tight">
                    {t[siteLang].botWarnDesc}
                  </p>
                </div>
              </motion.div>}

            {
    /* Bento Grid Stats */
  }
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
              <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className="col-span-1 md:col-span-4 bg-gradient-to-br from-[#10141e]/80 to-[#0a0d14]/80 backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-2xl relative overflow-hidden group"
  >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ServerCog className="w-16 h-16 text-indigo-500 rotate-12" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="text-slate-500 text-xs font-medium mb-0.5">{t[siteLang].serversCount}</h4>
                    <p className="text-3xl font-black text-white tracking-tighter">{botStatus.guildCount || 0}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 bg-indigo-500/10 w-fit px-2 py-1 rounded-md border border-indigo-500/20 mt-3">
                    <Activity className="w-3 h-3" />
                    <span>{t[siteLang].liveSync}</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.1 }}
    className="col-span-1 md:col-span-4 bg-gradient-to-br from-[#10141e]/80 to-[#0a0d14]/80 backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-2xl relative overflow-hidden group"
  >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap className="w-16 h-16 text-emerald-500 rotate-12" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="text-slate-500 text-xs font-medium mb-0.5">{t[siteLang].sysStatus}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                      <p className="text-2xl font-black text-white tracking-tighter">{t[siteLang].active}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-3">{t[siteLang].ready}</p>
                </div>
              </motion.div>
              
              <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.2 }}
    className="col-span-1 md:col-span-4 bg-gradient-to-br from-indigo-600 to-violet-700 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl relative overflow-hidden"
  >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="text-indigo-100 text-xs font-medium mb-1">{t[siteLang].quickCmds}</h4>
                    <p className="text-xl font-black text-white leading-tight">{t[siteLang].slashCmds}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4 bg-black/20 p-2.5 rounded-lg backdrop-blur-sm border border-white/10">
                    <code className="text-white text-xs font-mono font-black">/help</code>
                    <div className="bg-white text-indigo-900 text-[10px] font-bold px-1.5 py-0.5 rounded">✔</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {
    /* Content Switcher */
  }
            <AnimatePresence mode="wait">
              {!user ? <motion.div
    key="login-prompt"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex flex-col items-center py-20 px-6 sm:px-10 glass-card rounded-[3.5rem] mt-4 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden group"
  >
                  {
    /* Floating animated particles or gradients */
  }
                  <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-1000" />
                  <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-fuchsia-600/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-fuchsia-600/10 transition-all duration-1000" />

                  {
    /* Hero Header */
  }
                  <div className="text-center max-w-2xl mx-auto mb-16 relative z-10 flex flex-col items-center">
                    <motion.div
    initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
    animate={{ scale: 1, opacity: 1, rotate: 0 }}
    transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
    className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl mb-10 relative group cursor-pointer"
  >
                      <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 via-fuchsia-500 to-amber-500 rounded-[2.2rem] blur-xl opacity-20 group-hover:opacity-60 transition-all duration-700 animate-pulse" />
                      <Bot className="w-12 h-12 text-indigo-400 relative z-10" />
                    </motion.div>

                    <h2 className="text-4xl sm:text-6xl font-[900] text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-50 to-indigo-200/50 mb-6 tracking-tight leading-[1.1] select-none">
                      {siteLang === "ar" ? "سيطر على مجتمعك بذكاء" : "Elevate Your Community"}
                    </h2>
                    <p className="text-sm sm:text-lg text-slate-400/80 max-w-xl mb-12 leading-relaxed font-medium">
                      {siteLang === "ar" ? "النظام المتكامل لإدارة سيرفرات ديسكورد بأعلى معايير الجودة والسرعة. لوحة تحكم عصرية تجمع كل ما تحتاجه في مكان واحد." : "The ultimate Discord management suite built for scale, speed, and elegance. Experience the next generation of server administration."}
                    </p>

                    <motion.button
    whileHover={{ scale: 1.05, y: -4 }}
    whileTap={{ scale: 0.95 }}
    onClick={handleLogin}
    className="relative inline-flex h-16 items-center justify-center overflow-hidden rounded-[1.5rem] bg-indigo-600 px-12 font-black text-lg text-white transition-all hover:bg-indigo-500 hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] cursor-pointer select-none group"
  >
                      <span className="relative flex items-center gap-4">
                        <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        {t[siteLang].loginBtn}
                      </span>
                    </motion.button>

                    {
    /* Guest Login Bypass */
  }
                    <div className="mt-5 flex flex-col items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                        {siteLang === "ar" ? "أو جرب لوحة التحكم مباشرة وبدون تسجيل" : "Or try the dashboard instantly"}
                      </span>
                      <button
    onClick={() => {
      setUser({
        id: "1179133837930938470",
        // Hardcoded admin ID for full feature preview
        username: siteLang === "ar" ? "مجرّب تجريبي (Tester)" : "Interactive Tester",
        avatar: "0"
      });
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: siteLang === "ar" ? "تم الدخول كضيف تجريبي كامل الصلاحيات! استكشف لوحة التحكم الآن." : "Logged in as a full-powered tester! Explore the dashboard now.",
          type: "success"
        }
      }));
    }}
    className="px-5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/20 transition-all font-bold text-xs cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
  >
                        {siteLang === "ar" ? "\u{1F680} دخول كـ ضيف للتجربة والتصفح" : "\u{1F680} Enter as Guest & Test Live"}
                      </button>
                    </div>
                  </div>

                  {
    /* Features Showcase Grid */
  }
                  <div className="w-full border-t border-white/[0.05] pt-16 mt-2 relative z-10">
                    <div className="text-center mb-12">
                      <h3 className="text-[10px] font-black tracking-[0.3em] text-indigo-400 uppercase mb-3">
                        {siteLang === "ar" ? "مميزات لوحة التحكم الفريدة" : "ADVANCED CORE ENGINE"}
                      </h3>
                      <p className="text-2xl font-black text-white tracking-tight">
                        {siteLang === "ar" ? "مبنية لتلبي كافّة احتياجات سيرفرك" : "Engineered for Scale & Performance"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {
    /* Feature 1 */
  }
                      <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 mb-4 text-indigo-400">
                            <Zap className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-white text-sm mb-2 tracking-tight">
                            {siteLang === "ar" ? "نظام مستويات متكامل" : "Interactive Levelling"}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {siteLang === "ar" ? "عزز التفاعل في سيرفرك مع نظام ليفل متقدم، بطاقات رتب مخصصة، وجوائز تلقائية للأعضاء النشطين." : "Boost engagement with advanced XP systems, custom rank cards, and automated role rewards."}
                          </p>
                        </div>
                      </div>

                      {
    /* Feature 3 */
  }
                      <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] flex flex-col justify-between">
                        <div>
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 mb-4 text-indigo-400">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-white text-sm mb-2 tracking-tight">
                            {siteLang === "ar" ? "حماية وإشراف فوري" : "Pro-Grade Moderation"}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {siteLang === "ar" ? "إجراءات حماية سريعة باستخدام أوامر سلاش (/kick, /ban)، تنظيف فوري للرسائل وتتبع سجلات الخادم." : "Keep your sanctuary safe with ultra-responsive slash commands and detailed real-time logs."}
                          </p>
                        </div>
                      </div>

                      {
    /* Feature 4 */
  }
                      <div className="p-8 rounded-[2rem] glass-card hover:bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all duration-500 group flex flex-col justify-between">
                        <div>
                          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-6 text-indigo-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl">
                            <MessageSquare className="w-7 h-7" />
                          </div>
                          <h4 className="font-black text-white text-lg mb-3 tracking-tight">
                            {siteLang === "ar" ? "ترحيب ومغادرة ديناميكي" : "Welcome & Departure"}
                          </h4>
                          <p className="text-sm text-slate-400 leading-relaxed font-medium">
                            {siteLang === "ar" ? "لوحة ترحيب رائعة ومخصصة للأعضاء الجدد، إعطاء رتب تلقائية، ومغادرة تعبر عن الاهتمام بتفاصيل السيرفر." : "Stunning customizable visual panels to greet new members, automatic initial role assignments, and sweet farewell triggers."}
                          </p>
                        </div>
                      </div>

                      {
    /* Feature 5 */
  }
                      <div className="p-8 rounded-[2rem] glass-card hover:bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all duration-500 group flex flex-col justify-between">
                        <div>
                          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-6 text-indigo-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl">
                            <PartyPopper className="w-7 h-7" />
                          </div>
                          <h4 className="font-black text-white text-lg mb-3 tracking-tight">
                            {siteLang === "ar" ? "محرك الألعاب والتفاعل" : "Interactive Mini-Games"}
                          </h4>
                          <p className="text-sm text-slate-400 leading-relaxed font-medium">
                            {siteLang === "ar" ? "تفعيل المتعة داخل سيرفرك بألعاب تفاعلية مثل الروليت ولعبة الذاكرة ريبلیکا لزيادة حماسة وتفاعل المجتمع." : "Inject unmatched fun into chat channels with dynamic built-in games like Roulette and Replica memory quizzes."}
                          </p>
                        </div>
                      </div>

                      {
    /* Feature 6 */
  }
                      <div className="p-8 rounded-[2rem] bg-indigo-600 border border-indigo-500 hover:shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all duration-500 group flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 blur-[60px] rounded-full pointer-events-none -translate-y-24 translate-x-12 opacity-40 group-hover:scale-150 transition-transform duration-700" />
                        <div>
                          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 mb-6 text-white group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                            <Activity className="w-7 h-7" />
                          </div>
                          <h4 className="font-black text-white text-lg mb-3 tracking-tight">
                            {siteLang === "ar" ? "سرعة استجابة مذهلة" : "Ultra-Low Latency"}
                          </h4>
                          <p className="text-sm text-white/80 leading-relaxed font-medium">
                            {siteLang === "ar" ? "خوادم مكرسة عالية الأداء ومبنية على أحدث كود لضمان الرد على الأوامر في أقل من أجزاء من الثانية." : "Powered by highly optimized event-loops and dedicated cloud infrastructure assuring instantaneous slash commands response."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div> : selectedGuild ? securityStatus.hasPin && !securityStatus.pinVerified ? <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    className="max-w-md mx-auto p-8 rounded-[2.5rem] bg-[#0b0f17]/90 backdrop-blur-3xl border border-rose-500/10 shadow-[0_45px_90px_rgba(0,0,0,0.8)] relative z-25 text-center my-12 w-full"
  >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#FF512F] to-[#DD2476]" />
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center text-rose-400 mb-6 shadow-xl">
                      <Lock className="w-10 h-10 animate-pulse" />
                    </div>
                    
                    <h3 className="text-2xl font-[900] text-white tracking-tight mb-2">
                      {siteLang === "ar" ? "لوحة التحكم مُؤمّنة" : "Dashboard Locked"}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6 max-w-xs mx-auto">
                      {siteLang === "ar" ? "الرجاء إدخل رمز التحقق للحماية (PIN) للمتابعة والوصول لكافة الخيارات والإعدادات المتقدمة." : "Please enter your Master Security PIN to complete decryption and gain administrative access."}
                    </p>

                    <div className="space-y-4 max-w-xs mx-auto">
                      <input
    type="password"
    value={pinUnlockCode}
    onChange={(e) => setPinUnlockCode(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && verifyUnlockPin()}
    placeholder="••••"
    className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-rose-500 text-center tracking-widest font-mono text-lg transition-all"
  />
                      
                      <button
    onClick={verifyUnlockPin}
    disabled={pinUnlockLoading}
    className="w-full h-14 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-xs tracking-wider uppercase transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
  >
                        {pinUnlockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4 cursor-pointer text-rose-300" />}
                        {siteLang === "ar" ? "فك تشفير وإلغاء القفل" : "Decrypt & Access"}
                      </button>

                      <button
    onClick={() => confirmNavigation("server", null)}
    className="w-full text-center text-[10px] uppercase font-black tracking-widest text-slate-500 hover:text-slate-300 py-2 transition"
  >
                        {siteLang === "ar" ? "العودة للخلف" : "Go Back"}
                      </button>
                    </div>
                  </motion.div> : <motion.div
    key="guild-details"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="glass-card rounded-[2.5rem] p-6 lg:p-10 relative overflow-hidden z-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]"
  >
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 relative z-10 gap-6">
                    <div className="flex items-center gap-6">
                      <div className="relative shrink-0">
                        <div className="absolute -inset-1.5 bg-indigo-500/20 blur-lg rounded-[2rem]" />
                        {selectedGuild.icon ? <img
    src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`}
    alt={selectedGuild.name}
    className="w-20 h-20 rounded-[1.8rem] shadow-2xl border border-white/10 relative z-10 object-cover"
  /> : <div className="w-20 h-20 bg-gradient-to-br from-indigo-900 to-indigo-600 rounded-[1.8rem] flex items-center justify-center text-3xl font-black text-white shadow-2xl border border-white/10 relative z-10">
                            {selectedGuild.name.charAt(0)}
                          </div>}
                      </div>
                      <div>
                        <h2 className="text-2xl md:text-3xl font-[900] text-white tracking-tight leading-none mb-3">{selectedGuild.name}</h2>
                        <div className="flex items-center gap-3">
                          <p className="text-[11px] text-slate-400 font-black bg-white/5 px-3 py-1 rounded-full border border-white/10 tracking-widest uppercase">ID: {selectedGuild.id}</p>
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20 uppercase tracking-widest">{t[siteLang].connected}</span>
                        </div>
                      </div>
                    </div>
                    <button
    onClick={() => confirmNavigation("server", null)}
    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10 font-black flex items-center gap-3 text-[11px] shrink-0 uppercase tracking-widest shadow-xl"
  >
                      <ChevronLeft className="w-4 h-4" />
                      {t[siteLang].back}
                    </button>
                  </div>
                  
                  <div className="flex flex-col lg:flex-row gap-10">
                    {
    /* Sidebar */
  }
                    <div className="w-full lg:w-72 shrink-0 space-y-3 relative">
                      <button
    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
    className="w-full flex items-center justify-between gap-3 px-6 py-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl font-black transition-all text-xs text-white lg:hidden"
  >
                        <span className="flex items-center gap-2">
                           <Menu className="w-5 h-5 text-indigo-400" />
                           {siteLang === "ar" ? "عرض القائمة الرئيسية" : "BROWSE CATEGORIES"}
                        </span>
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                      </button>

                      <div className={`flex flex-col gap-1.5 transition-all duration-500 ${isSidebarOpen ? "max-h-[1000px] opacity-100 mt-2" : "max-h-0 opacity-0 overflow-hidden mt-0 lg:max-h-none lg:opacity-100 lg:overflow-visible"}`}>
                        <button
    onClick={() => {
      confirmNavigation("guild", "commands");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "commands" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <Settings2 className="w-5 h-5" />
                          {gT[siteLang].commandsTab || "Settings"}
                        </button>
                        <button
    onClick={() => {
      confirmNavigation("guild", "welcome");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "welcome" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <MessageSquare className="w-5 h-5" />
                          {gT[siteLang].welcomeTab || "Welcome"}
                        </button>
                        <button
    onClick={() => {
      confirmNavigation("guild", "levelling");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "levelling" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <Zap className="w-5 h-5" />
                          {gT[siteLang].levellingTab || "Levels"}
                        </button>
                        
                        <button
    onClick={() => {
      confirmNavigation("guild", "auto_features");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "auto_features" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <MessageSquare className="w-5 h-5" />
                          {gT[siteLang].autoTab || "Auto Features"}
                        </button>

                        <button
    onClick={() => {
      confirmNavigation("guild", "brokers");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "brokers" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <Briefcase className="w-5 h-5" />
                          {gT[siteLang].brokersTab || "Brokers"}
                        </button>

                        <button
    onClick={() => {
      confirmNavigation("guild", "suggestions");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "suggestions" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <Sparkles className="w-5 h-5" />
                          {gT[siteLang].suggestionsTab || "Suggestions"}
                        </button>

                        <button
    onClick={() => {
      confirmNavigation("guild", "tickets");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "tickets" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <MessageSquare className="w-5 h-5" />
                          {gT[siteLang].ticketsTab || "Tickets"}
                        </button>

                        <button
    onClick={() => {
      confirmNavigation("guild", "afk");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "afk" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <Moon className="w-5 h-5" />
                          {siteLang === "ar" ? "نظام الـ AFK" : "AFK System"}
                        </button>

                        <button
    onClick={() => {
      confirmNavigation("guild", "azkar");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "azkar" ? "bg-white text-emerald-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <BookOpen className="w-5 h-5" />
                          {siteLang === "ar" ? "نظام الأذكار" : "Azkar System"}
                        </button>

                        <button
    onClick={() => {
      confirmNavigation("guild", "applications");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "applications" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <FileText className="w-5 h-5" />
                          {siteLang === "ar" ? "نظام التقديمات" : "Applications"}
                        </button>

                        <button
    onClick={() => {
      confirmNavigation("guild", "logs");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "logs" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <FileText className="w-5 h-5" />
                          {gT[siteLang].logsTab || "Logs"}
                        </button>

                        <button
    onClick={() => {
      confirmNavigation("guild", "events");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "events" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <Zap className="w-5 h-5" />
                          {gT[siteLang].eventsTab || "Events"}
                        </button>

                        <button
    onClick={() => {
      confirmNavigation("guild", "scripts");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "scripts" ? "bg-white text-indigo-900 border-white shadow-[0_12px_24px_-8px_rgba(255,255,255,0.3)]" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <TerminalSquare className="w-5 h-5" />
                          {gT[siteLang].scriptsTab || "Scripts"}
                        </button>
                        
                        <div className="h-px bg-white/5 my-4 mx-4" />
                        
                        <button
    onClick={() => {
      confirmNavigation("guild", "security");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "security" ? "bg-indigo-600 text-white border-indigo-400/30" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-white"}`}
  >
                          <ShieldCheck className="w-5 h-5" />
                          {gT[siteLang].securityTab || "Security"}
                        </button>
                        
                        <button
    onClick={() => {
      confirmNavigation("guild", "premium");
      setIsSidebarOpen(false);
    }}
    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2.5xl font-black transition-all duration-300 text-[11px] tracking-widest uppercase border ${activeGuildTab === "premium" ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : "text-slate-400 hover:bg-white/5 border-transparent hover:text-amber-500"}`}
  >
                          <Star className="w-5 h-5" />
                          {gT[siteLang].premiumTab || "Premium"}
                        </button>
                      </div>
                    </div>

                    {
    /* Content */
  }
                    <div className="flex-1 min-w-0">
                      {activeGuildTab === "commands" && <GuildConfigView guildId={selectedGuild.id} siteLang={siteLang} onDirtyChange={setHasUnsavedChanges} />}
                      {activeGuildTab === "welcome" && <WelcomeSystemView guildId={selectedGuild.id} siteLang={siteLang} onDirtyChange={setHasUnsavedChanges} />}
                      {activeGuildTab === "levelling" && <LevellingConfigView guildId={selectedGuild.id} siteLang={siteLang} onDirtyChange={setHasUnsavedChanges} />}
                      {activeGuildTab === "scripts" && <ScriptConfigView guildId={selectedGuild.id} siteLang={siteLang} />}
                      {activeGuildTab === "events" && <EventsConfigView guildId={selectedGuild.id} siteLang={siteLang} />}
                      {activeGuildTab === "security" && <SecurityConfigView guildId={selectedGuild.id} siteLang={siteLang} isOwner={!!selectedGuild.owner} onDirtyChange={setHasUnsavedChanges} />}
                      {activeGuildTab === "logs" && <LogsConfigView guildId={selectedGuild.id} siteLang={siteLang} />}
                      {activeGuildTab === "auto_features" && <AutoFeaturesView guildId={selectedGuild.id} siteLang={siteLang} />}
                      {activeGuildTab === "brokers" && <BrokersConfigView guildId={selectedGuild.id} siteLang={siteLang} />}
                      {activeGuildTab === "suggestions" && <SuggestionsConfigView guildId={selectedGuild.id} siteLang={siteLang} />}
                      {activeGuildTab === "tickets" && <TicketsConfigView guildId={selectedGuild.id} siteLang={siteLang} />}
                      {activeGuildTab === "afk" && <AfkConfigView guildId={selectedGuild.id} siteLang={siteLang} onDirtyChange={setHasUnsavedChanges} />}
                      {activeGuildTab === "azkar" && <AzkarConfigView guildId={selectedGuild.id} siteLang={siteLang} onDirtyChange={setHasUnsavedChanges} />}
                      {activeGuildTab === "applications" && <ApplicationsConfigView guildId={selectedGuild.id} siteLang={siteLang} onDirtyChange={setHasUnsavedChanges} />}
                      {activeGuildTab === "premium" && <PremiumView userId={user.id} guildId={selectedGuild.id} siteLang={siteLang} />}
                    </div>
                  </div>
                </motion.div> : activeMainTab === "settings" ? <BackupSettingsView siteLang={siteLang} /> : <motion.div
    key="guild-list"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-4"
  >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                      {t[siteLang].communities}
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                        {guilds.length}
                      </span>
                    </h3>
                  </div>
                  
                  {guilds.length === 0 ? <div className="p-12 text-center bg-[#0c0f16]/80 backdrop-blur-xl border border-white/5 rounded-3xl relative z-10 w-full shadow-2xl">
                       <ShieldAlert className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                       <h3 className="text-xl font-black text-white mb-2">{t[siteLang].noPerm}</h3>
                       <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">{t[siteLang].noPermDesc}</p>
                     </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10 pb-20">
                      {guilds.map((guild, i) => {
    const botInGuild = botStatus.guildIds?.includes(guild.id);
    return <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.4 }}
      key={guild.id}
      className="group relative bg-[#0A0D14]/80 border border-white/5 hover:border-indigo-500/40 rounded-2xl p-5 hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden"
    >
                            <div className="relative z-10 flex flex-col h-full gap-4">
                              <div className={`flex flex-col items-center text-center gap-3 ${!botInGuild ? "opacity-70 group-hover:opacity-100 transition-opacity duration-500" : ""}`}>
                                <div className="relative shrink-0">
                                  {guild.icon ? <img
      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
      alt={guild.name}
      className={`w-16 h-16 rounded-xl border border-white/10 group-hover:scale-105 transition-transform duration-500 object-cover relative z-10 ${!botInGuild && "grayscale group-hover:grayscale-0"}`}
    /> : <div className="w-16 h-16 bg-[#1a1f2e] rounded-xl flex items-center justify-center text-xl font-bold text-white border border-white/10 group-hover:scale-105 transition-transform duration-500 relative z-10">
                                      {guild.name.charAt(0)}
                                    </div>}
                                  {botInGuild && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0A0D14] rounded-full z-20" />}
                                </div>
                                <div className="w-full">
                                  <p className="font-bold text-white text-base truncate mb-1" title={guild.name}>{guild.name}</p>
                                  {botInGuild ? <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {t[siteLang].botConnected}
                                    </div> : <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                      {t[siteLang].botMissing}
                                    </div>}
                                </div>
                              </div>
                              <div className="mt-auto pt-3 w-full flex items-center justify-center border-t border-white/5">
                                {botInGuild ? <button
      onClick={() => confirmNavigation("server", guild)}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-md transition-all text-xs"
    >
                                      {t[siteLang].manageServer}
                                  </button> : <a
      href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID || ""}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
      target="_blank"
      rel="noreferrer"
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-indigo-600/10 text-slate-300 border border-white/10 rounded-lg font-bold transition-all text-xs"
    >
                                      {t[siteLang].inviteBot}
                                  </a>}
                              </div>
                            </div>
                          </motion.div>;
  })}
                    </div>}
                </motion.div>}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {
    /* Unsaved Changes Modal */
  }
      <AnimatePresence>
        {pendingNav && <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.9, opacity: 0 }}
    className="bg-[#0A0D14] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
  >
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
                <AlertTriangle className="text-amber-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">
                {siteLang === "ar" ? "هل تريد حفظ التغييرات؟" : siteLang === "fr" ? "Voulez-vous enregistrer les modifications?" : "Do you want to save changes?"}
              </h3>
              <p className="text-slate-400 text-sm mb-8">
                {siteLang === "ar" ? "لديك تغييرات غير محفوظة، هل تريد الحفظ قبل الانتقال؟" : "You have unsaved changes. Do you want to save before leaving?"}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
    onClick={() => {
      executeNavigation(pendingNav.type, pendingNav.value);
    }}
    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10"
  >
                  {siteLang === "ar" ? "لا (تجاهل)" : "No (Discard)"}
                </button>
                <button
    onClick={() => {
      window.dispatchEvent(new CustomEvent("trigger-save"));
      setTimeout(() => {
        executeNavigation(pendingNav.type, pendingNav.value);
      }, 600);
    }}
    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-xl"
  >
                   {siteLang === "ar" ? "نعم (حفظ)" : "Yes (Save)"}
                </button>
              </div>
            </motion.div>
          </div>}
      </AnimatePresence>

      {/* Floating Unsaved Changes Notification Card on the Bottom Right */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-[200] bg-[#0E1119]/95 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md max-w-[450px]"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <p className="text-sm font-black text-slate-100">
                {siteLang === "ar" ? "هل تريد حفظ التغييرات؟" : "Do you want to save changes?"}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("trigger-cancel"));
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-xs transition-all border border-white/5 cursor-pointer"
              >
                {siteLang === "ar" ? "لا" : "No"}
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("trigger-save"));
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 border border-indigo-400/20 cursor-pointer"
              >
                {siteLang === "ar" ? "نعم" : "Yes"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>;
}
