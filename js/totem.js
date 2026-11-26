/* Tela do totem: mostra o alerta oficial da central, a rota até o abrigo, SOS, relatos e leitura em voz. */
(() => {
  const R = window.Risco, Canal = window.Canal, L = R.LEVELS;
  const $ = (s) => document.querySelector(s);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const T = R.TOTENS.find((t) => t.id === params.get("id")) || R.TOTENS[1];
  const A = R.AREAS.find((a) => a.id === T.area);
  const SH = R.ABRIGOS.find((s) => s.id === T.abrigo);
  let map = null, ready = false;
  const st = { level: 0, alert: null, connected: false, route: null, walkKm: null, speaking: false, sos: null, rep: null, seq: 0 };

  document.title = `Pluvial · Totem ${T.id}`;
  $("#t-id").textContent = `Totem ${T.id}`;
  $("#t-local").textContent = `${T.local} · ${A.nome} (fictício)`;
  $("#pick").innerHTML = R.TOTENS.map((t) => `<option value="${t.id}" ${t.id === T.id ? "selected" : ""}>${t.id} · ${R.AREAS.find((a) => a.id === t.area).nome}</option>`).join("");
  $("#pick").addEventListener("change", (e) => { location.search = "?id=" + e.target.value; });

  const fmtClock = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const tick = () => { $("#clock").textContent = fmtClock.format(new Date()); };
  tick(); setInterval(tick, 5000);

  /* ----- Distância a pé ----- */
  function km(a, b) {
    const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  const walk = () => st.walkKm ?? km(T.c, SH.c) * 1.3;
  const distTxt = () => {
    const d = walk();
    const m = d < 1 ? `${Math.round((d * 1000) / 10) * 10} m` : `${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
    return `${m} · cerca de ${Math.max(1, Math.round((d / 4.5) * 60))} min a pé`;
  };

  /* ----- Conteúdo de cada situação, em linguagem simples ----- */
  function content() {
    const lv = st.alert ?? st.level, official = st.alert !== null;
    const where = `${SH.nome.toLowerCase()} (${distTxt()})`;
    if (official && lv >= 3) return {
      lv: 3, title: "Saia agora",
      text: `Risco alto de deslizamento na encosta ${A.nome}. Vá agora para o abrigo.`,
      steps: [`Siga a rota azul até o ${where}.`, "Não volte para buscar objetos.", "Fique longe de barrancos, postes e árvores.", "Se alguém estiver preso ou ferido, toque em Pedir socorro."],
    };
    if (official) return {
      lv: 2, title: "Alerta: prepare-se para sair",
      text: `A central emitiu alerta para a encosta ${A.nome}. Esteja pronto para ir ao abrigo.`,
      steps: ["Separe documentos, remédios e carregador.", "Ajude idosos, crianças e pessoas com deficiência.", `Se a sirene tocar de novo, vá para o ${where}.`],
    };
    if (lv >= 1) return {
      lv: 1, title: "Atenção: chuva forte",
      text: `A central está acompanhando a encosta ${A.nome}. Fique atento a este totem, à sirene e ao WhatsApp.`,
      steps: ["Deixe documentos, remédios e carregador em lugar fácil.", "Evite ficar perto do barranco.", "Se notar rachaduras, estalos ou água barrenta, toque em Relatar risco."],
    };
    return {
      lv: 0, title: "Sem alerta agora",
      text: `Nenhum alerta oficial para a encosta ${A.nome} neste momento. Isso não garante que a área está segura.`,
      steps: [`Saiba onde fica o abrigo: ${where}.`, "Se notar rachaduras, estalos ou água barrenta, toque em Relatar risco.", "Em emergência, ligue 193 (Bombeiros) ou 199 (Defesa Civil)."],
    };
  }

  let lastKey = "";
  function paint() {
    const c = content(), box = $("#status");
    const color = L[c.lv].color;
    box.style.setProperty("--lc", color);
    document.documentElement.style.setProperty("--lc", color);
    box.classList.toggle("lv3", c.lv === 3 && !reduced());
    $("#s-area").textContent = `Encosta ${A.nome} · ${st.alert !== null ? "alerta oficial da central" : "acompanhamento"}`;
    $("#s-title").textContent = c.title;
    $("#s-text").textContent = c.text;
    $("#s-steps").innerHTML = c.steps.map((s) => `<li>${s}</li>`).join("");
    $("#r-name").textContent = SH.nome;
    $("#r-dist").textContent = `${distTxt()} · ${SH.vagas} vagas`;
    const key = c.title;
    if (lastKey && key !== lastKey && c.lv >= 2) alarm(c);
    lastKey = key;
    paintArea();
  }

  /* Bipe curto e leitura automática quando chega um alerta (se o navegador permitir som). */
  let audio = null;
  function alarm(c) {
    const box = $("#status");
    box.classList.remove("flash"); void box.offsetWidth;
    if (!reduced()) box.classList.add("flash");
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime;
      [0, 0.35, 0.7].forEach((d) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = 880; o.type = "square";
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.06, t + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
        o.connect(g); g.connect(audio.destination);
        o.start(t + d); o.stop(t + d + 0.3);
      });
    } catch {}
    if (navigator.userActivation?.hasBeenActive) setTimeout(() => speak(c), 1200);
  }

  /* ----- Voz: lê só as orientações oficiais desta tela, nada inventado. ----- */
  const voiceBtn = $("#b-voice");
  function speak(c = content()) {
    if (!("speechSynthesis" in window)) { $("#b-voice-t").textContent = "Voz indisponível"; return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${c.title}. ${c.text} ${c.steps.map((s, i) => `${i + 1}: ${s}`).join(" ")}`);
    u.lang = "pt-BR"; u.rate = 0.95;
    const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith("pt"));
    if (v) u.voice = v;
    u.onend = u.onerror = () => { st.speaking = false; voiceBtn.setAttribute("aria-pressed", "false"); $("#b-voice-t").textContent = "Ouvir orientações"; };
    st.speaking = true;
    voiceBtn.setAttribute("aria-pressed", "true");
    $("#b-voice-t").textContent = "Parar leitura";
    speechSynthesis.speak(u);
  }
  voiceBtn.addEventListener("click", () => {
    if (st.speaking) { speechSynthesis.cancel(); st.speaking = false; voiceBtn.setAttribute("aria-pressed", "false"); $("#b-voice-t").textContent = "Ouvir orientações"; }
    else speak();
  });

  /* ----- Conexão com a central ----- */
  const chip = $("#link");
  function connected() {
    st.connected = true;
    chip.dataset.on = "true";
    chip.textContent = "Central conectada";
  }
  function applyState(s) {
    const a = s?.areas?.find((x) => x.id === A.id);
    if (!a) return;
    st.level = a.level;
    st.alert = a.alert;
    paint();
  }
  Canal.on((m) => {
    if (m.type === "estado") { connected(); applyState(m.data); }
    if (m.type === "ack" && m.data?.totem === T.id) { connected(); onAck(m.data); }
  });
  applyState(Canal.lastState());
  Canal.send("ola", { totem: T.id });
  setTimeout(() => {
    if (st.connected) return;
    chip.dataset.on = "off";
    chip.textContent = "Sem resposta da central";
  }, 3000);

  /* ----- SOS ----- */
  const dSos = $("#dlg-sos"), dRep = $("#dlg-report");
  [dSos, dRep].forEach((d) => {
    d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
  });
  $("#b-sos").addEventListener("click", () => {
    $("#sos-pick").hidden = false; $("#sos-wait").hidden = true;
    dSos.showModal();
  });
  const SOS_TXT = {
    aguardando: ["A central recebeu seu pedido", "Fique perto do totem. Uma equipe será enviada."],
    caminho: ["Equipe de bombeiros a caminho", "Fique perto do totem e em lugar seguro."],
    atendimento: ["A equipe chegou", "Siga as orientações dos bombeiros."],
    resgatado: ["Atendimento concluído", "As pessoas foram levadas ao abrigo."],
  };
  function setSos(h, p, mode) {
    $("#sos-msg").textContent = h;
    $("#sos-sub").textContent = p;
    $("#sos-wait .spinner").className = "spinner" + (mode ? " " + mode : "");
  }
  dSos.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => {
    const req = `${T.id}-${Date.now()}`;
    st.sos = { req, kind: b.dataset.kind, state: "enviando" };
    $("#sos-pick").hidden = true; $("#sos-wait").hidden = false;
    setSos("Chamando a central…", "Fique perto do totem.");
    Canal.send("sos", { totem: T.id, req, kind: b.dataset.kind });
    setTimeout(() => {
      if (st.sos?.req !== req || st.sos.state !== "enviando") return;
      setSos("A central não respondeu", "Ligue 193 (Bombeiros). Na demonstração, abra a central em outra aba deste navegador.", "bad");
      showSosState("SOS sem resposta da central. Ligue 193.");
    }, 5000);
  }));
  function showSosState(text) {
    const el = $("#sos-state");
    el.hidden = !text;
    el.textContent = text || "";
  }

  /* ----- Relato ----- */
  $("#b-report").addEventListener("click", () => {
    $("#rep-pick").hidden = false; $("#rep-wait").hidden = true;
    dRep.showModal();
  });
  dRep.querySelectorAll("[data-tipo]").forEach((b) => b.addEventListener("click", () => {
    const req = `${T.id}-r${Date.now()}`;
    st.rep = { req, done: false };
    $("#rep-pick").hidden = true; $("#rep-wait").hidden = false;
    $("#rep-msg").textContent = "Enviando…";
    $("#rep-sub").textContent = "";
    $("#rep-wait .spinner").className = "spinner";
    Canal.send("relato", { totem: T.id, req, tipo: b.dataset.tipo });
    setTimeout(() => {
      if (st.rep?.req !== req || st.rep.done) return;
      $("#rep-msg").textContent = "A central não respondeu";
      $("#rep-sub").textContent = "Se for urgente, ligue 199 (Defesa Civil).";
      $("#rep-wait .spinner").className = "spinner bad";
    }, 5000);
  }));

  function onAck(d) {
    if (d.state === "relato" && st.rep?.req === d.req) {
      st.rep.done = true;
      $("#rep-msg").textContent = "Obrigado!";
      $("#rep-sub").textContent = "A central recebeu seu relato e vai acompanhar a encosta.";
      $("#rep-wait .spinner").className = "spinner ok";
      return;
    }
    if (st.sos?.req !== d.req || !SOS_TXT[d.state]) return;
    st.sos.state = d.state;
    const [h, p] = SOS_TXT[d.state];
    setSos(h, p, d.state === "resgatado" ? "ok" : "");
    showSosState(`Seu pedido: ${h.toLowerCase()}.`);
    if (d.state === "resgatado") setTimeout(() => showSosState(""), 15000);
  }

  /* ----- Mapa 2D com a rota ----- */
  function geo() {
    const lv = st.alert ?? st.level;
    return {
      area: { type: "FeatureCollection", features: [{ type: "Feature", properties: { color: L[lv].color }, geometry: { type: "Polygon", coordinates: [A.poly] } }] },
      route: { type: "FeatureCollection", features: st.route ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: st.route } }] : [] },
    };
  }
  function paintArea() {
    if (!ready) return;
    const g = geo();
    map.getSource("area").setData(g.area);
    map.getSource("route").setData(g.route);
  }
  function fitRoute() {
    if (!ready) return;
    const pts = [...(st.route || [T.c, SH.c]), ...A.poly];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: { top: 50, left: 50, right: 50, bottom: 130 }, duration: reduced() ? 0 : 1200 });
  }
  $("#b-route").addEventListener("click", fitRoute);

  function initMap() {
    const msg = $("#map-msg");
    if (!window.maplibregl) { msg.textContent = `Mapa indisponível. Abrigo: ${SH.nome}, ${distTxt()}.`; return; }
    try {
      map = new maplibregl.Map({ container: "map", style: window.PluvialMapa.style({ terrain: false }), center: T.c, zoom: 15, attributionControl: false, dragRotate: false, pitchWithRotate: false });
    } catch {
      msg.textContent = `Mapa indisponível. Abrigo: ${SH.nome}, ${distTxt()}.`;
      return;
    }
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Mapa: OpenFreeMap" }), "top-right");
    map.on("load", () => {
      map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      const g = geo();
      map.addSource("area", { type: "geojson", data: g.area });
      map.addSource("route", { type: "geojson", data: g.route });
      map.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.3 } });
      map.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": ["get", "color"], "line-width": 2.5 } });
      map.addLayer({ id: "route-case", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#071820", "line-width": 12 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#5ab0ff", "line-width": 7 } });
      const here = document.createElement("div");
      here.className = "here";
      here.innerHTML = "<i></i><span>Você está aqui</span>";
      new maplibregl.Marker({ element: here }).setLngLat(T.c).addTo(map);
      const sh = document.createElement("div");
      sh.className = "shel";
      sh.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" fill="currentColor"/></svg><span>Abrigo</span>`;
      new maplibregl.Marker({ element: sh }).setLngLat(SH.c).addTo(map);
      ready = true;
      msg.classList.add("done");
      paintArea();
      fitRoute();
    });
  }
  window.PluvialMapa.route(T.c, SH.c).then((r) => {
    st.route = r;
    let d = 0;
    for (let i = 0; i < r.length - 1; i++) d += km(r[i], r[i + 1]);
    if (r.length > 2) st.walkKm = d;
    paint();
    fitRoute();
  });

  paint();
  if (document.readyState === "complete") initMap(); else addEventListener("load", initMap);
})();
