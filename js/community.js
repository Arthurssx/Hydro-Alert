/* Página inicial: relatos de bueiro, pontos e ranking (os mesmos da página da comunidade). */
(() => {
  const { $, $$, esc, loadReports, saveReports, countTo, flip, toast, reduced, closeDialog, wireDialog } = window.Pluvial;
  const CM = window.Comunidade;
  const dlg = $("#dlg"), form = $("#form"), rank = $("#rank");
  let reports = loadReports();

  $('#form select[name="bairro"]').innerHTML = CM.BAIRROS.map((b) => `<option>${esc(b)}</option>`).join("");
  rank.innerHTML = CM.BAIRROS.map((b) => `<li data-bairro="${esc(b)}"><b>${esc(b)}</b><span class="tube"><i></i></span><span class="pts">0</span></li>`).join("");
  const rows = new Map($$("li", rank).map((li) => [li.dataset.bairro, li]));

  function render(animate = true) {
    const st = CM.load();
    const total = CM.myPoints(st), lv = CM.level(total);
    const opts = animate ? {} : { ms: 1 };
    countTo($("#n-rel"), reports.length, opts);
    countTo($("#n-pts"), total, opts);
    $("#n-lvl").textContent = lv.name;
    $("#n-next").textContent = lv.next ? `faltam ${lv.missing} pontos para ${lv.next}` : "nível máximo";
    $("#lvl-fill").style.transform = `scaleX(${lv.ratio})`;
    $$("[data-level]").forEach((el) => el.classList.toggle("on", total >= Number(el.dataset.level)));

    const list = CM.bairroRanking(st), max = Math.max(...list.map((b) => b.pts), 1);
    flip([...rows.values()], () => list.forEach((b) => rank.append(rows.get(b.bairro))));
    list.forEach((b) => {
      const li = rows.get(b.bairro);
      li.querySelector("i").style.transform = `scaleX(${b.pts / max})`;
      li.querySelector(".pts").textContent = b.pts + " pts";
      li.classList.toggle("has", b.bairro === CM.profile()?.bairro);
    });
    const people = CM.memberRanking(st).slice(0, 5);
    $("#top-people").innerHTML = people.map((m, i) => `<li class="${m.me ? "me" : ""}"><span class="pos">${i + 1}</span><b>${esc(m.nome)}${m.me ? " (você)" : ""}</b><small>${esc(m.bairro)}</small><span class="pts">${m.pts} pts</span></li>`).join("");
    $("#rank-empty").hidden = !!CM.profile() || reports.length > 0;
  }

  function flyPoints(from) {
    const to = $("#n-pts");
    if (reduced() || !from || !to) return;
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const chip = document.createElement("span");
    chip.className = "fly";
    chip.textContent = "+10";
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

  let opener = null;
  $$("[data-open-report]").forEach((b) => b.addEventListener("click", () => { opener = b; dlg.showModal(); }));
  $("#cancel").addEventListener("click", () => closeDialog(dlg));
  wireDialog(dlg);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const before = CM.level(CM.myPoints(CM.load())).name;
    reports.push({ uid: window.PluvialAuth?.current()?.id || null, at: Date.now(), bairro: f.get("bairro"), local: f.get("local"), texto: `${f.get("tipo")}: ${f.get("texto")}`, date: new Date().toLocaleString("pt-BR"), pontos: 10 });
    saveReports(reports);
    CM.logAction("relato");
    form.reset();
    closeDialog(dlg);
    flyPoints(opener);
    setTimeout(() => render(), reduced() ? 0 : 520);
    const after = CM.level(CM.myPoints(CM.load())).name;
    toast(after !== before ? `Relato enviado. Você agora é ${after}!` : "Relato enviado. +10 pontos para você e para o seu bairro.");
  });
  /* Mantém os números certos quando o painel ou a comunidade mudam em outra aba. */
  addEventListener("storage", (e) => { if (e.key === window.Pluvial.KEYS.reports || e.key === null || /pluvial-(social|contas|sessao)/.test(e.key)) { reports = loadReports(); render(); } });
  addEventListener("pageshow", (e) => { if (e.persisted) { reports = loadReports(); render(false); } });
  render(false);
})();
