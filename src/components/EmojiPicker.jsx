import React, { useState, useRef, useEffect } from 'react';

export function EmojiPicker({ value, onChange, siteLang }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const commonEmojis = ['📩', '🎫', '🛠️', '✨', '🔥', '💡', '✅', '❌', 'ℹ️', '⚙️', '🛡️', '💬', '❓', '❗', '🎉', '🚀', '💯', '👑', '⭐', '⚡', '🔒', '🔑', '🏷️', '📢'];

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full text-center bg-black/60 border border-white/10 rounded-xl px-2 py-2.5 text-lg text-white focus:border-indigo-600 outline-none hover:bg-black/80 transition-all"
      >
        {value || '📩'}
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 mt-2 p-3 bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl z-[100] grid grid-cols-6 gap-2 w-64">
          {commonEmojis.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setIsOpen(false); }}
              className="text-xl p-1.5 rounded-lg hover:bg-white/10 transition-all text-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
