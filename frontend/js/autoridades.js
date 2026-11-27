/* Painel das Autoridades (Defesa Civil).
   - Lê os relatos da página inicial (pluvial-reports) e as ocorrências do
     painel do morador (pluvial-ocorrencias), guardados no localStorage.
   - Filtra por bairro, encosta, tipo e status.
   - Marca relatos e ocorrências como verificados.
   - Define o nível de alerta de cada encosta (o morador.html lê esse nível).
   - Atualiza a ocupação dos abrigos.
   Escrito de propósito com function, getElementById, onclick, if/else e alert
   (atividade de JavaScript). Usa os dados de risco.js. */

var R = window.Risco;

// Tipos que contam como sinal de deslizamento.
var TIPOS_DESLIZAMENTO = ["Rachadura ou sinal de deslizamento", "Árvore ou poste em risco"];

// Escapa caracteres especiais do HTML (evita que texto digitado vire código).
function esc(texto) {
  return String(texto).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// Lê uma lista do localStorage (lista vazia se não houver).
function lerLista(chave) {
  var v = R.ler(chave, []);
  if (Array.isArray(v)) {
    return v;
  } else {
    return [];
  }
}

// Procura a encosta que tem o mesmo nome do bairro (ex.: bairro Dom Bosco → encosta E-02).
function encostaDoBairro(bairro) {
  for (var i = 0; i < R.AREAS.length; i++) {
    if (R.AREAS[i].nome === bairro) {
      return R.AREAS[i].id;
    }
  }
  return "";
}

// Junta relatos e ocorrências numa lista só, no mesmo formato.
function juntarRegistros() {
  var registros = [];
  var relatos = lerLista(R.CHAVES.relatos);
  for (var i = 0; i < relatos.length; i++) {
    var r = relatos[i];
    // Relatos antigos guardavam o tipo junto do texto ("Bueiro entupido: ...").
    var tipo = r.tipo;
    var texto = r.texto || "";
    if (!tipo) {
      tipo = texto.split(":")[0];
      texto = texto.indexOf(":") >= 0 ? texto.slice(texto.indexOf(":") + 1).trim() : texto;
    }
    registros.push({ chave: R.CHAVES.relatos, indice: i, origem: "Relato da página inicial", tipo: tipo, bairro: r.bairro, encosta: encostaDoBairro(r.bairro), texto: (r.local ? r.local + ": " : "") + texto, at: r.at || Date.now(), status: r.status || "pendente" });
  }
  var ocorrencias = lerLista(R.CHAVES.ocorrencias);
  for (var j = 0; j < ocorrencias.length; j++) {
    var o = ocorrencias[j];
    registros.push({ chave: R.CHAVES.ocorrencias, indice: j, origem: "Ocorrência do morador", tipo: o.tipo, bairro: o.areaNome, encosta: o.area, texto: o.texto, at: o.at, status: o.status || "pendente" });
  }
  // Mais recentes primeiro.
  registros.sort(function (a, b) { return b.at - a.at; });
  return registros;
}

// Preenche os seletores de filtro (bairros, encostas e tipos).
function prepararFiltros() {
  var fBairro = document.getElementById("f-bairro");
  var fEncosta = document.getElementById("f-encosta");
  for (var i = 0; i < R.BAIRROS.length; i++) {
    fBairro.add(new Option(R.BAIRROS[i], R.BAIRROS[i]));
  }
  for (var j = 0; j < R.AREAS.length; j++) {
    fEncosta.add(new Option(R.AREAS[j].nome, R.AREAS[j].id));
  }
  atualizarFiltroDeTipos();
  // Ao mudar qualquer filtro, a lista é refeita.
  document.getElementById("f-bairro").onchange = mostrarRegistros;
  document.getElementById("f-encosta").onchange = mostrarRegistros;
  document.getElementById("f-tipo").onchange = mostrarRegistros;
  document.getElementById("f-status").onchange = mostrarRegistros;
}

// Os tipos vêm dos próprios registros (relatos da home e ocorrências do morador).
function atualizarFiltroDeTipos() {
  var fTipo = document.getElementById("f-tipo");
  var atual = fTipo.value;
  var tipos = [];
  var registros = juntarRegistros();
  for (var i = 0; i < registros.length; i++) {
    if (tipos.indexOf(registros[i].tipo) === -1) {
      tipos.push(registros[i].tipo);
    }
  }
  tipos.sort();
  fTipo.length = 1; // mantém só "Todos os tipos"
  for (var j = 0; j < tipos.length; j++) {
    fTipo.add(new Option(tipos[j], tipos[j]));
  }
  fTipo.value = tipos.indexOf(atual) >= 0 ? atual : "";
}

// Mostra a lista respeitando os quatro filtros.
function mostrarRegistros() {
  var bairro = document.getElementById("f-bairro").value;
  var encosta = document.getElementById("f-encosta").value;
  var tipo = document.getElementById("f-tipo").value;
  var status = document.getElementById("f-status").value;
  var lista = document.getElementById("lista");
  var todos = juntarRegistros();
  var filtrados = [];

  for (var i = 0; i < todos.length; i++) {
    var r = todos[i];
    if (bairro !== "" && r.bairro !== bairro) {
      continue;
    } else if (encosta !== "" && r.encosta !== encosta) {
      continue;
    } else if (tipo !== "" && r.tipo !== tipo) {
      continue;
    } else if (status !== "" && r.status !== status) {
      continue;
    }
    filtrados.push(r);
  }

  document.getElementById("contagem").textContent = filtrados.length + " de " + todos.length + " registros";
  lista.innerHTML = "";

  if (filtrados.length === 0) {
    var vazio = document.createElement("li");
    vazio.className = "abr";
    vazio.textContent = todos.length === 0 ? "Nenhum relato ainda. Use “Carregar exemplos” ou registre um na página inicial ou no painel do morador." : "Nenhum registro com esses filtros.";
    lista.appendChild(vazio);
    return;
  }

  for (var j = 0; j < filtrados.length; j++) {
    lista.appendChild(criarItem(filtrados[j]));
  }
}

// Cria um item da lista com o botão de verificar.
function criarItem(r) {
  var li = document.createElement("li");
  var verificado = r.status === "verificado";
  li.className = "abr item" + (verificado ? " verificado" : "");
  li.innerHTML =
    '<span class="origem">' + esc(r.origem) + "</span>" +
    "<b>" + esc(r.tipo) + " · " + esc(r.bairro) + "</b>" +
    "<small>" + esc(r.texto) + " · " + new Date(r.at).toLocaleString("pt-BR") + "</small>" +
    '<span class="abr-tag' + (verificado ? " ok" : "") + '">' + (verificado ? "✓ Verificado" : "Pendente") + "</span>";

  var acoes = document.createElement("div");
  acoes.className = "acoes";
  var botao = document.createElement("button");
  botao.type = "button";
  if (verificado) {
    botao.className = "ghost";
    botao.textContent = "Voltar para pendente";
  } else {
    botao.className = "primary";
    botao.textContent = "Marcar como verificado";
  }
  // Ao clicar, troca o status desse registro.
  botao.onclick = function () {
    trocarStatus(r.chave, r.indice, verificado ? "pendente" : "verificado");
  };
  acoes.appendChild(botao);
  li.appendChild(acoes);
  return li;
}

// Grava o novo status no registro original (relato ou ocorrência).
function trocarStatus(chave, indice, novoStatus) {
  var lista = lerLista(chave);
  if (!lista[indice]) {
    alert("Esse registro não existe mais. A lista será atualizada.");
    atualizarTudo();
    return;
  }
  lista[indice].status = novoStatus;
  lista[indice].verificadoEm = novoStatus === "verificado" ? Date.now() : null;
  if (R.gravar(chave, lista)) {
    if (novoStatus === "verificado") {
      alert("Registro marcado como verificado. O morador já vê esse status.");
    } else {
      alert("Registro voltou para pendente.");
    }
  } else {
    alert("O navegador bloqueou o armazenamento. Nada foi salvo.");
  }
  atualizarTudo();
}

// Conta os sinais de deslizamento verificados de uma encosta.
function sinaisVerificados(idEncosta) {
  var registros = juntarRegistros();
  var total = 0;
  for (var i = 0; i < registros.length; i++) {
    var r = registros[i];
    if (r.encosta === idEncosta && r.status === "verificado" && TIPOS_DESLIZAMENTO.indexOf(r.tipo) >= 0) {
      total++;
    }
  }
  return total;
}

// Etiqueta do nível: cor + símbolo + nome.
function etiqueta(n) {
  var L = R.LEVELS[n];
  return '<span class="nivel-tag" style="background:' + L.color + "; color:" + L.text + '">' + L.icon + " " + L.name + "</span>";
}

// Monta a tabela de níveis: uma linha por encosta, com seletor e botão.
function mostrarNiveis() {
  var corpo = document.getElementById("tb-niveis");
  corpo.innerHTML = "";
  for (var i = 0; i < R.AREAS.length; i++) {
    var a = R.AREAS[i];
    var oficial = R.nivelOficial(a.id);
    var atual = oficial ? oficial.nivel : 0;
    var sinais = sinaisVerificados(a.id);
    var tr = document.createElement("tr");
    var opcoes = "";
    for (var n = 0; n < R.LEVELS.length; n++) {
      opcoes += '<option value="' + n + '"' + (n === atual ? " selected" : "") + ">" + R.LEVELS[n].icon + " " + R.LEVELS[n].name + "</option>";
    }
    tr.innerHTML =
      "<th scope=\"row\">" + esc(a.nome) + "</th>" +
      "<td>" + sinais + (sinais >= 3 ? " · considere elevar" : "") + "</td>" +
      "<td>" + etiqueta(atual) + (oficial ? "" : " <small>(padrão)</small>") + "</td>" +
      '<td><select id="nv-' + a.id + '" aria-label="Novo nível para ' + esc(a.nome) + '">' + opcoes + "</select></td>" +
      "<td></td>";
    var botao = document.createElement("button");
    botao.type = "button";
    botao.className = "primary";
    botao.textContent = "Definir nível";
    botao.setAttribute("aria-label", "Definir nível de " + a.nome);
    botao.onclick = criarAcaoNivel(a.id);
    tr.lastChild.appendChild(botao);
    corpo.appendChild(tr);
  }
}

// Cria a função do botão de cada encosta (guarda o id da encosta).
function criarAcaoNivel(idEncosta) {
  return function () {
    definirNivel(idEncosta);
  };
}

// Salva o nível escolhido para a encosta; o painel do morador passa a usar esse nível.
function definirNivel(idEncosta) {
  var area = R.area(idEncosta);
  var novo = Number(document.getElementById("nv-" + idEncosta).value);
  var oficial = R.nivelOficial(idEncosta);
  var atual = oficial ? oficial.nivel : 0;

  if (oficial && novo === atual) {
    alert("A encosta " + area.nome + " já está em " + R.LEVELS[novo].name + ".");
    return;
  }
  if (novo >= 2 && sinaisVerificados(idEncosta) === 0) {
    // Só um aviso: a Defesa Civil pode elevar por outros motivos (chuva, sensores).
    alert("Atenção: " + area.nome + " ainda não tem sinais de deslizamento verificados. O nível será definido mesmo assim.");
  }
  var niveis = R.ler(R.CHAVES.niveis, {});
  niveis[idEncosta] = { nivel: novo, em: Date.now() };
  if (R.gravar(R.CHAVES.niveis, niveis)) {
    alert("Nível de " + area.nome + " definido como " + R.LEVELS[novo].name + ". O painel do morador já mostra esse nível.");
  } else {
    alert("O navegador bloqueou o armazenamento. O nível não foi salvo.");
  }
  atualizarTudo();
}

// Monta a tabela de abrigos com um campo de número para cada um.
function mostrarAbrigos() {
  var corpo = document.getElementById("tb-abrigos");
  corpo.innerHTML = "";
  for (var i = 0; i < R.ABRIGOS.length; i++) {
    var s = R.ABRIGOS[i];
    var e = R.estado(s);
    var tr = document.createElement("tr");
    tr.innerHTML =
      "<th scope=\"row\">" + esc(s.nome) + "</th>" +
      "<td>" + s.vagas + "</td>" +
      '<td><input type="number" id="oc-' + s.id + '" min="0" max="' + s.vagas + '" step="1" value="' + R.ocupados(s) + '" aria-label="Pessoas no abrigo ' + esc(s.nome) + '" /></td>' +
      '<td><span class="abr-tag' + (e === "Lotado" ? " crit" : "") + '">' + e + "</span></td>";
    corpo.appendChild(tr);
  }
}

// Botão "Atualizar situação dos abrigos": confere os números e salva.
function atualizarAbrigos() {
  var novos = {};
  for (var i = 0; i < R.ABRIGOS.length; i++) {
    var s = R.ABRIGOS[i];
    var campo = document.getElementById("oc-" + s.id);
    var valor = campo.value.trim();
    var numero = Number(valor);
    if (valor === "" || !Number.isInteger(numero) || numero < 0 || numero > s.vagas) {
      campo.setAttribute("aria-invalid", "true");
      alert("O número de pessoas no abrigo " + s.nome + " precisa ser um inteiro entre 0 e " + s.vagas + ".");
      campo.focus();
      return;
    } else {
      campo.removeAttribute("aria-invalid");
      novos[s.id] = numero;
    }
  }
  if (R.gravar(R.CHAVES.abrigos, novos)) {
    alert("Situação dos abrigos atualizada. O painel do morador já mostra as vagas novas.");
  } else {
    alert("O navegador bloqueou o armazenamento. Nada foi salvo.");
  }
  atualizarTudo();
}

// Números do topo.
function mostrarResumo() {
  var registros = juntarRegistros();
  var pend = 0, verif = 0, desl = 0, emAlerta = 0;
  for (var i = 0; i < registros.length; i++) {
    if (registros[i].status === "verificado") {
      verif++;
    } else {
      pend++;
    }
    if (TIPOS_DESLIZAMENTO.indexOf(registros[i].tipo) >= 0) {
      desl++;
    }
  }
  for (var j = 0; j < R.AREAS.length; j++) {
    var n = R.nivelOficial(R.AREAS[j].id);
    if (n && n.nivel >= 2) {
      emAlerta++;
    }
  }
  document.getElementById("k-pend").textContent = pend;
  document.getElementById("k-verif").textContent = verif;
  document.getElementById("k-desl").textContent = desl;
  document.getElementById("k-max").textContent = emAlerta;
}

// Exemplos para a demonstração: alguns relatos e ocorrências pendentes.
function carregarExemplos() {
  var agora = Date.now();
  var relatos = lerLista(R.CHAVES.relatos);
  relatos.push(
    { at: agora - 50 * 60000, bairro: "Centro", local: "Av. Barão do Rio Branco, 2000", tipo: "Bueiro entupido", texto: "Bueiro cheio de folhas na esquina.", pontos: 10, status: "pendente" },
    { at: agora - 30 * 60000, bairro: "Dom Bosco", local: "Rua José Loures Valle", tipo: "Água acumulada", texto: "Água acumulando na calçada.", pontos: 10, status: "pendente" }
  );
  var ocorrencias = lerLista(R.CHAVES.ocorrencias);
  ocorrencias.push(
    { area: "E-02", areaNome: "Dom Bosco", tipo: "Rachadura ou sinal de deslizamento", texto: "Rachadura nova no muro perto do barranco.", at: agora - 20 * 60000, status: "pendente" },
    { area: "E-02", areaNome: "Dom Bosco", tipo: "Rachadura ou sinal de deslizamento", texto: "Água barrenta saindo do barranco.", at: agora - 15 * 60000, status: "pendente" },
    { area: "E-02", areaNome: "Dom Bosco", tipo: "Árvore ou poste em risco", texto: "Poste inclinando no fim da rua.", at: agora - 10 * 60000, status: "pendente" },
    { area: "E-04", areaNome: "Linhares", tipo: "Alagamento", texto: "Rua da escola estadual alagada.", at: agora - 5 * 60000, status: "pendente" }
  );
  if (R.gravar(R.CHAVES.relatos, relatos) && R.gravar(R.CHAVES.ocorrencias, ocorrencias)) {
    alert("Exemplos carregados: 2 relatos e 4 ocorrências pendentes.");
  } else {
    alert("O navegador bloqueou o armazenamento. Os exemplos não foram salvos.");
  }
  atualizarTudo();
}

// Refaz a página inteira com os dados mais recentes.
function atualizarTudo() {
  atualizarFiltroDeTipos();
  mostrarResumo();
  mostrarRegistros();
  mostrarNiveis();
  mostrarAbrigos();
}

// Liga os botões e desenha a página.
function iniciar() {
  prepararFiltros();
  document.getElementById("b-abrigos").onclick = atualizarAbrigos;
  document.getElementById("b-exemplos").onclick = carregarExemplos;
  // Se a página inicial ou o morador salvarem algo em outra aba, a lista se atualiza.
  window.addEventListener("storage", function () {
    atualizarTudo();
  });
  atualizarTudo();
}

iniciar();
