import { useState, useEffect } from "react";
import {
  Save,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Upload,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
  Heart,
  MousePointerClick,
  X,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { motion } from "motion/react";
export function AutoFeaturesView({ guildId, siteLang }) {
  const isAr = siteLang === "ar";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingEmbed, setSendingEmbed] = useState(null);
  const [postingVerif, setPostingVerif] = useState(false);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roleQuery, setRoleQuery] = useState("");
  const [channelQuery, setChannelQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("lines_bye");
  const [autolines, setAutolines] = useState([]);
  const [byeConfig, setByeConfig] = useState({
    channelId: "",
    message: "",
    lineUrl: "",
    enabled: false
  });
  const [newLineChannel, setNewLineChannel] = useState("");
  const [newLineUrl, setNewLineUrl] = useState("");
  const [imageChannels, setImageChannels] = useState([]);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState({
    trigger: "",
    replyText: "",
    isEmbed: false,
    embedTitle: "",
    embedColor: "#4f46e5",
    embedImage: "",
    embedFooter: "",
    matchType: "partial",
    allowedRoles: [],
    allowedChannels: []
  });
  const [savedEmbeds, setSavedEmbeds] = useState([]);
  const [activeEmbed, setActiveEmbed] = useState({
    id: "temp_embed",
    name: "",
    title: "",
    description: "",
    imageUrl: "",
    thumbnailUrl: "",
    footer: "",
    color: "#4f46e5",
    buttons: [],
    selectOptions: [],
    selectPlaceholder: "اختر خياراً...",
    roleOnAction: {
      type: "button",
      buttonLabel: "",
      roleId: "",
      emoji: ""
    }
  });
  const [targetSendChannel, setTargetSendChannel] = useState("");
  const [tempButton, setTempButton] = useState({
    label: "",
    emoji: "",
    style: "primary",
    actionType: "role",
    roleId: "",
    ephemeralText: ""
  });
  const [tempSelectOption, setTempSelectOption] = useState({
    label: "",
    description: "",
    emoji: "",
    actionType: "role",
    roleId: "",
    ephemeralText: ""
  });
  const [verification, setVerification] = useState({
    enabled: false,
    channelId: "",
    title: "توثيق الحساب \u{1F512}",
    description: "يرجى الضغط على الزر أدناه ليتم التحقق من حسابك وتفعيل صلاحياتك بالسيرفر.",
    imageUrl: "",
    color: "#10b981",
    buttonLabel: "اضغط للتوثيق \u{1F512}",
    addRoleId: "",
    removeRoleId: ""
  });
  const [autoRoles, setAutoRoles] = useState([]);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/guilds/${guildId}/roles-channels`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/auto-features`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/auto-replies`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/saved-embeds`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/verification`).then((res) => res.json()),
      fetch(`/api/guilds/${guildId}/auto-roles`).then((res) => res.json())
    ]).then(([structData, featuresData, repliesData, embedsData, verifData, autoRolesData]) => {
      if (structData.channels) setChannels(structData.channels);
      if (structData.roles) setRoles(structData.roles.filter((r) => r.name !== "@everyone"));
      if (structData.categories) setCategories(structData.categories);
      if (featuresData) {
        setAutolines(featuresData.autolines || []);
        if (featuresData.bye) setByeConfig(featuresData.bye);
        if (featuresData.imageChannels) setImageChannels(featuresData.imageChannels);
      }
      if (repliesData) setReplies(repliesData);
      if (embedsData) setSavedEmbeds(embedsData);
      if (verifData) setVerification(verifData);
      if (autoRolesData) setAutoRoles(autoRolesData);
      setLoading(false);
    }).catch((err) => {
      console.error("Error fetching auto features data:", err);
      setLoading(false);
    });
  }, [guildId]);
  const showToast = (message, type = "success") => {
    window.dispatchEvent(new CustomEvent("show-toast", {
      detail: { message, type }
    }));
  };
  const saveAllFeatures = async (section) => {
    setSaving(true);
    try {
      if (section === "lines_bye" || section === "image_channels") {
        await fetch(`/api/guilds/${guildId}/auto-features`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autolines, bye: byeConfig, imageChannels })
        });
      } else if (section === "replies") {
        await fetch(`/api/guilds/${guildId}/auto-replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(replies)
        });
      } else if (section === "embed_builder") {
        await fetch(`/api/guilds/${guildId}/saved-embeds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savedEmbeds)
        });
      } else if (section === "verification") {
        await fetch(`/api/guilds/${guildId}/verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verification)
        });
      } else if (section === "auto_roles") {
        await fetch(`/api/guilds/${guildId}/auto-roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(autoRoles)
        });
      }
      showToast(isAr ? "تم حفظ الإعدادات بنجاح! ✨" : "Settings saved successfully! ✨", "success");
    } catch (e) {
      console.error("Save error:", e);
      showToast(isAr ? "حدث خطأ أثناء الحفظ." : "Error saving configuration.", "error");
    } finally {
      setSaving(false);
    }
  };
  const handleAddAutoLine = () => {
    if (!newLineChannel) {
      showToast(isAr ? "يرجى تحديد روم/قناة للخط التلقائي" : "Please select a channel for the auto line", "error");
      return;
    }
    const duplicated = autolines.some((a) => a.channelId === newLineChannel);
    if (duplicated) {
      showToast(isAr ? "⚠️ ممنوع وضع خطّين تلقائيّين في نفس الروم!" : "⚠️ Duplicate auto line in the same channel is forbidden!", "error");
      return;
    }
    if (!newLineUrl) {
      showToast(isAr ? "يرجى اختيار صورة أو لصق رابط" : "Please upload or provide an image/line URL", "error");
      return;
    }
    const updated = [...autolines, { channelId: newLineChannel, lineUrl: newLineUrl }];
    setAutolines(updated);
    fetch(`/api/guilds/${guildId}/auto-features`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autolines: updated, bye: byeConfig })
    }).then(() => {
      showToast(isAr ? "تمت إضافة الخط التلقائي بنجاح!" : "Auto Line added successfully!");
      setNewLineChannel("");
      setNewLineUrl("");
    });
  };
  const handleRemoveAutoLine = (index) => {
    const updated = autolines.filter((_, idx) => idx !== index);
    setAutolines(updated);
    fetch(`/api/guilds/${guildId}/auto-features`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autolines: updated, bye: byeConfig })
    }).then(() => {
      showToast(isAr ? "تم حذف الخط التلقائي" : "Auto Line deleted");
    });
  };
  const handleImageUpload = (e, target) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        showToast(isAr ? "الملف كبير جداً (الأقصى 15 ميجابايت)" : "File is too large (Max 15MB)", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result;
        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: base64,
              name: file.name.split(".")[0]
            })
          });
          if (!response.ok) throw new Error("Upload failed");
          const data = await response.json();
          const targetUrl = data.url;
          if (target === "newline") {
            setNewLineUrl(targetUrl);
          } else if (target === "bye") {
            setByeConfig((prev) => ({ ...prev, lineUrl: targetUrl }));
          } else if (target === "reply") {
            setNewReply((prev) => ({ ...prev, embedImage: targetUrl }));
          } else if (target === "embed_img") {
            setActiveEmbed((prev) => ({ ...prev, imageUrl: targetUrl }));
          } else if (target === "embed_thumb") {
            setActiveEmbed((prev) => ({ ...prev, thumbnailUrl: targetUrl }));
          } else if (target === "verif") {
            setVerification((prev) => ({ ...prev, imageUrl: targetUrl }));
          }
          showToast(isAr ? "تم رفع وحفظ الصورة بنجاح! \u{1F389}" : "Image uploaded and saved successfully! \u{1F389}");
        } catch (err) {
          console.error("Upload error:", err);
          showToast(isAr ? "فشل رفع الصورة في الخادم" : "Failed to upload image to server", "error");
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const handleAddReply = () => {
    if (!newReply.trigger || !newReply.replyText && !newReply.isEmbed) {
      showToast(isAr ? "يجب تعبئة كلمة التحفيز ومحتوى الرد" : "Please fill trigger word and reply content", "error");
      return;
    }
    const item = {
      ...newReply,
      id: "reply_" + Math.random().toString(36).substring(2, 9)
    };
    const updated = [...replies, item];
    setReplies(updated);
    fetch(`/api/guilds/${guildId}/auto-replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    }).then(() => {
      showToast(isAr ? "تمت إضافة الرد التلقائي!" : "Auto reply added!");
      setNewReply({
        trigger: "",
        replyText: "",
        isEmbed: false,
        embedTitle: "",
        embedColor: "#4f46e5",
        embedImage: "",
        embedFooter: "",
        matchType: "partial",
        allowedRoles: [],
        allowedChannels: []
      });
    });
  };
  const handleRemoveReply = (id) => {
    const updated = replies.filter((r) => r.id !== id);
    setReplies(updated);
    fetch(`/api/guilds/${guildId}/auto-replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    }).then(() => {
      showToast(isAr ? "تم حذف الرد التلقائي" : "Auto reply deleted");
    });
  };
  const handleSaveActiveEmbed = () => {
    if (!activeEmbed.name) {
      showToast(isAr ? "يرجى إعطاء مسمى لقالب الإيمبد لحفظه" : "Please enter a template name for the embed", "error");
      return;
    }
    let updated;
    const exists = savedEmbeds.find((e) => e.id === activeEmbed.id);
    if (exists && activeEmbed.id !== "temp_embed") {
      updated = savedEmbeds.map((e) => e.id === activeEmbed.id ? activeEmbed : e);
    } else {
      const fresh = {
        ...activeEmbed,
        id: "embed_" + Math.random().toString(36).substring(2, 9)
      };
      updated = [...savedEmbeds, fresh];
    }
    setSavedEmbeds(updated);
    fetch(`/api/guilds/${guildId}/saved-embeds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    }).then(() => {
      showToast(isAr ? "تم حفظ قالب الإيمبد بنجاح!" : "Embed template saved successfully!");
      setActiveEmbed({
        id: "temp_embed",
        name: "",
        title: "",
        description: "",
        imageUrl: "",
        thumbnailUrl: "",
        footer: "",
        color: "#4f46e5",
        buttons: [],
        selectOptions: [],
        selectPlaceholder: "اختر خياراً...",
        roleOnAction: {
          type: "button",
          buttonLabel: "",
          roleId: "",
          emoji: ""
        }
      });
    });
  };
  const handleLoadEmbed = (val) => {
    setActiveEmbed({
      ...val,
      buttons: val.buttons || [],
      selectOptions: val.selectOptions || [],
      selectPlaceholder: val.selectPlaceholder || "اختر خياراً..."
    });
    showToast(isAr ? `تم تحميل قالب: ${val.name}` : `Loaded template: ${val.name}`);
  };
  const handleDeleteEmbed = (id, name) => {
    const updated = savedEmbeds.filter((e) => e.id !== id);
    setSavedEmbeds(updated);
    fetch(`/api/guilds/${guildId}/saved-embeds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    }).then(() => {
      showToast(isAr ? `تم حذف قالب: ${name}` : `Deleted template: ${name}`);
      if (activeEmbed.id === id) {
        setActiveEmbed({
          id: "temp_embed",
          name: "",
          title: "",
          description: "",
          imageUrl: "",
          thumbnailUrl: "",
          footer: "",
          color: "#4f46e5",
          buttons: [],
          selectOptions: [],
          selectPlaceholder: "اختر خياراً...",
          roleOnAction: {
            type: "button",
            buttonLabel: "",
            roleId: "",
            emoji: ""
          }
        });
      }
    });
  };
  const handleAddButton = () => {
    if (!tempButton.label) {
      showToast(isAr ? "يعبأ مسمى للزر أولاً" : "Please enter a button label first", "error");
      return;
    }
    const btns = activeEmbed.buttons || [];
    if (btns.length >= 5) {
      showToast(isAr ? "الحد الأقصى 5 أزرار لكل إيمبد!" : "Maximum 5 buttons allowed per embed!", "error");
      return;
    }
    const freshBtn = {
      ...tempButton,
      id: "btn_" + Math.random().toString(36).substring(2, 9)
    };
    setActiveEmbed((prev) => ({
      ...prev,
      buttons: [...prev.buttons || [], freshBtn]
    }));
    setTempButton({
      label: "",
      emoji: "",
      style: "primary",
      actionType: "role",
      roleId: "",
      ephemeralText: ""
    });
    showToast(isAr ? "تم إدراج الزر التفاعلي" : "Interactive button inserted");
  };
  const handleRemoveButton = (id) => {
    setActiveEmbed((prev) => ({
      ...prev,
      buttons: (prev.buttons || []).filter((b) => b.id !== id)
    }));
  };
  const handleAddSelectOption = () => {
    if (!tempSelectOption.label) {
      showToast(isAr ? "يجب وضع مسمى للخيار أولاً" : "Please enter an option label first", "error");
      return;
    }
    const opts = activeEmbed.selectOptions || [];
    if (opts.length >= 15) {
      showToast(isAr ? "الحد الأقصى 15 خيار للقائمة التفاعلية!" : "Maximum 15 options allowed!", "error");
      return;
    }
    const freshOpt = {
      ...tempSelectOption,
      id: "opt_" + Math.random().toString(36).substring(2, 9)
    };
    setActiveEmbed((prev) => ({
      ...prev,
      selectOptions: [...prev.selectOptions || [], freshOpt]
    }));
    setTempSelectOption({
      label: "",
      description: "",
      emoji: "",
      actionType: "role",
      roleId: "",
      ephemeralText: ""
    });
    showToast(isAr ? "تم إدراج خيار القائمة الجديد" : "Select option inserted");
  };
  const handleRemoveSelectOption = (id) => {
    setActiveEmbed((prev) => ({
      ...prev,
      selectOptions: (prev.selectOptions || []).filter((o) => o.id !== id)
    }));
  };
  const handleSendEmbedToChannel = async (embedId) => {
    if (!targetSendChannel) {
      showToast(isAr ? "يرجى اختيار روم/قناة صوتية أو كتابية لإرسال الإيمبد!" : "Please choose a channel to send the embed!", "error");
      return;
    }
    setSendingEmbed(embedId);
    try {
      const res = await fetch(`/api/guilds/${guildId}/send-embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedId, channelId: targetSendChannel })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isAr ? "\u{1F680} تم إرسال الإيمبد التفاعلي بنجاح إلى القناة!" : "\u{1F680} Interactive Embed sent successfully to channel!", "success");
      } else {
        showToast(data.error || (isAr ? "حدث خطأ أثناء إرسال الإيمبد." : "Failed to send embed."), "error");
      }
    } catch (e) {
      showToast(isAr ? "خطأ في الاتصال بالخادم" : "Server connection error", "error");
    } finally {
      setSendingEmbed(null);
    }
  };
  const handleSendVerificationPanel = async () => {
    if (!verification.channelId) {
      showToast(isAr ? "يرجى اختيار روم لوحة التوثيق قبل التفعيل والإرسال" : "Please select a channel for verification first", "error");
      return;
    }
    setPostingVerif(true);
    try {
      await fetch(`/api/guilds/${guildId}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...verification, enabled: true })
      });
      const res = await fetch(`/api/guilds/${guildId}/post-verification`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isAr ? "\u{1F512} تم إرسال وتجهيز لوحة التوثيق بنجاح!" : "\u{1F512} Verification panel sent and set up successfully!", "success");
      } else {
        showToast(data.error || (isAr ? "تعذر إرسال لوحة التوثيق" : "Could not send verification panel"), "error");
      }
    } catch (e) {
      showToast(isAr ? "فشل الاتصال بالبوت" : "Failed to connect to Discord Bot", "error");
    } finally {
      setPostingVerif(false);
    }
  };
  const handleToggleAutoRole = (roleId) => {
    let updated;
    if (autoRoles.includes(roleId)) {
      updated = autoRoles.filter((r) => r !== roleId);
    } else {
      updated = [...autoRoles, roleId];
    }
    setAutoRoles(updated);
  };
  if (loading) {
    return <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 rounded-3xl border border-white/5 space-y-3">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <span className="text-slate-400 text-sm font-medium">
          {isAr ? "جاري تحميل اللوحة المتكاملة للأدوات التلقائية..." : "Loading integrated automations dashboard..."}
        </span>
      </div>;
  }
  return <div className="space-y-6" id="auto_features_panel">
      {
    /* Title Header */
  }
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-900/60 rounded-2xl border border-white/5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isAr ? "نظام الإضافات التلقائية المطور" : "Advanced Automated Tools System"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? "تجهيز الردود التلقائية، الخط التلقائي لكل روم، الزا ببروم، لوحات التوثيق برتب، وصانع الإيمبيد" : "Setup auto line, bye banner, auto replies, custom button embeds & onboarding systems."}
            </p>
          </div>
        </div>
        
        {
    /* Sub sections selector */
  }
        <div className="flex flex-wrap gap-2 p-1 bg-black/40 rounded-xl border border-white/5 self-start">
          <button
    onClick={() => setActiveSubTab("lines_bye")}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === "lines_bye" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
  >
            {isAr ? "خطوط وباي روم" : "Lines & Bye Room"}
          </button>
          <button
    onClick={() => setActiveSubTab("replies")}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === "replies" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
  >
            {isAr ? "ردود تلقائية" : "Auto Replies"}
          </button>
          <button
    onClick={() => setActiveSubTab("embed_builder")}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === "embed_builder" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
  >
            {isAr ? "صانع الإيمبيدات" : "Embed Builder"}
          </button>
          <button
    onClick={() => setActiveSubTab("verification")}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === "verification" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
  >
            {isAr ? "التوثيق الزر" : "Button Verification"}
          </button>
          <button
    onClick={() => setActiveSubTab("image_channels")}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === "image_channels" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
  >
            {isAr ? "روم الصور فقط" : "Image Only"}
          </button>
        </div>
      </div>
      
      {
    /* SECTION 1: AUTO LINES & BYE ROOM */
  }
      {activeSubTab === "lines_bye" && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {
    /* Auto Lines Sub Card */
  }
          <div className="p-6 bg-slate-900/40 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">
                {isAr ? "نظام الخط التلقائي لكل روم \u{1F4F8}" : "Auto Line Per Channel \u{1F4F8}"}
              </h3>
            </div>
            
            <p className="text-xs text-rose-400 font-medium">
              {isAr ? "\u{1F4A1} قاعدة هامة: يمنع تفعيل أكثر من خط تلقائي لنفس الروم." : "\u{1F4A1} Important Rule: A channel can only have one active Auto Line."}
            </p>
            
            {
    /* Form to Add Auto Line */
  }
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-black/20 rounded-xl border border-white/5 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  {isAr ? "اختر الروم (قناة الكتابة)" : "Select Text Channel"}
                </label>
                <select
    value={newLineChannel}
    onChange={(e) => setNewLineChannel(e.target.value)}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  >
                  <option value="">{isAr ? "-- اختر القناة --" : "-- Choose Channel --"}</option>
                  {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  {isAr ? "رفع صورة الخط أو ملصق" : "Upload Banner Image / Line"}
                </label>
                <div className="flex gap-2">
                  <input
    type="file"
    accept="image/*"
    id="line-upload-file"
    className="hidden"
    onChange={(e) => handleImageUpload(e, "newline")}
  />
                  <label
    htmlFor="line-upload-file"
    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/20 text-xs font-medium cursor-pointer transition-all"
  >
                    <Upload className="w-4 h-4" />
                    {isAr ? "تحديد صورة الخط" : "Choose Line Banner"}
                  </label>
                  {newLineUrl && <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20">
                      ✓
                    </span>}
                </div>
              </div>
              
              <button
    type="button"
    onClick={handleAddAutoLine}
    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
  >
                <Plus className="w-4 h-4" />
                {isAr ? "إضافة خط تلقائي" : "Add Auto Line"}
              </button>
            </div>
            
            {newLineUrl && <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs text-slate-400 font-medium block">
                  {isAr ? "معاينة الخط المحدد:" : "Selected Line Preview:"}
                </span>
                <img src={newLineUrl} alt="Line preview" className="max-h-20 object-contain rounded border border-white/10" />
              </div>}
            
            {
    /* Auto Lines List */
  }
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                {isAr ? "الخطوط التلقائية الحالية" : "Active Auto Lines"}
              </h4>
              
              {autolines.length === 0 ? <div className="p-4 bg-black/10 rounded-xl border border-dashed border-white/5 text-center">
                  <span className="text-xs text-slate-500 mt-2 block">
                    {isAr ? "لا توجد أي خطوط تلقائية نشطة حالياً." : "No active auto lines yet."}
                  </span>
                </div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {autolines.map((line, idx) => {
    const channel = channels.find((c) => c.id === line.channelId);
    return <div key={idx} className="flex items-center justify-between p-3.5 bg-black/20 rounded-xl border border-white/5">
                        <div className="space-y-1">
                          <span className="text-xs font-black text-indigo-400">
                            #{channel ? channel.name : line.channelId}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <img src={line.lineUrl} alt="banner" className="h-6 object-contain rounded opacity-80" />
                          </div>
                        </div>
                        <button
      onClick={() => handleRemoveAutoLine(idx)}
      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
    >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>;
  })}
                </div>}
            </div>
          </div>
          
          {
    /* Bye Room Sub Card */
  }
          <div className="p-6 bg-slate-900/40 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? "نظام باي روم (توديع الأعضاء) \u{1F44B}" : "Goodbye Room Config \u{1F44B}"}
                </h3>
              </div>
              
              <button
    type="button"
    onClick={() => setByeConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
    className={`p-1 rounded-full transition-colors ${byeConfig.enabled ? "text-indigo-400" : "text-slate-600"}`}
  >
                {byeConfig.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
            
            {byeConfig.enabled && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      {isAr ? "روم المغادرة" : "Goodbye Channel"}
                    </label>
                    <select
    value={byeConfig.channelId}
    onChange={(e) => setByeConfig((prev) => ({ ...prev, channelId: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  >
                      <option value="">{isAr ? "-- اختر قناة التوديع --" : "-- Choose Channel --"}</option>
                      {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      {isAr ? "رسالة المغادرة" : "Goodbye Message"}
                    </label>
                    <textarea
    value={byeConfig.message}
    onChange={(e) => setByeConfig((prev) => ({ ...prev, message: e.target.value }))}
    placeholder={isAr ? "مع السلامة [user] من سيرفر [server]" : "Goodbye [user] from [server]"}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[80px]"
  />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {isAr ? "المتغيرات المتاحة: [user] اسم المغادر, [server] السيرفر, [membercount] عدد الأعضاء" : "Placeholders: [user] userName, [server] serverName, [membercount] member count"}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">
                      {isAr ? "رفع خط/صورة التوديع" : "Goodbye Image Flag / line"}
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
    type="file"
    accept="image/*"
    id="bye-line-upload"
    className="hidden"
    onChange={(e) => handleImageUpload(e, "bye")}
  />
                      <label
    htmlFor="bye-line-upload"
    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-pink-600/10 hover:bg-pink-600/20 text-pink-400 rounded-xl border border-pink-500/20 text-xs font-medium cursor-pointer transition-all"
  >
                        <Upload className="w-4 h-4" />
                        {isAr ? "رفع صورة التوديع" : "Upload Goodbye Banner"}
                      </label>
                    </div>
                  </div>
                  
                  {byeConfig.lineUrl && <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-1">
                      <span className="text-xs text-slate-400 font-medium block">
                        {isAr ? "معاينة صورة توديع الأعضاء:" : "Goodbye image preview:"}
                      </span>
                      <img src={byeConfig.lineUrl} alt="bye preview" className="max-h-24 object-contain rounded border border-white/10" />
                    </div>}
                </div>
              </div>}
            
            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
    type="button"
    onClick={() => saveAllFeatures("lines_bye")}
    disabled={saving}
    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
  >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isAr ? "حفظ إعدادات خطوط/باي روم" : "Save Lines & Goodbye settings"}
              </button>
            </div>
          </div>
        </motion.div>}
      
      {
    /* SECTION 2: AUTO REPLIES */
  }
      {activeSubTab === "replies" && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-6 bg-slate-900/40 rounded-2xl border border-white/5 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <MessageSquare className="w-5 h-5 text-indigo-450" />
              <h3 className="text-sm font-bold text-white">
                {isAr ? "نظام الردود التلقائية (العادية والإيمبد) \u{1F4AC}" : "Auto Replies Manager \u{1F4AC}"}
              </h3>
            </div>
            
            {
    /* Form to Create Auto Reply */
  }
            <div className="p-5 bg-black/25 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                {isAr ? "إضافة رد تلقائي جديد" : "Create New Auto Reply"}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {isAr ? "كلمة التحفيز (الزناد)" : "Trigger Word (Keyword)"}
                  </label>
                  <input
    type="text"
    value={newReply.trigger}
    onChange={(e) => setNewReply((prev) => ({ ...prev, trigger: e.target.value }))}
    placeholder={isAr ? "مثال: السلام عليكم أو ديسكورد" : "e.g., hello or ping"}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {isAr ? "نوع الرد" : "Reply Format"}
                  </label>
                  <div className="flex gap-4 pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
    type="radio"
    checked={!newReply.isEmbed}
    onChange={() => setNewReply((prev) => ({ ...prev, isEmbed: false }))}
    className="text-indigo-600 bg-slate-800 border-white/10"
  />
                      {isAr ? "رسالة نصية عادية" : "Plain Text Reply"}
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
    type="radio"
    checked={newReply.isEmbed}
    onChange={() => setNewReply((prev) => ({ ...prev, isEmbed: true }))}
    className="text-indigo-600 bg-slate-800 border-white/10"
  />
                      {isAr ? "رسالة إيمبد (بطاقة ملونة)" : "Embed Card Reply"}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isAr ? "طريقة مطابقة وتحفيز الكلمة" : "Trigger Match Logic"}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-905 border border-white/5 rounded-xl">
                  <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer p-1">
                    <input
    type="radio"
    checked={newReply.matchType === "partial"}
    onChange={() => setNewReply((prev) => ({ ...prev, matchType: "partial" }))}
    className="text-indigo-600 bg-slate-800 border-white/10 mt-0.5"
  />
                    <div>
                      <span className="font-bold block text-white text-[11px] mb-0.5">
                        {isAr ? "إذا الكلمة موجودة مع كلام تنرسل (مطابقة جزئية)" : "Match inside text (Partial)"}
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-normal">
                        {isAr ? "البوت بيرد حتى لو الكلمة وسط كلام آخر (مثال: 'رابط ديسكورد السيرفر')" : "Matches even if surrounded by other words"}
                      </span>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer p-1">
                    <input
    type="radio"
    checked={newReply.matchType === "exact"}
    onChange={() => setNewReply((prev) => ({ ...prev, matchType: "exact" }))}
    className="text-indigo-600 bg-slate-800 border-white/10 mt-0.5"
  />
                    <div>
                      <span className="font-bold block text-white text-[11px] mb-0.5">
                        {isAr ? "شرط لوحدها وتنرسل (مطابقة تامّة)" : "Match exactly on its own (Exact)"}
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-normal">
                        {isAr ? "البوت يرد بشرط تكون الكلمة لوحدها تماماً (لا يقبل كلام زائد قَبْلَها أو بَعْدَها)" : "Only matches if the entire message is exactly the trigger word"}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {
    /* Roles Restriction */
  }
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                    <span>{isAr ? "الرتب المسموح لها باستخدام الرد" : "Allowed Roles"}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({isAr ? "اترك فارغاً لكي يتمكن الجميع" : "Leave empty for anyone"})</span>
                  </label>
                  <div className="relative mb-2">
                    <input
    type="text"
    placeholder={isAr ? "بحث عن رتبة..." : "Search roles..."}
    className="w-full bg-slate-850 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
    onChange={(e) => setRoleQuery(e.target.value)}
  />
                  </div>
                  <div className="bg-slate-900 border border-white/10 rounded-xl p-2.5 max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                    {roles.filter((r) => !roleQuery || r.name.toLowerCase().includes(roleQuery.toLowerCase())).map((role) => {
    const isSelected = newReply.allowedRoles?.includes(role.id);
    return <label key={role.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                            <input
      type="checkbox"
      checked={isSelected || false}
      onChange={() => {
        const current = newReply.allowedRoles || [];
        const updated = isSelected ? current.filter((id) => id !== role.id) : [...current, role.id];
        setNewReply((prev) => ({ ...prev, allowedRoles: updated }));
      }}
      className="rounded border-white/10 text-indigo-600 focus:ring-0 bg-slate-950"
    />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#94a3b8" }} />
                            <span className="text-xs text-slate-200 truncate">{role.name}</span>
                          </label>;
  })}
                    {roles.length === 0 && <span className="text-[10px] text-slate-500 text-center block py-4">{isAr ? "لا توجد رتب متوفرة" : "No roles available"}</span>}
                  </div>
                </div>

                {
    /* Channels/Categories Restriction */
  }
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                    <span>{isAr ? "الرومات/الأقسام المسموح فيها بالرد" : "Allowed Channels or Categories"}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({isAr ? "اترك فارغاً ليعمل في جميع الرومات" : "Leave empty for all"})</span>
                  </label>
                  <div className="relative mb-2">
                    <input
    type="text"
    placeholder={isAr ? "بحث عن روم أو قسم..." : "Search channels & categories..."}
    className="w-full bg-slate-850 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
    onChange={(e) => setChannelQuery(e.target.value)}
  />
                  </div>
                  <div className="bg-slate-900 border border-white/10 rounded-xl p-2.5 max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                    {
    /* Category List */
  }
                    {categories.length > 0 && <div className="mb-2">
                        <div className="text-[10px] text-indigo-400 font-bold px-2 mb-1 uppercase tracking-wider">{isAr ? "\u{1F4C1} الأقسام (Categories)" : "\u{1F4C1} Categories"}</div>
                        {categories.filter((c) => !channelQuery || c.name.toLowerCase().includes(channelQuery.toLowerCase())).map((cat) => {
    const isSelected = newReply.allowedChannels?.includes(cat.id);
    return <label key={cat.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                                <input
      type="checkbox"
      checked={isSelected || false}
      onChange={() => {
        const current = newReply.allowedChannels || [];
        const updated = isSelected ? current.filter((id) => id !== cat.id) : [...current, cat.id];
        setNewReply((prev) => ({ ...prev, allowedChannels: updated }));
      }}
      className="rounded border-white/10 text-indigo-600 focus:ring-0 bg-slate-950"
    />
                                <span className="text-xs text-indigo-300 font-medium truncate">📁 {cat.name}</span>
                              </label>;
  })}
                      </div>}

                    {
    /* Text Channels List */
  }
                    <div>
                      <div className="text-[10px] text-amber-400 font-bold px-2 mb-1 uppercase tracking-wider">{isAr ? "\u{1F4AC} الرومات الكتابية" : "\u{1F4AC} Text Channels"}</div>
                      {channels.filter((c) => !channelQuery || c.name.toLowerCase().includes(channelQuery.toLowerCase())).map((ch) => {
    const isSelected = newReply.allowedChannels?.includes(ch.id);
    return <label key={ch.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded-lg cursor-pointer transition-colors pl-4">
                              <input
      type="checkbox"
      checked={isSelected || false}
      onChange={() => {
        const current = newReply.allowedChannels || [];
        const updated = isSelected ? current.filter((id) => id !== ch.id) : [...current, ch.id];
        setNewReply((prev) => ({ ...prev, allowedChannels: updated }));
      }}
      className="rounded border-white/10 text-indigo-600 focus:ring-0 bg-slate-950"
    />
                              <span className="text-xs text-slate-200 truncate"># {ch.name}</span>
                            </label>;
  })}
                      {channels.length === 0 && <span className="text-[10px] text-slate-500 text-center block py-4">{isAr ? "لا توجد رومات متوفرة" : "No channels available"}</span>}
                    </div>
                  </div>
                </div>
              </div>
              
              {!newReply.isEmbed ? <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {isAr ? "محتوى الرد النصي" : "Response Text content"}
                  </label>
                  <textarea
    value={newReply.replyText}
    onChange={(e) => setNewReply((prev) => ({ ...prev, replyText: e.target.value }))}
    placeholder={isAr ? "اكتب الرد هنا..." : "Type the answer here..."}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[80px]"
  />
                </div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        {isAr ? "عنوان الإيمبد" : "Embed Title"}
                      </label>
                      <input
    type="text"
    value={newReply.embedTitle || ""}
    onChange={(e) => setNewReply((prev) => ({ ...prev, embedTitle: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
  />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        {isAr ? "لون الإيمبد" : "Embed Hex Color"}
                      </label>
                      <input
    type="color"
    value={newReply.embedColor || "#4f46e5"}
    onChange={(e) => setNewReply((prev) => ({ ...prev, embedColor: e.target.value }))}
    className="w-16 h-8 bg-transparent border-none block"
  />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        {isAr ? "تذييل الإيمبد (Footer)" : "Embed Footer text"}
                      </label>
                      <input
    type="text"
    value={newReply.embedFooter || ""}
    onChange={(e) => setNewReply((prev) => ({ ...prev, embedFooter: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
  />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        {isAr ? "وصف الإيمبد (النص الرئيسي)" : "Embed Description (Main Text)"}
                      </label>
                      <textarea
    value={newReply.replyText}
    onChange={(e) => setNewReply((prev) => ({ ...prev, replyText: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white min-h-[60px]"
  />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        {isAr ? "صورة الإيمبد (اختياري)" : "Embed Banner Image (Optional)"}
                      </label>
                      <div className="flex gap-2">
                        <input
    type="file"
    accept="image/*"
    id="reply-img-upload"
    className="hidden"
    onChange={(e) => handleImageUpload(e, "reply")}
  />
                        <label
    htmlFor="reply-img-upload"
    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 rounded-lg border border-indigo-500/20 text-xs cursor-pointer"
  >
                          <Upload className="w-3.5 h-3.5" />
                          {isAr ? "تحميل صورة" : "Upload Banner"}
                        </label>
                        {newReply.embedImage && <button
    onClick={() => setNewReply((prev) => ({ ...prev, embedImage: "" }))}
    className="p-1 px-2.5 bg-red-500/10 text-red-400 rounded-lg text-xs"
  >
                            X
                          </button>}
                      </div>
                      {newReply.embedImage && <img src={newReply.embedImage} alt="Reply preview" className="mt-1 max-h-12 object-contain rounded" />}
                    </div>
                  </div>
                </div>}
              
              <div className="flex justify-end">
                <button
    type="button"
    onClick={handleAddReply}
    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
  >
                  <Plus className="w-4 h-4" />
                  {isAr ? "إضافة الرد التلقائي وإدراجه" : "Add and Save Auto Reply"}
                </button>
              </div>
            </div>
            
            {
    /* Auto Replies List */
  }
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                {isAr ? "الردود التلقائية النشطة بالبوت" : "Active Auto Replies"}
              </h4>
              
              {replies.length === 0 ? <div className="p-8 bg-black/15 text-center rounded-2xl border border-dashed border-white/5">
                  <span className="text-xs text-slate-500">{isAr ? "لا توجد أي ردود تلقائية مضافة حالياً." : "No active auto replies yet."}</span>
                </div> : <div className="grid grid-cols-1 gap-3">
                  {replies.map((rep) => <div key={rep.id} className="flex item-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-all gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded font-mono text-xs font-bold">
                            {rep.trigger}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                            {rep.isEmbed ? isAr ? "إيمبد \u{1F386}" : "Embed Reply" : isAr ? "نص \u{1F4DD}" : "Plain Text"}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-amber-450 px-1.5 py-0.5 rounded font-medium border border-amber-500/10">
                            {rep.matchType === "exact" ? isAr ? "مطابقة تامة \u{1F512}" : "Exact Match" : isAr ? "مطابقة جزئية \u{1F513}" : "Partial Match"}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-300 mt-2 line-clamp-1">
                          {rep.replyText}
                        </p>

                        {
    /* Allowed Roles Badges */
  }
                        {rep.allowedRoles && rep.allowedRoles.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                            <span className="text-[10px] text-slate-400 font-bold">{isAr ? "الرتب المسموحة:" : "Roles:"}</span>
                            {rep.allowedRoles.map((rId) => {
    const role = roles.find((r) => r.id === rId);
    return <span key={rId} className="px-1.5 py-0.5 bg-slate-900 border border-white/5 rounded text-[10px] text-indigo-400 font-semibold">
                                  @{role ? role.name : rId}
                                </span>;
  })}
                          </div>}

                        {
    /* Allowed Channels/Categories Badges */
  }
                        {rep.allowedChannels && rep.allowedChannels.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                            <span className="text-[10px] text-slate-400 font-bold">{isAr ? "الرومات/الأقسام:" : "Channels:"}</span>
                            {rep.allowedChannels.map((cId) => {
    const channel = channels.find((c) => c.id === cId) || categories.find((cat) => cat.id === cId);
    return <span key={cId} className="px-1.5 py-0.5 bg-slate-900 border border-white/5 rounded text-[10px] text-amber-400 font-semibold">
                                  {channel ? channel.name : cId}
                                </span>;
  })}
                          </div>}
                      </div>
                      
                      <button
    onClick={() => handleRemoveReply(rep.id)}
    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all self-center"
  >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>)}
                </div>}
            </div>
          </div>
        </motion.div>}
      
      {
    /* SECTION 3: INTERACTIVE EMBED BUILDER & SENDER */
  }
      {activeSubTab === "embed_builder" && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {
    /* Template Side-Manager */
  }
            <div className="col-span-1 lg:col-span-4 space-y-4">
              <div className="p-6 bg-slate-900/40 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {isAr ? "\u{1F4BE} القوالب المحفوظة" : "\u{1F4BE} Saved templates"}
                </h3>
                
                {savedEmbeds.length === 0 ? <span className="text-xs text-slate-500 block">
                    {isAr ? "لا توجد قوالب محفوظة حالياً." : "No saved templates."}
                  </span> : <div className="space-y-2">
                    {savedEmbeds.map((em) => <div key={em.id} className="flex items-center justify-between p-2.5 bg-black/35 rounded-xl border border-white/5 hover:border-indigo-550/30 transition-all">
                        <button
    onClick={() => handleLoadEmbed(em)}
    className="flex-1 text-left text-xs font-semibold text-slate-300 hover:text-white truncate"
  >
                          {em.name}
                        </button>
                        
                        <button
    onClick={() => handleDeleteEmbed(em.id, em.name)}
    className="p-1 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
  >
                          <X className="w-3 h-3" />
                        </button>
                      </div>)}
                  </div>}
                
                <div className="pt-2 border-t border-white/5 space-y-3">
                  <div className="bg-indigo-600/10 p-3 rounded-xl border border-indigo-500/15">
                    <span className="text-[10px] text-indigo-300 font-bold block mb-1">
                      {isAr ? "\u{1F680} إرسال إيمبد محفوظ إلى روم:" : "\u{1F680} Disaptch template to room:"}
                    </span>
                    
                    <select
    value={targetSendChannel}
    onChange={(e) => setTargetSendChannel(e.target.value)}
    className="w-full bg-slate-850 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white mb-2"
  >
                      <option value="">{isAr ? "-- اختر الروم --" : "-- Select Channel --"}</option>
                      {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                    </select>
                    
                    {savedEmbeds.length > 0 && <div className="space-y-1.5">
                        {savedEmbeds.map((em) => <button
    key={em.id}
    disabled={sendingEmbed !== null}
    onClick={() => handleSendEmbedToChannel(em.id)}
    className="w-full flex items-center justify-between px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs"
  >
                            {sendingEmbed === em.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : <>
                                <span>ارسل {em.name}</span>
                                <Send className="w-3 h-3" />
                              </>}
                          </button>)}
                      </div>}
                  </div>
                </div>
              </div>
            </div>
            
            {
    /* Builder Dashboard */
  }
            <div className="col-span-1 lg:col-span-8 space-y-6">
              <div className="p-6 bg-slate-900/40 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? "صانع وتجهيز الإيمبد التفاعلي المتقدم \u{1F4DD}" : "Custom Interactive Embed Creator \u{1F4DD}"}
                  </h3>
                  
                  <div className="w-48">
                    <input
    type="text"
    placeholder={isAr ? "مسمى قالب الحفظ باللوحة..." : "Template Name..."}
    value={activeEmbed.name}
    onChange={(e) => setActiveEmbed((prev) => ({ ...prev, name: e.target.value }))}
    className="w-full bg-slate-850 border border-indigo-500/20 rounded-xl px-3 py-1.5 text-xs text-white"
  />
                  </div>
                </div>
                
                {
    /* Embedded fields inputs */
  }
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isAr ? "عنوان الإيمبد الرئيسي" : "Embed Title"}
                    </label>
                    <input
    type="text"
    value={activeEmbed.title}
    onChange={(e) => setActiveEmbed((prev) => ({ ...prev, title: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isAr ? "لون الإيمبد الجانبي" : "Color"}
                    </label>
                    <input
    type="color"
    value={activeEmbed.color}
    onChange={(e) => setActiveEmbed((prev) => ({ ...prev, color: e.target.value }))}
    className="w-16 h-8 bg-transparent border-none block"
  />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isAr ? "نص الوصف (المحتوى الرئيسي)" : "Embed Description"}
                    </label>
                    <textarea
    value={activeEmbed.description}
    onChange={(e) => setActiveEmbed((prev) => ({ ...prev, description: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white min-h-[90px]"
  />
                  </div>
                  
                  {
    /* File Upload instead of links */
  }
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {isAr ? "رفع صورة الإيمبد المعروضة" : "Upload Main Embed Image"}
                    </label>
                    <div className="flex gap-2">
                      <input
    type="file"
    accept="image/*"
    id="embed-img-banner"
    className="hidden"
    onChange={(e) => handleImageUpload(e, "embed_img")}
  />
                      <label
    htmlFor="embed-img-banner"
    className="flex-1 flex items-center justify-center gap-2 p-2 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/20 text-xs cursor-pointer"
  >
                        <Upload className="w-4 h-4" />
                        {isAr ? "رفع صورة" : "Upload Banner"}
                      </label>
                    </div>
                    {activeEmbed.imageUrl && <div className="mt-1 flex gap-2 items-center">
                        <img src={activeEmbed.imageUrl} alt="prev" className="max-h-12 object-contain" />
                        <button onClick={() => setActiveEmbed((p) => ({ ...p, imageUrl: "" }))} className="text-red-400 text-xs">X</button>
                      </div>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {isAr ? "تذييل الإيمبد (Footer text)" : "Footer Text"}
                    </label>
                    <input
    type="text"
    value={activeEmbed.footer || ""}
    onChange={(e) => setActiveEmbed((prev) => ({ ...prev, footer: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  />
                  </div>
                </div>
                
                {
    /* Interactive Action Components (BUTTONS & ON CLICK INSTRUCTIONS) */
  }
                <div className="p-4 bg-black/35 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <MousePointerClick className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white">
                      {isAr ? "العناصر التفاعلية: الزر المانح للرتب والرسالة المخفية \u{1F579}️" : "Interactive Actions: Buttons with Roles & Ephemeral Messages \u{1F579}️"}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-indigo-300 mb-1">
                        {isAr ? "أكشن الضغط: رتبة للإعطاء/الأخذ" : "Button Toggle Role"}
                      </label>
                      <select
    value={activeEmbed.roleOnAction?.roleId || ""}
    onChange={(e) => setActiveEmbed((prev) => ({
      ...prev,
      roleOnAction: { ...prev.roleOnAction, roleId: e.target.value }
    }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  >
                        <option value="">{isAr ? "-- بدون أكشن رتبة --" : "-- No Role Action --"}</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-medium text-pink-300 mb-1">
                        {isAr ? "مسمى الزر التفاعلي" : "Active Button Label"}
                      </label>
                      <input
    type="text"
    placeholder={isAr ? "مثال: أخذ الرتبة الخاصة \u{1F396}️" : "e.g., Claim Role \u{1F396}️"}
    value={activeEmbed.roleOnAction?.buttonLabel || ""}
    onChange={(e) => setActiveEmbed((prev) => ({
      ...prev,
      roleOnAction: { ...prev.roleOnAction, buttonLabel: e.target.value, type: "button" }
    }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        {isAr ? "إيموجي الزر (اختياري)" : "Button Emoji (Optional)"}
                      </label>
                      <input
    type="text"
    placeholder="e.g., ⭐️ or :emoji_name:"
    value={activeEmbed.roleOnAction?.emoji || ""}
    onChange={(e) => setActiveEmbed((prev) => ({
      ...prev,
      roleOnAction: { ...prev.roleOnAction, emoji: e.target.value }
    }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-2 border-t border-white/5">
                  <button
    type="button"
    onClick={handleSaveActiveEmbed}
    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
  >
                    <Save className="w-4 h-4" />
                    {isAr ? "حفظ قالب الإيمبد باللوحة" : "Save Embed Template"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>}
      
      {
    /* SECTION 4: VERIFICATION SYSTEM */
  }
      {activeSubTab === "verification" && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-6 bg-slate-900/40 rounded-2xl border border-white/5 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? "\u{1F512} نظام التحقق والتوثيق بالنظام المزدوج للرتب" : "\u{1F512} Dual-Role Account Verification Panel Console"}
                </h3>
              </div>
              
              <button
    type="button"
    onClick={() => setVerification((prev) => ({ ...prev, enabled: !prev.enabled }))}
    className={`p-1 rounded-full transition-colors ${verification.enabled ? "text-emerald-400" : "text-slate-600"}`}
  >
                {verification.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
            
            {verification.enabled && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {
    /* Configuration Inputs */
  }
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isAr ? "روم لوحة التوثيق الكبرى" : "Verification Channel Output"}
                    </label>
                    <select
    value={verification.channelId}
    onChange={(e) => setVerification((prev) => ({ ...prev, channelId: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  >
                      <option value="">{isAr ? "-- اختر القناة --" : "-- Select Channel --"}</option>
                      {channels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {isAr ? "إعطاء هذه الرتبة (Add Role)" : "Add Role on Verification"}
                      </label>
                      <select
    value={verification.addRoleId}
    onChange={(e) => setVerification((prev) => ({ ...prev, addRoleId: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  >
                        <option value="">{isAr ? "-- اختر الرتبة --" : "-- Choose Role --"}</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {isAr ? "إزالة هذه الرتبة (Remove Role)" : "Remove Role on Verification"}
                      </label>
                      <select
    value={verification.removeRoleId}
    onChange={(e) => setVerification((prev) => ({ ...prev, removeRoleId: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  >
                        <option value="">{isAr ? "-- اختر الرتبة --" : "-- Choose Role --"}</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isAr ? "نص الزر الإجباري للتوثيق" : "Mandatory Button Label"}
                    </label>
                    <input
    type="text"
    value={verification.buttonLabel}
    onChange={(e) => setVerification((prev) => ({ ...prev, buttonLabel: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
  />
                  </div>
                </div>
                
                {
    /* Visual Customizers & Banner */
  }
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isAr ? "شعار لوحة التوثيق (رفع ملف صورة)" : "Verification Banner Image (Upload file)"}
                    </label>
                    <div className="flex gap-2">
                      <input
    type="file"
    accept="image/*"
    id="verif-banner-upload"
    className="hidden"
    onChange={(e) => handleImageUpload(e, "verif")}
  />
                      <label
    htmlFor="verif-banner-upload"
    className="flex-1 flex items-center justify-center gap-2 p-2 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-xs cursor-pointer"
  >
                        <Upload className="w-4 h-4" />
                        {isAr ? "رفع صورة التقديم" : "Upload Banner Image"}
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isAr ? "عنوان الإيمبد" : "Title"}
                      </label>
                      <input
    type="text"
    value={verification.title}
    onChange={(e) => setVerification((prev) => ({ ...prev, title: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
  />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {isAr ? "لون الإيمبد" : "Hex Color"}
                      </label>
                      <input
    type="color"
    value={verification.color}
    onChange={(e) => setVerification((prev) => ({ ...prev, color: e.target.value }))}
    className="w-16 h-8 bg-transparent border-none block"
  />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isAr ? "وصف ورسالة لوحة التوثيق" : "Panel Description message"}
                    </label>
                    <textarea
    value={verification.description}
    onChange={(e) => setVerification((prev) => ({ ...prev, description: e.target.value }))}
    className="w-full bg-slate-850 border border-white/10 rounded-lg p-2.5 text-xs text-white min-h-[60px]"
  />
                  </div>
                </div>
              </div>}
            
            <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
              <button
    type="button"
    onClick={() => saveAllFeatures("verification")}
    disabled={saving}
    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-white/5"
  >
                {isAr ? "حفظ كمسودة" : "Save as Draft"}
              </button>
              
              <button
    type="button"
    onClick={handleSendVerificationPanel}
    disabled={postingVerif}
    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
  >
                {postingVerif ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {isAr ? "تجهيز وإرسال لوحة التوثيق للسيرفر \u{1F680}" : "Publish & Post Verification Panel \u{1F680}"}
              </button>
            </div>
          </div>
        </motion.div>}

      {
    /* SECTION 5: IMAGE CHANNELS */
  }
      {activeSubTab === "image_channels" && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="p-6 bg-slate-900/40 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">
                {isAr ? "رومات الصور فقط (حذف أي كلام ونشر رياكشن) \u{1F5BC}️" : "Image Only Channels (Delete text & add reaction) \u{1F5BC}️"}
              </h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {isAr ? "أي شخص يرسل رسالة نصية بدون صورة في هذه الرومات سيتم حذف رسالته تلقائياً، وإذا أرسل صورة سيقوم البوت بوضع إيموجي \u{1F5BC}️ كـ رياكشن عليها." : "Any text message without an image in these channels will be automatically deleted. If an image is sent, the bot will react with \u{1F5BC}️."}
            </p>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  {isAr ? "اختر الرومات لإضافتها" : "Select channels to add"}
                </label>
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto bg-black/20 p-2 rounded-xl border border-white/5">
                  {channels.map((ch) => <label key={ch.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                      <input
    type="checkbox"
    checked={imageChannels.includes(ch.id)}
    onChange={(e) => {
      if (e.target.checked) {
        setImageChannels((prev) => [...prev, ch.id]);
      } else {
        setImageChannels((prev) => prev.filter((id) => id !== ch.id));
      }
    }}
    className="w-4 h-4 rounded border border-white/20 bg-black/40 checked:bg-indigo-500 checked:border-indigo-500 text-indigo-500 focus:ring-0"
  />
                      <span className="text-sm text-slate-300 font-medium">#{ch.name}</span>
                    </label>)}
                  {channels.length === 0 && <span className="text-xs text-slate-500 p-2">{isAr ? "لا توجد رومات" : "No channels available"}</span>}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
    onClick={() => saveAllFeatures("image_channels")}
    disabled={saving}
    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
  >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isAr ? "حفظ التغييرات" : "Save Changes"}
              </button>
            </div>
          </div>
        </motion.div>}
    </div>;
}
