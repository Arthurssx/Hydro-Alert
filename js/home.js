/* Página inicial: cartões de bairro, palavras que acendem ao rolar, flutuação dos bueiros. */
(() => {
  const P = window.Pluvial;
  const { $, $$, esc, reduced, onScrollFrame, loadData, state, priority } = P;

  /* ----- Cartões: gerados antes de community.js ligar os botões de relato ----- */
  const ART = { Crítico: "c-trash", Atenção: "c-leaves", Normal: "c-clean", "Sem dados": "c-base" };
  const LINE = { Crítico: "Precisa de verificação", Atenção: "Vale acompanhar", Normal: "Tudo certo por enquanto", "Sem dados": "Sem comunicação" };
  /* Um cartão por bairro, com o pior bueiro da rede (ver bueiros.js). A chuva real chega depois. */
  const B = window.Bueiros;
  const RANK = { Crítico: 3, Atenção: 2, Normal: 1, "Sem dados": 0 };
  function summary(hours) {
    const snap = B.snapshot(B.load(), hours);
    const by = {};
    snap.items.forEach((i) => { const b = (by[i.bairro] ||= { bairro: i.bairro, n: 0, worst: null, rel: 0 }); b.n++; b.rel += i.relatos.length; if (i.now !== null && (!b.worst || i.now > b.worst.now)) b.worst = i; });
    return { snap, list: Object.values(by).sort((a, b) => (b.worst?.now ?? 0) - (a.worst?.now ?? 0)) };
  }
  const cardInfo = (b) => { const st = b.worst?.state || "Sem dados"; return { st, html: `<li>${b.n} bueiros com sensor</li><li>Pior: ${b.worst ? `${b.worst.now}% na ${esc(b.worst.rua)}` : "sem leitura"}</li><li>${LINE[st]}${b.rel ? ` · ${b.rel} ${b.rel === 1 ? "aviso" : "avisos"}` : ""}</li>` }; };
  const zero = Array.from({ length: 36 }, (_, i) => ({ t: Date.now() + (i - 23) * 3600e3, mm: 0 }));
  const first = summary(zero).list;
  $("#cards").innerHTML = first.map((b, i) => {
    const { st, html } = cardInfo(b);
    return `<li class="card" data-reveal style="--d:${i % 3}" data-card="${esc(b.bairro)}">
      <svg class="card-art" aria-hidden="true"><use href="#${ART[st]}"/></svg>
      <h3>${esc(b.bairro.toLowerCase())}</h3>
      <ul>${html}</ul>
      <button type="button" class="pill small" data-open-report data-bairro="${esc(b.bairro)}">Relatar aqui</button>
    </li>`;
  }).join("");
  function live(hours) {
    const { snap, list } = summary(hours);
    list.forEach((b) => {
      const li = document.querySelector(`[data-card="${CSS.escape(b.bairro)}"]`);
      if (!li) return;
      const { st, html } = cardInfo(b);
      li.querySelector("ul").innerHTML = html;
      li.querySelector("use").setAttribute("href", `#${ART[st]}`);
    });
    const crit = snap.items.filter((i) => i.state === "Crítico").length, warn = snap.items.filter((i) => i.state === "Atenção").length;
    const el = $("#drain-live");
    el.hidden = false;
    el.classList.toggle("hot", crit > 0);
    el.innerHTML = `<b>Agora na rede:</b> ${crit} ${crit === 1 ? "bueiro crítico" : "bueiros críticos"} e ${warn} em atenção, com a chuva real. <a href="painel.html">Ver o painel dos bueiros</a>`;
  }
  B.rain().then((r) => live(r.hours)).catch(() => {});
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bairro]");
    if (b) $('#form select[name="bairro"]').value = b.dataset.bairro;
  }, true);

  P.reveal();
  if (reduced()) return;

  /* ----- Palavras acendem conforme a leitura ----- */
  const says = $$(".say").map((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="wd" aria-hidden="true">${esc(w)}</span>`).join(" ");
    return { el, spans: $$(".wd", el), lit: -1 };
  });
  /* ----- Elementos com parallax, medidos só no que está perto da tela ----- */
  const floats = $$("[data-speed]").map((el) => ({ el, speed: Number(el.dataset.speed), on: false }));
  const io = new IntersectionObserver((es) => es.forEach((e) => { floats.find((f) => f.el === e.target).on = e.isIntersecting; }), { rootMargin: "200px" });
  floats.forEach((f) => io.observe(f.el));
  const squircle = $("#squircle"), spin = $(".stamp .spin");

  onScrollFrame(() => {
    const vh = innerHeight, y = scrollY;
    for (const f of floats) {
      if (!f.on) continue;
      const box = f.el.parentElement.getBoundingClientRect();
      const mid = box.top + box.height / 2 - vh / 2;
      f.el.style.transform = `translate3d(0, ${mid * f.speed}px, 0) rotate(${mid * f.speed * 0.25}deg)`;
    }
    for (const s of says) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const p = Math.min(Math.max((vh * 0.86 - r.top) / (r.height + vh * 0.28), 0), 1);
      const lit = Math.round(p * s.spans.length);
      if (lit === s.lit) continue;
      s.spans.forEach((w, i) => w.classList.toggle("on", i < lit));
      s.lit = lit;
    }
    if (y < vh * 1.6) {
      const r = squircle.getBoundingClientRect();
      const p = Math.min(Math.max(1 - r.top / vh, 0), 1);
      squircle.style.transform = `scale(${0.86 + p * 0.14})`;
    }
    spin.style.setProperty("--turn", y * 0.18 + "deg");
  });
})();
