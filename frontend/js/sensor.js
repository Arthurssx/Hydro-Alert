/* Demonstração didática da regra usada no Arduino; não é uma leitura real. */
(() => {
  // Raiz da demonstração do sensor; se a página não tiver o sensor, o script nem roda.
  const root = document.querySelector("[data-sensor]");
  if (!root) return;
  // Texto mostrado para cada estado do sensor.
  const LABEL = { normal: "Verde · normal", attention: "Amarelo · atenção", critical: "Vermelho · crítico" };
  // Regra do Arduino: transforma a distância medida (cm) em % de acúmulo (10 cm = cheio, 100 cm = vazio).
  // Estado: menos de 40% normal, de 40 a 70% atenção, acima de 70% crítico.
  const evaluate = (cm) => {
    const accumulation = Math.min(100, Math.max(0, ((100 - cm) / 90) * 100));
    return { accumulation, state: accumulation < 40 ? "normal" : accumulation <= 70 ? "attention" : "critical" };
  };
  // Atalho para buscar elementos dentro da demonstração.
  const q = (s) => root.querySelector(s);
  // Controle deslizante da distância e botões com valores prontos.
  const slider = q("[data-sensor-range]");
  const buttons = [...root.querySelectorAll("[data-distance]")];
  const TOP = 44, SCALE = 2.6; // posição do sensor no desenho e px de SVG por centímetro
  // Redesenha tudo conforme a distância escolhida: estado/cor, posição da água e do feixe, textos e acessibilidade.
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
  // Atualiza ao arrastar o controle ou clicar num valor pronto; também roda uma vez no início.
  slider.addEventListener("input", update);
  buttons.forEach((b) => b.addEventListener("click", () => { slider.value = b.dataset.distance; update(); }));
  update();
})();