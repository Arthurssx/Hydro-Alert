/* Central de risco: painel, simulação e mapa 3D (MapLibre + relevo). */
(() => {
  const R = window.Risco, L = R.LEVELS;
  const $ = (s) => document.querySelector(s);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = () => matchMedia("(min-width: 901px)").matches;
  const S = { rain: 0, real: null, touched: false, sel: null, levels: new Map(), run: null, map: null, marks: new Map() };
  const byId = (id) => R.AREAS.find((a) => a.id === id);
  const mm = (n) => Math.round(n).toLocaleString("pt-BR") + " mm";

  /* ----- Relógio e aviso ----- */
  const fmtClock = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtShort = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const tick = () => { $("#clock").textContent = fmtClock.format(new Date()); };
  tick(); setInterval(tick, 1000);
  let toastT;
  function toast(text) {
    const el = $("#toast");
    el.textContent = text; el.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 4200);
  }

  /* ----- Lista de encostas ----- */
  $("#areas").innerHTML = R.AREAS.map((a) => `<li><button type="button" class="area-btn" data-id="${a.id}" aria-pressed="false"><b>${a.id} · ${a.nome}</b><span class="lvl"></span><small></small></button></li>`).join("");
  $("#areas-n").textContent = `${R.AREAS.length} áreas`;
  const btns = new Map([...document.querySelectorAll(".area-btn")].map((b) => [b.dataset.id, b]));
  btns.forEach((b, id) => b.addEventListener("click", () => select(id)));

  /* ----- Linha do tempo ----- */
  const logEl = $("#log");
  function log(text, level = 0) {
    logEl.querySelector(".empty")?.remove();
    const li = document.createElement("li");
    li.className = "new";
    li.style.setProperty("--c", L[level].color);
    li.innerHTML = `<time>${fmtClock.format(new Date())}</time>`;
    li.append(text);
    logEl.prepend(li);
    while (logEl.children.length > 40) logEl.lastChild.remove();
  }
  const emptyLog = () => { logEl.innerHTML = `<li class="empty">Nenhuma mudança de nível ainda.</li>`; };
  emptyLog();

  /* ----- Atualização geral ----- */
  function update() {
    const counts = [0, 0, 0, 0];
    let top = 0, people = 0, hot = 0;
    for (const a of R.AREAS) {
      a.ev = R.evaluate(a, S.rain);
      const lv = a.ev.level;
      counts[lv]++; top = Math.max(top, lv);
      if (lv >= 2) { people += a.moradores; hot++; }
      const prev = S.levels.get(a.id);
      if (prev !== undefined && prev !== lv) {
        log(`${a.id} ${a.nome} ${lv > prev ? "subiu" : "baixou"} para ${L[lv].name}.`, lv);
        const b = btns.get(a.id);
        b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
      }
      S.levels.set(a.id, lv);
      const b = btns.get(a.id);
      b.style.setProperty("--c", L[lv].color);
      b.querySelector(".lvl").textContent = L[lv].name;
      b.querySelector("small").textContent = `${a.moradores} moradores · solo ${a.move.toLocaleString("pt-BR")} mm/h`;
    }
    const city = $("#city");
    city.style.setProperty("--lc", L[top].color);
    city.classList.toggle("max", top === 3);
    $("#city-level").textContent = L[top].name;
    $("#city-sub").textContent = top >= 2
      ? `${people.toLocaleString("pt-BR")} moradores em ${hot} ${hot === 1 ? "área" : "áreas"} de alerta.`
      : top === 1 ? `${counts[1]} ${counts[1] === 1 ? "encosta" : "encostas"} em atenção. Nenhuma evacuação necessária.`
      : "Nenhuma encosta acima do normal. Ausência de alerta não garante que uma área está segura.";
    $("#city-count").innerHTML = L.map((l, i) => `<li style="--c:${l.color}"><b>${counts[i]}</b>${l.name}</li>`).join("");
    paintRain();
    paintDetail();
    paintMap();
    document.dispatchEvent(new Event("central:update"));
  }

  /* ----- Chuva ----- */
  const rainEl = $("#rain");
  function paintRain() {
    $("#rain-out").textContent = mm(S.rain);
    rainEl.value = Math.round(S.rain);
    rainEl.style.setProperty("--p", (S.rain / rainEl.max) * 100 + "%");
    rainEl.setAttribute("aria-valuetext", `${mm(S.rain)} em 72 horas`);
    document.querySelectorAll("[data-rain]").forEach((b) => {
      const v = b.dataset.rain === "real" ? S.real?.mm : Number(b.dataset.rain);
      b.setAttribute("aria-pressed", String(v !== undefined && Math.round(v) === Math.round(S.rain)));
    });
  }
  rainEl.addEventListener("input", () => { S.touched = true; stopScenario(); S.rain = Number(rainEl.value); update(); });
  document.querySelectorAll("[data-rain]").forEach((b) => b.addEventListener("click", () => {
    stopScenario(); S.touched = true;
    if (b.dataset.rain === "real") {
      if (!S.real) { toast("A chuva real ainda não está disponível."); return; }
      S.rain = S.real.mm;
    } else S.rain = Number(b.dataset.rain);
    update();
  }));

  /* Soma da chuva das últimas 72 horas no ponto de referência da cidade (Open-Meteo). */
  const RAIN_CACHE = "pluvial-chuva72-v1";
  async function loadRealRain() {
    const show = (r) => {
      S.real = r;
      $("#rain-real").textContent = `Chuva real nas últimas 72h: ${mm(r.mm)} · Open-Meteo, ${fmtShort.format(new Date(r.at))}.`;
      if (!S.touched) { S.rain = r.mm; update(); } else paintRain();
    };
    try {
      const c = JSON.parse(localStorage.getItem(RAIN_CACHE));
      if (c && Date.now() - c.at < 15 * 60000 && Number.isFinite(c.mm)) return show(c);
    } catch {}
    const q = new URLSearchParams({ latitude: "-21.762", longitude: "-43.349", hourly: "precipitation", past_days: "3", forecast_days: "1", timezone: "America/Sao_Paulo", timeformat: "unixtime" });
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?" + q, { signal: ctl.signal });
      if (!res.ok) throw new Error(res.status);
      const h = (await res.json()).hourly;
      const now = Date.now() / 1000;
      let total = 0, n = 0;
      h.time.forEach((t, i) => { if (t <= now && t > now - 72 * 3600 && Number.isFinite(h.precipitation[i])) { total += h.precipitation[i]; n++; } });
      if (n < 60) throw new Error("dados incompletos");
      const r = { mm: total, at: Date.now() };
      try { localStorage.setItem(RAIN_CACHE, JSON.stringify(r)); } catch {}
      show(r);
    } catch {
      $("#rain-real").textContent = "Chuva real indisponível agora. Use o controle para simular.";
    } finally { clearTimeout(timer); }
  }

  /* ----- Detalhes da encosta ----- */
  const detail = $("#detail"), moveEl = $("#d-move");
  function km(a, b) {
    const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  function paintDetail() {
    const a = byId(S.sel);
    if (!a) return;
    const lv = a.ev.level, ab = R.ABRIGOS.find((x) => x.id === a.abrigo);
    detail.style.setProperty("--c", L[lv].color);
    $("#d-id").textContent = `${a.id} · encosta fictícia`;
    $("#d-name").textContent = a.nome;
    $("#d-level").textContent = L[lv].name;
    $("#d-action").textContent = L[lv].action;
    $("#d-facts").innerHTML = [
      [a.moradores, "moradores"],
      [a.homes.length, "casas"],
      [a.susc === "alta" ? "Alta" : "Média", "suscetibilidade"],
      [km(a.c, ab.c).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km", ab.nome.toLowerCase()],
    ].map(([v, l]) => `<li><b>${v}</b>${l}</li>`).join("");
    $("#d-reasons").innerHTML = a.ev.reasons.map((r) => `<li>${r}</li>`).join("");
    moveEl.value = a.move;
    moveEl.style.setProperty("--p", (a.move / moveEl.max) * 100 + "%");
    $("#d-move-out").textContent = a.move.toLocaleString("pt-BR") + " mm/h";
    moveEl.setAttribute("aria-valuetext", a.move.toLocaleString("pt-BR") + " milímetros por hora");
    $("#d-cracks").textContent = a.cracks;
    document.dispatchEvent(new Event("central:detail"));
  }
  moveEl.addEventListener("input", () => { stopScenario(); byId(S.sel).move = Number(moveEl.value); update(); });
  $("#d-plus").addEventListener("click", () => { stopScenario(); const a = byId(S.sel); a.cracks = Math.min(9, a.cracks + 1); update(); });
  $("#d-minus").addEventListener("click", () => { stopScenario(); const a = byId(S.sel); a.cracks = Math.max(0, a.cracks - 1); update(); });
  $("#d-close").addEventListener("click", () => select(null));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && S.sel) select(null); });

  function select(id, fly = true) {
    const prev = S.sel;
    S.sel = id;
    btns.forEach((b, k) => b.setAttribute("aria-pressed", String(k === id)));
    S.marks.forEach((m, k) => m.getElement().classList.toggle("sel", k === id));
    detail.hidden = !id;
    if (id) {
      paintDetail();
      if (fly && S.map && id !== prev) {
        const a = byId(id);
        S.map.flyTo({ center: a.c, zoom: 14.7, pitch: S.flat ? 0 : 62, bearing: -25, duration: reduced() ? 0 : 2200, essential: true, padding: wide() ? { right: 360, top: 0, bottom: 0, left: 0 } : { bottom: Math.round(innerHeight * 0.45), top: 0, left: 0, right: 0 } });
      }
    }
    paintMap();
  }

  /* ----- Cenário de temporal: a chuva sobe e a encosta Dom Bosco começa a se mover. ----- */
  const scenBtn = $("#scenario");
  function stopScenario() {
    if (!S.run) return;
    cancelAnimationFrame(S.run.raf);
    S.run = null;
    scenBtn.classList.remove("running");
    $("#scenario-t").textContent = "Rodar cenário de temporal";
  }
  scenBtn.addEventListener("click", () => {
    if (S.run) { stopScenario(); log("Cenário interrompido pelo operador."); return; }
    const r0 = S.rain, D = 14, e2 = byId("E-02"), e1 = byId("E-01"), e5 = byId("E-05");
    const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
    const at = (t) => {
      S.rain = lerp(r0, Math.max(r0, 112), t / 11);
      e2.move = Math.round(lerp(0, 18, (t - 4) / 8) * 2) / 2;
      e2.cracks = t > 9 ? 4 : t > 7.5 ? 2 : t > 6 ? 1 : 0;
      e1.move = Math.round(lerp(0, 0.5, (t - 7) / 5) * 2) / 2;
      e5.cracks = t > 8.5 ? 2 : 0;
      update();
    };
    log("Cenário de temporal iniciado (simulação).", 1);
    select("E-02");
    if (reduced()) { at(D); return; }
    scenBtn.classList.add("running");
    $("#scenario-t").textContent = "Parar cenário";
    const t0 = performance.now();
    const frame = (now) => {
      const t = (now - t0) / 1000;
      at(t);
      if (t < D) S.run.raf = requestAnimationFrame(frame);
      else { stopScenario(); toast("Dom Bosco em alerta máximo: a central deve confirmar a evacuação."); }
    };
    S.run = { raf: requestAnimationFrame(frame) };
  });

  $("#reset").addEventListener("click", () => {
    stopScenario();
    R.AREAS.forEach((a) => { a.move = 0; a.cracks = 0; });
    S.touched = false;
    S.rain = S.real ? S.real.mm : 0;
    S.levels.clear();
    document.dispatchEvent(new Event("central:reset"));
    emptyLog();
    select(null);
    update();
    if (S.map) fitCity();
    toast("Demonstração reiniciada.");
  });

  /* ----- Mapa ----- */
  const STYLE = window.PluvialMapa.style();

  const ICON = {
    abrigo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" fill="currentColor"/></svg>`,
    base: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4 0-6 1-9z" fill="currentColor"/></svg>`,
  };

  const areaGeo = () => ({
    type: "FeatureCollection",
    features: R.AREAS.map((a) => ({ type: "Feature", id: a.id, properties: { id: a.id, level: a.ev?.level ?? 0, color: L[a.ev?.level ?? 0].color, sel: a.id === S.sel }, geometry: { type: "Polygon", coordinates: [a.poly] } })),
  });
  const homeGeo = () => ({
    type: "FeatureCollection",
    features: R.AREAS.flatMap((a) => a.homes.map((h) => ({ type: "Feature", properties: { area: a.id, status: h.status || "none", me: !!h.me }, geometry: { type: "Point", coordinates: h.c } }))),
  });

  let mapReady = false, pulseRaf = 0;
  function paintMap() {
    if (!mapReady) return;
    S.map.getSource("areas").setData(areaGeo());
    let any = false;
    R.AREAS.forEach((a) => {
      const el = S.marks.get(a.id).getElement(), lv = a.ev.level;
      el.style.setProperty("--c", L[lv].color);
      el.classList.toggle("hot", lv >= 2);
      el.setAttribute("aria-label", `${a.id} ${a.nome}: ${L[lv].name}`);
      if (lv >= 2) any = true;
    });
    if (any && !pulseRaf && !reduced()) pulseRaf = requestAnimationFrame(pulse);
  }
  function pulse(now) {
    const hot = R.AREAS.some((a) => a.ev.level >= 2);
    if (!hot) { S.map.setPaintProperty("area-pulse", "fill-opacity", 0); pulseRaf = 0; return; }
    S.map.setPaintProperty("area-pulse", "fill-opacity", 0.06 + 0.24 * (0.5 + 0.5 * Math.sin(now / 420)));
    pulseRaf = requestAnimationFrame(pulse);
  }
  function fitCity() {
    const pts = [...R.AREAS.flatMap((a) => a.poly), ...R.ABRIGOS.map((s) => s.c)];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    S.map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: wide() ? { top: 80, bottom: 90, left: 60, right: S.sel ? 380 : 60 } : 40, pitch: S.flat ? 0 : 52, bearing: -18, duration: reduced() ? 0 : 1800 });
  }

  function mapFail(text) {
    const m = $("#map-msg");
    m.textContent = text;
    m.classList.add("fail");
  }

  function initMap() {
    if (!window.maplibregl) { mapFail("Não foi possível carregar o mapa. Verifique a conexão: a simulação continua funcionando no painel."); return; }
    let map;
    try {
      map = new maplibregl.Map({ container: "map", style: STYLE, center: [-43.356, -21.758], zoom: 12.3, pitch: 52, bearing: -18, maxPitch: 75, attributionControl: false, fadeDuration: 200 });
    } catch {
      mapFail("Este navegador não conseguiu abrir o mapa 3D (WebGL indisponível). A simulação continua funcionando no painel.");
      return;
    }
    S.map = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Relevo: Terrain Tiles (Mapzen/AWS) · Mapa: OpenFreeMap" }), "bottom-right");
    const timeout = setTimeout(() => { if (!mapReady) mapFail("O mapa está demorando para carregar. Verifique a conexão."); }, 20000);

    map.on("load", () => {
      clearTimeout(timeout);
      map.addSource("areas", { type: "geojson", data: areaGeo() });
      map.addSource("homes", { type: "geojson", data: homeGeo() });
      map.addLayer({ id: "area-fill", type: "fill", source: "areas", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.26 } });
      map.addLayer({ id: "area-pulse", type: "fill", source: "areas", filter: [">=", ["get", "level"], 2], paint: { "fill-color": ["get", "color"], "fill-opacity": 0 } });
      map.addLayer({ id: "area-glow", type: "line", source: "areas", filter: [">=", ["get", "level"], 2], paint: { "line-color": ["get", "color"], "line-width": 12, "line-blur": 10, "line-opacity": 0.5 } });
      map.addLayer({ id: "area-line", type: "line", source: "areas", layout: { "line-join": "round" }, paint: { "line-color": ["get", "color"], "line-width": ["case", ["get", "sel"], 3.5, 1.8] } });
      map.addLayer({ id: "homes", type: "circle", source: "homes", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 1.3, 15, 3.4, 17, 6], "circle-color": ["match", ["get", "status"], "seguro", "#4fb39a", "ajuda", "#f5c518", "presos", "#ef4b3c", "#d4e3ea"], "circle-stroke-color": ["case", ["get", "me"], "#00a884", "#0b1f28"], "circle-stroke-width": ["case", ["get", "me"], 3, 0.6], "circle-pitch-alignment": "map" } });

      R.ABRIGOS.forEach((s) => {
        const el = document.createElement("div");
        el.className = "smark";
        el.innerHTML = `${ICON.abrigo}<span class="smark-l">${s.nome} · ${s.vagas} vagas</span>`;
        el.title = `${s.nome} (fictício) · ${s.vagas} vagas`;
        new maplibregl.Marker({ element: el }).setLngLat(s.c).addTo(map);
      });
      const base = document.createElement("div");
      base.className = "bmark"; base.innerHTML = ICON.base; base.title = `${R.BASE.nome} (posição fictícia)`;
      new maplibregl.Marker({ element: base }).setLngLat(R.BASE.c).addTo(map);

      R.AREAS.forEach((a) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "amark";
        el.innerHTML = `<span class="ring">${a.id.slice(2)}</span>${a.nome}`;
        el.addEventListener("click", (e) => { e.stopPropagation(); select(a.id); });
        S.marks.set(a.id, new maplibregl.Marker({ element: el }).setLngLat(a.c).addTo(map));
      });

      map.on("click", "area-fill", (e) => select(e.features[0].properties.id));
      map.on("mouseenter", "area-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "area-fill", () => { map.getCanvas().style.cursor = ""; });

      /* Créditos começam recolhidos; nomes dos abrigos só aparecem de perto. */
      map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      const zoomCls = () => map.getContainer().classList.toggle("near", map.getZoom() >= 13.6);
      map.on("zoom", zoomCls); zoomCls();

      mapReady = true;
      paintMap();
      document.dispatchEvent(new Event("central:mapready"));
      select(S.sel, false);
      $("#map-msg").classList.add("done");
      fitCity();
    });
  }

  $("#view3d").addEventListener("click", (e) => {
    if (!mapReady) return;
    S.flat = !S.flat;
    e.currentTarget.setAttribute("aria-pressed", String(!S.flat));
    S.map.setTerrain(S.flat ? null : { source: "dem", exaggeration: 1.6 });
    S.map.easeTo({ pitch: S.flat ? 0 : 55, duration: reduced() ? 0 : 900 });
  });
  $("#viewall").addEventListener("click", () => { if (mapReady) fitCity(); });

  const refreshHomes = () => { if (mapReady) S.map.getSource("homes").setData(homeGeo()); };
  window.Central = { S, R, L, $, log, toast, update, select, byId, km, reduced, wide, fmtShort, refreshHomes, mapReady: () => mapReady };

  update();
  loadRealRain();
  if (document.readyState === "complete") initMap(); else addEventListener("load", initMap);
})();
