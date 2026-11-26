/* Demonstração didática da regra usada no Arduino; não é uma leitura real. */
(() => {
  const root = document.querySelector("[data-sensor]");
  if (!root) return;
  const LABEL = { normal: "Verde · normal", attention: "Amarelo · atenção", critical: "Vermelho · crítico" };
  const evaluate = (cm) => {
    const accumulation = Math.min(100, Math.max(0, ((100 - cm) / 90) * 100));
    return { accumulation, state: accumulation < 40 ? "normal" : accumulation <= 70 ? "attention" : "critical" };
  };
  const q = (s) => root.querySelector(s);
  const slider = q("[data-sensor-range]");
  const buttons = [...root.querySelectorAll("[data-distance]")];
  const TOP = 44, SCALE = 2.6; // posição do sensor no desenho e px de SVG por centímetro
  function update() {
    const cm = Number(slider.value);
    const { accumulation, state } = evaluate(cm);
    const pct = accumulation.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    const y = TOP + cm * SCALE;
    root.dataset.state = state;
    q("[data-sensor-fill]").style.transform = `translateY(${y}px)`;
    q("[data-sensor-beam]").setAttribute("y2", y);
    q("[data-sensor-tag]").setAttribute("y", y - 8);
    q("[data-sensor-tag]").textContent = cm + " cm";
    q("[data-sensor-out]").textContent = cm + " cm";
    q("[data-sensor-pct]").textContent = pct + "%";
    q("[data-sensor-state]").textContent = LABEL[state];
    root.style.setProperty("--echo", (0.5 + cm / 100).toFixed(2) + "s");
    root.style.setProperty("--reach", cm * SCALE + "px");
    slider.setAttribute("aria-valuetext", `${cm} centímetros; ${pct}% de acúmulo estimado; ${LABEL[state]}`);
    slider.style.setProperty("--p", ((cm - slider.min) / (slider.max - slider.min)) * 100 + "%");
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.distance) === cm)));
  }
  slider.addEventListener("input", update);
  buttons.forEach((b) => b.addEventListener("click", () => { slider.value = b.dataset.distance; update(); }));
  update();
})();
