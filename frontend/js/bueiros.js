/* Rede de bueiros da página inicial: nível de cada bueiro com a chuva real e os relatos dos moradores.
   Os bueiros e as leituras são fictícios; as ruas são reais. A chuva vem do Open-Meteo. */
window.Bueiros = (() => {
  // Chaves do localStorage: STATE (quando a demonstração começou) e RAIN (cache da chuva).
  const STATE = "pluvial-bueiros-v1", RAIN = "pluvial-chuva-horaria-v1";
  // Os 40 bueiros fictícios: [id, bairro, rua real].
  const LIST = [
    ["B-01", "Centro", "Rua Batista de Oliveira"], ["B-02", "Centro", "Avenida Barão do Rio Branco"], ["B-03", "Centro", "Rua Santo Antônio"],
    ["B-04", "Centro", "Avenida Presidente Getúlio Vargas"], ["B-05", "Centro", "Rua Oscar Vidal"],
    ["B-06", "Manoel Honório", "Rua Carlos Gomes"], ["B-07", "Manoel Honório", "Rua Doutor Geraldo Paleta"], ["B-08", "Manoel Honório", "Rua Nossa Senhora do Líbano"], ["B-09", "Manoel Honório", "Rua Teodorico de Assis"],
    ["B-10", "São Pedro", "Avenida Senhor dos Passos"], ["B-11", "São Pedro", "Rua Dimas Bergo Xisto"], ["B-12", "São Pedro", "Rua Euclides Pezarini"], ["B-13", "São Pedro", "Rua Maria Luiza Clanzman"],
    ["B-14", "Benfica", "Rua Evaristo da Veiga"], ["B-15", "Benfica", "Rua dos Emboabas"], ["B-16", "Benfica", "Rua Diogo Álvares"],
    ["B-17", "São Mateus", "Ladeira Alexandre Leonel"], ["B-18", "São Mateus", "Rua Murilo Valle da Fonseca"], ["B-19", "São Mateus", "Rua Itajubá"], ["B-20", "São Mateus", "Rua Oscavo Gonzaga Prata"],
    ["B-21", "Santa Terezinha", "Rua Ribeiro de Abreu"], ["B-22", "Santa Terezinha", "Rua Victório Zarantonelo"], ["B-23", "Santa Terezinha", "Rua General Alberto de Matos"], ["B-24", "Santa Terezinha", "Rua Jovino Ribeiro"],
    ["B-25", "Bom Pastor", "Rua Doutor José Hemógenes Dutra"], ["B-26", "Bom Pastor", "Rua Agápio Vaz de Melo"], ["B-27", "Bom Pastor", "Avenida Presidente João Goulart"],
    ["B-28", "Dom Bosco", "Rua Arlete Bastos Magalhães"], ["B-29", "Dom Bosco", "Rua José Loures Valle"], ["B-30", "Dom Bosco", "Rua Pastor José Reis"], ["B-31", "Dom Bosco", "Rua Umberto Nery"],
    ["B-32", "Vila Ideal", "Rua Vera Consuelo Nascimento"], ["B-33", "Vila Ideal", "Rua Hottogarmini dos Reis"], ["B-34", "Vila Ideal", "Rua Jacinto Marcelino"],
    ["B-35", "Borboleta", "Rua Major Reinaldo Lawall"], ["B-36", "Borboleta", "Rua Cleveland Braga"], ["B-37", "Borboleta", "Rua Dimas Bergo Xisto"],
    ["B-38", "Linhares", "Rua Paulo Wilmar de Almeida"], ["B-39", "Linhares", "Estrada Athos Branco da Rosa"], ["B-40", "Linhares", "Rua Carlita de Assis Pereira"],
  ];
  // Bairros com bueiro, na ordem da lista (usados no formulário de relato e no ranking).
  const BAIRROS = [...new Set(LIST.map((b) => b[1]))];

  const DAY = 86400e3, HOUR = 3600e3;
  // Ler e gravar JSON no localStorage sem quebrar a página se o navegador bloquear.
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  // Número fixo calculado a partir de um texto (o mesmo bueiro sempre gera os mesmos valores).
  const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  // Limita um valor entre 0 e 100.
  const clamp = (v) => Math.max(0, Math.min(100, v));

  // Bairros com mais lixo e folhas entopem mais rápido (taxa em % por dia).
  const RATE = { "Centro": 5, "Manoel Honório": 3.5, "São Pedro": 3, "Benfica": 2.5, "São Mateus": 3, "Santa Terezinha": 3.5, "Bom Pastor": 2.5, "Dom Bosco": 4, "Vila Ideal": 3, "Linhares": 2.5, "Borboleta": 3 };
  // Bueiros fictícios que estão sem sinal do sensor.
  const OFFLINE = new Set(["B-07", "B-26"]);
  // Cada bueiro com valores fixos derivados do id: taxa de entupimento, capacidade e entupimento inicial.
  const BUEIROS = LIST.map(([id, bairro, rua]) => {
    const h = hash(id + rua);
    const rate = RATE[bairro] * (0.75 + (h % 50) / 100);
    const start = 8 + (h % 83);
    return { id, bairro, rua, rate, cap: 0.8 + ((h >> 3) % 50) / 100, offline: OFFLINE.has(id), seedDays: (start - 4) / rate };
  });

  // Momento em que a demonstração começou neste navegador (o entupimento cresce a partir dele).
  function start() {
    const s = read(STATE);
    if (s && Number.isFinite(s.start)) return s.start;
    const now = Date.now();
    write(STATE, { v: 1, start: now });
    return now;
  }

  // Chuva hora a hora (24 h passadas + 12 h de previsão) no Open-Meteo, com cache de 15 minutos.
  // Se falhar, usa o cache antigo ou chuva zero.
  async function rain() {
    const c = read(RAIN);
    if (c && Date.now() - c.at < 15 * 60e3 && Array.isArray(c.hours)) return c;
    const q = new URLSearchParams({ latitude: "-21.762", longitude: "-43.349", hourly: "precipitation", past_days: "1", forecast_days: "2", timezone: "America/Sao_Paulo", timeformat: "unixtime" });
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
    try {
      const h = (await (await fetch("https://api.open-meteo.com/v1/forecast?" + q, { signal: ctl.signal })).json()).hourly;
      const now = Date.now() / 1000;
      // Cada valor é a chuva da hora que termina em time[i].
      const idx = h.time.findIndex((x) => x >= now);
      if (idx < 24) throw new Error("dados insuficientes");
      const hours = h.time.slice(idx - 24, idx + 12).map((time, i) => ({ t: time * 1000, mm: Math.max(0, h.precipitation[idx - 24 + i] || 0) }));
      const out = { at: Date.now(), hours, real: true };
      write(RAIN, out);
      return out;
    } catch {
      if (c && Array.isArray(c.hours)) return { ...c, stale: true };
      return { at: Date.now(), hours: zero(), real: false };
    } finally { clearTimeout(t); }
  }
  // 36 horas sem chuva (usado antes da chuva real chegar ou se a busca falhar).
  const zero = () => Array.from({ length: 36 }, (_, i) => ({ t: Date.now() + (i - 23) * HOUR, mm: 0 }));
  // Chuva das 3 horas que terminam agora (a posição 23 da lista é a hora atual).
  const last3 = (hours) => hours.slice(21, 24).reduce((t, h) => t + h.mm, 0);

  // Nível (%) = entupimento × 0,8 + água da chuva das últimas 3 h. Sem sinal = null.
  function level(b, t0, rain3h) {
    if (b.offline) return null;
    const debris = clamp(4 + b.rate * ((Date.now() - (t0 - b.seedDays * DAY)) / DAY));
    return Math.round(clamp(debris * 0.8 + (rain3h * 2.2) / b.cap));
  }
  // Estado pelo nível: sem dados, Crítico (85% ou mais), Atenção (60 a 84%) ou Normal.
  const stateOf = (lv) => (lv === null ? "Sem dados" : lv >= 85 ? "Crítico" : lv >= 60 ? "Atenção" : "Normal");

  // Tira acentos e põe em minúsculas (para comparar textos).
  const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // Escolhe o bueiro citado num relato: pelo nome da rua no texto ou, se não achar, um bueiro fixo do bairro.
  function pick(bairro, text) {
    const list = BUEIROS.filter((b) => b.bairro === bairro);
    if (!list.length) return null;
    const t = norm(text);
    return list.find((b) => t.includes(norm(b.rua).replace(/^(rua|avenida|estrada|ladeira) /, ""))) || list[hash(text) % list.length];
  }

  // Situação de cada bueiro: nível agora, estado e quantos relatos dos moradores ele tem.
  function snapshot(hours, reports) {
    const t0 = start(), r3 = last3(hours);
    const count = {};
    reports.forEach((r) => { const b = pick(r.bairro, `${r.local} ${r.texto}`); if (b) count[b.id] = (count[b.id] || 0) + 1; });
    return BUEIROS.map((b) => {
      const now = level(b, t0, r3);
      return { ...b, now, state: stateOf(now), relatos: count[b.id] || 0 };
    });
  }

  // Funções públicas de window.Bueiros.
  return { BAIRROS, rain, zero, snapshot };
})();
