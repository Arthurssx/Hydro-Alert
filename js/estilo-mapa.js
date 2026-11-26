/* Estilo do mapa escuro (OpenFreeMap + relevo), usado pela central e pelo totem. */
window.PluvialMapa = (() => {
  const OMT = "omt";
  const TERRARIUM = { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], tileSize: 256, encoding: "terrarium", maxzoom: 15 };
  const name = ["coalesce", ["get", "name:pt"], ["get", "name"]];
  const base = {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: { [OMT]: { type: "vector", url: "https://tiles.openfreemap.org/planet" }, dem: TERRARIUM, hs: { ...TERRARIUM } },
    terrain: { source: "dem", exaggeration: 1.6 },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#0f2530" } },
      { id: "landcover", type: "fill", source: OMT, "source-layer": "landcover", paint: { "fill-color": ["match", ["get", "class"], ["wood", "forest"], "#17241f", "grass", "#1b2420", "#12303c"], "fill-opacity": 0.75 } },
      { id: "park", type: "fill", source: OMT, "source-layer": "park", paint: { "fill-color": "#17241f", "fill-opacity": 0.6 } },
      { id: "residential", type: "fill", source: OMT, "source-layer": "landuse", filter: ["match", ["get", "class"], ["residential", "suburb", "neighbourhood"], true, false], paint: { "fill-color": "#132f3b", "fill-opacity": 0.8 } },
      { id: "hillshade", type: "hillshade", source: "hs", paint: { "hillshade-shadow-color": "#03100f", "hillshade-highlight-color": "#4f7d90", "hillshade-accent-color": "#12303c", "hillshade-exaggeration": 0.6, "hillshade-illumination-direction": 315 } },
      { id: "water", type: "fill", source: OMT, "source-layer": "water", paint: { "fill-color": "#0f2a40" } },
      { id: "waterway", type: "line", source: OMT, "source-layer": "waterway", paint: { "line-color": "#2b6a92", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.6, 16, 3] } },
      { id: "building", type: "fill", source: OMT, "source-layer": "building", minzoom: 13.5, paint: { "fill-color": "#18394a", "fill-outline-color": "#2a4d5c", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 15, 0.9] } },
      { id: "road-minor", type: "line", source: OMT, "source-layer": "transportation", minzoom: 12.5, filter: ["match", ["get", "class"], ["minor", "service", "track"], true, false], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#24485a", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 13, 0.4, 17, 5] } },
      { id: "road-mid", type: "line", source: OMT, "source-layer": "transportation", filter: ["match", ["get", "class"], ["secondary", "tertiary"], true, false], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#3f6577", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, 0.4, 17, 8] } },
      { id: "road-major", type: "line", source: OMT, "source-layer": "transportation", filter: ["match", ["get", "class"], ["motorway", "trunk", "primary"], true, false], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#6f93a3", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 9, 0.6, 17, 11] } },
      { id: "road-name", type: "symbol", source: OMT, "source-layer": "transportation_name", minzoom: 14.5, layout: { "symbol-placement": "line", "text-field": name, "text-font": ["Noto Sans Regular"], "text-size": 11 }, paint: { "text-color": "#9db7c3", "text-halo-color": "#0f2530", "text-halo-width": 1.4 } },
      { id: "place", type: "symbol", source: OMT, "source-layer": "place", filter: ["match", ["get", "class"], ["suburb", "neighbourhood", "quarter"], true, false], layout: { "text-field": name, "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 15, 13], "text-transform": "uppercase", "text-letter-spacing": 0.12, "text-max-width": 8 }, paint: { "text-color": "#cfe0e8", "text-opacity": 0.75, "text-halo-color": "#0f2530", "text-halo-width": 1.6 } },
      { id: "city", type: "symbol", source: OMT, "source-layer": "place", maxzoom: 11.5, filter: ["match", ["get", "class"], ["city", "town"], true, false], layout: { "text-field": name, "text-font": ["Noto Sans Bold"], "text-size": 15 }, paint: { "text-color": "#fbfcfc", "text-halo-color": "#0f2530", "text-halo-width": 2 } },
    ],
  };

  function style({ terrain = true } = {}) {
    const s = JSON.parse(JSON.stringify(base));
    if (!terrain) delete s.terrain;
    return s;
  }
  /* Rota pelas ruas no servidor público do OSRM; sem resposta, usa linha reta. */
  const cache = new Map();
  async function route(from, to) {
    const key = from.join() + ";" + to.join();
    if (cache.has(key)) return cache.get(key);
    let coords = [from, to];
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`, { signal: ctl.signal });
      if (res.ok) {
        const g = (await res.json()).routes?.[0]?.geometry?.coordinates;
        if (g && g.length > 1) coords = [from, ...g, to];
      }
    } catch {} finally { clearTimeout(timer); }
    cache.set(key, coords);
    return coords;
  }
  return { style, route };
})();
