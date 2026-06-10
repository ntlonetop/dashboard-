import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { gT } from "./i18n";
import { Star, Gift, CheckCircle2, AlertCircle, Headphones, Loader2 } from "lucide-react";
export function PremiumView({ userId, guildId, siteLang }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceChannelId, setVoiceChannelId] = useState("");
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [saving, setSaving] = useState(false);
  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/premium/status?userId=${userId}${guildId ? `&guildId=${guildId}` : ""}`);
      const data = await res.json();
      setStatus(data);
      if (data.voiceEnabled !== void 0) {
        setVoiceEnabled(data.voiceEnabled);
        setVoiceChannelId(data.voiceChannelId || "");
      }
      if (guildId && data.isPremium) {
        const vRes = await fetch(`/api/guild/channels?guildId=${guildId}&type=voice`);
        const vChannels = await vRes.json();
        setVoiceChannels(vChannels);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (userId) fetchStatus();
  }, [userId, guildId]);
  const toggleVoice = async () => {
    if (!status?.isPremium || !guildId) return;
    setSaving(true);
    try {
      const newEnabled = !voiceEnabled;
      if (!newEnabled) {
        await fetch("/api/premium/voice-channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guildId, channelId: "" })
        });
        setVoiceChannelId("");
      } else {
      }
      setVoiceEnabled(newEnabled);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: siteLang === "ar" ? "تم تحديث إعدادات الصوت بنجاح" : "Voice settings updated successfully", type: "success" }
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };
  const saveSelectedVoiceChannel = async (cid) => {
    if (!status?.isPremium || !guildId) return;
    setSaving(true);
    try {
      await fetch("/api/premium/voice-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, channelId: cid })
      });
      setVoiceChannelId(cid);
      setVoiceEnabled(!!cid);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { message: siteLang === "ar" ? "تم تعيين روم الصوت بنجاح" : "Voice channel set successfully", type: "success" }
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };
  const handleRedeem = async () => {
    if (!code) return;
    setRedeeming(true);
    setMessage(null);
    try {
      const res = await fetch("/api/premium/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: gT[siteLang].redeemSuccess, type: "success" });
        setCode("");
        fetchStatus();
      } else {
        setMessage({ text: data.message || gT[siteLang].invalidCode, type: "error" });
      }
    } catch (e) {
      setMessage({ text: "Error connecting to server", type: "error" });
    } finally {
      setRedeeming(false);
    }
  };
  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  return <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-6"
  >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {
    /* Status Card */
  }
        <div className="bg-[#0f1219] p-6 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Star size={80} className="text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Star className="text-amber-400" size={20} />
            {gT[siteLang].premiumStatus}
          </h3>
          
          {status?.isPremium ? <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 size={18} />
                <span>Active</span>
              </div>
              <p className="text-slate-400 text-sm">
                {gT[siteLang].activeUntil}: <span className="font-mono text-indigo-400">{new Date(status.expiry).toLocaleDateString()}</span>
              </p>
            </div> : <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <AlertCircle size={18} />
                <span>{gT[siteLang].notPremium}</span>
              </div>
            </div>}
        </div>

        {
    /* Redeem Card */
  }
        <div className="bg-[#0f1219] p-6 rounded-2xl border border-white/5 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Gift className="text-indigo-400" size={20} />
            {gT[siteLang].redeemCode}
          </h3>
          
          <div className="space-y-4">
            <div>
              <input
    type="text"
    value={code}
    onChange={(e) => setCode(e.target.value)}
    placeholder="PREM-XXXX"
    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase font-mono text-white placeholder:text-slate-600"
  />
            </div>
            
            {message && <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${message.type === "success" ? "bg-emerald-900/20 text-emerald-400" : "bg-rose-900/20 text-rose-400"}`}>
                {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>}

            <button
    onClick={handleRedeem}
    disabled={redeeming || !code}
    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98]"
  >
              {redeeming ? <Loader2 className="animate-spin mx-auto" size={18} /> : gT[siteLang].redeemBtn}
            </button>
          </div>
        </div>
      </div>

      {
    /* Voice Control Section for Premium */
  }
      <div className="bg-[#0f1219] p-6 rounded-2xl border border-white/5 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Headphones className="text-indigo-400" size={20} />
          {siteLang === "ar" ? "تحكم الصوت (بريميوم)" : "Voice Control (Premium)"}
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          {siteLang === "ar" ? "تفعيل دخول البوت للقنوات الصوتية تلقائياً عند الحاجة. اختر الروم الصوتي المناسب أدناه لحفظه." : "Enable bot join voice channels automatically. Pick a voice channel below to save it."}
        </p>

        {status?.isPremium ? guildId ? <div className="space-y-4">
              <select
    value={voiceChannelId}
    onChange={(e) => saveSelectedVoiceChannel(e.target.value)}
    disabled={saving || !status?.isPremium}
    className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1.25em_1.25em] bg-no-repeat bg-[position:right_1rem_center] rtl:bg-[position:left_1rem_center]"
  >
                <option value="">{siteLang === "ar" ? "-- تعطيل الانضمام التلقائي --" : "-- Disable Auto-Join --"}</option>
                {voiceChannels.map((ch) => <option key={ch.id} value={ch.id}>🔊 {ch.name}</option>)}
              </select>
              
              {saving && <p className="text-sm text-indigo-400 animate-pulse">{siteLang === "ar" ? "جاري الحفظ..." : "Saving..."}</p>}
            </div> : <div className="bg-amber-900/20 text-amber-500 p-4 rounded-xl border border-amber-500/10 text-sm">
              {siteLang === "ar" ? "يرجى اختيار سيرفر من القائمة الجانبية لإدارة إعدادات الصوت" : "Please select a server from the sidebar to manage voice settings"}
            </div> : <button
    disabled
    className="w-full font-bold py-3 rounded-xl transition-all bg-slate-800 text-slate-500 cursor-not-allowed"
  >
           {siteLang === "ar" ? "متاح للبريميوم فقط" : "Premium Only"}
          </button>}
      </div>

      {
    /* Benefits Content (Optional but good for UI) */
  }
      <div className="bg-[#0f1219] p-8 rounded-3xl border border-white/5 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Premium Features</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
    "Custom Bot Branding",
    "Advanced Levelling Metrics",
    "Priority Support",
    "Unlimited Ticket Panels",
    "Animated Welcome Backgrounds",
    "Custom Commands Aliases"
  ].map((feat, i) => <li key={i} className="flex items-center gap-3 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="bg-indigo-900/30 p-2 rounded-full">
                <CheckCircle2 size={16} className="text-indigo-400" />
              </div>
              <span className="text-slate-300 text-sm font-medium">{feat}</span>
            </li>)}
        </ul>
      </div>
    </motion.div>;
}
