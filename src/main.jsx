import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Global fetch patch to support hosting the frontend on Gitub Pages 
// while calling the backend server on rent/other hosting (e.g. Bot-Hosting or Render).
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
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
