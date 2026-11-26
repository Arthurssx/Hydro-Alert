/* Rede de bueiros (drenagem): nível, chuva real, previsão, relatos dos moradores e ordens de serviço.
   Os bueiros e as leituras são fictícios; as ruas são reais. A chuva vem do Open-Meteo. */
window.Bueiros = (() => {
  const STATE = "pluvial-bueiros-v1", RAIN = "pluvial-chuva-horaria-v1", SNAP = "pluvial-drenagem";
  /* Base fictícia da equipe de limpeza (de onde sai a rota). */
  const GARAGEM = { nome: "Base da equipe de limpeza (fictícia)", c: [-43.3555, -21.7655] };
  const LIST = [
    ["B-01", "Centro", "Rua Batista de Oliveira", [-43.34606, -21.76387]],
    ["B-02", "Centro", "Avenida Barão do Rio Branco", [-43.34872, -21.76538]],
    ["B-03", "Centro", "Rua Santo Antônio", [-43.35093, -21.76227]],
    ["B-04", "Centro", "Avenida Presidente Getúlio Vargas", [-43.35001, -21.75751]],
    ["B-05", "Centro", "Rua Oscar Vidal", [-43.34991, -21.7652]],
    ["B-06", "Manoel Honório", "Rua Carlos Gomes", [-43.34811, -21.74245]],
    ["B-07", "Manoel Honório", "Rua Doutor Geraldo Paleta", [-43.34351, -21.7415]],
    ["B-08", "Manoel Honório", "Rua Nossa Senhora do Líbano", [-43.34435, -21.74723]],
    ["B-09", "Manoel Honório", "Rua Teodorico de Assis", [-43.34912, -21.74339]],
    ["B-10", "São Pedro", "Avenida Senhor dos Passos", [-43.39209, -21.77462]],
    ["B-11", "São Pedro", "Rua Dimas Bergo Xisto", [-43.39389, -21.77017]],
    ["B-12", "São Pedro", "Rua Euclides Pezarini", [-43.39242, -21.77019]],
    ["B-13", "São Pedro", "Rua Maria Luiza Clanzman", [-43.39475, -21.77407]],
    ["B-14", "Benfica", "Rua Evaristo da Veiga", [-43.43529, -21.69482]],
    ["B-15", "Benfica", "Rua dos Emboabas", [-43.43321, -21.69276]],
    ["B-16", "Benfica", "Rua Diogo Álvares", [-43.43249, -21.69314]],
    ["B-17", "São Mateus", "Ladeira Alexandre Leonel", [-43.35854, -21.78269]],
    ["B-18", "São Mateus", "Rua Murilo Valle da Fonseca", [-43.35845, -21.78388]],
    ["B-19", "São Mateus", "Rua Itajubá", [-43.3617, -21.77889]],
    ["B-20", "São Mateus", "Rua Oscavo Gonzaga Prata", [-43.36031, -21.78515]],
    ["B-21", "Santa Terezinha", "Rua Ribeiro de Abreu", [-43.35243, -21.73585]],
    ["B-22", "Santa Terezinha", "Rua Victório Zarantonelo", [-43.35473, -21.73387]],
    ["B-23", "Santa Terezinha", "Rua General Alberto de Matos", [-43.35417, -21.73152]],
    ["B-24", "Santa Terezinha", "Rua Jovino Ribeiro", [-43.35016, -21.73553]],
    ["B-25", "Bom Pastor", "Rua Doutor José Hemógenes Dutra", [-43.34163, -21.78112]],
    ["B-26", "Bom Pastor", "Rua Agápio Vaz de Melo", [-43.34147, -21.78255]],
    ["B-27", "Bom Pastor", "Avenida Presidente João Goulart", [-43.34033, -21.78487]],
    ["B-28", "Dom Bosco", "Rua Arlete Bastos Magalhães", [-43.37837, -21.78138]],
    ["B-29", "Dom Bosco", "Rua José Loures Valle", [-43.37582, -21.77885]],
    ["B-30", "Dom Bosco", "Rua Pastor José Reis", [-43.37513, -21.77692]],
    ["B-31", "Dom Bosco", "Rua Umberto Nery", [-43.37502, -21.7828]],
    ["B-32", "Vila Ideal", "Rua Vera Consuelo Nascimento", [-43.33303, -21.77981]],
    ["B-33", "Vila Ideal", "Rua Hottogarmini dos Reis", [-43.33635, -21.77642]],
    ["B-34", "Vila Ideal", "Rua Jacinto Marcelino", [-43.33338, -21.77537]],
    ["B-35", "Borboleta", "Rua Major Reinaldo Lawall", [-43.3902, -21.76506]],
    ["B-36", "Borboleta", "Rua Cleveland Braga", [-43.38926, -21.77065]],
    ["B-37", "Borboleta", "Rua Dimas Bergo Xisto", [-43.38801, -21.76758]],
    ["B-38", "Linhares", "Rua Paulo Wilmar de Almeida", [-43.32826, -21.7554]],
    ["B-39", "Linhares", "Estrada Athos Branco da Rosa", [-43.32173, -21.75383]],
    ["B-40", "Linhares", "Rua Carlita de Assis Pereira", [-43.33004, -21.75952]],
  ];
  const DAY = 86400e3, HOUR = 3600e3;
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

  /* Bairros com mais lixo e folhas entopem mais rápido (taxa em % por dia). */
  const RATE = { "Centro": 5, "Manoel Honório": 3.5, "São Pedro": 3, "Benfica": 2.5, "São Mateus": 3, "Santa Terezinha": 3.5, "Bom Pastor": 2.5, "Dom Bosco": 4, "Vila Ideal": 3, "Linhares": 2.5, "Borboleta": 3 };
  const OFFLINE = new Set(["B-07", "B-26"]);
  const BUEIROS = LIST.map(([id, bairro, rua, c]) => {
    const h = hash(id + rua);
    const rate = RATE[bairro] * (0.75 + (h % 50) / 100);
    const start = 8 + (h % 83); // entupimento fictício no início da demonstração
    return { id, bairro, rua, c, rate, cap: 0.8 + ((h >> 3) % 50) / 100, offline: OFFLINE.has(id), seedDays: (start - 4) / rate };
  });
  const byId = (id) => BUEIROS.find((b) => b.id === id);

  /* ----- Estado salvo: limpezas, histórico e ordem de serviço ----- */
  function load() {
    const s = read(STATE);
    if (s && s.v === 1) return s;
    /* Histórico fictício do mês para os indicadores começarem com dados. */
    const now = Date.now(), hist = [];
    for (let i = 0; i < 23; i++) {
      const b = BUEIROS[(i * 7) % BUEIROS.length];
      hist.push({ id: b.id, at: now - (2 + ((i * 37) % 26)) * DAY, tipo: "limpeza", espera: 1 + ((i * 13) % 5) + 0.5 * (i % 2), ficticio: true });
    }
    return { v: 1, start: now, clean: {}, history: hist, os: null, resolved: {} };
  }
  const save = (s) => write(STATE, s);

  /* ----- Chuva por hora (últimas 24 h e próximas 12 h) ----- */
  async function rain(force = false) {
    const c = read(RAIN);
    if (!force && c && Date.now() - c.at < 15 * 60e3 && Array.isArray(c.hours)) return c;
    const q = new URLSearchParams({ latitude: "-21.762", longitude: "-43.349", hourly: "precipitation", past_days: "1", forecast_days: "2", timezone: "America/Sao_Paulo", timeformat: "unixtime" });
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
    try {
      const h = (await (await fetch("https://api.open-meteo.com/v1/forecast?" + q, { signal: ctl.signal })).json()).hourly;
      const now = Date.now() / 1000;
      /* Cada valor é a chuva da hora que termina em time[i]. */
      const idx = h.time.findIndex((x) => x >= now);
      if (idx < 24) throw new Error("dados insuficientes");
      const hours = h.time.slice(idx - 24, idx + 12).map((time, i) => ({ t: time * 1000, mm: Math.max(0, h.precipitation[idx - 24 + i] || 0) }));
      const out = { at: Date.now(), hours, real: true };
      write(RAIN, out);
      return out;
    } catch {
      if (c) return { ...c, stale: true };
      const base = Date.now() - 24 * HOUR;
      return { at: Date.now(), hours: Array.from({ length: 36 }, (_, i) => ({ t: base + i * HOUR, mm: 0 })), real: false, failed: true };
    } finally { clearTimeout(t); }
  }
  /* Soma a chuva simulada (mm/h) da hora atual em diante. */
  function withSim(r, simMm) {
    if (!simMm) return r.hours;
    return r.hours.map((h, i) => (i >= 22 ? { ...h, mm: h.mm + simMm } : h));
  }
  const last3 = (hours, i) => hours.slice(Math.max(0, i - 2), i + 1).reduce((t, h) => t + h.mm, 0);

  /* ----- Nível de um bueiro ----- */
  function lastClean(b, s) { return s.clean[b.id] || s.start - b.seedDays * DAY; }
  function debris(b, s, at = Date.now()) { return clamp(4 + b.rate * ((at - lastClean(b, s)) / DAY)); }
  /* Nível = parte entupida + água da chuva das últimas 3 h. */
  function level(b, s, rain3h, at) {
    if (b.offline) return null;
    return Math.round(clamp(debris(b, s, at) * 0.8 + (rain3h * 2.2) / b.cap));
  }
  const stateOf = (lv) => (lv === null ? "Sem dados" : lv >= 85 ? "Crítico" : lv >= 60 ? "Atenção" : "Normal");
  const COLORS = { Crítico: "#c4412c", Atenção: "#a87400", Normal: "#1f8a63", "Sem dados": "#5d717b" };

  /* Série: 24 h para trás e 12 h para frente; e quando deve transbordar. */
  function series(b, s, hours) {
    const nowIdx = 23;
    const pts = hours.map((h, i) => ({ t: h.t, lv: level(b, s, last3(hours, i), Math.min(h.t, Date.now() + 12 * HOUR)), future: i > nowIdx }));
    const now = pts[nowIdx]?.lv ?? null;
    let full = null;
    for (let i = nowIdx + 1; i < pts.length; i++) if (pts[i].lv !== null && pts[i].lv >= 85) { full = i - nowIdx; break; }
    const peak = Math.max(...pts.slice(nowIdx).map((p) => p.lv ?? 0));
    return { pts, now, full, peak };
  }

  /* ----- Relatos dos moradores (landing e comunidade) ----- */
  const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function pick(bairro, text) {
    const list = BUEIROS.filter((b) => b.bairro === bairro);
    if (!list.length) return null;
    const t = norm(text);
    return list.find((b) => t.includes(norm(b.rua).replace(/^(rua|avenida|estrada|ladeira) /, ""))) || list[hash(text) % list.length];
  }
  function relatos(s) {
    const out = [];
    let reports = [];
    try { reports = JSON.parse(localStorage.getItem("pluvial-reports")) || []; } catch {}
    reports.forEach((r, i) => {
      const b = pick(r.bairro, `${r.local} ${r.texto}`);
      if (!b) return;
      const key = `r:${i}:${hash(r.local + r.texto)}`;
      out.push({ key, id: b.id, origem: "Relato na página inicial", texto: `${r.local}: ${r.texto}`, at: r.at || Date.parse(r.date) || s.start, confirma: 0, resolvido: s.resolved[key] || r.resolvido || null });
    });
    const C = window.Comunidade;
    if (C) {
      C.load().posts.filter((p) => !p.hidden && p.type === "aviso" && (p.sub === "bueiro" || p.sub === "alagamento")).forEach((p) => {
        const b = pick(p.bairro, p.text);
        if (!b) return;
        const key = `p:${p.id}`;
        out.push({ key, id: b.id, origem: `Comunidade · ${C.member(p.author)?.nome || "morador"}`, texto: p.text, at: p.at, confirma: (p.confirma || []).length, contestado: C.contested(p), resolvido: s.resolved[key] || p.resolvido || null, post: p.id });
      });
    }
    return out;
  }

  /* ----- Visão geral: tudo o que o painel precisa ----- */
  function snapshot(s, hours) {
    const rel = relatos(s);
    const items = BUEIROS.map((b) => {
      const sr = series(b, s, hours);
      const open = rel.filter((r) => r.id === b.id && !r.resolvido && !r.contestado);
      const score = sr.now === null ? 70 : sr.now + Math.max(0, sr.peak - sr.now) * 0.5 + open.reduce((t, r) => t + 8 + 3 * r.confirma, 0);
      return { ...b, ...sr, state: stateOf(sr.now), relatos: open, score, last: lastClean(b, s), debris: Math.round(debris(b, s)) };
    }).sort((a, b) => b.score - a.score);
    return { items, relatos: rel };
  }

  /* ----- Ordem de serviço e rota de limpeza ----- */
  const km = (a, b) => {
    const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  /* Ordena as paradas pelo vizinho mais próximo, saindo da base. */
  function order(ids) {
    const left = ids.map(byId).filter(Boolean), out = [];
    let at = GARAGEM.c;
    while (left.length) {
      left.sort((a, b) => km(at, a.c) - km(at, b.c));
      const n = left.shift();
      out.push(n.id);
      at = n.c;
    }
    return out;
  }
  async function route(ids) {
    const pts = [GARAGEM.c, ...ids.map((id) => byId(id).c)];
    let geom = pts, dist = 0, dur = 0;
    for (let i = 0; i < pts.length - 1; i++) dist += km(pts[i], pts[i + 1]) * 1.4;
    dur = (dist / 22) * 3600;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pts.map((p) => p.join(",")).join(";")}?overview=full&geometries=geojson`, { signal: ctl.signal });
      clearTimeout(t);
      const r = (await res.json()).routes?.[0];
      if (r) { geom = r.geometry.coordinates; dist = r.distance / 1000; dur = r.duration; }
    } catch {}
    return { geom, km: dist, min: Math.round(dur / 60 + ids.length * 15) };
  }

  /* Marca um bueiro como limpo e resolve os relatos ligados a ele. */
  function markClean(id, s, rel) {
    const now = Date.now();
    s.clean[id] = now;
    const open = rel.filter((r) => r.id === id && !r.resolvido);
    const espera = open.length ? Math.max(...open.map((r) => (now - r.at) / DAY)) : null;
    s.history.push({ id, at: now, tipo: "limpeza", espera, relatos: open.length });
    open.forEach((r) => { s.resolved[r.key] = now; });
    /* Avisos da comunidade e relatos da landing também ficam como resolvidos. */
    const C = window.Comunidade;
    if (C && open.some((r) => r.post)) {
      const st = C.load();
      open.filter((r) => r.post).forEach((r) => { const p = st.posts.find((x) => x.id === r.post); if (p) p.resolvido = now; });
      C.save(st);
    }
    if (open.some((r) => r.key.startsWith("r:"))) {
      try {
        const reps = JSON.parse(localStorage.getItem("pluvial-reports")) || [];
        open.filter((r) => r.key.startsWith("r:")).forEach((r) => { const i = Number(r.key.split(":")[1]); if (reps[i]) reps[i].resolvido = now; });
        localStorage.setItem("pluvial-reports", JSON.stringify(reps));
      } catch {}
    }
    if (s.os) s.os.done = [...new Set([...(s.os.done || []), id])];
    save(s);
    return open.length;
  }

  /* ----- Indicadores ----- */
  function metrics(s, rel) {
    const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
    const month = s.history.filter((h) => h.at >= m0.getTime() && h.tipo === "limpeza");
    const waits = s.history.filter((h) => h.espera != null).map((h) => h.espera);
    const byB = {};
    rel.forEach((r) => { const b = byId(r.id)?.bairro; if (b) byB[b] = (byB[b] || 0) + 1; });
    return {
      limposMes: month.length,
      esperaMedia: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null,
      abertos: rel.filter((r) => !r.resolvido && !r.contestado).length,
      porBairro: Object.entries(byB).sort((a, b) => b[1] - a[1]),
    };
  }

  /* ----- Resumo para a central e para a página inicial ----- */
  function publish(snap, info) {
    const crit = snap.items.filter((i) => i.state === "Crítico");
    const by = {};
    crit.forEach((i) => { by[i.bairro] = (by[i.bairro] || 0) + 1; });
    /* Risco de alagamento: 2 ou mais bueiros críticos no mesmo bairro. */
    const bairros = Object.entries(by).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([b, n]) => ({ bairro: b, criticos: n }));
    const out = { at: Date.now(), criticos: crit.map((i) => ({ id: i.id, bairro: i.bairro, rua: i.rua, c: i.c, lv: i.now })), atencao: snap.items.filter((i) => i.state === "Atenção").length, bairros, last3: info.last3, next6: info.next6, sim: info.sim || 0 };
    write(SNAP, out);
    window.Canal?.send("drenagem", out);
    return out;
  }
  const lastPublished = () => read(SNAP);

  return { BUEIROS, GARAGEM, COLORS, byId, load, save, rain, withSim, last3, series, stateOf, relatos, snapshot, order, route, markClean, metrics, publish, lastPublished, km };
})();
