/* Dados compartilhados do painel do morador e do painel das autoridades:
   níveis de alerta, encostas, abrigos, bairros e as chaves do localStorage.
   Tudo fictício. Na vida real, quem define áreas e níveis é a Defesa Civil. */
window.Risco = (() => {
  // Os 4 níveis de alerta (a posição é o nível: 0 a 3), com cor de fundo, cor do texto, símbolo e orientação.
  const LEVELS = [
    { name: "Observação", color: "#1f7a57", text: "#ffffff", icon: "●", action: "Acompanhar chuva e sensores." },
    { name: "Atenção", color: "#f5c518", text: "#0e2833", icon: "▲", action: "Fique atento à sirene e ao WhatsApp." },
    { name: "Alerta", color: "#f28a2e", text: "#0e2833", icon: "◆", action: "Prepare-se para sair. Abrigo de prontidão." },
    { name: "Alerta máximo", color: "#c4412c", text: "#ffffff", icon: "■", action: "Evacuação imediata da área." },
  ];

  // Encostas fictícias: id, nome, centro [longitude, latitude], suscetibilidade, moradores e abrigo de destino.
  const AREAS = [
    { id: "E-01", nome: "Santa Terezinha", c: [-43.3585, -21.7335], susc: "alta", moradores: 180, abrigo: "A-01" },
    { id: "E-02", nome: "Dom Bosco", c: [-43.3735, -21.7800], susc: "alta", moradores: 240, abrigo: "A-02" },
    { id: "E-03", nome: "Vila Ideal", c: [-43.3335, -21.7765], susc: "média", moradores: 150, abrigo: "A-03" },
    { id: "E-04", nome: "Linhares", c: [-43.3150, -21.7525], susc: "média", moradores: 120, abrigo: "A-04" },
    { id: "E-05", nome: "Borboleta", c: [-43.3880, -21.7690], susc: "alta", moradores: 90, abrigo: "A-02" },
  ];

  // Abrigos fictícios: posição [longitude, latitude], vagas e quanto começam ocupados (fração das vagas).
  // A-04 começa lotado de propósito: é o ponto de falha do fluxo do morador.
  const ABRIGOS = [
    { id: "A-01", nome: "Escola municipal", c: [-43.3520, -21.7390], vagas: 220, inicio: 0.35 },
    { id: "A-02", nome: "Ginásio poliesportivo", c: [-43.3790, -21.7735], vagas: 380, inicio: 0.85 },
    { id: "A-03", nome: "Centro comunitário", c: [-43.3405, -21.7720], vagas: 160, inicio: 0.2 },
    { id: "A-04", nome: "Escola estadual", c: [-43.3230, -21.7485], vagas: 180, inicio: 1 },
  ];

  // Bairros atendidos (os mesmos da página inicial).
  const BAIRROS = ["Centro", "Manoel Honório", "São Pedro", "Benfica", "São Mateus", "Santa Terezinha", "Bom Pastor", "Dom Bosco", "Vila Ideal", "Linhares", "Borboleta"];

  // Chaves do localStorage usadas pelas páginas.
  const CHAVES = {
    relatos: "pluvial-reports", // relatos da página inicial
    ocorrencias: "pluvial-ocorrencias", // ocorrências do painel do morador
    niveis: "pluvial-niveis", // nível oficial de cada encosta (definido pelas autoridades)
    abrigos: "pluvial-abrigos", // ocupação de cada abrigo (atualizada pelas autoridades)
  };

  // Lê um JSON do localStorage; se não existir ou estiver corrompido, devolve o padrão.
  function ler(chave, padrao) {
    try {
      const v = JSON.parse(localStorage.getItem(chave));
      return v === null || v === undefined ? padrao : v;
    } catch {
      return padrao;
    }
  }
  // Grava um JSON no localStorage. Devolve false se o navegador bloquear.
  function gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  }

  // Busca uma encosta ou um abrigo pelo id.
  const area = (id) => AREAS.find((a) => a.id === id);
  const abrigo = (id) => ABRIGOS.find((s) => s.id === id);

  // Nível oficial de uma encosta: { nivel, em } ou null se a Defesa Civil ainda não definiu.
  function nivelOficial(id) {
    const n = ler(CHAVES.niveis, {})[id];
    return n && Number.isInteger(n.nivel) ? n : null;
  }

  // Pessoas em cada abrigo: o valor salvo pelas autoridades ou a ocupação inicial.
  function ocupados(a) {
    const salvo = ler(CHAVES.abrigos, {})[a.id];
    return Number.isFinite(salvo) ? Math.max(0, Math.min(a.vagas, salvo)) : Math.round(a.vagas * a.inicio);
  }
  // Situação do abrigo conforme a ocupação.
  function estado(a) {
    const p = ocupados(a) / a.vagas;
    if (p >= 1) return "Lotado";
    if (p >= 0.7) return "Quase lotado";
    return "Disponível";
  }

  // Distância em km entre dois pontos [longitude, latitude].
  function km(p, q) {
    const r = Math.PI / 180, dLat = (q[1] - p[1]) * r, dLng = (q[0] - p[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(p[1] * r) * Math.cos(q[1] * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  // Abrigo indicado para uma encosta: o de destino ou, se estiver lotado, o mais próximo com vaga.
  function abrigoIndicado(a) {
    const destino = abrigo(a.abrigo);
    if (estado(destino) !== "Lotado") return { abrigo: destino, trocou: false, destino };
    const livres = ABRIGOS.filter((s) => estado(s) !== "Lotado").sort((x, y) => km(a.c, x.c) - km(a.c, y.c));
    return { abrigo: livres[0] || destino, trocou: !!livres[0], destino };
  }

  // Link da rota a pé no Google Maps, saindo da encosta (se informada) até o abrigo.
  function maps(s, origem) {
    const o = origem ? `&origin=${origem.c[1]},${origem.c[0]}` : "";
    return `https://www.google.com/maps/dir/?api=1${o}&destination=${s.c[1]},${s.c[0]}&travelmode=walking`;
  }

  return { LEVELS, AREAS, ABRIGOS, BAIRROS, CHAVES, ler, gravar, area, abrigo, nivelOficial, ocupados, estado, km, abrigoIndicado, maps };
})();
