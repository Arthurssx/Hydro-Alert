/* Painel do Morador: alerta da encosta (com o nível definido pelas autoridades),
   mapa ilustrativo de abrigos, sugestão de abrigo com vaga, listas e ocorrências.
   Usa os dados e funções de risco.js. */
(() => {
  const R = window.Risco;
  // Atalho para buscar elementos pelo id.
  const $ = (id) => document.getElementById(id);
  // Escapa caracteres especiais do HTML (evita que texto digitado vire código).
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Formata a distância em km com uma casa decimal.
  const fmtKm = (n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";

  // Mensagem e orientações de cada nível de alerta (a posição é o nível: 0 a 3).
  const MENSAGENS = [
    ["Sem alerta agora", ["Saiba onde fica o abrigo mais próximo.", "Deixe documentos e remédios em lugar fácil.", "Em emergência, ligue 193 (Bombeiros) ou 199 (Defesa Civil)."]],
    ["Atenção: chuva forte", ["Fique atento à sirene e ao WhatsApp.", "Evite ficar perto do barranco.", "Se notar rachaduras ou água barrenta, registre uma ocorrência."]],
    ["Alerta: prepare-se para sair", ["Separe documentos, remédios e carregador.", "Ajude idosos, crianças e pessoas com deficiência.", "Esteja pronto para ir ao abrigo."]],
    ["Alerta máximo: saia agora", ["Vá agora para o abrigo, sem voltar para buscar objetos.", "Fique longe de barrancos, postes e árvores.", "Se alguém estiver preso ou ferido, ligue 193."]],
  ];
  const TIPOS = ["Rachadura ou sinal de deslizamento", "Alagamento", "Bueiro entupido", "Árvore ou poste em risco"];

  // Abrigo selecionado no mapa.
  let abrigoSel = null;

  // Etiqueta de nível: cor + símbolo + nome (a informação não depende só da cor).
  function etiqueta(n) {
    const L = R.LEVELS[n];
    return `<span class="nivel-tag" style="background:${L.color}; color:${L.text}">${L.icon} ${L.name}</span>`;
  }

  // ----- Listas de opções -----
  const opcoesAreas = R.AREAS.map((a) => `<option value="${a.id}">${esc(a.nome)}</option>`).join("");
  const opcoesTipos = TIPOS.map((t) => `<option>${t}</option>`).join("");
  $("sel-area").innerHTML = opcoesAreas;
  $("oc-area").innerHTML = opcoesAreas;
  $("oc-tipo").innerHTML = opcoesTipos;
  $("f-tipo").insertAdjacentHTML("beforeend", opcoesTipos);
  $("f-area").insertAdjacentHTML("beforeend", opcoesAreas);

  // ----- Meu alerta -----
  // Ao trocar de encosta, o seletor de nível volta para o nível oficial dela.
  function usarNivelOficial() {
    const oficial = R.nivelOficial($("sel-area").value);
    $("sel-nivel").value = String(oficial ? oficial.nivel : 0);
  }

  function atualizarAlerta() {
    const area = R.area($("sel-area").value);
    const nivel = Number($("sel-nivel").value);
    const oficial = R.nivelOficial(area.id);
    const [titulo, passos] = MENSAGENS[nivel];

    // Quem definiu o nível: Defesa Civil, simulação ou ninguém ainda.
    if (oficial && oficial.nivel === nivel) {
      $("nivel-oficial").textContent = `Nível definido pela Defesa Civil às ${new Date(oficial.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;
    } else if (oficial) {
      $("nivel-oficial").textContent = `Simulação. O nível oficial desta encosta é ${R.LEVELS[oficial.nivel].name}.`;
    } else if (nivel === 0) {
      $("nivel-oficial").textContent = "A Defesa Civil ainda não definiu um nível para esta encosta.";
    } else {
      $("nivel-oficial").textContent = "Simulação. A Defesa Civil ainda não definiu um nível para esta encosta.";
    }

    $("alerta").style.setProperty("--c", R.LEVELS[nivel].color);
    $("alerta-tag").outerHTML = `<p class="nivel-tag" id="alerta-tag" style="background:${R.LEVELS[nivel].color}; color:${R.LEVELS[nivel].text}">${R.LEVELS[nivel].icon} ${R.LEVELS[nivel].name}</p>`;
    $("alerta-titulo").textContent = titulo;
    $("alerta-texto").textContent = `Encosta ${area.nome}. ${R.LEVELS[nivel].action}`;
    $("alerta-passos").innerHTML = passos.map((p) => `<li>${p}</li>`).join("");

    // Abrigo: se o de destino estiver lotado, sugere o mais próximo com vaga.
    const ind = R.abrigoIndicado(area);
    const box = $("alerta-abrigo");
    box.classList.toggle("trocado", ind.trocou);
    const dist = fmtKm(R.km(area.c, ind.abrigo.c));
    box.innerHTML = ind.trocou
      ? `<p><b>O abrigo de destino (${esc(ind.destino.nome)}) está lotado.</b></p><p>Vá para o <b>${esc(ind.abrigo.nome)}</b>, a ${dist} daqui, que tem vagas.</p><p><a href="${R.maps(ind.abrigo, area)}" target="_blank" rel="noopener noreferrer">Rota a pé no Google Maps</a> · <a href="#h-mapa">Ver no mapa</a></p>`
      : `<p>Abrigo: <b>${esc(ind.abrigo.nome)}</b> (${R.estado(ind.abrigo).toLowerCase()}), a ${dist} daqui.</p><p><a href="${R.maps(ind.abrigo, area)}" target="_blank" rel="noopener noreferrer">Rota a pé no Google Maps</a> · <a href="#h-mapa">Ver no mapa</a></p>`;

    // Alerta máximo: banner no topo da página, no lugar do alert().
    const banner = $("banner-max");
    if (nivel === 3) {
      banner.innerHTML = `<b>■ Alerta máximo em ${esc(area.nome)}</b>Saia agora e vá para o ${esc(ind.abrigo.nome)}, sem voltar para buscar objetos. <a href="#h-mapa">Ver a rota no mapa</a>`;
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }

    abrigoSel = ind.abrigo.id;
    desenharMapa();
    listarAbrigos();
  }
  $("sel-area").addEventListener("change", () => { usarNivelOficial(); atualizarAlerta(); });
  $("sel-nivel").addEventListener("change", atualizarAlerta);

  // ----- Mapa ilustrativo (SVG) -----
  // Converte [longitude, latitude] em x, y do desenho de 640 × 400, com margem.
  const pontos = [...R.AREAS, ...R.ABRIGOS].map((p) => p.c);
  const minX = Math.min(...pontos.map((p) => p[0])), maxX = Math.max(...pontos.map((p) => p[0]));
  const minY = Math.min(...pontos.map((p) => p[1])), maxY = Math.max(...pontos.map((p) => p[1]));
  const esc2 = Math.min(540 / (maxX - minX), 300 / (maxY - minY));
  const xy = (c) => [50 + (c[0] - minX) * esc2 + (540 - (maxX - minX) * esc2) / 2, 50 + (maxY - c[1]) * esc2 + (300 - (maxY - minY) * esc2) / 2];

  // Posição do nome de cada encosta e abrigo no desenho, para os textos não se cruzarem.
  // [deslocamento x, deslocamento y, alinhamento]
  const ROTULO = {
    "E-01": [36, 5, "start"], "E-02": [36, 5, "start"], "E-03": [36, 5, "start"], "E-04": [0, 50, "middle"], "E-05": [0, -40, "middle"],
    "A-01": [22, 5, "start"], "A-02": [22, 1, "start"], "A-03": [0, -24, "middle"], "A-04": [0, -24, "middle"],
  };
  const rotulo = (id, x, y, texto) => { const [dx, dy, al] = ROTULO[id]; return `<text class="m-nome" x="${x + dx}" y="${y + dy}" text-anchor="${al}">${esc(texto)}</text>`; };

  function desenharMapa() {
    const area = R.area($("sel-area").value);
    const destino = R.abrigo(abrigoSel) || R.abrigoIndicado(area).abrigo;
    const [ax, ay] = xy(area.c), [bx, by] = xy(destino.c);
    let svg = `<path class="m-rio" d="M-10 150 C 120 170 220 250 330 240 S 520 300 650 340"/>
      <path class="m-rua" d="M40 60 L 600 360 M 80 380 L 560 40 M 0 260 L 640 210"/>`;
    // Encostas: círculos com a cor do nível oficial e o nome.
    R.AREAS.forEach((a) => {
      const [x, y] = xy(a.c), n = R.nivelOficial(a.id)?.nivel ?? 0;
      svg += `<circle class="m-area${a.id === area.id ? " sel" : ""}" cx="${x}" cy="${y}" r="28" fill="${R.LEVELS[n].color}"><title>Encosta ${esc(a.nome)}: ${R.LEVELS[n].name}</title></circle>${rotulo(a.id, x, y, a.nome)}`;
    });
    // Rota: da encosta escolhida até o abrigo selecionado (no início, o indicado).
    svg += `<line class="m-rota" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`;
    // Abrigos: um marcador clicável por abrigo.
    R.ABRIGOS.forEach((s) => {
      const [x, y] = xy(s.c), lot = R.estado(s) === "Lotado";
      svg += `<g class="m-abr${lot ? " lotado" : ""}${s.id === abrigoSel ? " sel" : ""}" data-abr="${s.id}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-pressed="${s.id === abrigoSel}" aria-label="Abrigo ${esc(s.nome)}, ${R.estado(s)}">
        <circle r="15"/><path d="M-7 1 L0 -6 L7 1 V7 H-7 Z"/>${rotulo(s.id, 0, 0, s.nome)}</g>`;
    });
    $("mapa").innerHTML = svg;
    mostrarAbrigo();
  }

  // Painel ao lado do mapa com o abrigo selecionado.
  function mostrarAbrigo() {
    const s = R.abrigo(abrigoSel), area = R.area($("sel-area").value);
    if (!s) { $("mapa-info").innerHTML = "<p>Clique num abrigo no mapa.</p>"; return; }
    const e = R.estado(s);
    let extra = "";
    if (e === "Lotado") {
      const alt = R.abrigoIndicado({ ...area, abrigo: s.id });
      if (alt.trocou) extra = `<p><b>Lotado.</b> O abrigo com vaga mais próximo é o ${esc(alt.abrigo.nome)}.</p>`;
    }
    $("mapa-info").innerHTML = `<h3>${esc(s.nome)}</h3>
      <p><span class="abr-tag${e === "Lotado" ? " crit" : ""}">${e}</span></p>
      <p>${R.ocupados(s)} de ${s.vagas} vagas ocupadas</p>
      <p>${fmtKm(R.km(area.c, s.c))} da encosta ${esc(area.nome)}</p>${extra}
      <p><a href="${R.maps(s, area)}" target="_blank" rel="noopener noreferrer">Rota a pé no Google Maps</a></p>`;
  }

  // Seleciona um abrigo (pelo mapa ou pela lista).
  function selecionar(id) {
    abrigoSel = id;
    desenharMapa();
    listarAbrigos();
  }
  $("mapa").addEventListener("click", (e) => {
    const g = e.target.closest("[data-abr]");
    if (g) selecionar(g.dataset.abr);
  });
  $("mapa").addEventListener("keydown", (e) => {
    const g = e.target.closest("[data-abr]");
    if (g && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      selecionar(g.dataset.abr);
      $("mapa").querySelector(`[data-abr="${g.dataset.abr}"]`).focus();
    }
  });

  // ----- Áreas de risco -----
  function listarAreas() {
    $("lista-areas").innerHTML = R.AREAS.map((a) => {
      const n = R.nivelOficial(a.id)?.nivel ?? 0;
      return `<li class="abr"><b>${esc(a.nome)}</b>${etiqueta(n)}<small>Suscetibilidade ${a.susc} · ${a.moradores} moradores · abrigo: ${esc(R.abrigo(a.abrigo).nome)}</small></li>`;
    }).join("");
  }

  // ----- Abrigos (filtro por situação; clicar seleciona no mapa) -----
  function listarAbrigos() {
    const filtro = $("f-abrigo").value;
    const itens = R.ABRIGOS.filter((s) => !filtro || R.estado(s) === filtro);
    $("lista-abrigos").innerHTML = itens.length
      ? itens.map((s) => {
          const e = R.estado(s);
          return `<li><button type="button" class="abr" data-e="${e}" data-sel="${s.id}" aria-pressed="${s.id === abrigoSel}"><b>${esc(s.nome)}</b><span class="abr-tag">${e}</span><small>${R.ocupados(s)} de ${s.vagas} vagas ocupadas · ver no mapa</small></button></li>`;
        }).join("")
      : `<li class="abr">Nenhum abrigo com esse filtro.</li>`;
  }
  $("f-abrigo").addEventListener("change", listarAbrigos);
  $("lista-abrigos").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sel]");
    if (!b) return;
    selecionar(b.dataset.sel);
    $("h-mapa").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });

  // ----- Botões de exibir/ocultar de cada bloco -----
  function alternar(botao, alvo) {
    botao.addEventListener("click", () => {
      alvo.hidden = !alvo.hidden;
      botao.textContent = alvo.hidden ? "Mostrar" : "Ocultar";
      botao.setAttribute("aria-expanded", String(!alvo.hidden));
    });
  }
  alternar($("t-areas"), $("c-areas"));
  alternar($("t-abrigos"), $("c-abrigos"));
  alternar($("t-oc"), $("c-oc"));

  // ----- Ocorrências -----
  const lerOcorrencias = () => { const v = R.ler(R.CHAVES.ocorrencias, []); return Array.isArray(v) ? v : []; };

  function listarOcorrencias() {
    const tipo = $("f-tipo").value, ar = $("f-area").value;
    const itens = lerOcorrencias().filter((o) => (!tipo || o.tipo === tipo) && (!ar || o.area === ar)).reverse();
    $("lista-oc").innerHTML = itens.length
      ? itens.map((o) => {
          const ok = o.status === "verificado";
          return `<li class="abr"><b>${esc(o.tipo)}</b><span class="abr-tag${ok ? " ok" : ""}">${ok ? "✓ Verificada pela Defesa Civil" : "Pendente de verificação"}</span><small>${esc(o.areaNome)} · ${esc(o.texto)} · ${new Date(o.at).toLocaleString("pt-BR")}</small></li>`;
        }).join("")
      : `<li class="abr">Nenhuma ocorrência registrada.</li>`;
  }
  $("f-tipo").addEventListener("change", listarOcorrencias);
  $("f-area").addEventListener("change", listarOcorrencias);

  // Estado do campo: o botão fica desabilitado enquanto não houver texto.
  const campo = $("oc-texto"), botao = $("oc-enviar"), erro = $("oc-erro");
  function limparErro() {
    campo.removeAttribute("aria-invalid");
    erro.textContent = "";
  }
  campo.addEventListener("input", () => {
    botao.disabled = campo.value.trim() === "";
    $("oc-ok").textContent = "";
    if (campo.value.trim().length >= 10) limparErro();
  });

  // Envio: valida, salva (simulação) e mostra a confirmação junto ao formulário.
  $("form-oc").addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = campo.value.trim();
    if (texto.length < 10) {
      campo.setAttribute("aria-invalid", "true");
      erro.textContent = "Descreva com pelo menos 10 caracteres: onde fica e o que você viu.";
      campo.focus();
      return;
    }
    const area = R.area($("oc-area").value);
    const lista = lerOcorrencias();
    lista.push({ area: area.id, areaNome: area.nome, tipo: $("oc-tipo").value, texto, at: Date.now(), status: "pendente" });
    if (!R.gravar(R.CHAVES.ocorrencias, lista)) {
      erro.textContent = "O navegador bloqueou o armazenamento. A ocorrência não foi salva.";
      return;
    }
    limparErro();
    campo.value = "";
    botao.disabled = true;
    $("oc-ok").textContent = "Ocorrência registrada (simulação). A Defesa Civil vai conferir no painel das autoridades.";
    listarOcorrencias();
  });

  // Se o painel das autoridades mudar algo em outra aba, esta página se atualiza.
  addEventListener("storage", (e) => {
    if (e.key === null || Object.values(R.CHAVES).includes(e.key)) {
      if (e.key === R.CHAVES.niveis || e.key === null) usarNivelOficial();
      listarAreas();
      atualizarAlerta();
      listarOcorrencias();
    }
  });

  // Primeira pintura da página.
  usarNivelOficial();
  listarAreas();
  atualizarAlerta();
  listarOcorrencias();
})();
