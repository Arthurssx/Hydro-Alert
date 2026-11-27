/* Página inicial: cartões de bairro, palavras que acendem ao rolar e flutuação dos bueiros. */
(() => {
  const P = window.Pluvial, B = window.Bueiros;
  const { $, $$, esc, reduced, onScrollFrame } = P;

  /* ----- Cartões de bairro (gerados antes de community.js ligar os botões de relato) ----- */
  // ART: desenho de cada cartão por estado. LINE: frase de situação.
  const ART = { Crítico: "c-trash", Atenção: "c-leaves", Normal: "c-clean", "Sem dados": "c-base" };
  const LINE = { Crítico: "Precisa de verificação", Atenção: "Vale acompanhar", Normal: "Tudo certo por enquanto", "Sem dados": "Sem comunicação" };

  // Agrupa os bueiros por bairro (quantidade, pior bueiro e relatos) e ordena do mais cheio para o menos cheio.
  function summary(hours) {
    const items = B.snapshot(hours, P.loadReports());
    const by = {};
    items.forEach((i) => {
      const b = (by[i.bairro] ||= { bairro: i.bairro, n: 0, worst: null, rel: 0 });
      b.n++;
      b.rel += i.relatos;
      if (i.now !== null && (!b.worst || i.now > b.worst.now)) b.worst = i;
    });
    return { items, list: Object.values(by).sort((a, b) => (b.worst?.now ?? 0) - (a.worst?.now ?? 0)) };
  }
  // Estado e texto do cartão de um bairro.
  function cardInfo(b) {
    const st = b.worst?.state || "Sem dados";
    const rel = b.rel ? ` · ${b.rel} ${b.rel === 1 ? "relato" : "relatos"}` : "";
    return { st, html: `<li>${b.n} bueiros com sensor</li><li>Pior: ${b.worst ? `${b.worst.now}% na ${esc(b.worst.rua)}` : "sem leitura"}</li><li>${LINE[st]}${rel}</li>` };
  }

  // Primeira pintura com chuva zero; a chuva real atualiza logo depois.
  $("#cards").innerHTML = summary(B.zero()).list.map((b, i) => {
    const { st, html } = cardInfo(b);
    return `<li class="card" data-reveal style="--d:${i % 3}" data-card="${esc(b.bairro)}">
      <svg class="card-art" aria-hidden="true"><use href="#${ART[st]}"/></svg>
      <h3>${esc(b.bairro.toLowerCase())}</h3>
      <ul>${html}</ul>
      <button type="button" class="pill small" data-open-report data-bairro="${esc(b.bairro)}">Relatar aqui</button>
    </li>`;
  }).join("");

  // Atualiza os cartões e escreve o resumo "Agora na rede" (críticos e em atenção).
  let last = null;
  function live(hours, real) {
    last = { hours, real };
    const { items, list } = summary(hours);
    list.forEach((b) => {
      const li = document.querySelector(`[data-card="${CSS.escape(b.bairro)}"]`);
      if (!li) return;
      const { st, html } = cardInfo(b);
      li.querySelector("ul").innerHTML = html;
      li.querySelector("use").setAttribute("href", `#${ART[st]}`);
    });
    const crit = items.filter((i) => i.state === "Crítico").length, warn = items.filter((i) => i.state === "Atenção").length;
    const el = $("#drain-live");
    el.hidden = false;
    el.classList.toggle("hot", crit > 0);
    el.innerHTML = `<b>Agora na rede:</b> ${crit} ${crit === 1 ? "bueiro crítico" : "bueiros críticos"} e ${warn} em atenção, ${real ? "com a chuva real das últimas 3 horas" : "sem a chuva real (sem conexão com a previsão)"}.`;
  }
  // Busca a chuva real (se falhar, usa chuva zero).
  B.rain().then((r) => live(r.hours, r.real)).catch(() => {});
  // Quando um relato novo é enviado, os cartões contam o relato na hora.
  addEventListener("pluvial:relato", () => { if (last) live(last.hours, last.real); });

  // Ao clicar em "Relatar aqui", já seleciona o bairro no formulário de relato.
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bairro]");
    if (b) $('#form select[name="bairro"]').value = b.dataset.bairro;
  }, true);

  /* ----- Menu do celular (até 900px): o botão abre e fecha a navegação ----- */
  const menuBtn = $("#menu-btn"), menu = $("#menu");
  function abrirMenu(abrir) {
    menu.classList.toggle("open", abrir);
    menuBtn.closest(".top").classList.toggle("menu-aberto", abrir);
    menuBtn.setAttribute("aria-expanded", String(abrir));
  }
  menuBtn.addEventListener("click", () => abrirMenu(!menu.classList.contains("open")));
  // Fecha ao escolher um link ou apertar Esc.
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) abrirMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("open")) { abrirMenu(false); menuBtn.focus(); }
  });

  // Revelação ao rolar. Com movimento reduzido, o script para por aqui.
  P.reveal();
  if (reduced()) return;

  /* ----- Palavras acendem conforme a leitura ----- */
  const says = $$(".say").map((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="wd" aria-hidden="true">${esc(w)}</span>`).join(" ");
    return { el, spans: $$(".wd", el), lit: -1 };
  });
  /* ----- Elementos flutuantes (parallax): só se movem enquanto estão perto da tela ----- */
  const floats = $$("[data-speed]").map((el) => ({ el, speed: Number(el.dataset.speed), on: false }));
  const io = new IntersectionObserver((es) => es.forEach((e) => { floats.find((f) => f.el === e.target).on = e.isIntersecting; }), { rootMargin: "200px" });
  floats.forEach((f) => io.observe(f.el));
  // squircle: bloco da foto que cresce ao rolar. spin: selo que gira.
  const squircle = $("#squircle"), spin = $(".stamp .spin");

  // A cada rolagem: move os flutuantes, acende as palavras, escala a foto e gira o selo.
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
