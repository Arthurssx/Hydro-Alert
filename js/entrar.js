/* Página de entrar e criar conta. */
(() => {
  const A = window.PluvialAuth, C = window.Comunidade;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const back = A.safeReturn(params.get("volta"));
  const fEntrar = $("#form-entrar"), fCriar = $("#form-criar");

  $("#r-bairro").insertAdjacentHTML("beforeend", (C?.BAIRROS || []).map((b) => `<option>${b}</option>`).join(""));

  /* Já conectado: oferece seguir ou trocar de conta. */
  const cur = A.current();
  if (cur) {
    const card = $(".card");
    card.innerHTML = `<h2 style="font-size:2rem;color:var(--storm);text-transform:uppercase">Olá, ${cur.nome.replace(/[<>&"]/g, "")}!</h2>
      <p class="sub">Você já está conectado${cur.demo ? " com a conta de demonstração" : ` como ${cur.email}`}.</p>
      <a class="primary wide" href="${back}" style="text-decoration:none"><span>Continuar</span></a>
      <button type="button" class="ghost-btn" id="switch">Entrar com outra conta</button>`;
    $("#switch").addEventListener("click", () => { A.logout(); location.reload(); });
    return;
  }

  /* Abas */
  function tab(which) {
    const criar = which === "criar";
    $("#tab-entrar").setAttribute("aria-selected", String(!criar));
    $("#tab-criar").setAttribute("aria-selected", String(criar));
    fEntrar.hidden = criar;
    fCriar.hidden = !criar;
    history.replaceState(null, "", `?${criar ? "modo=criar&" : ""}volta=${encodeURIComponent(back)}`);
    (criar ? $("#r-nome") : $("#l-email")).focus();
  }
  $("#tab-entrar").addEventListener("click", () => tab("entrar"));
  $("#tab-criar").addEventListener("click", () => tab("criar"));
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => tab(b.dataset.go)));
  $(".tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = $("#tab-entrar").getAttribute("aria-selected") === "true" ? "criar" : "entrar";
    tab(next);
    $(`#tab-${next}`).focus();
  });

  /* Mostrar senha */
  $$("[data-eye]").forEach((b) => b.addEventListener("click", () => {
    const inp = document.getElementById(b.dataset.eye), show = inp.type === "password";
    inp.type = show ? "text" : "password";
    b.textContent = show ? "Ocultar" : "Mostrar";
    b.setAttribute("aria-pressed", String(show));
    b.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
  }));

  /* Força da senha */
  $("#r-senha").addEventListener("input", (e) => {
    const s = A.strength(e.target.value);
    $(".meter").dataset.s = e.target.value ? Math.max(1, s.score) : 0;
    $("#r-meter-t").textContent = e.target.value ? `Força da senha: ${s.label}. Use pelo menos 8 caracteres, com letras e números.` : "Pelo menos 8 caracteres, com letras e números.";
  });

  /* Erros */
  function clear(form) {
    $$("[data-err]", form).forEach((el) => { el.textContent = ""; if (el.classList.contains("err-box")) el.hidden = true; });
    $$("[aria-invalid]", form).forEach((el) => el.removeAttribute("aria-invalid"));
  }
  function show(form, field, msg) {
    const el = $(`[data-err="${field}"]`, form) || $('[data-err="geral"]', form);
    el.textContent = msg;
    el.hidden = false;
    const input = form.elements[field];
    if (input && input.focus) { input.setAttribute("aria-invalid", "true"); input.focus(); }
    else el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  function busy(form, on) {
    const b = $("button[type=submit]", form);
    b.setAttribute("aria-busy", String(on));
    b.disabled = on;
  }
  const go = (nome) => {
    const t = $("#toast");
    t.textContent = `Bem-vindo, ${nome}!`;
    t.classList.add("show");
    setTimeout(() => { location.href = back; }, 700);
  };

  fEntrar.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(fEntrar);
    const f = fEntrar.elements;
    if (!f.email.value.trim()) return show(fEntrar, "geral", "Digite seu e-mail.");
    if (!f.senha.value) return show(fEntrar, "geral", "Digite sua senha.");
    busy(fEntrar, true);
    try {
      const u = await A.login({ email: f.email.value, senha: f.senha.value, manter: f.manter.checked });
      go(u.nome);
    } catch (err) {
      show(fEntrar, "geral", err.message);
      f.senha.value = "";
    } finally { busy(fEntrar, false); }
  });

  fCriar.addEventListener("submit", async (e) => {
    e.preventDefault();
    clear(fCriar);
    const f = fCriar.elements;
    if (f.senha.value && f.senha2.value !== f.senha.value) return show(fCriar, "senha2", "As senhas não são iguais.");
    busy(fCriar, true);
    try {
      const u = await A.register({ nome: f.nome.value, email: f.email.value, senha: f.senha.value, bairro: f.bairro.value, alertas: f.alertas.checked, termos: f.termos.checked });
      go(u.nome);
    } catch (err) {
      show(fCriar, err.field || "geral", err.message);
    } finally { busy(fCriar, false); }
  });

  $("#demo").addEventListener("click", () => { const u = A.demo(); go(u.nome); });
  $("#forgot").addEventListener("click", () => { const n = $("#forgot-note"); n.hidden = !n.hidden; });
  $("#open-terms").addEventListener("click", (e) => { e.preventDefault(); $("#terms").showModal(); });
  $("#terms").addEventListener("click", (e) => { if (e.target.id === "terms") e.target.close(); });

  if (params.get("modo") === "criar") tab("criar");
})();
