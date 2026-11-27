/* Página inicial: formulário de relato, pontos do morador e ranking de bairros e moradores. */
(() => {
  const P = window.Pluvial;
  const { $, $$, esc, loadReports, saveReports, countTo, flip, toast, reduced, closeDialog, wireDialog, level, PONTOS } = P;
  // Bairros com bueiro (os mesmos dos cartões).
  const BAIRROS = window.Bueiros.BAIRROS;

  // Moradores fictícios do ranking: [nome, bairro, pontos].
  const MEMBROS = [
    ["Cida", "Dom Bosco", 118], ["Rafael", "Santa Terezinha", 96], ["Lúcia", "Vila Ideal", 74], ["Jorge", "Centro", 61],
    ["Bia", "São Pedro", 52], ["Seu Antônio", "Linhares", 44], ["Paula", "Borboleta", 39], ["Diego", "Benfica", 31],
    ["Marta", "Manoel Honório", 27], ["Kauã", "Bom Pastor", 20], ["Neide", "São Mateus", 15], ["Thiago", "Dom Bosco", 12],
  ].map(([nome, bairro, pts]) => ({ nome, bairro, pts }));

  // Janela e formulário de relato, lista do ranking e relatos salvos.
  const dlg = $("#dlg"), form = $("#form"), rank = $("#rank");
  let reports = loadReports();

  // Seus pontos: cada relato vale 10.
  const myPoints = () => reports.reduce((t, r) => t + (r.pontos ?? PONTOS), 0);
  // Seu bairro: o do relato mais recente.
  const myBairro = () => reports.at(-1)?.bairro || null;

  // Ranking de bairros: soma os pontos dos moradores fictícios e os dos seus relatos. Desempate por nome.
  function bairroRanking() {
    const by = Object.fromEntries(BAIRROS.map((b) => [b, 0]));
    MEMBROS.forEach((m) => { by[m.bairro] += m.pts; });
    reports.forEach((r) => { if (by[r.bairro] !== undefined) by[r.bairro] += r.pontos ?? PONTOS; });
    return BAIRROS.map((b) => ({ bairro: b, pts: by[b] })).sort((a, b) => b.pts - a.pts || a.bairro.localeCompare(b.bairro, "pt-BR"));
  }
  // Ranking de moradores: os fictícios e você (depois do primeiro relato).
  function memberRanking() {
    const list = MEMBROS.map((m) => ({ ...m }));
    if (reports.length) list.push({ nome: "Você", bairro: myBairro(), pts: myPoints(), me: true });
    return list.sort((a, b) => b.pts - a.pts);
  }

  // Preenche a lista de bairros do formulário e cria uma linha de ranking para cada bairro.
  $('#form select[name="bairro"]').innerHTML = BAIRROS.map((b) => `<option>${esc(b)}</option>`).join("");
  rank.innerHTML = BAIRROS.map((b) => `<li data-bairro="${esc(b)}"><b>${esc(b)}</b><span class="tube"><i></i></span><span class="pts">0</span></li>`).join("");
  // Mapa bairro -> linha do ranking (para reordenar com animação).
  const rows = new Map($$("li", rank).map((li) => [li.dataset.bairro, li]));

  // Atualiza números (relatos, pontos, nível), barra de nível, ranking de bairros e top 5 de moradores.
  function render(animate = true) {
    const total = myPoints(), lv = level(total), ms = animate ? 900 : 1;
    countTo($("#n-rel"), reports.length, ms);
    countTo($("#n-pts"), total, ms);
    $("#n-lvl").textContent = lv.name;
    $("#n-next").textContent = lv.next ? `faltam ${lv.missing} pontos para ${lv.next}` : "nível máximo";
    $("#lvl-fill").style.transform = `scaleX(${lv.ratio})`;
    $$("[data-level]").forEach((el) => el.classList.toggle("on", total >= Number(el.dataset.level)));

    const list = bairroRanking(), max = Math.max(...list.map((b) => b.pts), 1);
    flip([...rows.values()], () => list.forEach((b) => rank.append(rows.get(b.bairro))));
    list.forEach((b) => {
      const li = rows.get(b.bairro);
      li.querySelector("i").style.transform = `scaleX(${b.pts / max})`;
      li.querySelector(".pts").textContent = b.pts + " pts";
      li.classList.toggle("has", b.bairro === myBairro());
    });
    // Top 5; se você estiver fora do top 5, aparece em 6º lugar com a sua posição real.
    const people = memberRanking();
    const top = people.slice(0, 5), meAt = people.findIndex((m) => m.me);
    if (meAt >= 5) top.push(people[meAt]);
    $("#top-people").innerHTML = top.map((m) => `<li class="${m.me ? "me" : ""}"><span class="pos">${people.indexOf(m) + 1}</span><b>${esc(m.nome)}</b><small>${esc(m.bairro)}</small><span class="pts">${m.pts} pts</span></li>`).join("");
    $("#rank-empty").hidden = reports.length > 0;
  }

  // Anima um "+10" voando do botão de relato até o contador de pontos.
  function flyPoints(from) {
    const to = $("#n-pts");
    if (reduced() || !from || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const chip = document.createElement("span");
    chip.className = "fly";
    chip.textContent = "+" + PONTOS;
    chip.setAttribute("aria-hidden", "true");
    chip.style.left = a.left + a.width / 2 + "px";
    chip.style.top = a.top + "px";
    document.body.append(chip);
    const dx = b.left - a.left - a.width / 2, dy = b.top - a.top;
    chip.animate(
      [{ transform: "translate(-50%,0) scale(.6)", opacity: 0 }, { transform: `translate(calc(-50% + ${dx * 0.4}px), ${Math.min(dy, 0) - 90}px) scale(1.15)`, opacity: 1, offset: 0.4 }, { transform: `translate(calc(-50% + ${dx}px), ${dy}px) scale(.7)`, opacity: 0.2 }],
      { duration: 950, easing: "cubic-bezier(.4,0,.2,1)" },
    ).onfinish = () => chip.remove();
  }

  // opener: botão que abriu a janela (de onde sai o +10).
  let opener = null;
  $$("[data-open-report]").forEach((b) => b.addEventListener("click", () => {
    opener = b;
    erroCampo(campoLocal, "");
    erroCampo(campoTexto, "");
    dlg.showModal();
  }));
  $("#cancel").addEventListener("click", () => closeDialog(dlg));
  wireDialog(dlg);

  // Envio do relato: salva, soma pontos, fecha a janela, anima e avisa (inclusive se subiu de nível).
  // Mostra ou limpa o erro de um campo: borda vermelha, aria-invalid e mensagem logo abaixo.
  function erroCampo(campo, msg) {
    const alvo = document.getElementById(campo.id + "-erro");
    if (msg) {
      campo.setAttribute("aria-invalid", "true");
      alvo.textContent = msg;
    } else {
      campo.removeAttribute("aria-invalid");
      alvo.textContent = "";
    }
  }
  const campoLocal = document.getElementById("r-local"), campoTexto = document.getElementById("r-texto");
  // Ao corrigir o campo, o erro some.
  campoLocal.addEventListener("input", () => { if (campoLocal.value.trim().length >= 3) erroCampo(campoLocal, ""); });
  campoTexto.addEventListener("input", () => { if (campoTexto.value.trim().length >= 10) erroCampo(campoTexto, ""); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const local = String(f.get("local")).trim(), texto = String(f.get("texto")).trim();
    // Validação: cada campo mostra a própria mensagem; o foco vai para o primeiro com erro.
    erroCampo(campoLocal, local.length < 3 ? "Informe a rua, o número ou um ponto de referência." : "");
    erroCampo(campoTexto, texto.length < 10 ? "Descreva o problema com pelo menos 10 caracteres." : "");
    const primeiro = form.querySelector('[aria-invalid="true"]');
    if (primeiro) { primeiro.focus(); return; }
    const before = level(myPoints()).name;
    reports.push({ at: Date.now(), bairro: f.get("bairro"), local, tipo: f.get("tipo"), texto, pontos: PONTOS, status: "pendente" });
    saveReports(reports);
    form.reset();
    closeDialog(dlg);
    flyPoints(opener);
    setTimeout(() => render(), reduced() ? 0 : 520);
    dispatchEvent(new Event("pluvial:relato"));
    const after = level(myPoints()).name;
    toast(after !== before ? `Relato enviado. Você agora é ${after}!` : `Relato enviado. +${PONTOS} pontos para você e para o seu bairro.`);
  });

  // Mantém os números certos se outra aba desta página registrar um relato.
  addEventListener("storage", (e) => { if (e.key === P.KEY || e.key === null) { reports = loadReports(); render(); } });
  // Ao voltar pelo botão "voltar" do navegador, recarrega os dados.
  addEventListener("pageshow", (e) => { if (e.persisted) { reports = loadReports(); render(false); } });
  // Primeira pintura, sem animação.
  render(false);
})();
