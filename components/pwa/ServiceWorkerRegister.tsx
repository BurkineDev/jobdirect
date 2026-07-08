"use client";

import { useEffect } from "react";

/** Enregistre le service worker (installation PWA + page hors-ligne). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Échec silencieux : l'app fonctionne sans le service worker.
      });
    }
  }, []);

  return null;
}
