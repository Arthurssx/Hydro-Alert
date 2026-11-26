/* Resposta: disparo do alerta, sirene, WhatsApp simulado, quem está seguro e envio de bombeiros.
   Tudo é simulação: nenhuma mensagem real é enviada e nenhuma sirene real é acionada. */
(() => {
  const C = window.Central;
  if (!C) return;
  const { S, R, L, $, log, toast, byId, km, reduced, fmtShort } = C;
  const TEAMS = 3;
  const ALERTS = new Map(); // área -> { at, level, timers, route, siren }
  const REQ = []; // pedidos de ajuda
  let free = TEAMS, sound = true, audio = null, phoneArea = null, seq = 0, layers = false;

  const homeNo = (h) => Number(h.id.split("-").pop()) + 1;
  /* "a casa 12" ou "o totem T-02" (pedidos feitos no totem não têm casa). */
  const place = (h) => (h.totem ? `o totem ${h.totem}` : `a casa ${homeNo(h)}`);
  const placeShort = (h) => (h.totem ? `totem ${h.totem}` : `casa ${homeNo(h)}`);
  const who = (h) => (h.totem ? "pessoas no totem" : `${h.pessoas} pessoas`);
  const shelterOf = (a) => R.ABRIGOS.find((x) => x.id === a.abrigo);
  const dist = (a, b) => km(a, b).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const KIND = { ajuda: "Precisa de ajuda para sair", presos: "Pessoas presas ou feridas" };
  const TRUCK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 6h11v9h1V9h4l4 4v4h-2a2.5 2.5 0 0 1-5 0H9a2.5 2.5 0 0 1-5 0H2z" fill="currentColor"/></svg>`;

  /* Um morador fictício por área "segura" o celular da demonstração. */
  R.AREAS.forEach((a) => { a.homes[Math.min(7, a.homes.length - 1)].me = true; });

  /* ----- Som da sirene (Web Audio, curto e baixo) ----- */
  const soundBtn = $("#sound");
  soundBtn.addEventListener("click", () => {
    sound = !sound;
    soundBtn.setAttribute("aria-pressed", String(sound));
    soundBtn.textContent = sound ? "Som ligado" : "Som desligado";
  });
  function sirenSound() {
    if (!sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = "triangle";
      for (let i = 0; i < 4; i++) {
        o.frequency.setValueAtTime(600, t + i);
        o.frequency.linearRampToValueAtTime(1100, t + i + 0.5);
        o.frequency.linearRampToValueAtTime(600, t + i + 1);
      }
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.15);
      g.gain.setValueAtTime(0.08, t + 3.7);
      g.gain.linearRampToValueAtTime(0, t + 4);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + 4.1);
    } catch {}
  }

  /* ----- Rotas pelas ruas (OSRM público); sem resposta, usa linha reta. ----- */
  const routeCache = new Map();
  async function route(from, to) {
    const key = from.join() + ";" + to.join();
    if (routeCache.has(key)) return routeCache.get(key);
    let coords = [from, to];
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`, { signal: ctl.signal });
      if (res.ok) {
        const g = (await res.json()).routes?.[0]?.geometry?.coordinates;
        if (g && g.length > 1) coords = [from, ...g, to];
      }
    } catch {} finally { clearTimeout(timer); }
    routeCache.set(key, coords);
    return coords;
  }

  /* ----- Camadas do mapa ----- */
  const fc = (features) => ({ type: "FeatureCollection", features });
  function initLayers() {
    if (layers || !C.mapReady()) return;
    const map = S.map;
    map.addSource("routes", { type: "geojson", data: fc([]) });
    map.addSource("help", { type: "geojson", data: fc([]) });
    map.addLayer({ id: "route-case", type: "line", source: "routes", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#071820", "line-width": 8, "line-opacity": 0.75 } }, "homes");
    map.addLayer({ id: "route-line", type: "line", source: "routes", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": ["get", "color"], "line-width": 4, "line-dasharray": [0, 4, 3] } }, "homes");
    map.addLayer({ id: "help-ring", type: "circle", source: "help", paint: { "circle-radius": 12, "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 2.5, "circle-stroke-color": ["match", ["get", "kind"], "presos", "#ef4b3c", "#f5c518"], "circle-pitch-alignment": "map" } });
    R.TOTENS.forEach((t) => {
      const el = document.createElement("a");
      el.className = "tmark";
      el.href = `totem.html?id=${t.id}`;
      el.target = "_blank";
      el.rel = "noopener";
      el.textContent = "T";
      el.title = `Totem ${t.id} · ${t.local} (fictício). Clique para abrir a tela do totem.`;
      new maplibregl.Marker({ element: el }).setLngLat(t.c).addTo(map);
    });
    layers = true;
    paintAll();
  }
  function paintRoutes() {
    if (!layers) return;
    const lines = [];
    ALERTS.forEach((st) => { if (st.route) lines.push({ type: "Feature", properties: { color: "#9bd3e0" }, geometry: { type: "LineString", coordinates: st.route } }); });
    REQ.forEach((r) => { if (r.state === "caminho" && r.path) lines.push({ type: "Feature", properties: { color: "#ff8a7d" }, geometry: { type: "LineString", coordinates: r.path } }); });
    S.map.getSource("routes").setData(fc(lines));
    S.map.getSource("help").setData(fc(REQ.filter((r) => r.state !== "resgatado").map((r) => ({ type: "Feature", properties: { kind: r.kind }, geometry: { type: "Point", coordinates: r.home.c } }))));
  }

  /* Animação: tracejado andando na rota e anel pulsando nos pedidos de ajuda. */
  const DASH = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]];
  let raf = 0, step = 0, last = 0;
  function loop(now) {
    raf = 0;
    if (!layers || !(ALERTS.size || REQ.length)) return;
    if (now - last > 70) {
      last = now;
      step = (step + 1) % DASH.length;
      S.map.setPaintProperty("route-line", "line-dasharray", DASH[step]);
      const k = 0.5 + 0.5 * Math.sin(now / 280);
      S.map.setPaintProperty("help-ring", "circle-radius", 9 + 11 * k);
      S.map.setPaintProperty("help-ring", "circle-stroke-opacity", 1 - 0.8 * k);
    }
    raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && layers && !reduced()) raf = requestAnimationFrame(loop); };

  /* ----- Disparo do alerta ----- */
  function fire(id) {
    const a = byId(id);
    if (!a || ALERTS.has(id) || a.ev.level < 2) return;
    const st = { at: Date.now(), level: a.ev.level, timers: [], route: null, siren: null };
    ALERTS.set(id, st);
    a.homes.forEach((h) => { h.status = "none"; });
    log(`Operador confirmou ${L[st.level].name.toLowerCase()} em ${a.id} ${a.nome}. Sirene e WhatsApp disparados para ${a.moradores} moradores.`, 3);
    sirenSound();
    if (C.mapReady() && window.maplibregl) {
      const el = document.createElement("div");
      el.className = "siren";
      el.innerHTML = "<i></i><i></i><i></i><b>!</b>";
      st.siren = new maplibregl.Marker({ element: el }).setLngLat([a.c[0], a.c[1] + 0.0032]).addTo(S.map);
    }
    route(a.c, shelterOf(a).c).then((c) => { if (ALERTS.get(id) === st) { st.route = c; paintRoutes(); } });
    /* Respostas simuladas dos outros moradores ao longo de ~25 segundos. */
    a.homes.forEach((h) => {
      if (h.me) return;
      const p = Math.random();
      const kind = p < 0.76 ? "seguro" : p < 0.84 ? "ajuda" : p < 0.87 ? "presos" : null;
      if (kind) st.timers.push(setTimeout(() => setHome(h, kind), reduced() ? 300 : 1500 + Math.random() * 23000));
    });
    openPhone(a);
    C.refreshHomes();
    paintAll();
    kick();
    toast(`Alerta disparado para ${a.nome}.`);
  }

  function endAlert(id) {
    const st = ALERTS.get(id), a = byId(id);
    if (!st) return;
    st.timers.forEach(clearTimeout);
    st.siren?.remove();
    ALERTS.delete(id);
    for (let i = REQ.length - 1; i >= 0; i--) if (REQ[i].area === a) { dropReq(REQ[i]); REQ.splice(i, 1); }
    a.homes.forEach((h) => { h.status = "none"; });
    if (phoneArea === id) closePhone(true);
    log(`Alerta encerrado em ${a.id} ${a.nome}.`, a.ev.level);
    C.refreshHomes();
    paintAll();
  }
  function dropReq(r) {
    clearTimeout(r.timer);
    if (r.state === "caminho" || r.state === "atendimento") free++;
    r.state = "cancelado";
    r.marker?.remove();
  }

  /* ----- Respostas dos moradores ----- */
  function setHome(h, status) {
    const a = byId(h.area);
    if (!ALERTS.has(a.id) || h.status === status) return;
    h.status = status;
    if (status === "ajuda" || status === "presos") {
      const open = REQ.find((r) => r.home === h && r.state !== "resgatado");
      if (open) { if (status === "presos") open.kind = "presos"; }
      else {
        REQ.push({ id: ++seq, home: h, area: a, kind: status, at: Date.now(), state: "aguardando" });
        log(`${KIND[status]}: casa ${homeNo(h)} em ${a.nome}, ${h.pessoas} pessoas.`, status === "presos" ? 3 : 2);
      }
    }
    C.refreshHomes();
    paintAll();
    kick();
  }

  /* ----- Bombeiros ----- */
  function send(id) {
    const r = REQ.find((x) => x.id === id);
    if (!r || r.state !== "aguardando" || !free) return;
    free--;
    r.state = "caminho";
    log(`Equipe enviada para ${place(r.home)} em ${r.area.nome}.`, 2);
    ack(r);
    paintAll();
    if (!(C.mapReady() && window.maplibregl)) { r.timer = setTimeout(() => arrive(r), 4000); return; }
    const el = document.createElement("div");
    el.className = "truck";
    el.innerHTML = TRUCK;
    el.title = "Equipe de bombeiros (simulação)";
    r.marker = new maplibregl.Marker({ element: el }).setLngLat(R.BASE.c).addTo(S.map);
    const xs = [R.BASE.c[0], r.home.c[0]], ys = [R.BASE.c[1], r.home.c[1]];
    S.map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: C.wide() ? { top: 90, bottom: 90, left: 360, right: S.sel ? 400 : 90 } : 50, maxZoom: 15, duration: reduced() ? 0 : 1400 });
    route(R.BASE.c, r.home.c).then((path) => {
      if (r.state !== "caminho") return;
      r.path = path;
      paintRoutes();
      const seg = [];
      let total = 0;
      for (let i = 0; i < path.length - 1; i++) { const d = km(path[i], path[i + 1]); seg.push(d); total += d; }
      const dur = reduced() ? 0 : Math.min(11000, Math.max(4500, total * 2200)), t0 = performance.now();
      const move = (now) => {
        if (r.state !== "caminho") return;
        const f = dur ? Math.min(1, (now - t0) / dur) : 1;
        let left = f * total, i = 0;
        while (i < seg.length - 1 && left > seg[i]) { left -= seg[i]; i++; }
        const p = path[i], q = path[i + 1], u = seg[i] ? Math.min(1, left / seg[i]) : 1;
        r.marker.setLngLat([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]);
        if (f < 1) requestAnimationFrame(move); else arrive(r);
      };
      requestAnimationFrame(move);
    });
  }
  function arrive(r) {
    if (r.state !== "caminho") return;
    r.state = "atendimento";
    r.marker?.getElement().classList.add("work");
    log(`Equipe chegou ${r.home.totem ? `ao totem ${r.home.totem}` : `à casa ${homeNo(r.home)}`} em ${r.area.nome}.`, 2);
    ack(r);
    paintAll();
    r.timer = setTimeout(() => {
      r.state = "resgatado";
      r.home.status = "seguro";
      free++;
      const el = r.marker?.getElement();
      if (el) { el.classList.add("gone"); setTimeout(() => r.marker.remove(), 600); }
      log(`${r.home.totem ? `Pessoas do totem ${r.home.totem}` : `${r.home.pessoas} pessoas da casa ${homeNo(r.home)}`} levadas ao abrigo ${shelterOf(r.area).nome.toLowerCase()}.`, 0);
      ack(r);
      if (r.home.me && phoneArea === r.area.id) bot("A equipe chegou e levou vocês ao abrigo. Fiquem lá até a liberação da Defesa Civil.");
      C.refreshHomes();
      paintAll();
      r.timer = setTimeout(() => { const i = REQ.indexOf(r); if (i >= 0) { REQ.splice(i, 1); paintAll(); } }, 10000);
    }, reduced() ? 300 : 4000);
  }

  /* ----- Celular simulado ----- */
  const phone = $("#phone"), chat = $("#chat"), phoneOpen = $("#phone-open");
  const replyBtns = [...document.querySelectorAll("#replies button")];
  function msg(side, html) {
    chat.querySelector(".typing")?.remove();
    const el = document.createElement("div");
    el.className = "msg " + side;
    el.innerHTML = `${html}<time>${fmtShort.format(new Date())}${side === "out" ? " ✓✓" : ""}</time>`;
    chat.append(el);
    chat.scrollTop = chat.scrollHeight;
  }
  function typing() {
    const el = document.createElement("div");
    el.className = "typing";
    el.innerHTML = "<i></i><i></i><i></i>";
    chat.append(el);
    chat.scrollTop = chat.scrollHeight;
  }
  function bot(html) {
    if (phone.hidden && !phoneArea) return;
    typing();
    setTimeout(() => msg("in", html), reduced() ? 0 : 900);
  }
  function openPhone(a) {
    phoneArea = a.id;
    const me = a.homes.find((h) => h.me), ab = shelterOf(a), lv = ALERTS.get(a.id).level;
    $("#phone-who").textContent = `Celular de um morador da casa ${homeNo(me)} · ${a.nome} (fictício)`;
    chat.innerHTML = "";
    replyBtns.forEach((b) => { b.disabled = false; });
    phone.hidden = false;
    phoneOpen.hidden = true;
    const head = lv >= 3 ? "⚠️ <strong>ALERTA MÁXIMO · risco de deslizamento</strong>" : "⚠️ <strong>ALERTA · risco de deslizamento</strong>";
    const what = lv >= 3
      ? "Saia de casa agora. Leve documentos, remédios e carregador. Não volte para buscar objetos."
      : "Prepare-se para sair. Separe documentos, remédios e carregador e fique longe do barranco.";
    typing();
    setTimeout(() => msg("in", `${head}\nÁrea: encosta ${a.nome}\n\n${what}\n\n🏫 Abrigo mais próximo: ${ab.nome}, a ${dist(me.c, ab.c)} km (${ab.vagas} vagas).\nRota segura: <a href="#" data-route>ver no mapa</a>\n\nResponda:\n1 · Estou seguro\n2 · Preciso de ajuda para sair\n3 · Tem gente presa ou ferida`), reduced() ? 0 : 1100);
  }
  function closePhone(forget = false) {
    phone.hidden = true;
    if (forget) phoneArea = null;
    phoneOpen.hidden = !phoneArea;
  }
  $("#phone-close").addEventListener("click", () => closePhone());
  phoneOpen.addEventListener("click", () => { phone.hidden = false; phoneOpen.hidden = true; });
  chat.addEventListener("click", (e) => {
    if (!e.target.closest("[data-route]")) return;
    e.preventDefault();
    const st = ALERTS.get(phoneArea);
    if (!st?.route || !C.mapReady()) return;
    const xs = st.route.map((p) => p[0]), ys = st.route.map((p) => p[1]);
    S.map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: C.wide() ? { top: 90, bottom: 90, left: 360, right: S.sel ? 400 : 90 } : 50, maxZoom: 16, duration: reduced() ? 0 : 1400 });
  });
  const BOT = {
    seguro: "Obrigado! Você foi marcado como <strong>seguro</strong>. Fique no abrigo até a Defesa Civil liberar a volta.",
    ajuda: "Recebemos seu pedido. Uma equipe vai até você. Enquanto isso, fique no ponto mais alto e longe do barranco. Mantenha o celular ligado.",
    presos: "Pedido de <strong>resgate prioritário</strong> enviado à central. Não tente remover escombros sozinho. Se puder, fique em um cômodo longe da encosta.",
  };
  replyBtns.forEach((b) => b.addEventListener("click", () => {
    const a = byId(phoneArea);
    if (!a || !ALERTS.has(a.id)) return;
    const kind = b.dataset.r, me = a.homes.find((h) => h.me);
    msg("out", b.textContent.trim().replace(/^(\d)\s*/, "$1 · "));
    replyBtns.forEach((x) => { x.disabled = true; });
    setTimeout(() => {
      bot(BOT[kind]);
      setHome(me, kind);
      setTimeout(() => replyBtns.forEach((x) => { x.disabled = false; }), 1200);
    }, reduced() ? 0 : 500);
  }));

  /* ----- Pintura do painel ----- */
  const ago = (t) => {
    const s = Math.round((Date.now() - t) / 1000);
    return s < 10 ? "agora" : s < 60 ? `há ${s} s` : `há ${Math.round(s / 60)} min`;
  };
  const ORDER = { aguardando: 0, caminho: 1, atendimento: 2, resgatado: 3 };
  function paintReqs() {
    const box = $("#help");
    box.hidden = !(ALERTS.size || REQ.length);
    $("#teams").textContent = `${free} de ${TEAMS} equipes livres`;
    const list = REQ.filter((r) => r.state !== "cancelado").sort((x, y) => ORDER[x.state] - ORDER[y.state] || (x.kind === "presos" ? -1 : 0) - (y.kind === "presos" ? -1 : 0) || x.at - y.at);
    $("#reqs").innerHTML = list.length ? list.map((r) => {
      const action = r.state === "aguardando"
        ? `<button type="button" class="go" data-req="${r.id}" ${free ? "" : "disabled"}>${free ? "Enviar equipe" : "Sem equipe livre"}</button>`
        : `<span class="st">${r.state === "caminho" ? "Equipe a caminho" : r.state === "atendimento" ? "Em atendimento" : "Resgatado ✓"}</span>`;
      return `<li class="${r.kind}${r.state === "resgatado" ? " done" : ""}"><b>${r.kind === "presos" ? "Presos ou feridos" : "Ajuda para sair"} · ${placeShort(r.home)}</b><small>${r.area.nome} · ${who(r.home)} · ${ago(r.at)}</small>${action}</li>`;
    }).join("") : `<li class="empty">Nenhum pedido ainda. As respostas dos moradores aparecem aqui.</li>`;
  }
  function paintDetail() {
    const a = byId(S.sel);
    if (!a) return;
    const st = ALERTS.get(a.id), lv = a.ev.level;
    $("#d-dispatch").hidden = !!st;
    $("#d-evac").hidden = !st;
    if (!st) {
      const fireBtn = $("#d-fire");
      fireBtn.disabled = lv < 2;
      fireBtn.classList.toggle("ready", lv >= 2);
      $("#d-fire-note").textContent = lv < 2
        ? "O disparo fica liberado a partir do nível Alerta. Quem decide é sempre um operador da central."
        : `Toca a sirene da comunidade e envia WhatsApp para os ${a.moradores} moradores cadastrados, com o abrigo e a rota.`;
      return;
    }
    const sum = { seguro: 0, ajuda: 0, presos: 0, none: 0 };
    a.homes.forEach((h) => { sum[h.status || "none"] += h.pessoas; });
    const total = Object.values(sum).reduce((x, y) => x + y, 0) || 1;
    const bar = $("#d-evac-bar");
    bar.querySelector(".s").style.width = (sum.seguro / total) * 100 + "%";
    bar.querySelector(".h").style.width = (sum.ajuda / total) * 100 + "%";
    bar.querySelector(".p").style.width = (sum.presos / total) * 100 + "%";
    $("#d-evac-since").textContent = `disparado às ${fmtShort.format(new Date(st.at))}`;
    $("#d-evac-n").innerHTML = [[sum.seguro, "pessoas seguras", L[0].color], [sum.ajuda, "pedem ajuda", L[1].color], [sum.presos, "presas ou feridas", L[3].color], [sum.none, "sem resposta", "#d4e3ea"]]
      .map(([n, t, c]) => `<li style="--c:${c}"><b>${n}</b>${t}</li>`).join("");
  }
  function paintAll() {
    publish();
    paintReqs();
    paintDetail();
    paintRoutes();
    document.querySelectorAll(".legend .hl").forEach((li) => { li.hidden = !ALERTS.size; });
    document.querySelectorAll(".area-btn").forEach((b) => b.classList.toggle("sent", ALERTS.has(b.dataset.id)));
  }

  function resetAll() {
    [...ALERTS.keys()].forEach((id) => { const st = ALERTS.get(id); st.timers.forEach(clearTimeout); st.siren?.remove(); });
    ALERTS.clear();
    REQ.forEach(dropReq);
    REQ.length = 0;
    free = TEAMS;
    R.AREAS.forEach((a) => a.homes.forEach((h) => { h.status = "none"; }));
    closePhone(true);
    C.refreshHomes();
    paintAll();
  }

  /* ----- Canal com os totens ----- */
  const Canal = window.Canal;
  function ack(r) { if (r.home.totem && Canal) Canal.send("ack", { req: r.totemReq, totem: r.home.totem, state: r.state }); }
  let pubT = 0;
  function publish() {
    if (!Canal) return;
    clearTimeout(pubT);
    pubT = setTimeout(() => {
      const state = { rain: S.rain, areas: R.AREAS.map((a) => ({ id: a.id, level: a.ev.level, alert: ALERTS.has(a.id) ? ALERTS.get(a.id).level : null, reasons: a.ev.reasons })) };
      Canal.saveState(state);
      Canal.send("estado", state);
    }, 150);
  }
  Canal?.on((m) => {
    const d = m.data || {}, t = R.TOTENS.find((x) => x.id === d.totem);
    /* Aviso de sinal de deslizamento publicado na comunidade. */
    if (m.type === "relato" && d.origem === "comunidade") {
      const a = byId(d.area);
      if (!a) return;
      a.cracks = Math.min(9, a.cracks + 1);
      log(`Aviso da comunidade (${a.nome}): ${d.tipo}.`, 1);
      toast(`Novo aviso da comunidade em ${a.nome}.`);
      Canal.send("ack", { req: d.req, origem: "comunidade", state: "relato" });
      C.update();
      return;
    }
    if (!t) return;
    const a = byId(t.area);
    if (m.type === "ola") publish();
    if (m.type === "sos" && (d.kind === "ajuda" || d.kind === "presos")) {
      const home = { id: `${t.id}-sos-${d.req}`, totem: t.id, area: a.id, c: t.c, pessoas: 0, status: d.kind };
      const r = { id: ++seq, home, area: a, kind: d.kind, at: Date.now(), state: "aguardando", totemReq: d.req };
      REQ.push(r);
      log(`SOS no totem ${t.id} (${t.local}, ${a.nome}): ${KIND[d.kind].toLowerCase()}.`, 3);
      toast(`SOS recebido do totem ${t.id}.`);
      Canal.send("ack", { req: d.req, totem: t.id, state: "aguardando" });
      paintAll();
      kick();
    }
    if (m.type === "relato") {
      a.cracks = Math.min(9, a.cracks + 1);
      log(`Relato no totem ${t.id} (${a.nome}): ${d.tipo}.`, 1);
      toast(`Novo relato do totem ${t.id}: ${d.tipo}.`);
      Canal.send("ack", { req: d.req, totem: t.id, state: "relato" });
      C.update();
    }
  });

  $("#d-fire").addEventListener("click", () => fire(S.sel));
  $("#d-end").addEventListener("click", () => endAlert(S.sel));
  $("#reqs").addEventListener("click", (e) => { const b = e.target.closest("[data-req]"); if (b) send(Number(b.dataset.req)); });
  document.addEventListener("central:update", paintAll);
  document.addEventListener("central:detail", paintDetail);
  document.addEventListener("central:reset", resetAll);
  document.addEventListener("central:mapready", initLayers);
  setInterval(() => { if (REQ.length) paintReqs(); }, 5000);
  initLayers();
  paintAll();
})();
