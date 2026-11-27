/* Núcleo da página inicial: relatos salvos, níveis do morador e utilitários. Sem dependências. */
window.Pluvial = (() => {
  // Chave do localStorage onde ficam os relatos dos moradores.
  const KEY = "pluvial-reports";
  // Níveis do morador: pontos mínimos e nome (os mesmos da lista "levels" do index.html).
  const LEVELS = [[0, "Vizinho"], [30, "Guardião"], [80, "Sentinela"], [160, "Referência do bairro"]];
  // Pontos ganhos por relato.
  const PONTOS = 10;

  // Atalhos: $ busca um elemento e $$ busca vários (devolve lista).
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  // Escapa caracteres especiais do HTML (evita que texto digitado vire código).
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Verdadeiro se a pessoa prefere menos animações.
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lê os relatos salvos neste navegador (lista vazia se não houver ou estiver corrompido).
  function loadReports() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  // Salva os relatos; se o navegador bloquear o armazenamento, avisa que vale só nesta visita.
  function saveReports(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      toast("Armazenamento indisponível: o relato vale só nesta visita.");
    }
  }

  // Nível atual, próximo nível, pontos que faltam e proporção da barra, a partir do total de pontos.
  function level(total) {
    let i = 0;
    LEVELS.forEach((l, n) => { if (total >= l[0]) i = n; });
    const next = LEVELS[i + 1];
    const from = LEVELS[i][0];
    return { name: LEVELS[i][1], next: next && next[1], missing: next ? next[0] - total : 0, ratio: next ? (total - from) / (next[0] - from) : 1 };
  }

  // Aviso rápido (toast) na parte de baixo da tela; some depois de ~4 s.
  let toastTimer;
  function toast(text) {
    const el = $("#toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
  }

  // Anima um número subindo ou descendo até o valor final (ou troca direto, com movimento reduzido).
  const counters = new WeakMap();
  function countTo(el, target, ms = 900) {
    cancelAnimationFrame(counters.get(el));
    const from = parseInt(el.textContent, 10) || 0;
    if (reduced() || from === target || ms <= 1) { el.textContent = target; return; }
    const t0 = performance.now();
    const frame = (now) => {
      const t = Math.min((now - t0) / ms, 1);
      el.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 4)));
      if (t < 1) counters.set(el, requestAnimationFrame(frame));
    };
    counters.set(el, requestAnimationFrame(frame));
  }

  // Revela os elementos [data-reveal] quando entram na tela. O CSS só os esconde quando html.js existe.
  function reveal() {
    const els = $$("[data-reveal]");
    if (!("IntersectionObserver" in window) || reduced()) { els.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  }

  // Anima a mudança de ordem de uma lista (técnica FLIP: mede, muda, anima a diferença).
  function flip(items, mutate) {
    const before = new Map(items.map((el) => [el, el.getBoundingClientRect().top]));
    mutate();
    if (reduced()) return;
    items.forEach((el, i) => {
      const dy = before.get(el) - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 620, delay: i * 18, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    });
  }

  // Executa um callback de rolagem no máximo uma vez por quadro.
  function onScrollFrame(cb) {
    let queued = false;
    const run = () => { queued = false; cb(); };
    const req = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    addEventListener("scroll", req, { passive: true });
    addEventListener("resize", req, { passive: true });
    run();
  }

  // Fecha o <dialog> com a animação de saída.
  function closeDialog(dlg) {
    if (!dlg.open) return;
    if (reduced()) { dlg.close(); return; }
    dlg.classList.add("closing");
    setTimeout(() => { dlg.classList.remove("closing"); dlg.close(); }, 200);
  }
  // Fecha o diálogo ao clicar fora dele ou ao apertar Esc.
  function wireDialog(dlg) {
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeDialog(dlg); });
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeDialog(dlg); });
  }

  // Tudo que fica disponível em window.Pluvial.
  return { KEY, LEVELS, PONTOS, $, $$, esc, reduced, loadReports, saveReports, level, toast, countTo, reveal, flip, onScrollFrame, closeDialog, wireDialog };
})();
