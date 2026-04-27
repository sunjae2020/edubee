import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./hooks/use-theme";

// Catch any crash outside React's tree (module init, ThemeProvider, etc.)
window.addEventListener("error", (evt) => {
  const root = document.getElementById("root");
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;font-family:Inter,sans-serif;">
        <div style="max-width:480px;text-align:center;">
          <p style="font-size:32px;margin-bottom:16px">⚠️</p>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:8px;color:#1C1917">Application failed to start</h2>
          <p style="font-size:13px;color:#78716C;margin-bottom:20px;word-break:break-word">${evt.message}</p>
          <button onclick="location.reload()" style="padding:8px 20px;background:#F5821F;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">Reload Page</button>
        </div>
      </div>`;
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

createRoot(rootEl).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
