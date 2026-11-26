/* Comunidade: perfis, grupos de bairro, publicações, reações, pontos, selos, missões e ranking.
   Protótipo: tudo fica neste navegador. Os outros moradores e as publicações iniciais são fictícios. */
window.Comunidade = (() => {
  const REPORTS = "pluvial-reports";
  /* Cada conta tem os seus próprios dados na comunidade; sem login, o feed é só de leitura. */
  const Auth = () => window.PluvialAuth;
  const KEY = () => `pluvial-social-v2:${Auth()?.current()?.id || "visitante"}`;
  const BAIRROS = ["Centro", "Manoel Honório", "São Pedro", "Benfica", "São Mateus", "Santa Terezinha", "Bom Pastor", "Dom Bosco", "Vila Ideal", "Linhares", "Borboleta"];
  /* Bairros com encosta monitorada pela central (ver risco.js). */
  const ENCOSTA = { "Santa Terezinha": "E-01", "Dom Bosco": "E-02", "Vila Ideal": "E-03", "Linhares": "E-04", "Borboleta": "E-05" };
  const LEVELS = [[0, "Vizinho"], [30, "Guardião"], [80, "Sentinela"], [160, "Referência do bairro"]];
  const TYPES = { aviso: "Aviso de risco", mutirao: "Mutirão", dica: "Dica", ajuda: "Rede de ajuda" };
  const SUBS = { bueiro: "Bueiro entupido", alagamento: "Alagamento", encosta: "Rachadura ou sinal de deslizamento", arvore: "Árvore ou poste em risco" };
  const REACTIONS = { apoio: ["👍", "Apoio"], importante: ["⚠️", "Importante"], obrigado: ["🙏", "Obrigado"], preocupado: ["😟", "Preocupado"] };
  const BADGES = {
    olho: ["👀", "Olho vivo", "Publicou o primeiro aviso de risco"],
    massa: ["🧹", "Mão na massa", "Participou de um mutirão"],
    organiza: ["📣", "Organizador", "Organizou um mutirão"],
    amiga: ["🤝", "Mão amiga", "Respondeu a um pedido de ajuda"],
    atento: ["✅", "Vizinho atento", "Confirmou ou contestou 5 avisos"],
    guardiao: ["🛡️", "Guardião", "Chegou a 30 pontos"],
  };

  const MEMBROS = [
    ["m1", "Cida", "Dom Bosco", 118, true], ["m2", "Rafael", "Santa Terezinha", 96, true], ["m3", "Lúcia", "Vila Ideal", 74, false],
    ["m4", "Jorge", "Centro", 61, true], ["m5", "Bia", "São Pedro", 52, false], ["m6", "Seu Antônio", "Linhares", 44, true],
    ["m7", "Paula", "Borboleta", 39, false], ["m8", "Diego", "Benfica", 31, true], ["m9", "Marta", "Manoel Honório", 27, false],
    ["m10", "Kauã", "Bom Pastor", 20, true], ["m11", "Neide", "São Mateus", 15, false], ["m12", "Thiago", "Dom Bosco", 12, true],
  ].map(([id, nome, bairro, base, ativo]) => ({ id, nome, bairro, base, ativo }));
  const MEMBER_BADGES = { m1: ["organiza", "massa", "olho", "guardiao"], m2: ["olho", "atento", "guardiao"], m3: ["massa", "amiga", "guardiao"], m4: ["olho", "guardiao"], m5: ["olho", "guardiao"], m6: ["guardiao"], m7: ["amiga", "guardiao"], m8: ["organiza", "guardiao"], m9: ["massa"], m10: ["massa"], m11: ["massa"], m12: ["massa"] };

  /* Publicações iniciais (h = horas atrás). */
  const SEED = [
    { id: "s1", type: "mutirao", author: "m1", bairro: "Dom Bosco", h: 5, text: "Mutirão de limpeza dos bueiros da rua principal. Traga luva e saco de lixo; a associação empresta as pás.", quando: "Sábado, 8h", onde: "Praça do bairro (ponto fictício)", participa: ["m12", "m3", "m10"], interesse: ["m4"], reacts: { apoio: ["m4", "m5", "m2"], obrigado: ["m12"] }, comments: [{ author: "m12", text: "Levo duas pás e um rastelo.", h: 4, likes: ["m1"], replies: [{ author: "m1", text: "Perfeito, Thiago! Valeu.", h: 3 }] }] },
    { id: "s2", type: "aviso", sub: "encosta", author: "m2", bairro: "Santa Terezinha", h: 3, text: "Apareceu uma rachadura nova no muro do fim da rua, perto do barranco. Alguém mais viu?", confirma: ["m11"], reacts: { importante: ["m1", "m6"], preocupado: ["m3"] }, comments: [{ author: "m3", text: "Vi sim, ontem estava menor.", h: 2 }] },
    { id: "s3", type: "dica", author: "m3", bairro: "Vila Ideal", h: 20, text: "Kit de emergência: documentos num saco plástico, remédios, carregador, lanterna e água. Deixe perto da porta na época de chuva.", reacts: { apoio: ["m1", "m2", "m4", "m6"], obrigado: ["m9", "m10"] } },
    { id: "s4", type: "aviso", sub: "bueiro", author: "m4", bairro: "Centro", h: 8, text: "Bueiro entupido de folhas na esquina da praça. Quando chove, a água sobe na calçada.", confirma: ["m5", "m9"], reacts: { importante: ["m5"] } },
    { id: "s5", type: "ajuda", author: "m6", bairro: "Linhares", h: 26, text: "Moro com minha mãe, que usa cadeira de rodas. Se tiver alerta, alguém da rua consegue ajudar a levar ela até o abrigo?", reacts: { apoio: ["m1", "m3", "m7"] }, comments: [{ author: "m7", text: "Pode contar comigo, moro duas casas abaixo.", h: 24, likes: ["m6", "m1"] }, { author: "m8", text: "Tenho carro, se precisar é só chamar.", h: 22, likes: ["m6"] }] },
    { id: "s6", type: "aviso", sub: "alagamento", author: "m5", bairro: "São Pedro", h: 30, text: "A rua alagou rápido na última chuva, com água na altura do joelho perto da ponte.", confirma: ["m8"], contesta: ["m10"], reacts: { preocupado: ["m4", "m9"] } },
    { id: "s7", type: "mutirao", author: "m8", bairro: "Benfica", h: 48, text: "Plantio de mudas na encosta atrás da escola: a raiz ajuda a segurar o solo. Precisamos de 10 pessoas.", quando: "Domingo, 9h", onde: "Escola do bairro (ponto fictício)", participa: ["m9", "m11"], interesse: ["m2", "m7"], reacts: { apoio: ["m2", "m6"] } },
    { id: "s8", type: "dica", author: "m7", bairro: "Borboleta", h: 60, text: "Sinais de deslizamento: rachaduras novas, portas que começam a emperrar, postes ou árvores inclinando e água barrenta saindo do barranco. Viu algum? Avise na hora.", reacts: { importante: ["m2", "m6", "m12", "m1"], obrigado: ["m3"] } },
  ];

  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const emptyReacts = () => Object.fromEntries(Object.keys(REACTIONS).map((k) => [k, []]));
  let cid = 0;
  const comment = (c, now) => ({ id: "c" + ++cid + "-" + Math.round(now / 1000), author: c.author, text: c.text, at: now - (c.h || 0) * 3600e3, likes: c.likes || [], replies: (c.replies || []).map((r) => comment(r, now)) });

  function fresh() {
    const now = Date.now();
    const p = profile();
    return {
      v: 2, log: [], saved: [], notifs: [], badges: [], joined: p ? [p.bairro] : [],
      posts: SEED.map((s) => ({
        confirma: [], contesta: [], participa: [], interesse: [], ...s,
        reacts: { ...emptyReacts(), ...(s.reacts || {}) },
        at: now - s.h * 3600e3,
        comments: (s.comments || []).map((c) => comment(c, now)),
      })),
    };
  }
  function load() {
    const s = read(KEY());
    return s && s.v === 2 && Array.isArray(s.posts) ? s : fresh();
  }
  const save = (s) => (Auth()?.current() ? write(KEY(), s) : true);
  const profile = () => { const u = Auth()?.current(); return u ? { nome: u.nome, bairro: u.bairro } : null; };
  const setProfile = (p) => !!Auth()?.updateProfile(p);
  const reports = () => { const r = read(REPORTS); return Array.isArray(r) ? r : []; };

  function logAction(kind, st) {
    const s = st || load();
    s.log.push({ kind, at: Date.now() });
    if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
    if (!st) save(s);
    return s;
  }

  const contested = (p) => p.type === "aviso" && (p.contesta?.length || 0) >= (p.confirma?.length || 0) + 2;
  const reactCount = (p) => Object.values(p.reacts || {}).reduce((t, a) => t + a.length, 0);
  const allComments = (p) => p.comments.flatMap((c) => [c, ...(c.replies || [])]);

  /* Pontos ganhos por um morador com publicações e interações. */
  function pointsOf(uid, st) {
    let p = 0;
    for (const post of st.posts) {
      if (post.hidden) continue;
      if (post.author === uid) {
        p += post.type === "mutirao" ? 15 : 5;
        if (post.type === "aviso" && !contested(post)) p += 3 * post.confirma.length;
        if (post.type === "mutirao") p += 2 * post.participa.length;
        p += reactCount(post);
      }
      if (post.participa?.includes(uid)) p += 10;
      if (post.confirma?.includes(uid) || post.contesta?.includes(uid)) p += 1;
      p += 2 * allComments(post).filter((c) => c.author === uid).length;
    }
    return p;
  }

  const MISSIONS = [
    { id: "aviso", text: "Faça 1 aviso de risco ou relato de bueiro", goal: 1, kinds: ["aviso", "relato"] },
    { id: "confirma", text: "Confirme ou conteste 3 avisos de vizinhos", goal: 3, kinds: ["confirma"] },
    { id: "mutirao", text: "Participe de 1 mutirão", goal: 1, kinds: ["participa"] },
    { id: "ajuda", text: "Responda a um pedido da rede de ajuda", goal: 1, kinds: ["ajuda"] },
  ];
  const BONUS = 15;
  function weekStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  }
  function missions(st) {
    const since = weekStart();
    return MISSIONS.map((m) => {
      const n = st.log.filter((l) => l.at >= since && m.kinds.includes(l.kind)).length;
      return { ...m, n: Math.min(n, m.goal), done: n >= m.goal };
    });
  }
  function myPoints(st) {
    const uid = Auth()?.current()?.id;
    const mine = uid ? reports().filter((r) => r.uid === uid).length : 0;
    return pointsOf("me", st) + mine * 10 + missions(st).filter((m) => m.done).length * BONUS;
  }
  function level(total) {
    let i = 0;
    LEVELS.forEach((l, n) => { if (total >= l[0]) i = n; });
    const next = LEVELS[i + 1];
    const from = LEVELS[i][0], to = next ? next[0] : from;
    return { name: LEVELS[i][1], next: next && next[1], missing: next ? to - total : 0, ratio: next ? (total - from) / (to - from) : 1 };
  }

  /* Selos do morador "me", a partir do que ele já fez. */
  function myBadges(st) {
    const k = (kind) => st.log.filter((l) => l.kind === kind).length;
    const out = [];
    if (k("aviso") || st.posts.some((p) => p.author === "me" && p.type === "aviso")) out.push("olho");
    if (k("participa")) out.push("massa");
    if (st.posts.some((p) => p.author === "me" && p.type === "mutirao")) out.push("organiza");
    if (k("ajuda")) out.push("amiga");
    if (k("confirma") >= 5) out.push("atento");
    if (myPoints(st) >= 30) out.push("guardiao");
    return out;
  }
  const badgesOf = (id, st) => (id === "me" ? myBadges(st) : MEMBER_BADGES[id] || []);

  function memberRanking(st) {
    const list = MEMBROS.map((m) => ({ id: m.id, nome: m.nome, bairro: m.bairro, pts: m.base + pointsOf(m.id, st) }));
    const me = profile();
    if (me) list.push({ id: "me", nome: me.nome, bairro: me.bairro, pts: myPoints(st), me: true });
    return list.sort((a, b) => b.pts - a.pts);
  }
  function bairroRanking(st) {
    const by = Object.fromEntries(BAIRROS.map((b) => [b, 0]));
    MEMBROS.forEach((m) => { by[m.bairro] += m.base + pointsOf(m.id, st); });
    const me = profile();
    if (me && by[me.bairro] !== undefined) by[me.bairro] += pointsOf("me", st);
    reports().forEach((r) => { if (by[r.bairro] !== undefined) by[r.bairro] += r.pontos ?? 10; });
    return BAIRROS.map((b) => ({ bairro: b, pts: by[b] })).sort((a, b) => b.pts - a.pts || a.bairro.localeCompare(b.bairro, "pt-BR"));
  }
  /* Número de membros do grupo (fictício, estável por bairro). */
  const groupSize = (b) => 60 + ([...b].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 340);
  const member = (id) => (id === "me" ? { id: "me", ...(profile() || { nome: "Você", bairro: "" }) } : MEMBROS.find((m) => m.id === id));

  /* Benefícios: os pontos podem ser trocados por descontos e vivências na cidade.
     Parceiros fictícios; na versão real, convênios com o comércio local e a prefeitura.
     Trocar não reduz o nível: o nível usa os pontos ganhos; o saldo usa ganhos menos trocados. */
  const REWARDS = [
    { id: "muda", icone: "🌱", titulo: "Muda de árvore nativa", texto: "Para plantar na sua rua ou na encosta do bairro.", custo: 30, parceiro: "Viveiro parceiro (fictício)" },
    { id: "padaria", icone: "🥖", titulo: "10% de desconto na padaria", texto: "Numa padaria parceira do seu bairro.", custo: 40, parceiro: "Comércio do bairro (fictício)" },
    { id: "parque", icone: "🌳", titulo: "Passeio guiado num parque", texto: "Visita com guia ambiental num parque da cidade.", custo: 50, parceiro: "Parque parceiro (fictício)" },
    { id: "cinema", icone: "🎬", titulo: "Meia-entrada no cinema", texto: "Válida de segunda a quinta num cinema parceiro.", custo: 60, parceiro: "Cinema parceiro (fictício)" },
    { id: "kit", icone: "🔦", titulo: "Kit chuva", texto: "Capa de chuva e lanterna para o kit de emergência.", custo: 80, parceiro: "Defesa Civil (simulação)" },
    { id: "material", icone: "🧱", titulo: "15% em material de construção", texto: "Para pequenos reparos de calha, muro e drenagem.", custo: 100, parceiro: "Loja parceira (fictícia)" },
  ];
  const spent = (st) => (st.trocas || []).reduce((t, x) => t + x.custo, 0);
  const balance = (st) => Math.max(0, myPoints(st) - spent(st));
  function redeem(st, id) {
    const r = REWARDS.find((x) => x.id === id);
    if (!r) throw new Error("Benefício não encontrado.");
    if (balance(st) < r.custo) throw new Error(`Faltam ${r.custo - balance(st)} pontos para este benefício.`);
    const code = "PLV-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("") + "-" + String(Date.now()).slice(-3);
    const t = { id: r.id, titulo: r.titulo, custo: r.custo, codigo: code, at: Date.now(), validade: Date.now() + 30 * 86400e3 };
    st.trocas = [...(st.trocas || []), t];
    return t;
  }

  return { REWARDS, balance, spent, redeem, BAIRROS, ENCOSTA, LEVELS, TYPES, SUBS, REACTIONS, BADGES, MEMBROS, MISSIONS, BONUS, load, save, profile, setProfile, reports, logAction, contested, reactCount, allComments, pointsOf, missions, myPoints, level, myBadges, badgesOf, memberRanking, bairroRanking, groupSize, member, emptyReacts };
})();
