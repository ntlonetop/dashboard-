import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Global fetch patch to support hosting the frontend on Gitub Pages 
// while calling the backend server on rent/other hosting (e.g. Bot-Hosting or Render).
const originalFetch = window.fetch || globalThis.fetch;

const customFetch = async (input, init) => {
  let url = input;
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (typeof url === "string" && url.startsWith("/api/") && apiBase) {
    url = `${apiBase.replace(/\/+$/, "")}${url}`;
  }
  
  if (apiBase) {
    if (!init) {
      init = {};
    }
    if (!init.credentials) {
      init.credentials = "include";
    }
  }
  return originalFetch(url, init);
};

try {
  Object.defineProperty(window, "fetch", {
    value: customFetch,
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e1) {
  try {
    Object.defineProperty(globalThis, "fetch", {
      value: customFetch,
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (e2) {
    console.warn("[Fetch Patch] Could not patch fetch via Object.defineProperty. Trying direct assignment as fallback.", e1, e2);
    try {
      window.fetch = customFetch;
    } catch (e3) {
      console.error("[Fetch Patch] Direct assignment to window.fetch failed:", e3);
    }
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW failed', err));
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
