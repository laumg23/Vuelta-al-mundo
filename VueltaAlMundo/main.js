// ==========================================
// DE ALICANTE A NORDKAPP
// main.js
// ==========================================

// ---------- MAPA ----------
const map = L.map("map").setView([40, 0], 4);

L.esri.tiledMapLayer({
  url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"
}).addTo(map);

// ---------- ELEMENTOS ----------
const stageList = document.getElementById("stageList");
const stageCounter = document.getElementById("stageCounter");

const kmEl = document.getElementById("km");
const daysEl = document.getElementById("days");
const elevationEl = document.getElementById("elevation");

const currentCountry = document.getElementById("currentCountry");
const currentPlace = document.getElementById("currentPlace");
const countryCount = document.getElementById("countryCount");

const fitBtn = document.getElementById("fitRoutes");

// ---------- VARIABLES ----------
let routes = [];
let layers = [];

// ==========================================
// INICIO
// ==========================================

init();

fitBtn.addEventListener("click", fitAllRoutes);

async function init() {

  const response = await fetch("data/routes.json");
  routes = await response.json();

  render();
}

// ==========================================
// RENDER GENERAL
// ==========================================

async function render() {

  stageList.innerHTML = "";

  layers.forEach(layer => map.removeLayer(layer));
  layers = [];

  // ----------------------------------------
  // AGRUPAR ETAPAS POR PAÍS
  // ----------------------------------------

  const countries = {};

  routes.forEach(route => {

    const country = route.country || "País desconocido";

    if (!countries[country]) {
      countries[country] = [];
    }

    countries[country].push(route);

  });

  // ----------------------------------------
  // MOSTRAR PAÍSES Y SUS ETAPAS
  // ----------------------------------------

  for (const country of Object.keys(countries)) {

    // CABECERA DEL PAÍS
    const countryHeader = document.createElement("div");

    countryHeader.className = "countryHeader";

    countryHeader.innerHTML = `
      <div class="countryName">${country}</div>
      <div class="countryStages">
        ${countries[country].length}
        ${countries[country].length === 1 ? "ETAPA" : "ETAPAS"}
      </div>
    `;

    stageList.appendChild(countryHeader);

    // ETAPAS DEL PAÍS
    for (const route of countries[country]) {

      const layer = await drawRoute(route);

      layers.push(layer);

      const item = document.createElement("div");

      item.className = "stageItem";

      item.innerHTML = `
        <div class="stageDay">DÍA ${route.day}</div>
        <div class="stageTitle">${route.name}</div>
        <div class="stageMeta">${route.km} km · ${route.elevation} m</div>
      `;

      item.onclick = () => {

        map.fitBounds(layer.bounds, {
          padding: [50, 50]
        });

        layer.popup.openOn(map);

      };

      stageList.appendChild(item);

    }

  }

  stageCounter.textContent = routes.length;

  updateTotals();
  updateInfoPanel();

}

// ==========================================
// DIBUJAR RUTA GPX
// ==========================================

function drawRoute(route) {

  return new Promise(resolve => {

    const gpx = new L.GPX(route.track, {
      async: true,

      polyline_options: {
        color: "#D61F26",
        weight: 4,
        opacity: 1
      },

      marker_options: {
        startIconUrl: null,
        endIconUrl: null,
        shadowUrl: null
      }

    });

    gpx.on("loaded", e => {

      const fecha = new Date(route.date).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      const popup = L.popup().setContent(`
        <div style="min-width:180px;font-family:Arial">

          <div style="font-size:11px;color:#888">
            DÍA ${route.day}
          </div>

          <div style="font-size:18px;font-weight:700;margin:6px 0">
            ${route.name}
          </div>

          <div style="font-size:12px;color:#666">
            ${fecha}
          </div>

          <div style="margin-top:8px;font-weight:600">
            ${route.km} km · ${route.elevation} m ↑
          </div>

        </div>
      `);

      gpx.popup = popup;
      gpx.bounds = e.target.getBounds();

      resolve(gpx);

    });

    gpx.on("click", ev => {

      gpx.popup
        .setLatLng(ev.latlng)
        .openOn(map);

    });

    gpx.addTo(map);

  });

}

// ==========================================
// ESTADÍSTICAS
// ==========================================

function updateTotals() {

  const totalKm = routes.reduce(
    (sum, r) => sum + Number(r.km),
    0
  );

  const totalElevation = routes.reduce(
    (sum, r) => sum + Number(r.elevation),
    0
  );

  kmEl.textContent = totalKm.toFixed(1);

  daysEl.textContent = routes.length;

  elevationEl.textContent = `${totalElevation} m`;

}

// ==========================================
// PANEL DERECHO
// ==========================================

function updateInfoPanel() {

  if (!routes.length) return;

  const last = routes[routes.length - 1];

  currentCountry.textContent = last.country;
  currentPlace.textContent = last.place;

  const countries = [
    ...new Set(routes.map(r => r.country))
  ];

  countryCount.textContent = countries.length;

}

// ==========================================
// VER MAPA COMPLETO
// ==========================================

function fitAllRoutes() {

  if (!layers.length) return;

  const group = L.featureGroup(layers);

  map.fitBounds(group.getBounds(), {
    padding: [60, 60]
  });

}
