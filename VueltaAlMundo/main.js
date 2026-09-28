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


  // AGRUPAR ETAPAS POR PAÍS

  const countries = {};

  routes.forEach(route => {

    const country = route.country || "País desconocido";

    if (!countries[country]) {
      countries[country] = [];
    }

    countries[country].push(route);

  });


  // MOSTRAR PAÍSES Y SUS ETAPAS

  for (const country of Object.keys(countries)) {

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


    for (const route of countries[country]) {

      const layer = await drawRoute(route);

      layers.push(layer);


      const item = document.createElement("div");

      item.className = "stageItem";

      item.innerHTML = `
        <div class="stageDay">DÍA ${route.day}</div>

        <div class="stageTitle">
          ${route.name}
        </div>

        <div class="stageMeta">
          ${route.km} km · ${route.elevation} m
        </div>
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

      // ------------------------------------------
      // FECHA
      // ------------------------------------------

      const fecha = formatDate(route.date);


      // ------------------------------------------
      // POPUP
      // ------------------------------------------

      const popup = L.popup({
        maxWidth: 340,
        minWidth: 300,
        className: "routePopup"
      }).setContent(`

        <div class="routePopupContent">

          <div class="routePopupHeader">

            <div class="routePopupDay">
              DÍA ${route.day}
            </div>

          </div>


          <div class="routePopupTitle">
            ${route.name}
          </div>


          <div class="routePopupDate">
            <span class="routePopupIcon">●</span>
            ${fecha}
          </div>


          <div class="routePopupStats">

            <div class="routePopupStat">

              <div class="routePopupStatValue">
                ${formatNumber(route.km)}
              </div>

              <div class="routePopupStatLabel">
                KM
              </div>

            </div>


            <div class="routePopupDivider"></div>


            <div class="routePopupStat">

              <div class="routePopupStatValue">
                ${formatNumber(route.elevation)}
              </div>

              <div class="routePopupStatLabel">
                DESNIVEL
              </div>

            </div>

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
// FORMATEAR FECHA
// ==========================================

function formatDate(value) {

  if (!value) {
    return "Fecha no disponible";
  }


  // Si ya es una fecha válida en formato ISO

  let date = new Date(value);


  if (!isNaN(date.getTime())) {

    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

  }


  // ------------------------------------------
  // FORMATO DD/MM/YYYY
  // ------------------------------------------

  if (typeof value === "string") {

    const match = value.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    );


    if (match) {

      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      const year = Number(match[3]);

      date = new Date(year, month, day);


      if (!isNaN(date.getTime())) {

        return date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

      }

    }

  }


  return "Fecha no disponible";

}


// ==========================================
// FORMATEAR NÚMEROS
// ==========================================

function formatNumber(value) {

  const number = Number(value);


  if (isNaN(number)) {
    return "—";
  }


  return number.toLocaleString("es-ES", {
    maximumFractionDigits: 2
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

  elevationEl.textContent = `${Math.round(totalElevation)} m`;

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
