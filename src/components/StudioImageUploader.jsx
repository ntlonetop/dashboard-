import { useState, useRef } from "react";
import { Image as ImageIcon, Trash2, Eye, Loader2 } from "lucide-react";
export function StudioImageUploader({
  value,
  onChange,
  siteLang,
  label,
  aspectRatio = "any"
}) {
  const isAr = siteLang === "ar";
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (file) => {
    if (file.size > 15 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? "حجم الصورة كبير جداً (الأقصى 15 ميجابايت)" : "Image too large (Max 15MB)",
          type: "error"
        }
      }));
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result;
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Data,
            name: file.name.split(".")[0]
          })
        });
        if (!response.ok) {
          throw new Error("Upload failed");
        }
        const data = await response.json();
        if (data.url) {
          onChange(data.url);
          window.dispatchEvent(new CustomEvent("show-toast", {
            detail: {
              message: isAr ? "تم رفع الصورة بنجاح! \u{1F4F8}" : "Image uploaded successfully! \u{1F4F8}",
              type: "success"
            }
          }));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Image upload error:", err);
      window.dispatchEvent(new CustomEvent("show-toast", {
        detail: {
          message: isAr ? "فشل رفع الصورة في الخادم." : "Failed to upload image to server.",
          type: "error"
        }
      }));
    } finally {
      setUploading(false);
    }
  };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => {
    setDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleUpload(file);
    }
  };
  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square max-w-[180px]",
    avatar: "aspect-square rounded-full max-w-[120px] mx-auto",
    any: "min-h-[140px]"
  };
  return <div className="space-y-2">
      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">
        {label}
      </label>

      {value ? <div className={`relative overflow-hidden group border border-white/10 rounded-2xl bg-black/40 ${aspectClasses[aspectRatio]} flex items-center justify-center transition-all`}>
          <img
    src={value}
    alt="Uploaded Preview"
    className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 group-hover:scale-105`}
    onError={(e) => {
      e.currentTarget.style.display = "none";
    }}
  />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
            <a
    href={value}
    target="_blank"
    rel="noreferrer"
    className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl transition-all"
    title={isAr ? "عرض الحجم الكامل" : "View Full Size"}
  >
              <Eye size={16} />
            </a>
            <button
    type="button"
    onClick={() => onChange("")}
    className="p-2.5 bg-rose-600/20 hover:bg-rose-650 text-rose-500 hover:text-white border border-rose-500/20 rounded-xl transition-all"
    title={isAr ? "حذف الصورة" : "Remove Image"}
  >
              <Trash2 size={16} />
            </button>
          </div>
        </div> : <div
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
    onClick={() => fileInputRef.current?.click()}
    className={`cursor-pointer border-2 border-dashed rounded-2xl py-8 px-4 flex flex-col items-center justify-center text-center transition-all duration-300 ${dragging ? "border-indigo-500 bg-indigo-500/5" : "border-white/10 bg-black/20 hover:bg-black/35 hover:border-white/20"} ${aspectClasses[aspectRatio]}`}
  >
          <input
    type="file"
    ref={fileInputRef}
    onChange={handleFileChange}
    accept="image/*"
    className="hidden"
  />

          {uploading ? <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">
                {isAr ? "جاري الرفع للـديسكورد..." : "Uploading to server..."}
              </p>
            </div> : <div className="space-y-2">
              <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-white/5">
                <ImageIcon size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-300">
                  {isAr ? "اضغط لاختيار صورة من الاستوديو" : "Click to choose from your gallery"}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isAr ? "أو اسحب وأفلت الملف هنا مباشرة" : "or drag and drop your file here"}
                </p>
              </div>
            </div>}
        </div>}
    </div>;
}
