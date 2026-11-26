/* Service worker do Pluvial: guarda o site e o mapa de Juiz de Fora para funcionar sem internet.
   - Páginas e arquivos do site: tenta a rede primeiro; sem rede, usa a cópia salva.
   - Blocos do mapa, relevo e bibliotecas: usa a cópia salva primeiro (mudam pouco).
   - Previsão do tempo e rotas: tenta a rede; sem rede, devolve a última resposta salva. */
const VERSION = "pluvial-v6";
const SHELL = `${VERSION}-site`, TILES = `${VERSION}-mapa`, DATA = `${VERSION}-dados`;
const MAX_TILES = 4000;

const FILES = [
  "./", "index.html", "painel.html", "central.html", "totem.html", "comunidade.html", "entrar.html", "manifest.webmanifest", "assets/icone.svg",
  "css/base.css", "css/fonts.css", "css/home.css", "css/painel.css", "css/central.css", "css/totem.css", "css/comunidade.css", "css/entrar.css",
  "js/core.js", "js/sensor.js", "js/home.js", "js/community.js", "js/site-config.js", "js/weather.js", "js/rain.js", "js/painel.js",
  "js/risco.js", "js/estilo-mapa.js", "js/canal.js", "js/central.js", "js/resposta.js", "js/totem.js", "js/offline.js", "js/comunidade-dados.js", "js/comunidade.js", "js/landing.js", "js/auth.js", "js/entrar.js", "js/bueiros.js", "js/drenagem-central.js",
  "assets/fonts/bricolage-grotesque.woff2", "assets/mariano-procopio.jpg",
];
const LIBS = [
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js",
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const site = await caches.open(SHELL);
    await site.addAll(FILES);
    const libs = await caches.open(TILES);
    await Promise.all(LIBS.map((u) => fetch(u, { mode: "cors" }).then((r) => r.ok && libs.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isTile = (u) => /fonts\.googleapis\.com|fonts\.gstatic\.com|tiles\.openfreemap\.org|elevation-tiles-prod|services\.arcgisonline\.com|tile\.openstreetmap|unpkg\.com/.test(u.href);
/* O índice do mapa muda de versão com o tempo: sempre tenta a rede antes. */
const isData = (u) => /api\.open-meteo\.com|router\.project-osrm\.org/.test(u.href) || u.href === "https://tiles.openfreemap.org/planet";

async function trim() {
  const c = await caches.open(TILES), keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(SHELL)).put(url.pathname === "/" ? "./" : url.pathname.slice(1), res.clone());
        return res;
      } catch {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match("totem.html")) || Response.error();
        return Response.error();
      }
    })());
    return;
  }

  if (isTile(url) && !isData(url)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { (await caches.open(TILES)).put(req, res.clone()); trim(); }
      return res;
    })());
    return;
  }

  if (isData(url)) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(DATA)).put(req, res.clone());
        return res;
      } catch {
        return (await caches.match(req)) || Response.error();
      }
    })());
  }
});

/* Baixa os blocos do mapa e do relevo de Juiz de Fora, a pedido da página. */
function tilesFor([w, s, e, n], z) {
  const x = (lng) => Math.floor(((lng + 180) / 360) * 2 ** z);
  const y = (lat) => { const r = (lat * Math.PI) / 180; return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z); };
  const out = [];
  for (let i = x(w); i <= x(e); i++) for (let j = y(n); j <= y(s); j++) out.push([z, i, j]);
  return out;
}
self.addEventListener("message", (e) => {
  if (e.data?.type !== "preparar") return;
  const port = e.ports[0];
  e.waitUntil((async () => {
    try {
      const bbox = [-43.43, -21.81, -43.29, -21.71];
      const tj = await (await fetch("https://tiles.openfreemap.org/planet")).json();
      const vec = tj.tiles[0];
      const urls = [
        "https://tiles.openfreemap.org/planet",
        ...["Noto Sans Regular", "Noto Sans Bold"].flatMap((f) => ["0-255", "256-511"].map((r) => `https://tiles.openfreemap.org/fonts/${encodeURIComponent(f)}/${r}.pbf`)),
      ];
      for (let z = 10; z <= 15; z++) for (const [zz, x, y] of tilesFor(bbox, z)) {
        if (z <= 14) urls.push(vec.replace("{z}", zz).replace("{x}", x).replace("{y}", y));
        urls.push(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zz}/${x}/${y}.png`);
      }
      const c = await caches.open(TILES);
      let done = 0;
      for (let i = 0; i < urls.length; i += 8) {
        await Promise.all(urls.slice(i, i + 8).map(async (u) => {
          if (await c.match(u)) return;
          try { const r = await fetch(u, { mode: "cors" }); if (r.ok) await c.put(u, r); } catch {}
        }));
        done = Math.min(urls.length, i + 8);
        port?.postMessage({ type: "progresso", done, total: urls.length });
      }
      const data = await caches.open(DATA);
      for (const u of e.data.rotas || []) {
        if (!/^https:\/\/router\.project-osrm\.org\//.test(u) || (await data.match(u))) continue;
        try { const r = await fetch(u); if (r.ok) await data.put(u, r); } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      port?.postMessage({ type: "pronto", total: urls.length });
    } catch (err) {
      port?.postMessage({ type: "erro", message: String(err) });
    }
  })());
});
