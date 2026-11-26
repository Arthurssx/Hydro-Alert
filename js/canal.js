/* Canal entre a central e os totens abertos no mesmo navegador (demonstração).
   Na vida real, isso seria um servidor; aqui usa BroadcastChannel, com localStorage como reserva. */
window.Canal = (() => {
  const KEY = "pluvial-canal", STATE = "pluvial-estado";
  const subs = [];
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("pluvial") : null;
  const deliver = (m) => subs.forEach((f) => { try { f(m); } catch (e) { console.error(e); } });
  if (bc) bc.onmessage = (e) => deliver(e.data);
  else addEventListener("storage", (e) => { if (e.key === KEY && e.newValue) { try { deliver(JSON.parse(e.newValue)); } catch {} } });

  function send(type, data) {
    const m = { type, data, at: Date.now() };
    if (bc) bc.postMessage(m);
    else { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {} }
  }
  const on = (f) => subs.push(f);
  /* Estado mais recente da central, para um totem aberto depois. */
  function saveState(s) { try { localStorage.setItem(STATE, JSON.stringify({ ...s, at: Date.now() })); } catch {} }
  function lastState() { try { return JSON.parse(localStorage.getItem(STATE)); } catch { return null; } }
  return { send, on, saveState, lastState };
})();
