import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle stale chunk errors after new deployments by forcing a one-time reload.
// When Vite ships a new build, hashed chunk filenames change. Old tabs (or SW-cached
// index.html) can fail to dynamically import the new chunk → "error loading dynamically
// imported module". A hard reload pulls the fresh index.html and chunk graph.
const STALE_RELOAD_KEY = "lablink:stale-chunk-reloaded";
const handleStaleChunk = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (!/dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
    return;
  }
  if (sessionStorage.getItem(STALE_RELOAD_KEY)) return;
  sessionStorage.setItem(STALE_RELOAD_KEY, "1");
  // Unregister SWs + clear caches so the new index.html is fetched fresh.
  Promise.allSettled([
    "serviceWorker" in navigator
      ? navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister())))
      : Promise.resolve(),
    "caches" in window ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : Promise.resolve(),
  ]).finally(() => {
    window.location.reload();
  });
};
window.addEventListener("vite:preloadError", (e) => handleStaleChunk((e as any).payload));
window.addEventListener("error", (e) => handleStaleChunk(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => handleStaleChunk(e.reason));
// Clear the guard once the app successfully boots.
requestIdleCallback?.(() => sessionStorage.removeItem(STALE_RELOAD_KEY));

createRoot(document.getElementById("root")!).render(<App />);
