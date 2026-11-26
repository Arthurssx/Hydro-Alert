/* Chuva e lâmina d'água em um único canvas. Respeita movimento reduzido e pausa fora da tela. */
window.PluvialRain = (() => {
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function create(canvas, opts = {}) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const color = opts.color || canvas.dataset.color || "190,225,240";
    const waterTop = opts.waterTop || canvas.dataset.top || "rgba(111,183,211,.92)";
    const waterBody = opts.waterBody || canvas.dataset.body || "rgba(29,111,148,.86)";
    let w = 0, h = 0, dpr = 1, drops = [], sparks = [], rings = [], running = false, visible = true, raf = 0, last = 0, t = 0;
    let intensity = opts.intensity ?? 0.3, flood = opts.flood ?? 0.04, level = flood, wind = 0, windTarget = 0, obstacles = [];

    function measure() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      if (opts.obstacles) {
        obstacles = opts.obstacles().map((el) => {
          const o = el.getBoundingClientRect();
          return { x0: o.left - r.left, x1: o.right - r.left, y: o.top - r.top + (el.matches("button") ? 0 : o.height * 0.13) };
        });
      }
    }
    const spawn = (d, anywhere) => {
      d.z = 0.35 + Math.random() * 0.65; // profundidade: gota distante é menor e mais lenta
      d.x = Math.random() * (w + 160) - 80;
      d.y = anywhere ? Math.random() * h : -30 - Math.random() * 120;
      d.v = 720 + 620 * d.z;
      d.l = 9 + 19 * d.z;
      return d;
    };
    const target = () => Math.round(Math.min((w * h) / 3600, innerWidth < 700 ? 110 : 300) * Math.min(intensity, 1.5));
    const surface = (x) => h - level * h + Math.sin(x / 90 + t * 1.3) * 3.5 + Math.sin(x / 37 - t * 2.1) * 1.8;

    function splash(x, y, z) {
      if (sparks.length > 160) return;
      for (let i = 0, n = 1 + (z > 0.7 ? 2 : 1); i < n; i++) sparks.push({ x, y, vx: (Math.random() - 0.5) * 110, vy: -50 - Math.random() * 90, life: 0.24 + Math.random() * 0.14 });
    }
    function step(dt) {
      t += dt;
      wind += (windTarget - wind) * Math.min(dt * 2, 1);
      level += (flood - level) * Math.min(dt * 0.9, 1);
      const want = target();
      while (drops.length < want) drops.push(spawn({}, drops.length < want * 0.5));
      if (drops.length > want) drops.length = Math.max(want, drops.length - 4);
      for (const d of drops) {
        const py = d.y;
        d.y += d.v * dt;
        d.x += wind * d.v * dt;
        let hit = false;
        for (const o of obstacles) {
          if (py < o.y && d.y >= o.y && d.x > o.x0 && d.x < o.x1) { splash(d.x, o.y, d.z); hit = true; break; }
        }
        if (!hit) {
          const s = surface(d.x);
          if (d.y >= s) {
            if (rings.length < 40 && d.z > 0.6) rings.push({ x: d.x, y: s, r: 1, life: 0.5 });
            else splash(d.x, s, d.z);
            hit = true;
          }
        }
        if (hit) spawn(d);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt; s.vy += 620 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].life -= dt; rings[i].r += 46 * dt;
        if (rings[i].life <= 0) rings.splice(i, 1);
      }
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      for (const [min, max, a, lw] of [[0, 0.6, 0.22, 1], [0.6, 0.8, 0.36, 1.2], [0.8, 1.01, 0.55, 1.5]]) {
        ctx.strokeStyle = `rgba(${color},${a})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (const d of drops) {
          if (d.z < min || d.z >= max) continue;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - wind * d.l, d.y - d.l);
        }
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(${color},.7)`;
      for (const s of sparks) ctx.fillRect(s.x, s.y, 1.5, 1.5);
      if (level > 0.001) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + 12; x += 12) ctx.lineTo(x, surface(x));
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = waterBody;
        ctx.fill();
        ctx.beginPath();
        for (let x = 0; x <= w + 12; x += 12) x === 0 ? ctx.moveTo(x, surface(x)) : ctx.lineTo(x, surface(x));
        ctx.strokeStyle = waterTop;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      for (const r of rings) {
        ctx.strokeStyle = `rgba(${color},${(r.life / 0.5) * 0.6})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y + 1, r.r * 1.8, r.r * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    function loop(now) {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }
    function sync() {
      const should = visible && !document.hidden && !reduced();
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
      if (reduced()) { level = flood; drops = []; const n = target(); for (let i = 0; i < n; i++) drops.push(spawn({}, true)); draw(); }
    }
    measure();
    new ResizeObserver(() => { measure(); if (!running) draw(); }).observe(canvas);
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; sync(); }).observe(canvas);
    document.addEventListener("visibilitychange", sync);
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    if (opts.followPointer) addEventListener("pointermove", (e) => { windTarget = ((e.clientX / innerWidth) - 0.5) * 0.28; }, { passive: true });
    sync();
    return {
      set(v) { if (v.intensity !== undefined) intensity = v.intensity; if (v.flood !== undefined) flood = v.flood; if (reduced()) sync(); },
      remeasure: measure,
    };
  }
  return { create };
})();
