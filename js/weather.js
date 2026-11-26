/* Previsão Open-Meteo com cache compartilhado entre as páginas. Separada da simulação dos sensores. */
window.PluvialWeather = (() => {
  const CACHE = "pluvial-weather-v1";
  const FRESH = 15 * 60000, STALE = 3 * 3600000;
  let rateLimitedUntil = 0, lastFetch = 0, inflight = null;

  function summarize(payload, nowSeconds) {
    const h = payload.hourly;
    if (!h || !Array.isArray(h.time) || !Array.isArray(h.precipitation_probability) || !Array.isArray(h.precipitation)) throw new Error("Previsão incompleta");
    // Os valores representam a hora precedente; selecionamos intervalos que terminam após agora.
    const next = h.time
      .map((end, i) => ({ end, probability: h.precipitation_probability[i], mm: h.precipitation[i] }))
      .filter((v) => Number.isFinite(v.end) && v.end > nowSeconds)
      .slice(0, 24);
    if (next.length !== 24 || next.some((v) => !Number.isFinite(v.mm) || v.mm < 0 || !Number.isFinite(v.probability) || v.probability < 0 || v.probability > 100)) throw new Error("Previsão horária indisponível");
    const c = payload.current;
    if (!c || !Number.isFinite(c.temperature_2m) || !Number.isFinite(c.time) || Math.abs(c.time - nowSeconds) > 10800) throw new Error("Condições atuais indisponíveis");
    return { next, probability6h: Math.max(...next.slice(0, 6).map((v) => v.probability)), total24h: next.reduce((t, v) => t + v.mm, 0), current: c };
  }
  function describe(code) {
    if (code === 0) return "Céu limpo";
    if (code === 1 || code === 2) return "Parcialmente nublado";
    if (code === 3) return "Nublado";
    if (code === 45 || code === 48) return "Nevoeiro";
    if (code >= 51 && code <= 57) return "Garoa";
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Chuva";
    if (code >= 95 && code <= 99) return "Trovoadas";
    return "Condição variável";
  }
  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE));
      return c && c.payload && Number.isFinite(c.receivedAt) ? c : null;
    } catch {
      return null;
    }
  }
  const result = (c, cached) => ({ metrics: summarize(c.payload, Date.now() / 1000), receivedAt: c.receivedAt, cached, description: "" });

  async function request() {
    const query = new URLSearchParams({
      latitude: "-21.762", longitude: "-43.349",
      current: "temperature_2m,weather_code,is_day",
      hourly: "precipitation_probability,precipitation",
      timezone: "America/Sao_Paulo", timeformat: "unixtime", forecast_days: "3",
    });
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      lastFetch = Date.now();
      const res = await fetch("https://api.open-meteo.com/v1/forecast?" + query, { signal: ctl.signal });
      if (res.status === 429) rateLimitedUntil = Date.now() + FRESH;
      if (!res.ok) throw new Error("Serviço indisponível");
      const payload = await res.json();
      const entry = { payload, receivedAt: Date.now() };
      const out = result(entry, false);
      try { localStorage.setItem(CACHE, JSON.stringify(entry)); } catch {}
      return out;
    } finally {
      clearTimeout(timer);
    }
  }
  /* Usa o cache recente; se a rede falhar, aceita cache de até 3h e avisa. Nunca inventa dados. */
  async function get({ force = false } = {}) {
    const cache = readCache();
    if (!force && cache && Date.now() - cache.receivedAt < FRESH) {
      try { return result(cache, true); } catch {}
    }
    if (force && Date.now() - lastFetch < 60000) throw Object.assign(new Error("recent"), { code: "recent" });
    if (Date.now() < rateLimitedUntil) throw Object.assign(new Error("limit"), { code: "limit" });
    if (inflight) return inflight;
    inflight = request()
      .catch((err) => {
        if (cache && Date.now() - cache.receivedAt < STALE) return { ...result(cache, true), stale: true };
        throw err;
      })
      .finally(() => { inflight = null; });
    return inflight;
  }
  const time = (seconds, full = false) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...(full ? { day: "2-digit", month: "2-digit" } : {}), hour: "2-digit", minute: "2-digit" }).format(new Date(seconds * 1000));
  return { get, summarize, describe, time };
})();
