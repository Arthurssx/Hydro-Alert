/* Central: risco de alagamento vindo da rede de bueiros (painel dos bueiros).
   Mostra os bairros em risco no painel lateral e os bueiros críticos no mapa. */
(() => {
  const C = window.Central, Canal = window.Canal;
  if (!C) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const box = document.createElement("section");
  box.className = "block drain";
  box.setAttribute("aria-labelledby", "drain-t");
  box.setAttribute("aria-live", "polite");
  document.querySelector(".rainbox").after(box);
  let last = null, known = new Set(), layer = false;

  function paint(d) {
    last = d;
    if (!d) {
      box.innerHTML = `<div class="block-head"><h2 id="drain-t">Alagamento · bueiros</h2></div><p class="real">Abra o <a href="painel.html">painel dos bueiros</a> para acompanhar a rede de drenagem.</p>`;
      return;
    }
    const age = Math.round((Date.now() - d.at) / 60000);
    box.innerHTML = `<div class="block-head"><h2 id="drain-t">Alagamento · bueiros</h2><a class="link small" href="painel.html">Painel</a></div>
      ${d.bairros.length ? `<ul class="drain-list">${d.bairros.map((b) => `<li><b>${esc(b.bairro)}</b><span>${b.criticos} ${b.criticos === 1 ? "bueiro crítico" : "bueiros críticos"}</span></li>`).join("")}</ul>` : `<p class="drain-ok">Nenhum bairro com risco de alagamento agora.</p>`}
      <p class="real">${d.criticos.length} críticos e ${d.atencao} em atenção na rede · chuva de ${d.last3.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm nas últimas 3 h${d.sim ? " (com simulação)" : ""} · ${age < 1 ? "agora" : `há ${age} min`}</p>`;
    d.bairros.forEach((b) => { if (!known.has(b.bairro)) C.log(`Risco de alagamento em ${b.bairro}: ${b.criticos} ${b.criticos === 1 ? "bueiro crítico" : "bueiros críticos"} (rede de drenagem).`, 2); });
    known = new Set(d.bairros.map((b) => b.bairro));
    paintMap();
  }

  function paintMap() {
    const map = C.S.map;
    if (!C.mapReady() || !map) return;
    const data = { type: "FeatureCollection", features: (last?.criticos || []).map((b) => ({ type: "Feature", properties: { rua: b.rua, lv: b.lv }, geometry: { type: "Point", coordinates: b.c } })) };
    if (!layer) {
      map.addSource("drain", { type: "geojson", data });
      map.addLayer({ id: "drain-halo", type: "circle", source: "drain", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 8, 16, 18], "circle-color": "#5ab0ff", "circle-opacity": 0.25, "circle-pitch-alignment": "map" } });
      map.addLayer({ id: "drain", type: "circle", source: "drain", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 4, 16, 8], "circle-color": "#2f7fd8", "circle-stroke-color": "#fff", "circle-stroke-width": 2, "circle-pitch-alignment": "map" } });
      layer = true;
    } else map.getSource("drain").setData(data);
  }

  try { paint(JSON.parse(localStorage.getItem("pluvial-drenagem"))); } catch { paint(null); }
  Canal?.on((m) => { if (m.type === "drenagem") paint(m.data); });
  document.addEventListener("central:mapready", paintMap);
  /* O "Reiniciar" da central limpa a linha do tempo: os bairros voltam a ser anunciados. */
  document.addEventListener("central:reset", () => { known = new Set(); setTimeout(() => paint(last), 50); });
})();
