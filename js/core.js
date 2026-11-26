/* Núcleo do Pluvial: dados, regras de prioridade e utilitários. Sem dependências. */
window.Pluvial = (() => {
  const KEYS = { reports: "pluvial-reports", data: "pluvial-data" };
  const BAIRROS = ["Centro", "Manoel Honório", "São Pedro", "Benfica", "São Mateus", "Santa Terezinha", "Bom Pastor"];
  const SEED = [
    ["JF-001", "Centro", "Ponto demonstrativo A", 86, -21.762, -43.349],
    ["JF-002", "Manoel Honório", "Ponto demonstrativo B", 74, -21.744, -43.347],
    ["JF-003", "São Pedro", "Ponto demonstrativo C", 58, -21.773, -43.392],
    ["JF-004", "Benfica", "Ponto demonstrativo D", 43, -21.691, -43.434],
    ["JF-005", "São Mateus", "Ponto demonstrativo E", 22, -21.782, -43.36],
    ["JF-006", "Santa Terezinha", "Ponto demonstrativo F", 15, -21.733, -43.354],
    ["JF-007", "Bom Pastor", "Ponto demonstrativo G", null, -21.785, -43.342],
  ].map(([id, bairro, local, value, lat, lng]) => ({ id, bairro, local, value, lat, lng }));
  const LEVELS = [[0, "Vizinho"], [30, "Guardião"], [80, "Sentinela"]];
  const COLORS = { Crítico: "#c4412c", Atenção: "#d99a00", Normal: "#1f8a63", "Sem dados": "#6b7f89" };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function readArray(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      toast("Armazenamento indisponível: as alterações valem só nesta sessão.");
      return false;
    }
  }
  const loadReports = () => readArray(KEYS.reports) || [];
  const saveReports = (r) => write(KEYS.reports, r);
  /* Coordenadas sempre vêm da semente, mesmo com dados antigos salvos no navegador. */
  function loadData() {
    const saved = readArray(KEYS.data);
    return SEED.map((s) => {
      const old = saved && saved.find((d) => d && d.id === s.id);
      return old ? { ...s, value: old.value === null || Number.isFinite(old.value) ? old.value : s.value, cleaned: !!old.cleaned, history: Array.isArray(old.history) ? old.history : [] } : { ...s, history: [] };
    });
  }
  const saveData = (d) => write(KEYS.data, d);

  const state = (d) => (d.value === null ? "Sem dados" : d.value > 70 ? "Crítico" : d.value >= 40 ? "Atenção" : "Normal");
  const color = (d) => COLORS[state(d)];
  const priority = (d, rain) => (d.value === null ? "Inspecionar" : d.value > 70 || (rain && d.value >= 40) ? "Alta" : d.value >= 40 ? "Média" : "Baixa");
  const score = (d, rain) => (d.value === null ? 69 : d.value + (rain && d.value >= 40 ? 40 : 0));
  const pointsOf = (r) => r.pontos ?? 10;

  function progress(total) {
    let i = 0;
    LEVELS.forEach((l, n) => { if (total >= l[0]) i = n; });
    const next = LEVELS[i + 1];
    return { level: LEVELS[i][1], next, ratio: Math.min(total / LEVELS[LEVELS.length - 1][0], 1), missing: next ? next[0] - total : 0 };
  }

  let toastTimer;
  function toast(text) {
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.setAttribute("role", "status");
      document.body.append(el);
    }
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
  }

  const counters = new WeakMap();
  function countTo(el, target, { pad = 0, suffix = "", ms = 900 } = {}) {
    const fmt = (n) => String(n).padStart(pad, "0") + suffix;
    cancelAnimationFrame(counters.get(el));
    const from = parseInt(el.textContent, 10) || 0;
    if (reduced() || from === target) { el.textContent = fmt(target); return; }
    const t0 = performance.now();
    const frame = (now) => {
      const t = Math.min((now - t0) / ms, 1);
      el.textContent = fmt(Math.round(from + (target - from) * (1 - Math.pow(1 - t, 4))));
      if (t < 1) counters.set(el, requestAnimationFrame(frame));
    };
    counters.set(el, requestAnimationFrame(frame));
  }

  /* Revela elementos ao entrar na tela. O CSS só esconde quando html.js existe. */
  function reveal(root = document) {
    const els = $$("[data-reveal]", root);
    if (!("IntersectionObserver" in window) || reduced()) { els.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  }

  /* Anima a mudança de ordem/posição de uma lista (técnica FLIP). */
  function flip(items, mutate) {
    const before = new Map(items.map((el) => [el, el.getBoundingClientRect().top]));
    mutate();
    if (reduced()) return;
    items.forEach((el, i) => {
      const prev = before.get(el);
      if (prev === undefined || !el.isConnected) return;
      const dy = prev - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 620, delay: i * 18, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    });
  }

  /* Executa um callback de scroll no máximo uma vez por quadro. */
  function onScrollFrame(cb) {
    let queued = false;
    const run = () => { queued = false; cb(); };
    const req = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    addEventListener("scroll", req, { passive: true });
    addEventListener("resize", req, { passive: true });
    run();
  }

  /* Fecha o <dialog> com a animação de saída antes de removê-lo da tela. */
  function closeDialog(dlg) {
    if (!dlg.open) return;
    if (reduced()) { dlg.close(); return; }
    dlg.classList.add("closing");
    setTimeout(() => { dlg.classList.remove("closing"); dlg.close(); }, 200);
  }
  function wireDialog(dlg) {
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeDialog(dlg); });
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeDialog(dlg); });
  }

  return { KEYS, BAIRROS, SEED, LEVELS, $, $$, esc, reduced, loadReports, saveReports, loadData, saveData, state, color, priority, score, pointsOf, progress, toast, countTo, reveal, flip, onScrollFrame, closeDialog, wireDialog };
})();
