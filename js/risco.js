/* Dados fictícios das encostas e regras de risco de deslizamento. Sem dependências.
   Os limiares são inventados para a demonstração. Na vida real, quem define é a
   Defesa Civil, com base em estudos geotécnicos e nos critérios do Cemaden. */
window.Risco = (() => {
  const LEVELS = [
    { name: "Observação", color: "#4fb39a", action: "Acompanhar chuva e sensores." },
    { name: "Atenção", color: "#f5c518", action: "Preparar equipes e avisar os moradores para ficarem atentos." },
    { name: "Alerta", color: "#f28a2e", action: "Moradores devem se preparar para sair. Abrigo de prontidão." },
    { name: "Alerta máximo", color: "#ef4b3c", action: "Evacuação imediata da área." },
  ];

  /* Chuva acumulada em 72h (mm) para chegar a Atenção, Alerta e Alerta máximo. */
  const RAIN = { alta: [50, 90, 140], media: [70, 120, 180] };
  /* Movimento da encosta medido pelo sensor de inclinação (mm/h). */
  const MOVE = [1, 5, 15];
  const CRACKS = 3;

  const AREAS = [
    { id: "E-01", nome: "Santa Terezinha", c: [-43.3585, -21.7335], r: 360, ang: 35, susc: "alta", moradores: 180, abrigo: "A-01" },
    { id: "E-02", nome: "Dom Bosco", c: [-43.3735, -21.7800], r: 420, ang: -20, susc: "alta", moradores: 240, abrigo: "A-02" },
    { id: "E-03", nome: "Vila Ideal", c: [-43.3335, -21.7765], r: 330, ang: 60, susc: "media", moradores: 150, abrigo: "A-03" },
    { id: "E-04", nome: "Linhares", c: [-43.3150, -21.7525], r: 300, ang: 10, susc: "media", moradores: 120, abrigo: "A-04" },
    { id: "E-05", nome: "Borboleta", c: [-43.3880, -21.7690], r: 310, ang: -50, susc: "alta", moradores: 90, abrigo: "A-02" },
  ];
  const ABRIGOS = [
    { id: "A-01", nome: "Escola municipal", c: [-43.3520, -21.7390], vagas: 220 },
    { id: "A-02", nome: "Ginásio poliesportivo", c: [-43.3790, -21.7735], vagas: 380 },
    { id: "A-03", nome: "Centro comunitário", c: [-43.3405, -21.7720], vagas: 160 },
    { id: "A-04", nome: "Escola estadual", c: [-43.3230, -21.7485], vagas: 180 },
  ];
  const BASE = { nome: "Quartel dos bombeiros", c: [-43.3480, -21.7600] };

  const pick = (v, t) => (v >= t[2] ? 3 : v >= t[1] ? 2 : v >= t[0] ? 1 : 0);
  const mm = (n) => Math.round(n).toLocaleString("pt-BR") + " mm";

  /* Devolve o nível (0 a 3) e os motivos, em linguagem simples. */
  function evaluate(area, rain72) {
    const t = RAIN[area.susc];
    const r = pick(rain72, t), m = pick(area.move, MOVE);
    const reasons = [];
    if (r) reasons.push(`Chuva de ${mm(rain72)} em 72h. Nesta encosta, atenção começa em ${mm(t[0])}.`);
    if (m) reasons.push(`Sensor de inclinação marca ${area.move.toLocaleString("pt-BR")} mm/h de movimento do solo.`);
    let level = Math.max(r, m);
    if (r && m && level < 3) { level++; reasons.push("Chuva e movimento do solo ao mesmo tempo: o nível sobe um grau."); }
    if (area.cracks >= CRACKS) {
      if (level < 3) level++;
      reasons.push(`${area.cracks} moradores relataram rachaduras ou árvores inclinando.`);
    } else if (area.cracks) reasons.push(`${area.cracks} ${area.cracks === 1 ? "relato" : "relatos"} de rachadura. A partir de ${CRACKS}, o nível sobe.`);
    if (!reasons.length) reasons.push("Chuva e sensores dentro do normal.");
    return { level, reasons };
  }

  /* Gerador pseudoaleatório com semente: o desenho das áreas é sempre o mesmo. */
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const M = 111320;
  /* Contorno irregular e alongado, como uma encosta. */
  function blob(area, seed) {
    const rnd = rng(seed), k = Math.cos((area.c[1] * Math.PI) / 180), a = (area.ang * Math.PI) / 180;
    const amp = [0, 0, 0].map(() => 0.05 + rnd() * 0.12), ph = [0, 0, 0].map(() => rnd() * 6.283);
    const pts = [];
    for (let i = 0; i < 28; i++) {
      const t = (i / 28) * 6.283;
      const rr = 1 + amp[0] * Math.sin(2 * t + ph[0]) + amp[1] * Math.sin(3 * t + ph[1]) + amp[2] * Math.sin(5 * t + ph[2]);
      const x = Math.cos(t) * area.r * 1.45 * rr, y = Math.sin(t) * area.r * 0.72 * rr;
      pts.push([area.c[0] + (x * Math.cos(a) - y * Math.sin(a)) / (M * k), area.c[1] + (x * Math.sin(a) + y * Math.cos(a)) / M]);
    }
    pts.push(pts[0]);
    return pts;
  }
  function inside([x, y], poly) {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }
  /* Uma casa fictícia para cada 5 moradores, espalhada dentro da área. */
  function homes(area, poly, seed) {
    const rnd = rng(seed * 7 + 3), xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const out = [], n = Math.round(area.moradores / 5);
    for (let tries = 0; out.length < n && tries < n * 40; tries++) {
      const p = [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)];
      if (inside(p, poly)) out.push({ id: `${area.id}-${out.length}`, area: area.id, c: p, pessoas: 2 + Math.floor(rnd() * 5) });
    }
    return out;
  }

  AREAS.forEach((a, i) => {
    a.move = 0; a.cracks = 0;
    a.poly = blob(a, i + 11);
    a.homes = homes(a, a.poly, i + 11);
  });

  /* Totens fictícios: um por encosta, no caminho entre a área de risco e o abrigo. */
  const TOTENS = [["T-01", "E-01", "Praça da comunidade"], ["T-02", "E-02", "Ponto de ônibus"], ["T-03", "E-03", "Posto de saúde"], ["T-04", "E-04", "Praça do bairro"], ["T-05", "E-05", "Escola do bairro"]]
    .map(([id, area, local]) => {
      const a = AREAS.find((x) => x.id === area), s = ABRIGOS.find((x) => x.id === a.abrigo);
      return { id, area, local, abrigo: s.id, c: [a.c[0] + (s.c[0] - a.c[0]) * 0.45, a.c[1] + (s.c[1] - a.c[1]) * 0.45] };
    });

  return { LEVELS, RAIN, MOVE, CRACKS, AREAS, ABRIGOS, BASE, TOTENS, evaluate };
})();
