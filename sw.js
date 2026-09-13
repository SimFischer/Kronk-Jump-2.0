/* Kronk springt! – Offline-Betrieb für wackeliges Schul-WLAN.
 * Code und Aufgaben werden bevorzugt frisch geladen (damit neue
 * Sammlungen sofort erscheinen), Bilder bevorzugt aus dem Speicher.
 * Ohne Netz kommt alles aus dem Speicher. */
"use strict";

const VERSION = "kronk-20260913e";
const SHELL = [
  "./", "./index.html", "./style.css", "./spiel.js", "./aufgaben.js",
  "./manifest.json",
  "./assets/kronk-normal.png", "./assets/kronk-sprung.png", "./assets/kronk-jubel.png",
  "./assets/icon-192.png", "./assets/icon-512.png"
];
const NETWORK_TIMEOUT = 3000;

// Die Aufgabendateien stehen in aufgaben.js; von dort werden sie gelesen,
// damit eine neue Sammlung ohne Änderung am Service Worker mitgespeichert wird.
async function collectionFiles() {
  try {
    const response = await fetch("./aufgaben.js", { cache: "no-store" });
    if (!response.ok) return [];
    const text = await response.text();
    return [...new Set([...text.matchAll(/"(aufgaben\/[a-z0-9-]+\.js)"/g)].map(m => "./" + m[1]))];
  } catch (_) { return []; }
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const files = [...SHELL, ...await collectionFiles()];
    // Einzeln, damit eine fehlende Datei nicht die ganze Installation kippt.
    await Promise.all(files.map(file => cache.add(file).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

async function fromCache(request) {
  const cache = await caches.open(VERSION);
  return (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
}

async function store(request, response) {
  if (response && response.ok && response.type === "basic") {
    const cache = await caches.open(VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await Promise.race([
      fetch(request).then(r => store(request, r)),
      new Promise((_, reject) => setTimeout(() => reject(Error("langsam")), NETWORK_TIMEOUT))
    ]);
    if (response) return response;
  } catch (_) { /* offline oder zu langsam */ }
  const cached = await fromCache(request);
  if (cached) return cached;
  if (request.mode === "navigate") {
    const start = await fromCache(new Request("./index.html"));
    if (start) return start;
  }
  return fetch(request);
}

async function cacheFirst(request) {
  const cached = await fromCache(request);
  if (cached) return cached;
  const response = await fetch(request);
  return store(request, response);
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isBild = /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
  event.respondWith(isBild ? cacheFirst(request) : networkFirst(request));
});
