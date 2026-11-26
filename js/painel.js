/* Painel dos bueiros: chuva real, nível e previsão de cada bueiro, avisos dos moradores,
   fila de limpeza, ordem de serviço com rota e indicadores. */
(() => {
  const B = window.Bueiros;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmtH = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const fmtD = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  const mm = (n) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm`;
  const days = (t) => { const d = Math.floor((Date.now() - t) / 86400e3); return d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`; };

  let s = B.load(), rain = null, sim = 0, hours = [], snap = { items: [], relatos: [] }, pub = null;
  const sel = new Set(s.os && !s.os.finished ? s.os.stops : []);
  const F = { q: "", b: "", st: "" };

  let toastT;
  function toast(t) {
    const el = $("#toast");
    el.textContent = t; el.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 3800);
  }

  /* Conta no topo */
  const u = window.PluvialAuth?.current();
  if (u) { $("#acc").textContent = `Olá, ${u.nome.split(" ")[0]}`; $("#acc").href = "comunidade.html"; }

  /* ----- Cálculo geral ----- */
  function compute() {
    hours = rain ? B.withSim(rain, sim) : [];
    if (!hours.length) return;
    snap = B.snapshot(s, hours);
    const info = { last3: B.last3(hours, 23), next6: hours.slice(24, 30).reduce((t, h) => t + h.mm, 0), sim };
    pub = B.publish(snap, info);
    paint(info);
  }

  /* ----- Chuva ----- */
  function paintRain(info) {
    $("#r-last").textContent = mm(info.last3);
    $("#r-next").textContent = mm(info.next6);
    const max = Math.max(4, ...hours.map((h) => h.mm));
    const w = 360 / hours.length;
    $("#r-bars").innerHTML = hours.map((h, i) => {
      const hgt = Math.max(1.5, (h.mm / max) * 52);
      return `<rect x="${i * w + 1}" y="${56 - hgt}" width="${w - 2}" height="${hgt}" rx="1.5" fill="${i > 23 ? "#9bd3e0" : "#f5c518"}" opacity="${i > 23 ? 0.75 : 1}"/>`;
    }).join("") + `<line x1="${24 * w}" x2="${24 * w}" y1="0" y2="60" stroke="#fbfcfc" stroke-dasharray="3 3" opacity=".7"/>`;
    $("#r-src").textContent = rain.failed ? "Sem conexão com a previsão: usando chuva zero. Use o simulador."
      : `${rain.stale ? "Última previsão salva" : "Open-Meteo"} · atualizado às ${fmtH.format(new Date(rain.at))} · amarelo: últimas 24 h; azul: próximas 12 h${sim ? " · com simulação" : ""}`;
  }
  $("#sim").addEventListener("input", (e) => {
    sim = Number(e.target.value);
    e.target.style.setProperty("--p", (sim / 15) * 100 + "%");
    $("#sim-out").textContent = sim ? `+${sim} mm/h` : "desligado";
    compute();
  });

  /* ----- Indicadores e alerta de alagamento ----- */
  function paintKpis() {
    const it = snap.items;
    $("#k-crit").textContent = it.filter((i) => i.state === "Crítico").length;
    $("#k-warn").textContent = it.filter((i) => i.state === "Atenção").length;
    const m = B.metrics(s, snap.relatos);
    $("#k-rel").textContent = m.abertos;
    $("#k-month").textContent = m.limposMes;
    $("#k-wait").textContent = m.esperaMedia != null ? `${m.esperaMedia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias do aviso à limpeza` : "do aviso à limpeza: —";
    $$(".kpi[data-f]").forEach((k) => k.setAttribute("aria-pressed", String(F.st === k.dataset.f)));
    const fl = $("#flood");
    fl.hidden = !pub.bairros.length;
    fl.innerHTML = pub.bairros.length ? `<b>Risco de alagamento</b> ${pub.bairros.map((b) => `${esc(b.bairro)} (${b.criticos} ${b.criticos === 1 ? "bueiro crítico" : "bueiros críticos"})`).join(", ")}. A <a href="central.html">central de risco</a> foi avisada.` : "";
    paintStats(m);
  }
  $$(".kpi[data-f]").forEach((k) => k.addEventListener("click", () => {
    F.st = F.st === k.dataset.f ? "" : k.dataset.f;
    $("#q-s").value = F.st;
    paint();
    if (innerWidth < 1000) $("#fila").scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
  }));

  /* ----- Fila ----- */
  $("#q-b").insertAdjacentHTML("beforeend", [...new Set(B.BUEIROS.map((b) => b.bairro))].sort((a, b) => a.localeCompare(b, "pt-BR")).map((b) => `<option>${esc(b)}</option>`).join(""));
  $("#q").addEventListener("input", (e) => { F.q = e.target.value.trim().toLowerCase(); paintRows(); });
  $("#q-b").addEventListener("change", (e) => { F.b = e.target.value; paintRows(); paintMap(); });
  $("#q-s").addEventListener("change", (e) => { F.st = e.target.value; paint(); });
  const visible = () => snap.items.filter((i) => (!F.q || `${i.rua} ${i.bairro} ${i.id}`.toLowerCase().includes(F.q)) && (!F.b || i.bairro === F.b) && (!F.st || (F.st === "relatos" ? i.relatos.length : i.state === F.st)));
  function forecastTxt(i) {
    if (i.now === null) return "Sem sinal do sensor · precisa de inspeção";
    if (i.state === "Crítico") return `<span class="fc">Pode transbordar agora</span>`;
    if (i.full) return `<span class="fc">Transborda em ~${i.full} h com a chuva prevista</span>`;
    return `Limpo ${days(i.last)} · entupimento ${i.debris}%`;
  }
  function paintRows() {
    const list = visible();
    $("#q-count").textContent = `${list.length} de ${snap.items.length}`;
    $("#rows").innerHTML = list.map((i) => `<li class="row${sel.has(i.id) ? " sel" : ""}" style="--c:${B.COLORS[i.state]}">
      <input type="checkbox" data-sel="${i.id}" ${sel.has(i.id) ? "checked" : ""} ${i.offline ? "" : ""} aria-label="Incluir ${esc(i.rua)} na rota de limpeza" />
      <button type="button" class="main" data-open="${i.id}"><b>${esc(i.rua)}</b><small>${esc(i.bairro)} · ${i.id}</small><small>${forecastTxt(i)}</small>
        ${i.relatos.length ? `<span class="chips"><span class="chip">${i.relatos.length} ${i.relatos.length === 1 ? "aviso de morador" : "avisos de moradores"}</span></span>` : ""}</button>
      <span class="lv"><strong>${i.now === null ? "—" : i.now + "%"}</strong><small>${i.state}</small></span>
      <span class="tube" aria-hidden="true"><i style="transform:scaleX(${(i.now ?? 0) / 100})"></i></span></li>`).join("");
    $("#empty").hidden = list.length > 0;
  }
  $("#rows").addEventListener("change", (e) => { const c = e.target.closest("[data-sel]"); if (c) toggleSel(c.dataset.sel, c.checked); });
  $("#rows").addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openDetail(b.dataset.open); });

  /* ----- Ordem de serviço ----- */
  function toggleSel(id, on) {
    if (s.os && !s.os.finished) { s.os = null; B.save(s); }
    on ? sel.add(id) : sel.delete(id);
    paintOS(); paintRows(); paintMap();
  }
  function paintOS() {
    const os = s.os && !s.os.finished ? s.os : null;
    $("#os-count").textContent = os ? `${os.stops.length} paradas · ${(os.done || []).length} limpas` : sel.size ? `${sel.size} ${sel.size === 1 ? "bueiro selecionado" : "bueiros selecionados"}` : "Nenhum bueiro na rota";
    $("#os-go").disabled = !sel.size || !!os;
    $("#os-clear").hidden = !sel.size && !os;
    $("#os-hint").hidden = !!os;
    const box = $("#os-result");
    box.hidden = !os;
    if (!os) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="os-sum"><div><strong>${os.stops.length}</strong>paradas</div><div><strong>${os.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</strong>de percurso</div><div><strong>${Math.floor(os.min / 60)}h${String(os.min % 60).padStart(2, "0")}</strong>estimado</div></div>
      <ol class="stops">${os.stops.map((id, n) => {
        const b = snap.items.find((x) => x.id === id) || B.byId(id), done = (os.done || []).includes(id);
        return `<li class="${done ? "done" : ""}"><span class="n">${n + 1}</span><span><b>${esc(b.rua)}</b><small>${esc(b.bairro)} · ${b.now == null ? "sem sinal" : (done ? "limpo" : b.now + "%")}</small></span>${done ? `<span class="ok-t">✓ Limpo</span>` : `<button type="button" data-clean="${id}">Marcar limpo</button>`}</li>`;
      }).join("")}</ol>`;
  }
  $("#os-auto").addEventListener("click", () => {
    if (s.os && !s.os.finished) { s.os = null; }
    sel.clear();
    snap.items.filter((i) => !i.offline).slice(0, 6).forEach((i) => sel.add(i.id));
    paintOS(); paintRows(); paintMap();
    toast("Os 6 bueiros mais urgentes foram selecionados.");
  });
  $("#os-clear").addEventListener("click", () => { sel.clear(); s.os = null; B.save(s); paintOS(); paintRows(); paintMap(); });
  $("#os-go").addEventListener("click", async () => {
    const btn = $("#os-go");
    btn.disabled = true; btn.textContent = "Calculando a rota…";
    const stops = B.order([...sel]);
    const r = await B.route(stops);
    s.os = { stops, geom: r.geom, km: r.km, min: r.min, at: Date.now(), done: [] };
    B.save(s);
    btn.textContent = "Gerar rota de limpeza";
    paintOS(); paintMap(true);
    toast(`Rota pronta: ${stops.length} paradas, ${r.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km.`);
  });
  $("#os-result").addEventListener("click", (e) => { const b = e.target.closest("[data-clean]"); if (b) clean(b.dataset.clean); });

  function clean(id) {
    const n = B.markClean(id, s, snap.relatos);
    const b = B.byId(id);
    sel.delete(id);
    if (s.os && s.os.stops.every((x) => (s.os.done || []).includes(x))) {
      s.os.finished = true;
      B.save(s);
      toast("Ordem de serviço concluída! Todos os bueiros da rota foram limpos.");
    } else toast(`Bueiro da ${b.rua} limpo.${n ? ` ${n} ${n === 1 ? "aviso de morador resolvido" : "avisos de moradores resolvidos"}.` : ""}`);
    if (s.os && !s.os.finished) s.os.stops.filter((x) => !(s.os.done || []).includes(x)).forEach((x) => sel.add(x));
    compute();
    if ($("#dlg").open) openDetail(id);
  }

  /* ----- Mapa ----- */
  let map = null, ready = false, pins = [], stopMarks = [];
  function geo() {
    const shown = new Set(visible().map((i) => i.id));
    return {
      type: "FeatureCollection",
      features: snap.items.map((i) => ({ type: "Feature", properties: { id: i.id, color: B.COLORS[i.state], sel: sel.has(i.id), dim: !shown.has(i.id), crit: i.state === "Crítico" }, geometry: { type: "Point", coordinates: i.c } })),
    };
  }
  function paintMap(fit = false) {
    if (!ready) return;
    map.getSource("b").setData(geo());
    pins.forEach((m) => m.remove());
    pins = snap.items.filter((i) => i.relatos.length).map((i) => {
      const el = document.createElement("button");
      el.type = "button"; el.className = "rpin";
      el.innerHTML = `<b>${i.relatos.length}</b>`;
      el.setAttribute("aria-label", `${i.relatos.length} aviso(s) de morador em ${i.rua}`);
      el.addEventListener("click", (e) => { e.stopPropagation(); openDetail(i.id); });
      return new maplibregl.Marker({ element: el, anchor: "bottom-left", offset: [4, -4] }).setLngLat(i.c).addTo(map);
    });
    stopMarks.forEach((m) => m.remove());
    stopMarks = [];
    const os = s.os && !s.os.finished ? s.os : null;
    map.getSource("rota").setData({ type: "FeatureCollection", features: os ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: os.geom } }] : [] });
    if (os) {
      const g = document.createElement("div");
      g.className = "garage"; g.textContent = "🚚"; g.title = B.GARAGEM.nome;
      stopMarks.push(new maplibregl.Marker({ element: g }).setLngLat(B.GARAGEM.c).addTo(map));
      os.stops.forEach((id, n) => {
        const el = document.createElement("div");
        el.className = "stop" + ((os.done || []).includes(id) ? " done" : "");
        el.textContent = n + 1;
        stopMarks.push(new maplibregl.Marker({ element: el, offset: [0, -20] }).setLngLat(B.byId(id).c).addTo(map));
      });
      if (fit) {
        const xs = os.geom.map((p) => p[0]), ys = os.geom.map((p) => p[1]);
        map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 60, duration: reduced() ? 0 : 1200, maxZoom: 15 });
      }
    }
  }
  function initMap() {
    const msg = $("#map-msg");
    if (!window.maplibregl || !window.PluvialMapa) { msg.textContent = "Mapa indisponível. A fila ao lado continua funcionando."; return; }
    try {
      map = new maplibregl.Map({ container: "map", style: window.PluvialMapa.style({ terrain: false }), center: [-43.36, -21.758], zoom: 12.3, attributionControl: false, dragRotate: false, pitchWithRotate: false });
    } catch { msg.textContent = "Este navegador não conseguiu abrir o mapa."; return; }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Mapa: OpenFreeMap" }), "bottom-right");
    map.on("load", () => {
      map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      map.addSource("b", { type: "geojson", data: geo() });
      map.addSource("rota", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "rota-case", type: "line", source: "rota", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#071820", "line-width": 8, "line-opacity": 0.7 } });
      map.addLayer({ id: "rota", type: "line", source: "rota", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#f5c518", "line-width": 4, "line-dasharray": [1.5, 1.2] } });
      map.addLayer({ id: "b-halo", type: "circle", source: "b", filter: ["==", ["get", "crit"], true], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 9, 16, 20], "circle-color": "#c4412c", "circle-opacity": 0.22 } });
      map.addLayer({ id: "b", type: "circle", source: "b", paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 16, 11],
        "circle-color": ["get", "color"], "circle-opacity": ["case", ["get", "dim"], 0.25, 1],
        "circle-stroke-color": ["case", ["get", "sel"], "#f5c518", "#fbfcfc"], "circle-stroke-width": ["case", ["get", "sel"], 4, 2], "circle-stroke-opacity": ["case", ["get", "dim"], 0.3, 1],
      } });
      map.on("click", "b", (e) => openDetail(e.features[0].properties.id));
      map.on("mouseenter", "b", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "b", () => { map.getCanvas().style.cursor = ""; });
      ready = true;
      msg.classList.add("done");
      if (!(s.os && !s.os.finished)) {
        const xs = B.BUEIROS.map((b) => b.c[0]), ys = B.BUEIROS.map((b) => b.c[1]);
        map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 40, duration: 0 });
      }
      paintMap(!!(s.os && !s.os.finished));
    });
  }

  /* ----- Detalhe do bueiro ----- */
  const dlg = $("#dlg");
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-x]")) dlg.close(); });
  function chart(i) {
    const W = 560, H = 170, P = 26, n = i.pts.length, x = (k) => P + (k / (n - 1)) * (W - P - 6), y = (v) => H - 22 - (v / 100) * (H - 40);
    const past = i.pts.slice(0, 24), fut = i.pts.slice(23);
    const line = (arr, off) => arr.map((p, k) => `${k ? "L" : "M"}${x(k + off).toFixed(1)},${y(p.lv ?? 0).toFixed(1)}`).join("");
    const maxR = Math.max(4, ...hours.map((h) => h.mm));
    const rainBars = hours.map((h, k) => `<rect x="${(x(k) - 4).toFixed(1)}" y="${(H - 22 - (h.mm / maxR) * 30).toFixed(1)}" width="8" height="${((h.mm / maxR) * 30).toFixed(1)}" fill="#9bd3e0" opacity=".55"/>`).join("");
    const ticks = [0, 12, 23, 35].map((k) => `<text x="${x(k)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#4a606b">${k === 23 ? "agora" : fmtH.format(new Date(i.pts[k].t))}</text>`).join("");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Nível do bueiro nas últimas 24 horas e previsão para as próximas 12 horas">
      ${rainBars}
      <line x1="${P}" x2="${W - 6}" y1="${y(85)}" y2="${y(85)}" stroke="#c4412c" stroke-dasharray="5 4" opacity=".8"/><text x="${W - 8}" y="${y(85) - 5}" text-anchor="end" font-size="11" fill="#c4412c">transborda (85%)</text>
      <line x1="${P}" x2="${W - 6}" y1="${y(60)}" y2="${y(60)}" stroke="#d99a00" stroke-dasharray="2 4" opacity=".7"/>
      ${i.now === null ? `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#4a606b">Sem sinal do sensor</text>` : `<path d="${line(past, 0)}" fill="none" stroke="#0e2833" stroke-width="3"/><path d="${line(fut, 23)}" fill="none" stroke="#0e2833" stroke-width="3" stroke-dasharray="6 5" opacity=".75"/>`}
      <line x1="${x(23)}" x2="${x(23)}" y1="8" y2="${H - 22}" stroke="#0a1f28" opacity=".35"/>${ticks}
      ${[0, 50, 100].map((v) => `<text x="${P - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#4a606b">${v}</text>`).join("")}</svg>`;
  }
  function openDetail(id) {
    const i = snap.items.find((x) => x.id === id);
    if (!i) return;
    const all = snap.relatos.filter((r) => r.id === id);
    const hist = s.history.filter((h) => h.id === id).sort((a, b) => b.at - a.at).slice(0, 4);
    const fore = i.now === null ? `<p class="bd-fore bad">O sensor está sem sinal. Mande alguém inspecionar.</p>`
      : i.state === "Crítico" ? `<p class="bd-fore bad">Nível crítico agora: pode transbordar. Prioridade de limpeza.</p>`
      : i.full ? `<p class="bd-fore bad">Com a chuva prevista, deve passar de 85% em cerca de ${i.full} h.</p>`
      : `<p class="bd-fore">Sem risco de transbordar nas próximas 12 h com a chuva prevista (pico de ${i.peak}%).</p>`;
    dlg.innerHTML = `<div class="bd-top" style="--c:${B.COLORS[i.state]}"><button type="button" class="x" data-x aria-label="Fechar">×</button>
      <p class="eyebrow">${i.id} · ${esc(i.bairro)} · posição fictícia</p><h2 id="d-rua">${esc(i.rua)}</h2><span class="bd-badge">${i.state}${i.now === null ? "" : ` · ${i.now}%`}</span></div>
      <div class="bd-body">
        <div class="bd-nums"><div><strong>${i.now ?? "—"}${i.now === null ? "" : "%"}</strong>nível agora</div><div><strong>${i.debris}%</strong>entupimento</div><div><strong>${i.peak}%</strong>pico em 12 h</div><div><strong>${days(i.last).replace("há ", "")}</strong>última limpeza</div></div>
        ${fore}${chart(i)}
        <div class="chart-legend"><span>— nível (24 h)</span><span>- - previsão (12 h)</span><span style="color:#2a4d7a">▮ chuva por hora</span></div>
        <h3>Avisos dos moradores</h3>
        <ul class="bd-rel">${all.length ? all.map((r) => `<li>${esc(r.texto)}<small>${esc(r.origem)} · ${fmtD.format(new Date(r.at))}${r.confirma ? ` · confirmado por ${r.confirma}` : ""}${r.resolvido ? " · ✓ resolvido" : r.contestado ? " · contestado" : ""}</small></li>`).join("") : `<li>Nenhum aviso para este bueiro. <a href="comunidade.html">Avise pela comunidade</a>.</li>`}</ul>
        <h3>Histórico</h3>
        <ul class="bd-rel">${hist.length ? hist.map((h) => `<li>Limpeza ${h.ficticio ? "(registro fictício)" : "pela equipe"}<small>${fmtD.format(new Date(h.at))}${h.relatos ? ` · resolveu ${h.relatos} aviso(s)` : ""}</small></li>`).join("") : "<li>Sem limpezas registradas neste mês.</li>"}</ul>
        <div class="bd-acts">${i.offline ? "" : `<button type="button" class="a1" data-route="${id}">${sel.has(id) || s.os?.stops?.includes(id) ? "✓ Na rota de limpeza" : "Adicionar à rota"}</button>`}<button type="button" class="a2" data-clean2="${id}">Marcar como limpo agora</button></div>
      </div>`;
    if (!dlg.open) dlg.showModal();
  }
  dlg.addEventListener("click", (e) => {
    const r = e.target.closest("[data-route]"), c = e.target.closest("[data-clean2]");
    if (r) { toggleSel(r.dataset.route, !sel.has(r.dataset.route)); openDetail(r.dataset.route); }
    if (c) clean(c.dataset.clean2);
  });

  /* ----- Indicadores de baixo ----- */
  function paintStats(m) {
    const max = Math.max(1, ...m.porBairro.map((x) => x[1]));
    $("#by-bairro").innerHTML = m.porBairro.length ? m.porBairro.slice(0, 7).map(([b, n]) => `<li><span>${esc(b)}</span><span class="tube"><i style="--w:${n / max}"></i></span><b>${n}</b></li>`).join("") : "<li>Nenhum aviso ainda.</li>";
    $("#hist").innerHTML = [...s.history].sort((a, b) => b.at - a.at).slice(0, 10).map((h) => { const b = B.byId(h.id); return `<li><span>${esc(b?.rua || h.id)}<br /><small>${esc(b?.bairro || "")}${h.ficticio ? " · fictício" : ""}</small></span><small>${fmtD.format(new Date(h.at))}</small></li>`; }).join("");
  }

  function paint(info) {
    if (info) paintRain(info);
    paintKpis();
    paintRows();
    paintOS();
    paintMap();
  }

  /* ----- Início ----- */
  async function loadRain(force) {
    rain = await B.rain(force);
    compute();
  }
  addEventListener("storage", (e) => { if (/pluvial-(reports|social-v2|bueiros)/.test(e.key || "")) { s = B.load(); compute(); } });
  setInterval(() => { if (!document.hidden) loadRain(); }, 15 * 60e3);
  setInterval(() => { if (!document.hidden && !dlg.open) compute(); }, 60e3);
  loadRain();
  if (document.readyState === "complete") initMap(); else addEventListener("load", initMap);
})();
