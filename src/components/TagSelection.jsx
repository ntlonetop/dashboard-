import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
export function TagSelection({
  items,
  selectedIds,
  onToggle,
  placeholder,
  type = "channel",
  isAr = false
}) {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const unselectedItems = items.filter((item) => !selectedIds.includes(item.id));
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = unselectedItems.filter(
    (item) => item.name.toLowerCase().includes(search.toLowerCase())
  );
  return <div className="space-y-4">
        <div className="relative">
          <div
    onClick={() => setIsOpen(!isOpen)}
    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold flex items-center justify-between cursor-pointer focus-within:border-amber-500 transition-colors"
  >
            <span className="text-slate-400 font-medium">{placeholder}</span>
            <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>

          <AnimatePresence>
            {isOpen && <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="absolute top-full left-0 right-0 z-50 mt-2 bg-[#0c0f16] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
  >
                <div className="p-3 border-b border-white/5">
                  <input
    autoFocus
    type="text"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder={isAr ? "بحث..." : "Search..."}
    onClick={(e) => e.stopPropagation()}
    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
  />
                </div>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                  {filtered.length === 0 ? <div className="p-4 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">{isAr ? "لا يوجد نتائج" : "No results"}</div> : filtered.map((item) => <button
    key={item.id}
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle(item.id);
      setSearch("");
    }}
    className="w-full text-right rtl:text-right ltr:text-left p-3 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between group"
  >
                        <span className="text-sm font-bold text-slate-300 group-hover:text-amber-500">
                          {type === "channel" ? "#" : "@"}{item.name}
                        </span>
                        <Plus className="w-4 h-4 text-slate-700 group-hover:text-amber-500" />
                      </button>)}
                </div>
              </motion.div>}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => <div
    key={item.id}
    className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in zoom-in-95 group"
  >
              <span className="text-xs font-black text-amber-500">
                {type === "channel" ? "#" : "@"}{item.name}
              </span>
              <button
    onClick={() => onToggle(item.id)}
    className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
  >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>)}
        </div>
      </div>;
}
export function AliasTagInput({
  aliases,
  onChange,
  placeholder,
  isAr = false
}) {
  const [input, setInput] = useState("");
  const handleAdd = (e) => {
    e?.preventDefault();
    const val = input.trim();
    if (val) {
      const parts = val.split(/[\s,،]+/).map((p) => p.trim().toLowerCase()).filter(Boolean);
      const newAliases = [...aliases];
      let changed = false;
      for (const p of parts) {
        if (!newAliases.includes(p)) {
          newAliases.push(p);
          changed = true;
        }
      }
      if (changed) {
        onChange(newAliases);
      }
      setInput("");
    }
  };
  const handleInputChange = (e) => {
    const text = e.target.value;
    if (text.endsWith(" ") || text.endsWith(",") || text.endsWith("،")) {
      const word = text.slice(0, -1).trim().toLowerCase();
      if (word) {
        if (!aliases.includes(word)) {
          onChange([...aliases, word]);
        }
        setInput("");
      } else {
        setInput("");
      }
    } else {
      setInput(text);
    }
  };
  const remove = (index) => {
    const newAliases = [...aliases];
    newAliases.splice(index, 1);
    onChange(newAliases);
  };
  return <div className="space-y-4">
        <div className="bg-black/20 border border-white/10 rounded-[2rem] p-6 min-h-[140px] focus-within:border-sky-500 group transition-all duration-500">
          <div className="flex flex-wrap gap-2 mb-4">
            {aliases.map((alias, idx) => <motion.div
    key={`${alias}-${idx}`}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 rounded-2xl group/tag"
  >
                <span className="text-xs font-black text-sky-400 group-hover/tag:text-sky-300 transition-colors uppercase tracking-widest">{alias}</span>
                <button
    type="button"
    onClick={() => remove(idx)}
    className="w-6 h-6 rounded-lg flex items-center justify-center text-sky-500/50 hover:bg-rose-500 hover:text-white transition-all"
  >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>)}
          </div>
          <form onSubmit={handleAdd}>
            <input
    type="text"
    value={input}
    onChange={handleInputChange}
    placeholder={placeholder}
    className="w-full bg-transparent border-none focus:ring-0 text-white text-sm font-bold placeholder:text-slate-700"
  />
          </form>
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black text-center italic opacity-60">
          {isAr ? "اضغط Enter أو مسافة للتفعيل على الجوال والكمبيوتر" : "Press Enter or Space to add on Mobile or Desktop"}
        </p>
      </div>;
}
