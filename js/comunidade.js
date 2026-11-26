/* Comunidade Pluvial: rede social dos moradores (feed, grupos de bairro, mutirões, reações,
   comentários com respostas, notificações, perfis com selos, missões e ranking). */
(() => {
  const C = window.Comunidade, Canal = window.Canal;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  let st = C.load();
  const ui = { open: new Set(), all: new Set(), menu: null, reply: {}, fresh: null, flash: null, q: "", rank: "pessoas", photo: null, preset: null };

  /* ----- Utilidades ----- */
  let toastT;
  function toast(t) {
    const el = $("#toast");
    el.textContent = t; el.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 3600);
  }
  const COLORS = ["#9bd3c5", "#fbe7a1", "#f9d8c6", "#b9d6e3", "#9bd3e0", "#d6e6a8"];
  const GRADS = [["#0e2833", "#1d6f94"], ["#135a44", "#3fa585"], ["#8a2a1e", "#e0723a"], ["#2a4d7a", "#5ab0ff"], ["#6b5200", "#e0b030"], ["#134a5e", "#3fa0c4"]];
  const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const color = (id) => COLORS[hash(id) % COLORS.length];
  const grad = (b) => { const [a, z] = GRADS[hash(b) % GRADS.length]; return `linear-gradient(135deg, ${a}, ${z})`; };
  const initials = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const member = (id) => C.member(id) || { id, nome: "Morador", bairro: "" };
  function av(id, cls = "") {
    const m = member(id);
    return `<span class="av ${cls}${m.ativo ? " on" : ""}" style="--c:${color(id)}" aria-hidden="true">${esc(initials(m.nome))}</span>`;
  }
  const avBtn = (id, cls = "") => `<button type="button" class="av-btn" data-profile="${id}" aria-label="Ver perfil de ${esc(member(id).nome)}">${av(id, cls)}</button>`;
  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "agora";
    if (m < 60) return `${m} min`;
    const h = Math.round(m / 60);
    return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
  }
  const me = () => C.profile();
  const ptsOf = (id) => (id === "me" ? C.myPoints(st) : (C.MEMBROS.find((m) => m.id === id)?.base || 0) + C.pointsOf(id, st));
  const lvlOf = (id) => C.level(ptsOf(id)).name;
  const opts = (sel) => C.BAIRROS.map((b) => `<option ${b === sel ? "selected" : ""}>${esc(b)}</option>`).join("");
  const posts = () => st.posts.filter((p) => !p.hidden);
  const byId = (id) => st.posts.find((p) => p.id === id);

  /* Próxima data de um texto como "Sábado, 8h". */
  const DOW = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function nextDate(q) {
    const i = DOW.findIndex((d) => String(q).toLowerCase().includes(d));
    if (i < 0) return null;
    const d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + ((i - d.getDay() + 7) % 7 || 7));
    return d;
  }
  const tile = (q) => { const d = nextDate(q); return `<span class="date-tile" aria-hidden="true"><span>${d ? MON[d.getMonth()] : "data"}</span><strong>${d ? d.getDate() : "?"}</strong></span>`; };

  /* ----- Notificações, selos e níveis ----- */
  function notify(text, post, icon = "🔔") {
    st.notifs.unshift({ id: "n" + Date.now() + Math.random().toString(36).slice(2, 6), at: Date.now(), text, post, icon, read: false });
    st.notifs.length = Math.min(st.notifs.length, 50);
    const b = $("#bell");
    b.classList.remove("ring"); void b.offsetWidth; if (!reduced()) b.classList.add("ring");
  }
  function progress() {
    if (!me()) return;
    const have = new Set(st.badges || []);
    for (const id of C.myBadges(st)) if (!have.has(id)) {
      const [e, n] = C.BADGES[id];
      notify(`Você ganhou o selo ${e} ${n}!`, null, e);
      toast(`Novo selo: ${e} ${n}`);
      have.add(id);
    }
    st.badges = [...have];
    const lv = C.level(C.myPoints(st)).name;
    if (st.lastLevel && st.lastLevel !== lv && C.LEVELS.findIndex((l) => l[1] === lv) > C.LEVELS.findIndex((l) => l[1] === st.lastLevel)) notify(`Você subiu para o nível ${lv}!`, null, "⭐");
    st.lastLevel = lv;
  }
  function commit(before) {
    progress();
    if (!C.save(st)) toast("Sem espaço para salvar neste navegador. Tente uma foto menor.");
    render();
    if (before !== undefined) {
      const d = C.myPoints(st) - before;
      if (d > 0) toast(`+${d} ${d === 1 ? "ponto" : "pontos"} para você e para ${me()?.bairro || "o seu bairro"}`);
    }
  }

  /* Vizinhos fictícios reagem ao que você publica (deixa a demonstração viva). */
  const CANNED = {
    aviso: ["Vi também, obrigado por avisar.", "Passei aí agora, está igual.", "Já avisei a associação do bairro."],
    mutirao: ["Conta comigo!", "Levo duas pás.", "Posso levar água pra galera."],
    ajuda: ["Posso ajudar, moro perto.", "Tenho carro, se precisar."],
    dica: ["Ótima dica!", "Vou montar o meu hoje."],
  };
  function neighbors(post) {
    const pool = [...C.MEMBROS].sort((a, b) => (b.bairro === post.bairro) - (a.bairro === post.bairro) || hash(a.id + post.id) - hash(b.id + post.id)).slice(0, 4);
    const plan = [
      [3500, pool[0], "react"],
      [8000, pool[1], post.type === "aviso" ? "confirma" : post.type === "mutirao" ? "participa" : "react"],
      [13000, pool[2], "comment"],
      [19000, pool[3], "react"],
    ];
    plan.forEach(([ms, m, act]) => setTimeout(() => {
      const p = byId(post.id);
      if (!p || p.hidden || !m) return;
      const nome = m.nome;
      if (act === "react") {
        const r = p.type === "aviso" ? "importante" : p.type === "dica" ? "obrigado" : "apoio";
        if (Object.values(p.reacts).some((a) => a.includes(m.id))) return;
        p.reacts[r].push(m.id);
        notify(`${nome} reagiu ${C.REACTIONS[r][0]} à sua publicação.`, p.id, C.REACTIONS[r][0]);
      } else if (act === "confirma") {
        if (p.confirma.includes(m.id)) return;
        p.confirma.push(m.id);
        notify(`${nome} confirmou o seu aviso. +3 pontos.`, p.id, "✅");
      } else if (act === "participa") {
        if (p.participa.includes(m.id)) return;
        p.participa.push(m.id);
        notify(`${nome} vai participar do seu mutirão. +2 pontos.`, p.id, "📅");
      } else {
        const list = CANNED[p.type] || CANNED.dica;
        p.comments.push({ id: "c" + Date.now(), author: m.id, text: list[hash(m.id) % list.length], at: Date.now(), likes: [], replies: [] });
        notify(`${nome} comentou na sua publicação.`, p.id, "💬");
      }
      commit();
    }, reduced() ? ms / 4 : ms));
  }
  /* O autor responde quando você comenta pela primeira vez num post dele. */
  function authorReply(post, comment) {
    if (post.author === "me" || post.repliedMe) return;
    post.repliedMe = true;
    setTimeout(() => {
      const p = byId(post.id), c = p?.comments.find((x) => x.id === comment.id);
      if (!c) return;
      c.replies.push({ id: "r" + Date.now(), author: p.author, text: p.type === "ajuda" ? "Muito obrigado, vizinho! Vou te chamar." : "Valeu pela força!", at: Date.now(), likes: [], replies: [] });
      notify(`${member(p.author).nome} respondeu ao seu comentário.`, p.id, "💬");
      commit();
    }, reduced() ? 1500 : 6000);
  }

  /* ----- Perfil e entrada ----- */
  const dJoin = $("#dlg-join"), dPost = $("#dlg-post"), dProf = $("#dlg-profile");
  [dJoin, dPost, dProf].forEach((d) => d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.close(); }));
  const Auth = window.PluvialAuth;
  /* Sem conta: leva para a página de entrar e volta para cá depois. */
  function needMe() {
    if (me()) return false;
    toast("Entre ou crie sua conta para participar.");
    setTimeout(() => { location.href = Auth.loginUrl(); }, 500);
    return true;
  }
  function openJoin(edit = false) {
    const f = $("#join-form"), p = me();
    f.bairro.innerHTML = opts(p?.bairro || "Dom Bosco");
    f.nome.value = p?.nome || "";
    $("#dj-t").textContent = "Editar perfil";
    dJoin.showModal();
    setTimeout(() => f.nome.focus(), 50);
  }
  $("#join-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target, nome = f.nome.value.trim();
    if (!nome || !me()) return;
    C.setProfile({ nome, bairro: f.bairro.value });
    if (!st.joined.includes(f.bairro.value)) st.joined.push(f.bairro.value);
    dJoin.close();
    commit();
    toast("Perfil atualizado.");
  });

  /* ----- Publicar ----- */
  const form = $("#composer"), F = form.elements;
  F.sub.innerHTML = Object.entries(C.SUBS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  function openComposer(preset = {}) {
    if (needMe()) return;
    F.bairro.innerHTML = opts(preset.bairro || me().bairro);
    $$("input[name=type]", form).forEach((r) => { r.checked = r.value === (preset.type || "aviso"); });
    $("#dp-who").innerHTML = `${av("me")}<div>${esc(me().nome)}<small>Publicando no grupo do bairro</small></div>`;
    paintForm();
    dPost.showModal();
    setTimeout(() => F.text.focus(), 50);
    if (preset.photo) setTimeout(() => $("#photo").click(), 120);
  }
  function paintForm() {
    const type = form.querySelector("input[name=type]:checked").value;
    $$("[data-for]", form).forEach((el) => { el.hidden = el.dataset.for !== type; });
    const toCentral = type === "aviso" && F.sub.value === "encosta" && C.ENCOSTA[F.bairro.value];
    const hint = $("#hint");
    hint.className = "hint" + (toCentral ? " central" : "");
    hint.textContent = toCentral ? `Este aviso também vai para a central de risco, que acompanha a encosta de ${F.bairro.value}.`
      : type === "mutirao" ? "Organizar um mutirão vale 15 pontos, mais 2 por vizinho que participar."
      : type === "ajuda" ? "Combine ajuda entre vizinhos, como quem ajuda idosos e pessoas com deficiência a sair. Em perigo agora, ligue 193."
      : "Sem telefone, endereço completo ou foto de pessoas.";
    F.text.placeholder = type === "mutirao" ? "Conte o que vai ser feito e o que levar." : type === "aviso" ? "Onde fica e o que você viu?" : "O que está acontecendo no seu bairro?";
  }
  form.addEventListener("change", (e) => { if (e.target.id !== "photo") paintForm(); });
  /* Foto reduzida para caber no armazenamento do navegador. */
  $("#photo").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      ui.photo = cv.toDataURL("image/jpeg", 0.72);
      URL.revokeObjectURL(url);
      $("#photo-prev img").src = ui.photo;
      $("#photo-prev").hidden = false;
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("Não foi possível abrir essa imagem."); };
    img.src = url;
  });
  $("#photo-x").addEventListener("click", () => { ui.photo = null; $("#photo-prev").hidden = true; });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = F.text.value.trim();
    if (!text) return;
    const before = C.myPoints(st);
    const type = form.querySelector("input[name=type]:checked").value;
    const post = { id: "p" + Date.now(), type, author: "me", bairro: F.bairro.value, text, at: Date.now(), reacts: C.emptyReacts(), confirma: [], contesta: [], participa: [], interesse: [], comments: [] };
    if (ui.photo) post.img = ui.photo;
    if (type === "aviso") post.sub = F.sub.value;
    if (type === "mutirao") { post.quando = F.quando.value.trim() || "A combinar"; post.onde = F.onde.value.trim() || "A combinar"; post.participa = ["me"]; }
    const area = type === "aviso" && post.sub === "encosta" && C.ENCOSTA[post.bairro];
    if (area && Canal) {
      post.req = `com-${post.id}`;
      post.central = "enviado";
      Canal.send("relato", { area, req: post.req, origem: "comunidade", tipo: `${C.SUBS.encosta.toLowerCase()} (comunidade)` });
    }
    st.posts.unshift(post);
    if (!st.joined.includes(post.bairro)) st.joined.push(post.bairro);
    C.logAction(type === "aviso" ? "aviso" : type, st);
    if (type === "mutirao") C.logAction("participa", st);
    form.reset(); ui.photo = null; $("#photo-prev").hidden = true;
    dPost.close();
    ui.fresh = post.id;
    if (!["feed", "grupo", "avisos", "ajuda", "eventos"].includes(route().view)) location.hash = "#/feed";
    commit(before);
    neighbors(post);
  });

  /* Avisos de bueiro resolvidos pela equipe de limpeza (registro do painel dos bueiros). */
  const drained = () => { try { return JSON.parse(localStorage.getItem("pluvial-bueiros-v1"))?.resolved || {}; } catch { return {}; } };

  /* ----- Post ----- */
  function postHTML(p) {
    const a = member(p.author), mine = p.author === "me";
    const mineR = Object.keys(p.reacts).find((k) => p.reacts[k].includes("me"));
    const total = C.reactCount(p), ncom = C.allComments(p).length;
    const top = Object.entries(p.reacts).filter(([, v]) => v.length).sort((x, y) => y[1].length - x[1].length).slice(0, 3);
    const saved = st.saved.includes(p.id);
    let body = `<span class="tag ${p.type}">${p.type === "aviso" ? "⚠️ " + esc(C.SUBS[p.sub] || "Aviso") : { mutirao: "📅 Mutirão", ajuda: "🤝 Rede de ajuda", dica: "💡 Dica" }[p.type]}</span>`;
    body += `<p class="txt${p.text.length < 90 && !p.img && p.type === "dica" ? " big" : ""}">${esc(p.text)}</p>`;
    if (p.type === "aviso") {
      const contested = C.contested(p);
      body += `<div class="status-line">${p.resolvido || drained()[`p:${p.id}`] ? `<span class="state ok">✓ Resolvido pela equipe de limpeza</span>` : ""}${contested ? `<span class="state bad">Contestado por vizinhos</span>` : p.confirma.length ? `<span class="state ok">✓ Confirmado por ${p.confirma.length} ${p.confirma.length === 1 ? "vizinho" : "vizinhos"}</span>` : `<span class="state">Aguardando confirmação</span>`}
        ${p.central === "recebido" ? `<span class="state central">A central de risco recebeu</span>` : p.central === "enviado" ? `<span class="state central">Enviado à central de risco</span>` : ""}</div>
        <div class="vote"><button type="button" data-act="confirma" aria-pressed="${p.confirma.includes("me")}" ${mine ? "disabled" : ""}>Confirmo · ${p.confirma.length}</button><button type="button" data-act="contesta" aria-pressed="${p.contesta.includes("me")}" ${mine ? "disabled" : ""}>Não confirmo · ${p.contesta.length}</button></div>`;
    }
    if (p.img) body += `<img class="photo" src="${p.img}" alt="Foto enviada por ${esc(a.nome)}" loading="lazy" />`;
    if (p.type === "mutirao") {
      const goers = p.participa.slice(0, 5);
      body += `<div class="event">${tile(p.quando)}<div><b>${esc(p.quando)}</b><p>📍 ${esc(p.onde)}</p>
        <div class="goers"><span class="stack">${goers.map((g) => av(g, "xs")).join("")}</span>${p.participa.length} ${p.participa.length === 1 ? "vai" : "vão"} · ${p.interesse.length} com interesse</div></div>
        <div class="event-acts"><button type="button" class="go" data-act="participa" aria-pressed="${p.participa.includes("me")}" ${mine ? "disabled" : ""}>${p.participa.includes("me") ? "✓ Vou participar" : "Vou participar"}</button><button type="button" data-act="interesse" aria-pressed="${p.interesse.includes("me")}" ${mine ? "disabled" : ""}>${p.interesse.includes("me") ? "★ Interessado" : "☆ Tenho interesse"}</button></div></div>`;
    }
    const counts = (total || ncom) ? `<div class="counts"><span class="rx">${total ? `<span class="emo">${top.map(([k]) => `<span>${C.REACTIONS[k][0]}</span>`).join("")}</span>${total}` : ""}</span>${ncom ? `<button type="button" data-act="comentar">${ncom} ${ncom === 1 ? "comentário" : "comentários"}</button>` : ""}</div>` : `<div class="counts"></div>`;
    const picker = `<div class="picker" role="group" aria-label="Escolher reação">${Object.entries(C.REACTIONS).map(([k, [e, n]]) => `<button type="button" data-act="react" data-r="${k}" title="${n}" aria-label="${n}" aria-pressed="${mineR === k}">${e}</button>`).join("")}</div>`;
    const actbar = `<div class="actbar"><div class="rx-wrap"><button type="button" data-act="react-main" class="${mineR ? "on" : ""}">${mineR ? `${C.REACTIONS[mineR][0]} ${C.REACTIONS[mineR][1]}` : "👍 Apoiar"}</button>${picker}</div>
      <button type="button" data-act="comentar">💬 Comentar</button><button type="button" data-act="salvar" class="${saved ? "on" : ""}">${saved ? "🔖 Salvo" : "🔖 Salvar"}</button></div>`;
    const menu = ui.menu === p.id ? `<div class="menu" role="menu">${saved ? `<button type="button" data-act="salvar" role="menuitem">Remover dos salvos</button>` : `<button type="button" data-act="salvar" role="menuitem">Salvar publicação</button>`}${mine ? `<button type="button" data-act="excluir" role="menuitem">Excluir publicação</button>` : `<button type="button" data-act="denunciar" role="menuitem">Denunciar publicação</button>`}<button type="button" data-act="grupo" role="menuitem">Ir para o grupo ${esc(p.bairro)}</button></div>` : "";
    return `<li class="post card${p.id === ui.fresh ? " new" : ""}${p.id === ui.flash ? " flash" : ""}" data-id="${p.id}" id="post-${p.id}">
      <div class="post-h">${avBtn(p.author)}<div class="who"><button type="button" class="name" data-profile="${p.author}">${esc(a.nome)}${mine ? " (você)" : ""}</button><span class="lvl-chip">${lvlOf(p.author)}</span> ▸ <a class="grp" href="#/grupo/${encodeURIComponent(p.bairro)}">Vizinhos do ${esc(p.bairro)}</a><small>${ago(p.at)} · 🌐 comunidade</small></div>
        <div class="menu-wrap"><button type="button" class="dots" data-act="menu" aria-label="Mais opções" aria-expanded="${ui.menu === p.id}">⋯</button>${menu}</div></div>
      ${body}${counts}${actbar}${commentsHTML(p)}</li>`;
  }
  function cmHTML(p, c, isReply) {
    const liked = c.likes?.includes("me");
    return `<li class="cm">${avBtn(c.author, "s")}<div class="cm-body"><div class="bubble"><b>${esc(member(c.author).nome)}</b>${esc(c.text)}</div>
      <div class="cm-acts"><button type="button" data-act="like" data-c="${c.id}" class="${liked ? "on" : ""}">${liked ? "Apoiado" : "Apoiar"}${c.likes?.length ? ` · ${c.likes.length}` : ""}</button>${isReply ? "" : `<button type="button" data-act="reply" data-c="${c.id}">Responder</button>`}<span>${ago(c.at)}</span></div>
      ${!isReply && c.replies?.length ? `<ol class="replies">${c.replies.map((r) => cmHTML(p, r, true)).join("")}</ol>` : ""}</div></li>`;
  }
  function commentsHTML(p) {
    if (!ui.open.has(p.id) && !p.comments.length) return "";
    const list = ui.all.has(p.id) || ui.open.has(p.id) ? p.comments : p.comments.slice(-1);
    const hidden = p.comments.length - list.length;
    const rt = ui.reply[p.id] && p.comments.find((c) => c.id === ui.reply[p.id]);
    return `<div class="comments">${hidden ? `<button type="button" class="more" data-act="all">Ver mais ${hidden} ${hidden === 1 ? "comentário" : "comentários"}</button>` : ""}
      <ol>${list.map((c) => cmHTML(p, c, false)).join("")}</ol>
      ${ui.open.has(p.id) ? `${rt ? `<span class="reply-to">Respondendo a ${esc(member(rt.author).nome)} · <button type="button" class="more" data-act="noreply">cancelar</button></span>` : ""}
      <form class="cform">${av("me", "s")}<input name="c" maxlength="280" aria-label="Escreva um comentário" placeholder="${rt ? "Escreva uma resposta" : p.type === "ajuda" ? "Ofereça ajuda ou combine com o vizinho" : "Escreva um comentário"}" /><button type="submit">Enviar</button></form>` : ""}</div>`;
  }

  /* ----- Ações nos posts (delegadas) ----- */
  const center = $("#view");
  center.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const li = b.closest("[data-id]");
    const p = li && byId(li.dataset.id);
    const act = b.dataset.act;
    if (!p) return;
    if (act === "menu") { ui.menu = ui.menu === p.id ? null : p.id; render(); return; }
    if (act === "grupo") { ui.menu = null; location.hash = `#/grupo/${encodeURIComponent(p.bairro)}`; return; }
    if (act === "comentar") { ui.open.add(p.id); render(); $(`#post-${p.id} .cform input`)?.focus(); return; }
    if (act === "all") { ui.all.add(p.id); render(); return; }
    if (act === "noreply") { delete ui.reply[p.id]; render(); return; }
    if (act === "reply") { ui.open.add(p.id); ui.reply[p.id] = b.dataset.c; render(); $(`#post-${p.id} .cform input`)?.focus(); return; }
    if (needMe()) return;
    const before = C.myPoints(st);
    ui.menu = null;
    if (act === "react" || act === "react-main") {
      const cur = Object.keys(p.reacts).find((k) => p.reacts[k].includes("me"));
      Object.values(p.reacts).forEach((arr) => { const i = arr.indexOf("me"); if (i >= 0) arr.splice(i, 1); });
      const want = act === "react" ? b.dataset.r : cur ? null : "apoio";
      if (want && want !== (act === "react" ? cur : null)) p.reacts[want].push("me");
      b.closest(".picker")?.classList.remove("open");
    }
    if (act === "confirma" || act === "contesta") {
      const other = act === "confirma" ? "contesta" : "confirma";
      const i = p[other].indexOf("me"); if (i >= 0) p[other].splice(i, 1);
      const j = p[act].indexOf("me");
      if (j >= 0) p[act].splice(j, 1); else { p[act].push("me"); C.logAction("confirma", st); }
    }
    if (act === "participa" || act === "interesse") {
      const other = act === "participa" ? "interesse" : "participa";
      const i = p[other].indexOf("me"); if (i >= 0) p[other].splice(i, 1);
      const j = p[act].indexOf("me");
      if (j >= 0) p[act].splice(j, 1); else { p[act].push("me"); if (act === "participa") C.logAction("participa", st); }
    }
    if (act === "like") {
      const c = C.allComments(p).find((x) => x.id === b.dataset.c);
      if (c) { c.likes = c.likes || []; const i = c.likes.indexOf("me"); if (i >= 0) c.likes.splice(i, 1); else c.likes.push("me"); }
    }
    if (act === "salvar") {
      const i = st.saved.indexOf(p.id);
      if (i >= 0) st.saved.splice(i, 1); else { st.saved.push(p.id); toast("Publicação salva."); }
    }
    if (act === "denunciar") { p.hidden = true; toast("Publicação ocultada. Na versão real, moderadores do bairro analisariam a denúncia."); }
    if (act === "excluir") { st.posts.splice(st.posts.indexOf(p), 1); toast("Publicação excluída."); }
    commit(before);
  });
  /* Toque longo no botão Apoiar abre as reações no celular. */
  let pressT;
  center.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("[data-act=react-main]");
    if (!b || e.pointerType === "mouse") return;
    pressT = setTimeout(() => { b.nextElementSibling.classList.add("open"); pressT = "done"; }, 450);
  });
  center.addEventListener("pointerup", () => { if (pressT !== "done") clearTimeout(pressT); });
  center.addEventListener("click", (e) => { if (pressT === "done" && e.target.closest("[data-act=react-main]")) { e.stopImmediatePropagation(); pressT = null; } }, true);

  center.addEventListener("submit", (e) => {
    if (!e.target.classList.contains("cform")) return;
    e.preventDefault();
    if (needMe()) return;
    const p = byId(e.target.closest("[data-id]").dataset.id);
    const text = e.target.c.value.trim();
    if (!p || !text) return;
    const before = C.myPoints(st);
    const c = { id: "c" + Date.now(), author: "me", text: text.slice(0, 280), at: Date.now(), likes: [], replies: [] };
    const parent = ui.reply[p.id] && p.comments.find((x) => x.id === ui.reply[p.id]);
    if (parent) parent.replies.push(c); else p.comments.push(c);
    delete ui.reply[p.id];
    C.logAction(p.type === "ajuda" && p.author !== "me" ? "ajuda" : "comenta", st);
    if (!parent) authorReply(p, c);
    commit(before);
    $(`#post-${p.id} .cform input`)?.focus();
  });

  /* ----- Visões ----- */
  function route() {
    const [, view = "feed", arg] = decodeURIComponent(location.hash).match(/^#\/([^/]+)\/?(.*)$/) || [];
    return { view, arg };
  }
  const matchQ = (p) => !ui.q || `${p.text} ${member(p.author).nome} ${p.bairro} ${C.TYPES[p.type]}`.toLowerCase().includes(ui.q);
  const feedList = (list) => {
    list = list.filter(matchQ).sort((a, b) => b.at - a.at);
    return list.length ? `<ol class="feed">${list.map(postHTML).join("")}</ol>` : `<div class="card empty-card">${ui.q ? `Nada encontrado para “${esc(ui.q)}”.` : "Nada por aqui ainda. Que tal publicar o primeiro?"}</div>`;
  };
  function composeBox(preset = {}) {
    const p = me();
    if (!p) return `<div class="card compose guest"><b>Faça parte da comunidade do seu bairro</b><p>Entre para publicar avisos, organizar mutirões, reagir e ganhar pontos.</p><div class="guest-btns"><a class="primary" href="${Auth.loginUrl()}">Entrar</a><a class="ghost-pill" href="entrar.html?modo=criar&volta=${encodeURIComponent("comunidade.html" + location.hash)}">Criar conta</a></div></div>`;
    return `<div class="card compose"><div class="compose-top">${av("me")}<button type="button" class="fake" data-compose='${JSON.stringify(preset)}'>O que está acontecendo ${preset.bairro ? "no " + esc(preset.bairro) : "no seu bairro"}, ${esc(p.nome.split(" ")[0])}?</button></div>
      <div class="compose-acts"><button type="button" data-compose='${JSON.stringify({ ...preset, type: "aviso" })}'>⚠️ Aviso</button><button type="button" data-compose='${JSON.stringify({ ...preset, type: "mutirao" })}'>📅 Mutirão</button><button type="button" data-compose='${JSON.stringify({ ...preset, type: "ajuda" })}'>🤝 Ajuda</button><button type="button" data-compose='${JSON.stringify({ ...preset, photo: true })}'>📷 Foto</button></div></div>`;
  }
  const LV = ["Observação", "Atenção", "Alerta", "Alerta máximo"];
  const AREA_NOME = Object.fromEntries(Object.entries(C.ENCOSTA).map(([b, id]) => [id, b]));
  function stories() {
    const s = Canal?.lastState();
    const alerts = (s?.areas || []).filter((a) => a.alert !== null && a.alert !== undefined);
    const ev = posts().filter((p) => p.type === "mutirao").sort((a, b) => (nextDate(a.quando)?.getTime() || 9e15) - (nextDate(b.quando)?.getTime() || 9e15))[0];
    const mis = C.missions(st).find((m) => !m.done);
    const topB = C.bairroRanking(st)[0];
    const dica = posts().filter((p) => p.type === "dica")[new Date().getDate() % Math.max(1, posts().filter((p) => p.type === "dica").length)];
    const cards = [
      `<button type="button" class="story new" data-compose='{}'><span class="plus">+</span><b>Criar publicação</b><small>Aviso, mutirão ou ajuda</small></button>`,
      alerts.length
        ? `<a class="story" style="--s:linear-gradient(160deg,#c4312a,#7d1b16)" href="totem.html?id=${alerts[0].id.replace("E", "T")}"><span class="big">🚨</span><b>Alerta oficial</b><small>${esc(AREA_NOME[alerts[0].id])}: ${LV[alerts[0].alert]}. Veja a rota.</small></a>`
        : `<a class="story" style="--s:linear-gradient(160deg,#135a44,#3fa585)" href="central.html"><span class="big">🛰️</span><b>Sem alerta oficial</b><small>A central acompanha as encostas. Isso não garante segurança.</small></a>`,
      ev ? `<button type="button" class="story" style="--s:linear-gradient(160deg,#6b5200,#e0b030)" data-go="${ev.id}"><span class="big">📅</span><b>${esc(ev.quando)}</b><small>Mutirão no ${esc(ev.bairro)} · ${ev.participa.length} vão</small></button>` : "",
      mis ? `<a class="story" style="--s:linear-gradient(160deg,#0e2833,#1d6f94)" href="#/ranking"><span class="big">🎯</span><b>Missão</b><small>${esc(mis.text)} (${mis.n}/${mis.goal})</small></a>` : "",
      `<a class="story" style="--s:${grad(topB.bairro)}" href="#/grupo/${encodeURIComponent(topB.bairro)}"><span class="big">🏆</span><b>${esc(topB.bairro)}</b><small>Bairro que mais cuida: ${topB.pts} pontos</small></a>`,
      dica ? `<button type="button" class="story" style="--s:linear-gradient(160deg,#2a4d7a,#5ab0ff)" data-go="${dica.id}"><span class="big">💡</span><b>Dica do dia</b><small>${esc(dica.text.slice(0, 60))}…</small></button>` : "",
    ];
    return `<div class="stories" aria-label="Destaques">${cards.join("")}</div>`;
  }
  function groupCard(b) {
    const joined = st.joined.includes(b), n = posts().filter((p) => p.bairro === b).length;
    return `<div class="card gcard"><div class="cover" style="--g:${grad(b)}"></div><div class="gin"><b>Vizinhos do ${esc(b)}</b><small>${C.groupSize(b)} membros · ${n} ${n === 1 ? "publicação" : "publicações"}</small>${C.ENCOSTA[b] ? `<span class="chip">Encosta monitorada</span>` : ""}
      <div class="gbtns"><a href="#/grupo/${encodeURIComponent(b)}">Ver</a><button type="button" class="${joined ? "" : "join"}" data-join="${esc(b)}">${joined ? "✓ Participando" : "Entrar"}</button></div></div></div>`;
  }
  function rankingView() {
    const tabs = `<div class="rank-tabs" role="tablist"><button type="button" role="tab" data-rank="pessoas" aria-selected="${ui.rank === "pessoas"}">Moradores</button><button type="button" role="tab" data-rank="bairros" aria-selected="${ui.rank === "bairros"}">Bairros</button></div>`;
    let inner;
    if (ui.rank === "pessoas") {
      const list = C.memberRanking(st);
      const [a, b, c] = list;
      const pod = (m, n) => m ? `<div>${avBtn(m.id, "l")}<b>${esc(m.nome)}</b><small>${m.pts} pts</small><span class="base">${n}</span></div>` : "<div></div>";
      inner = `<div class="podium">${pod(b, 2)}${pod(a, 1)}${pod(c, 3)}</div><ol class="rank-list">${list.map((m, i) => `<li class="${m.me ? "me" : ""}"><span class="pos">${i + 1}</span>${avBtn(m.id, "")}<span><b>${esc(m.nome)}${m.me ? " (você)" : ""}</b><small>${esc(m.bairro)} · ${C.level(m.pts).name}</small></span><span class="pts">${m.pts}</span></li>`).join("")}</ol>`;
    } else {
      const mine = me()?.bairro;
      inner = `<ol class="rank-list">${C.bairroRanking(st).map((b, i) => `<li class="${b.bairro === mine ? "me" : ""}"><span class="pos">${i + 1}</span><a class="gav" style="--g:${grad(b.bairro)}" href="#/grupo/${encodeURIComponent(b.bairro)}" aria-label="Grupo ${esc(b.bairro)}">${esc(initials(b.bairro))}</a><span><b>${esc(b.bairro)}</b><small>${C.groupSize(b.bairro)} membros${C.ENCOSTA[b.bairro] ? " · encosta monitorada" : ""}</small></span><span class="pts">${b.pts}</span></li>`).join("")}</ol>`;
    }
    const pts = me() ? C.myPoints(st) : 0;
    return `<div class="view-h"><h1>Ranking</h1><p>Quem mais cuida da própria rua. Os outros moradores são fictícios.</p></div>
      ${tabs}<div class="card">${inner}</div>
      <div class="card sec-card"><h2>Níveis</h2></div>
      <div class="card" style="margin-top:-12px"><div class="levels">${C.LEVELS.map(([n, name]) => `<div class="${pts >= n ? "on" : ""}"><b>${name}</b>${n} pontos</div>`).join("")}</div></div>
      <div class="card sec-card"><h2>Missões da semana</h2><ul class="missions">${missionsHTML()}</ul></div>
      <div class="card sec-card wallet-link"><h2>Troque seus pontos</h2><p>Descontos no comércio do bairro, mudas de árvore, kit chuva e mais.</p><a class="primary" href="#/beneficios">Ver benefícios</a></div>
      <div class="card sec-card"><h2>Como ganhar pontos</h2></div>
      <div class="card" style="margin-top:-12px"><ul class="how"><li><b>+10</b> relato de bueiro na página inicial</li><li><b>+10</b> participar de um mutirão</li><li><b>+15</b> organizar um mutirão (+2 por participante)</li><li><b>+5</b> publicar um aviso (+3 por vizinho que confirmar)</li><li><b>+2</b> comentar ou responder · <b>+1</b> confirmar ou contestar</li><li><b>+1</b> por reação recebida · <b>+${C.BONUS}</b> por missão da semana</li><li>Aviso contestado por mais vizinhos do que confirmaram não vale pontos.</li></ul></div>`;
  }
  /* ----- Benefícios: trocar pontos por descontos e vivências ----- */
  const fmtDia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  function rewardsView() {
    const p = me(), bal = p ? C.balance(st) : 0, total = p ? C.myPoints(st) : 0;
    const head = `<div class="view-h"><h1>Trocar pontos</h1><p>Cada relato, mutirão e ajuda vale pontos. Troque por descontos e vivências na cidade. Parceiros fictícios nesta demonstração.</p></div>`;
    const wallet = p
      ? `<div class="card wallet"><div><small>Seu saldo para trocar</small><strong>${bal} pontos</strong><span>${total} ganhos · ${C.spent(st)} já trocados · o nível continua ${C.level(total).name}</span></div><a class="ghost-pill" href="#/ranking">Como ganhar mais</a></div>`
      : `<div class="card compose guest"><b>Entre para trocar seus pontos</b><p>Os pontos ficam na sua conta.</p><div class="guest-btns"><a class="primary" href="${Auth.loginUrl()}">Entrar</a></div></div>`;
    const cards = C.REWARDS.map((r) => {
      const falta = r.custo - bal, armed = ui.redeem === r.id;
      const btn = !p ? `<a class="rw-btn" href="${Auth.loginUrl()}">Entrar para trocar</a>`
        : falta > 0 ? `<button type="button" class="rw-btn" disabled>Faltam ${falta} pontos</button>`
        : armed ? `<button type="button" class="rw-btn go" data-redeem="${r.id}" data-confirm="1">Confirmar troca (−${r.custo})</button>`
        : `<button type="button" class="rw-btn" data-redeem="${r.id}">Trocar por ${r.custo} pontos</button>`;
      return `<article class="card reward${falta > 0 ? " locked" : ""}"><span class="rw-ic" aria-hidden="true">${r.icone}</span><h3>${esc(r.titulo)}</h3><p>${esc(r.texto)}</p><small>${esc(r.parceiro)}</small><div class="rw-foot"><span class="rw-cost">${r.custo} pts</span>${btn}</div></article>`;
    }).join("");
    const mine = (st.trocas || []).slice().reverse();
    const vouchers = p && mine.length ? `<div class="card sec-card"><h2>Seus cupons</h2><ul class="vouchers">${mine.map((t) => `<li><span><b>${esc(t.titulo)}</b><small>Trocado em ${fmtDia.format(new Date(t.at))} · válido até ${fmtDia.format(new Date(t.validade))}</small></span><code>${esc(t.codigo)}</code></li>`).join("")}</ul><p class="muted">Mostre o código no parceiro. Nesta demonstração, os códigos não têm valor real.</p></div>` : "";
    return head + wallet + `<div class="rewards">${cards}</div>` + vouchers;
  }
  center.addEventListener("click", (e) => {
    const b = e.target.closest("[data-redeem]");
    if (!b) return;
    if (needMe()) return;
    if (!b.dataset.confirm) { ui.redeem = b.dataset.redeem; render(); return; }
    try {
      const t = C.redeem(st, b.dataset.redeem);
      ui.redeem = null;
      notify(`Você trocou ${t.custo} pontos por: ${t.titulo}. Código ${t.codigo}.`, null, "🎁");
      commit();
      toast(`Troca feita! Seu código: ${t.codigo}`);
    } catch (err) { toast(err.message); ui.redeem = null; render(); }
  });

  const missionsHTML = () => C.missions(st).map((m) => `<li class="${m.done ? "done" : ""}">${m.done ? "✓ " : ""}${esc(m.text)}<div class="bar"><span class="tube" aria-hidden="true"><i style="transform:scaleX(${m.n / m.goal})"></i></span>${m.n}/${m.goal}</div></li>`).join("");

  function renderCenter() {
    const { view, arg } = route();
    let html = "";
    if (view === "feed") html = stories() + composeBox() + feedList(posts());
    else if (view === "avisos") html = `<div class="view-h"><h1>Avisos de risco</h1><p>Confirme ou conteste o que os vizinhos viram. Sinais de deslizamento vão para a central.</p></div>` + composeBox({ type: "aviso" }) + feedList(posts().filter((p) => p.type === "aviso"));
    else if (view === "ajuda") html = `<div class="view-h"><h1>Rede de ajuda</h1><p>Combine quem ajuda quem quando a chuva apertar. Em perigo agora, ligue 193.</p></div>` + composeBox({ type: "ajuda" }) + feedList(posts().filter((p) => p.type === "ajuda"));
    else if (view === "salvos") html = `<div class="view-h"><h1>Salvos</h1><p>Publicações que você guardou.</p></div>` + feedList(posts().filter((p) => st.saved.includes(p.id)));
    else if (view === "eventos") html = `<div class="view-h"><h1>Mutirões</h1><p>Limpeza de bueiros, plantio em encostas e outras ações no seu bairro.</p></div>` + composeBox({ type: "mutirao" }) + feedList(posts().filter((p) => p.type === "mutirao"));
    else if (view === "grupos") html = `<div class="view-h"><h1>Grupos de bairro</h1><p>Cada bairro tem o seu grupo. Entre nos que você frequenta.</p></div><div class="groups">${C.BAIRROS.map(groupCard).join("")}</div>`;
    else if (view === "grupo" && C.BAIRROS.includes(arg)) {
      const joined = st.joined.includes(arg), rank = C.bairroRanking(st).findIndex((b) => b.bairro === arg) + 1;
      html = `<div class="card ghead"><div class="cover" style="--g:${grad(arg)}">${C.ENCOSTA[arg] ? `<span>Encosta monitorada pela central</span>` : ""}</div><div class="gin"><div><h1>Vizinhos do ${esc(arg)}</h1><p>Grupo público · ${C.groupSize(arg)} membros · ${rank}º no ranking de bairros</p></div><button type="button" class="gbtn ${joined ? "joined" : ""}" data-join="${esc(arg)}">${joined ? "✓ Participando" : "+ Entrar no grupo"}</button></div></div>`
        + composeBox({ bairro: arg }) + feedList(posts().filter((p) => p.bairro === arg));
    } else if (view === "ranking") html = rankingView();
    else if (view === "beneficios") html = rewardsView();
    else if (view === "menu") html = `<div class="card" style="padding:12px">${$(".left").innerHTML}</div>`;
    else { location.hash = "#/feed"; return; }
    center.innerHTML = html;
    ui.fresh = null;
    if (ui.flash) {
      const el = $(`#post-${ui.flash}`);
      if (el) el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "center" });
      ui.flash = null;
    }
  }

  /* ----- Laterais e topo ----- */
  function renderSides() {
    const p = me(), { view } = route();
    $("#me-btn").innerHTML = p ? av("me") : `<span class="av" style="--c:#d5e3ea">?</span>`;
    $("#me-btn").setAttribute("aria-label", p ? "Meu perfil" : "Entrar");
    $("#login-btn").hidden = !!p;
    $("#me-btn").hidden = !p;
    $("#me-line").innerHTML = p ? `${av("me")}<span>${esc(p.nome)}<small>${esc(p.bairro)} · ${C.level(C.myPoints(st)).name} · ${C.myPoints(st)} pts</small></span>` : `<span class="av" style="--c:#d5e3ea">?</span><span>Entrar ou criar conta<small>Para publicar, reagir e pontuar</small></span>`;
    $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === view));
    $("#my-groups").innerHTML = st.joined.length
      ? st.joined.map((b) => `<li><a href="#/grupo/${encodeURIComponent(b)}"><span class="gav" style="--g:${grad(b)}">${esc(initials(b))}</span><span>Vizinhos do ${esc(b)}<small>${posts().filter((x) => x.bairro === b).length} publicações</small></span></a></li>`).join("")
      : `<li class="empty">Você ainda não participa de grupos. <a href="#/grupos">Ver grupos</a></li>`;
    const evs = posts().filter((x) => x.type === "mutirao").sort((a, b) => (nextDate(a.quando)?.getTime() || 9e15) - (nextDate(b.quando)?.getTime() || 9e15)).slice(0, 3);
    $("#mini-events").innerHTML = evs.map((e) => `<li><a href="#/eventos" data-go="${e.id}">${tile(e.quando)}<span><b>${esc(e.text.slice(0, 48))}${e.text.length > 48 ? "…" : ""}</b><small>${esc(e.bairro)} · ${e.participa.length} vão</small></span></a></li>`).join("") || `<li class="muted">Nenhum mutirão marcado.</li>`;
    $("#bonus").textContent = C.BONUS;
    $("#missions").innerHTML = missionsHTML();
    const list = C.memberRanking(st);
    $("#mini-rank").innerHTML = list.slice(0, 5).map((m, i) => `<li class="${m.me ? "me" : ""}"><span class="pos">${i + 1}</span>${avBtn(m.id, "s")}<span><b>${esc(m.nome)}</b><small>${esc(m.bairro)}</small></span><span class="pts">${m.pts}</span></li>`).join("");
    $("#online").innerHTML = C.MEMBROS.filter((m) => m.ativo).map((m) => `<li><button type="button" data-profile="${m.id}">${av(m.id, "s")}<span>${esc(m.nome)}<small>${esc(m.bairro)}</small></span></button></li>`).join("");
    const unread = st.notifs.filter((n) => !n.read).length;
    $("#bell-n").hidden = !unread;
    $("#bell-n").textContent = unread > 9 ? "9+" : unread;
    $("#notif-list").innerHTML = st.notifs.length ? st.notifs.map((n) => `<li class="${n.read ? "read" : ""}"><button type="button" data-notif="${n.id}"><span class="av" style="--c:${color(n.id)}">${n.icon}</span><span>${esc(n.text)}<small>${ago(n.at)}</small></span><span class="dot"></span></button></li>`).join("") : `<li class="none">Nada novo por aqui. Publique algo e os vizinhos vão interagir.</li>`;
  }
  function render() {
    const focus = document.activeElement, fid = focus?.closest?.("[data-id]")?.dataset.id, val = focus?.name === "c" ? focus.value : null;
    renderSides();
    renderCenter();
    if (fid && val !== null) { const inp = $(`#post-${fid} .cform input`); if (inp) { inp.value = val; inp.focus(); } }
  }

  /* ----- Eventos globais (delegados) ----- */
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t.closest(".bell-wrap")) closeBell();
    const prof = t.closest("[data-profile]");
    if (prof) { e.preventDefault(); openProfile(prof.dataset.profile); return; }
    const comp = t.closest("[data-compose]");
    if (comp) { openComposer(JSON.parse(comp.dataset.compose || "{}")); return; }
    const go = t.closest("[data-go]");
    if (go) { e.preventDefault(); ui.flash = go.dataset.go; if (route().view !== "feed") location.hash = "#/feed"; else render(); return; }
    const join = t.closest("[data-join]");
    if (join) {
      if (needMe()) return;
      const b = join.dataset.join, i = st.joined.indexOf(b);
      if (i >= 0) st.joined.splice(i, 1); else { st.joined.push(b); toast(`Você entrou no grupo Vizinhos do ${b}.`); }
      commit();
      return;
    }
    const rk = t.closest("[data-rank]");
    if (rk) { ui.rank = rk.dataset.rank; render(); return; }
    const nt = t.closest("[data-notif]");
    if (nt) {
      const n = st.notifs.find((x) => x.id === nt.dataset.notif);
      if (n) { n.read = true; C.save(st); closeBell(); if (n.post && byId(n.post)) { ui.flash = n.post; ui.open.add(n.post); if (route().view !== "feed") location.hash = "#/feed"; } render(); }
      return;
    }
    if (t.closest("#me-line") || t.closest("#me-btn")) { me() ? openProfile("me") : (location.href = Auth.loginUrl()); return; }
    if (ui.menu && !t.closest(".menu-wrap")) { ui.menu = null; render(); }
    if (!t.closest(".bell-wrap")) closeBell();
  });
  const bell = $("#bell"), notifs = $("#notifs");
  function closeBell() { notifs.hidden = true; bell.setAttribute("aria-expanded", "false"); }
  bell.addEventListener("click", (e) => { e.stopPropagation(); notifs.hidden = !notifs.hidden; bell.setAttribute("aria-expanded", String(!notifs.hidden)); });
  $("#read-all").addEventListener("click", (e) => { e.stopPropagation(); st.notifs.forEach((n) => { n.read = true; }); C.save(st); render(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { closeBell(); if (ui.menu) { ui.menu = null; render(); } } });
  $("#q").addEventListener("input", (e) => { ui.q = e.target.value.trim().toLowerCase(); renderCenter(); });
  addEventListener("hashchange", () => { ui.menu = null; render(); scrollTo({ top: 0, behavior: "auto" }); });

  /* ----- Perfil (janela) ----- */
  function openProfile(id) {
    const m = member(id), mine = id === "me";
    if (mine && !me()) { location.href = Auth.loginUrl(); return; }
    const pts = ptsOf(id), lv = C.level(pts), rank = C.memberRanking(st).findIndex((x) => x.id === id) + 1;
    const theirs = posts().filter((p) => p.author === id).sort((a, b) => b.at - a.at);
    const got = new Set(C.badgesOf(id, st));
    const confs = posts().filter((p) => p.confirma.includes(id) || p.contesta.includes(id)).length;
    const muts = posts().filter((p) => p.participa.includes(id)).length;
    dProf.innerHTML = `<button type="button" class="pf-close" data-close aria-label="Fechar">×</button><div class="cover" style="--g:${grad(m.bairro || id)}"></div>
      <div class="pf-top">${av(id, "xl")}<div class="who"><h2>${esc(m.nome)}${mine ? " (você)" : ""}</h2><p>${esc(m.bairro)} · ${lv.name}${rank ? ` · ${rank}º no ranking` : ""}</p></div>${mine ? `<button type="button" class="pf-edit" id="pf-edit">Editar perfil</button>` : ""}</div>
      <div class="pf-stats"><div><strong>${pts}</strong>pontos${mine ? ` · saldo ${C.balance(st)}` : ""}</div><div><strong>${theirs.length}</strong>publicações</div><div><strong>${muts}</strong>mutirões</div><div><strong>${confs}</strong>avisos checados</div></div>
      <div class="badges">${Object.entries(C.BADGES).map(([k, [e, n, d]]) => `<span class="badge${got.has(k) ? "" : " off"}" title="${esc(d)}">${e} ${n}</span>`).join("")}</div>
      ${mine ? `<div class="pf-account"><span>${esc(Auth.current()?.demo ? "Conta de demonstração" : Auth.current()?.email || "")}</span><button type="button" class="pf-edit" id="pf-logout">Sair da conta</button><button type="button" class="link danger-link" id="pf-delete">Excluir conta</button></div><div class="pf-danger" id="pf-danger"></div>` : ""}<div class="pf-posts"><h3>Publicações</h3><ol>${theirs.map((p) => `<li><button type="button" class="more" data-go="${p.id}" data-close>${esc(C.TYPES[p.type])} · ${esc(p.bairro)}</button><small>${ago(p.at)}</small>${esc(p.text.slice(0, 120))}${p.text.length > 120 ? "…" : ""}</li>`).join("") || `<li>Nenhuma publicação ainda.</li>`}</ol></div>`;
    $("#pf-edit")?.addEventListener("click", () => { dProf.close(); openJoin(true); });
    $("#pf-logout")?.addEventListener("click", () => { Auth.logout(); location.href = "comunidade.html"; });
    $("#pf-delete")?.addEventListener("click", () => {
      const box = $("#pf-danger");
      box.innerHTML = `<p><b>Excluir sua conta?</b> Isso apaga a conta, o perfil e tudo o que você publicou neste navegador. Não dá para desfazer.</p><div class="pf-danger-btns"><button type="button" class="pf-edit" id="pf-cancel">Cancelar</button><button type="button" class="danger" id="pf-confirm">Excluir definitivamente</button></div>`;
      $("#pf-cancel").addEventListener("click", () => openProfile("me"));
      $("#pf-confirm").addEventListener("click", () => { Auth.deleteAccount(); location.href = "comunidade.html"; });
    });
    dProf.showModal();
  }

  /* ----- Central e outras abas ----- */
  function paintOfficial(state) {
    const box = $("#official");
    const on = (state?.areas || []).filter((a) => a.alert !== null && a.alert !== undefined);
    box.hidden = !on.length;
    box.innerHTML = on.map((a) => `<span><b>Alerta oficial · ${esc(AREA_NOME[a.id] || a.id)}</b> ${LV[a.alert]}. ${a.alert >= 3 ? "Saia agora e vá para o abrigo." : "Prepare-se para sair."}</span><a href="totem.html?id=${a.id.replace("E", "T")}">Ver orientações e rota</a>`).join("") + (on.length ? `<span>Pedido de socorro não é pela comunidade: ligue 193.</span>` : "");
  }
  if (Canal) {
    paintOfficial(Canal.lastState());
    Canal.on((m) => {
      if (m.type === "estado") { paintOfficial(m.data); if (route().view === "feed") renderCenter(); }
      if (m.type === "ack" && m.data?.origem === "comunidade") {
        const p = st.posts.find((x) => x.req === m.data.req);
        if (p && p.central !== "recebido") { p.central = "recebido"; notify("A central de risco recebeu o seu aviso de sinal de deslizamento.", p.id, "🛰️"); commit(); }
      }
    });
  }
  addEventListener("storage", (e) => { if (/pluvial-(reports|social-v2|contas|sessao)/.test(e.key || "")) { st = C.load(); render(); } });
  setInterval(() => { if (!document.hidden && !document.activeElement?.closest?.("form")) renderSides(); }, 60000);

  /* Primeira visita de uma conta: entra no grupo do bairro e recebe boas-vindas. */
  if (me() && !st.welcomed) {
    st.welcomed = true;
    if (!st.joined.includes(me().bairro)) st.joined.push(me().bairro);
    notify(`Bem-vindo, ${me().nome}! Você entrou no grupo Vizinhos do ${me().bairro}.`, null, "👋");
    C.save(st);
  }
  progress();
  render();
})();
