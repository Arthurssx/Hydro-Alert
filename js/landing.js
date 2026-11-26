/* Página inicial: mostra ao vivo a situação das encostas, vinda da central aberta neste navegador. */
(() => {
  /* Botão de conta no topo: "Entrar" ou o apelido de quem já entrou. */
  const link = document.getElementById("auth-link"), u = window.PluvialAuth?.current();
  if (link && u) { link.textContent = `Olá, ${u.nome.split(" ")[0]}`; link.href = "comunidade.html"; }
})();
(() => {
  const el = document.getElementById("enc-live"), Canal = window.Canal;
  if (!el || !Canal) return;
  const NOMES = { "E-01": "Santa Terezinha", "E-02": "Dom Bosco", "E-03": "Vila Ideal", "E-04": "Linhares", "E-05": "Borboleta" };
  const LV = ["observação", "atenção", "alerta", "alerta máximo"];
  function paint(s) {
    if (!s?.areas) return;
    const on = s.areas.filter((a) => a.alert !== null && a.alert !== undefined);
    el.hidden = false;
    el.classList.toggle("hot", on.length > 0);
    el.innerHTML = on.length
      ? `<b>Agora na central:</b> ${on.map((a) => `${NOMES[a.id]} em ${LV[a.alert]}`).join(", ")}. <a href="totem.html?id=${on[0].id.replace("E", "T")}">Ver orientações</a>`
      : `<b>Agora na central:</b> nenhuma encosta com alerta oficial. Isso não garante que uma área está segura.`;
  }
  paint(Canal.lastState());
  Canal.on((m) => { if (m.type === "estado") paint(m.data); });
})();
