/* Modo sem internet: registra o service worker, baixa o mapa de Juiz de Fora uma vez
   e mostra um aviso quando a conexão cai. Funciona em http://localhost/127.0.0.1 ou https. */
(() => {
  /* Mesma versão do sw.js: quando ele muda, os mapas guardados são apagados e precisam ser baixados de novo. */
  const KEY = "pluvial-offline-pluvial-v6";
  const out = document.querySelector("[data-offline]");
  const say = (t) => { if (out) out.textContent = t; };

  function banner() {
    let el = document.getElementById("net-banner");
    if (!el) {
      el = document.createElement("div");
      el.id = "net-banner";
      el.setAttribute("role", "status");
      el.style.cssText = "position:fixed;left:50%;top:10px;z-index:200;transform:translateX(-50%);max-width:calc(100vw - 24px);padding:10px 18px;border-radius:99px;background:#f5c518;color:#0b1f28;font:700 .9rem 'Bricolage Grotesque',system-ui,sans-serif;box-shadow:0 8px 24px #0008;text-align:center";
      document.body.append(el);
    }
    el.hidden = navigator.onLine;
    el.textContent = "Sem internet. Usando o mapa e os dados salvos neste aparelho.";
    document.documentElement.classList.toggle("is-offline", !navigator.onLine);
  }
  addEventListener("online", banner);
  addEventListener("offline", banner);
  banner();

  if (!("serviceWorker" in navigator)) { say("Este navegador não suporta o modo sem internet."); return; }
  if (!isSecureContext) { say("Modo sem internet só funciona em localhost ou https."); return; }

  navigator.serviceWorker.register("sw.js").then(async (reg) => {
    await navigator.serviceWorker.ready;
    let done = false;
    try { done = localStorage.getItem(KEY) === "pronto"; } catch {}
    if (done) { say("Pronto para funcionar sem internet."); return; }
    if (!navigator.onLine) { say("Conecte-se uma vez para preparar o modo sem internet."); return; }
    const sw = reg.active || navigator.serviceWorker.controller;
    if (!sw) return;
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progresso") say(`Preparando o mapa para uso sem internet: ${Math.round((m.done / m.total) * 100)}%`);
      if (m.type === "pronto") { try { localStorage.setItem(KEY, "pronto"); } catch {} say("Pronto para funcionar sem internet."); }
      if (m.type === "erro") say("Não foi possível preparar o modo sem internet agora.");
    };
    say("Preparando o mapa para uso sem internet…");
    /* Rotas a pé dos totens e de evacuação até os abrigos, no mesmo formato usado pelas páginas. */
    const R = window.Risco, rotas = [];
    if (R) {
      const url = (a, b) => `https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`;
      const abrigo = (id) => R.ABRIGOS.find((s) => s.id === id).c;
      R.TOTENS.forEach((t) => rotas.push(url(t.c, abrigo(t.abrigo))));
      R.AREAS.forEach((a) => rotas.push(url(a.c, abrigo(a.abrigo))));
    }
    sw.postMessage({ type: "preparar", rotas }, [ch.port2]);
  }).catch(() => say("Este navegador bloqueou o modo sem internet. Abra no Chrome, Edge ou Firefox."));
})();
