/* Contas e sessão do Pluvial (protótipo).
   Sem servidor: as contas ficam neste navegador. A senha nunca é guardada em texto:
   guardamos só um hash PBKDF2-SHA-256 com sal aleatório. Na versão real, isto seria
   trocado por um serviço de autenticação (por exemplo, Supabase Auth) com confirmação por e-mail. */
window.PluvialAuth = (() => {
  const ACCOUNTS = "pluvial-contas", SESSION = "pluvial-sessao", TRIES = "pluvial-tentativas";
  const ITER = 120000;
  const DEMO = { email: "demo@pluvial.app", nome: "Visitante Demo", bairro: "Dom Bosco" };

  const read = (store, k) => { try { return JSON.parse(store.getItem(k)); } catch { return null; } };
  const write = (store, k, v) => { try { store.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const accounts = () => read(localStorage, ACCOUNTS) || [];
  const saveAccounts = (a) => write(localStorage, ACCOUNTS, a);
  const norm = (e) => String(e || "").trim().toLowerCase();
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function hash(password, salt) {
    if (!crypto?.subtle) throw Object.assign(new Error("Abra o site por http://127.0.0.1 ou https para usar contas."), { field: "geral" });
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
    return b64(bits);
  }
  /* Comparação em tempo constante. */
  const same = (a, b) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

  function strength(p) {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[a-z]/i.test(p) && /\d/.test(p)) s++;
    if (/[^a-z0-9]/i.test(p) || (/[a-z]/.test(p) && /[A-Z]/.test(p))) s++;
    return { score: s, label: ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"][s] };
  }
  const fail = (field, message) => Object.assign(new Error(message), { field });

  function validate({ nome, email, senha, bairro }) {
    if (!String(nome || "").trim() || String(nome).trim().length < 2) throw fail("nome", "Escolha um apelido com pelo menos 2 letras.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(norm(email))) throw fail("email", "Digite um e-mail válido.");
    if (String(senha || "").length < 8 || !/[a-z]/i.test(senha) || !/\d/.test(senha)) throw fail("senha", "A senha precisa de pelo menos 8 caracteres, com letras e números.");
    if (!bairro) throw fail("bairro", "Escolha o seu bairro.");
  }

  function startSession(acc, keep) {
    const s = { uid: acc.id, at: Date.now(), exp: Date.now() + (keep ? 30 : 1) * 86400e3 };
    sessionStorage.removeItem(SESSION);
    localStorage.removeItem(SESSION);
    write(keep ? localStorage : sessionStorage, SESSION, s);
    acc.ultimoAcesso = Date.now();
    const all = accounts().map((a) => (a.id === acc.id ? acc : a));
    saveAccounts(all);
    return publicView(acc);
  }
  const publicView = (a) => a && { id: a.id, nome: a.nome, email: a.email, bairro: a.bairro, criado: a.criado, alertas: !!a.alertas, demo: !!a.demo };

  async function register({ nome, email, senha, bairro, alertas, termos, manter = true }) {
    validate({ nome, email, senha, bairro });
    if (!termos) throw fail("termos", "Para criar a conta, aceite os termos e a política de privacidade.");
    if (accounts().some((a) => a.email === norm(email))) throw fail("email", "Já existe uma conta com este e-mail. Tente entrar.");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const acc = {
      id: "u" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => x.toString(16).padStart(2, "0")).join(""),
      nome: String(nome).trim().slice(0, 24), email: norm(email), bairro, alertas: !!alertas,
      salt: b64(salt), hash: await hash(senha, salt), iter: ITER, criado: Date.now(), consentimento: Date.now(),
    };
    if (!saveAccounts([...accounts(), acc])) throw fail("geral", "Não foi possível salvar a conta neste navegador.");
    return startSession(acc, manter);
  }

  /* Bloqueio de 30 s depois de 5 tentativas erradas. */
  function checkTries() {
    const t = read(localStorage, TRIES) || { n: 0, until: 0 };
    if (Date.now() < t.until) throw fail("geral", `Muitas tentativas. Aguarde ${Math.ceil((t.until - Date.now()) / 1000)} segundos.`);
    return t;
  }
  async function login({ email, senha, manter }) {
    const t = checkTries();
    const acc = accounts().find((a) => a.email === norm(email) && !a.demo);
    const ok = acc && same(await hash(String(senha || ""), unb64(acc.salt)), acc.hash);
    if (!ok) {
      t.n++;
      if (t.n >= 5) { t.until = Date.now() + 30000; t.n = 0; }
      write(localStorage, TRIES, t);
      throw fail("geral", "E-mail ou senha incorretos.");
    }
    localStorage.removeItem(TRIES);
    return startSession(acc, manter);
  }
  /* Conta de demonstração para apresentações (sem senha, claramente marcada). */
  function demo() {
    let acc = accounts().find((a) => a.demo);
    if (!acc) {
      acc = { id: "udemo", ...DEMO, demo: true, alertas: true, criado: Date.now() };
      saveAccounts([...accounts(), acc]);
    }
    return startSession(acc, false);
  }
  function current() {
    const s = read(sessionStorage, SESSION) || read(localStorage, SESSION);
    if (!s || Date.now() > s.exp) { logout(); return null; }
    return publicView(accounts().find((a) => a.id === s.uid));
  }
  function logout() {
    sessionStorage.removeItem(SESSION);
    localStorage.removeItem(SESSION);
  }
  function updateProfile({ nome, bairro, alertas }) {
    const me = current();
    if (!me) return null;
    const all = accounts().map((a) => (a.id === me.id ? { ...a, ...(nome ? { nome: String(nome).trim().slice(0, 24) } : {}), ...(bairro ? { bairro } : {}), ...(alertas !== undefined ? { alertas: !!alertas } : {}) } : a));
    saveAccounts(all);
    return current();
  }
  /* Direito de exclusão (LGPD): apaga a conta e os dados da comunidade ligados a ela. */
  function deleteAccount() {
    const me = current();
    if (!me) return;
    saveAccounts(accounts().filter((a) => a.id !== me.id));
    try { localStorage.removeItem(`pluvial-social-v2:${me.id}`); } catch {}
    logout();
  }
  /* Só aceita voltar para uma página do próprio site. */
  function safeReturn(v) {
    return /^[a-z0-9_-]+\.html([?#][^\s]*)?$/i.test(String(v || "")) ? v : "comunidade.html";
  }
  function loginUrl(back = location.pathname.split("/").pop() + location.search + location.hash) {
    return `entrar.html?volta=${encodeURIComponent(back)}`;
  }

  return { register, login, demo, logout, current, updateProfile, deleteAccount, strength, safeReturn, loginUrl, DEMO };
})();
