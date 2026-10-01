// ==========================================
// DE ALICANTE A NORDKAPP
// main.js
// ==========================================


// ==========================================
// MAPA
// ==========================================

const map = L.map("map").setView([40, 0], 4);


L.esri.tiledMapLayer({

  url:
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"

}).addTo(map);



// ==========================================
// ELEMENTOS
// ==========================================

const stageList =
  document.getElementById("stageList");

const stageCounter =
  document.getElementById("stageCounter");


const kmEl =
  document.getElementById("km");

const daysEl =
  document.getElementById("days");

const elevationEl =
  document.getElementById("elevation");


const currentCountry =
  document.getElementById("currentCountry");

const currentPlace =
  document.getElementById("currentPlace");

const countryCount =
  document.getElementById("countryCount");


// ==========================================
// PAÍSES VISITADOS
// ==========================================

const countriesCard =
  document.getElementById("countriesCard");

const countriesToggle =
  document.getElementById("countriesToggle");

const countryList =
  document.getElementById("countryList");



const fitBtn =
  document.getElementById("fitRoutes");


const stagePanel =
  document.getElementById("stagePanel");

const stageToggle =
  document.getElementById("stageToggle");



// ==========================================
// VARIABLES
// ==========================================

let routes = [];

let layers = [];



// ==========================================
// INICIO
// ==========================================

init();


fitBtn.addEventListener(
  "click",
  fitAllRoutes
);


stageToggle.addEventListener(
  "click",
  toggleStagePanel
);


// Abrir / cerrar países

countriesToggle.addEventListener(
  "click",
  toggleCountries
);



// ==========================================
// CARGAR DATOS
// ==========================================

async function init() {

  try {

    const response =
      await fetch("data/routes.json");


    if (!response.ok) {

      throw new Error(
        "No se pudo cargar routes.json"
      );

    }


    routes =
      await response.json();


    render();

  } catch (error) {

    console.error(
      "Error cargando las rutas:",
      error
    );

  }

}



// ==========================================
// ABRIR / CERRAR ETAPAS
// ==========================================

function toggleStagePanel() {

  stagePanel.classList.toggle(
    "collapsed"
  );

}



// ==========================================
// ABRIR / CERRAR PAÍSES
// ==========================================

function toggleCountries() {

  countriesCard.classList.toggle(
    "expanded"
  );

}



// ==========================================
// RENDER GENERAL
// ==========================================

async function render() {


  stageList.innerHTML = "";


  // Eliminar rutas anteriores

  layers.forEach(layer => {

    map.removeLayer(layer);

  });


  layers = [];



  // ==========================================
  // AGRUPAR DÍAS POR PAÍS
  // ==========================================

  const countries = {};


  routes.forEach(route => {

    const country =
      route.country || "País desconocido";


    if (!countries[country]) {

      countries[country] = [];

    }


    countries[country].push(route);

  });



  // ==========================================
  // MOSTRAR PAÍSES
  // ==========================================

  for (
    const country of Object.keys(countries)
  ) {


    // ------------------------------------------
    // CABECERA DEL PAÍS
    // ------------------------------------------

    const countryHeader =
      document.createElement("div");


    countryHeader.className =
      "countryHeader";


    countryHeader.innerHTML = `

      <div class="countryName">
        ${country}
      </div>

      <div class="countryStages">

        1 ETAPA

      </div>

    `;


    stageList.appendChild(
      countryHeader
    );



    // ------------------------------------------
    // DÍAS DEL PAÍS
    // ------------------------------------------

    for (
      const route of countries[country]
    ) {


      const layer =
        await drawRoute(route);


      layers.push(layer);



      const item =
        document.createElement("div");


      item.className =
        "stageItem";


      item.innerHTML = `

        <div class="stageDay">
          DÍA ${route.day}
        </div>


        <div class="stageTitle">
          ${route.name}
        </div>


        <div class="stageMeta">
          ${formatNumber(route.km)}
          km ·
          ${formatNumber(route.elevation)}
          m
        </div>

      `;



      // ------------------------------------------
      // CLICK EN DÍA
      // ------------------------------------------

      item.onclick = () => {


        map.fitBounds(
          layer.bounds,
          {
            padding: [50, 50]
          }
        );


        layer.popup.openOn(map);

      };



      stageList.appendChild(item);

    }

  }



  // ==========================================
  // CONTADOR DE ETAPAS
  // ==========================================

  // Una etapa = un país.
  // Un día = un GPX dentro de esa etapa.

  stageCounter.textContent =
    Object.keys(countries).length;



  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  updateTotals();



  // ==========================================
  // INFORMACIÓN ACTUAL
  // ==========================================

  updateInfoPanel();



  // ==========================================
  // LISTA DE PAÍSES
  // ==========================================

  updateCountriesList();

}



// ==========================================
// ACTUALIZAR LISTA DE PAÍSES
// ==========================================

function updateCountriesList() {


  const countries = [
    ...new Set(

      routes
        .map(route => route.country)
        .filter(Boolean)

    )
  ];



  // Número de países

  countryCount.textContent =
    countries.length;



  // Vaciar lista

  countryList.innerHTML = "";



  // Crear cada país

  countries.forEach(
    (country, index) => {


      const item =
        document.createElement("div");


      item.className =
        "countryListItem";


      item.innerHTML = `

        <span class="countryListNumber">
          ${index + 1}
        </span>

        <span class="countryListName">
          ${country}
        </span>

      `;


      countryList.appendChild(item);

    }
  );

}



// ==========================================
// DIBUJAR RUTA GPX
// ==========================================

function drawRoute(route) {

  return new Promise(resolve => {


    const gpx =
      new L.GPX(
        route.track,
        {

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

        }
      );



    // ========================================
    // GPX CARGADO
    // ========================================

    gpx.on(
      "loaded",
      e => {


        // --------------------------------------
        // FECHA
        // --------------------------------------

        const fecha =
          formatDate(route.date);



        // --------------------------------------
        // POPUP
        // --------------------------------------

        const popup =
          L.popup({

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

                <span class="routePopupIcon">
                  ●
                </span>

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

                    ${formatNumber(
                      route.elevation
                    )}

                  </div>


                  <div class="routePopupStatLabel">

                    DESNIVEL

                  </div>

                </div>


              </div>


            </div>

          `);



        // Guardamos el popup

        gpx.popup =
          popup;



        // Guardamos los límites

        gpx.bounds =
          e.target.getBounds();



        resolve(gpx);

      }
    );



    // ========================================
    // CLICK DIRECTAMENTE SOBRE LA RUTA
    // ========================================

    gpx.on(
      "click",
      ev => {

        gpx.popup

          .setLatLng(
            ev.latlng
          )

          .openOn(map);

      }
    );



    // Añadir al mapa

    gpx.addTo(map);

  });

}



// ==========================================
// FORMATEAR FECHA
// ==========================================

function formatDate(value) {


  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "Fecha no disponible";

  }



  // Convertimos a texto

  const text =
    String(value).trim();



  // ------------------------------------------
  // DD/MM/YYYY
  // DD-MM-YYYY
  // ------------------------------------------

  let match =
    text.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    );


  if (match) {


    const day =
      Number(match[1]);


    const month =
      Number(match[2]);


    const year =
      Number(match[3]);


    const date =
      new Date(
        year,
        month - 1,
        day
      );


    if (
      !isNaN(
        date.getTime()
      )
    ) {

      return formatDateObject(date);

    }

  }



  // ------------------------------------------
  // YYYY-MM-DD
  // ------------------------------------------

  match =
    text.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    );


  if (match) {


    const year =
      Number(match[1]);


    const month =
      Number(match[2]);


    const day =
      Number(match[3]);


    const date =
      new Date(
        year,
        month - 1,
        day
      );


    if (
      !isNaN(
        date.getTime()
      )
    ) {

      return formatDateObject(date);

    }

  }



  // ------------------------------------------
  // ISO con hora
  // ------------------------------------------

  const date =
    new Date(text);


  if (
    !isNaN(
      date.getTime()
    )
  ) {

    return formatDateObject(date);

  }



  // ------------------------------------------
  // Si no se puede interpretar
  // ------------------------------------------

  return "Fecha no disponible";

}



// ==========================================
// FORMATEAR OBJETO DATE
// ==========================================

function formatDateObject(date) {

  return date.toLocaleDateString(
    "es-ES",
    {

      day: "numeric",

      month: "long",

      year: "numeric"

    }
  );

}



// ==========================================
// FORMATEAR NÚMEROS
// ==========================================

function formatNumber(value) {


  const number =
    Number(value);


  if (
    isNaN(number)
  ) {

    return "—";

  }



  return number.toLocaleString(
    "es-ES",
    {

      maximumFractionDigits: 2

    }
  );

}



// ==========================================
// ESTADÍSTICAS
// ==========================================

function updateTotals() {


  const totalKm =
    routes.reduce(

      (sum, r) =>
        sum + Number(r.km),

      0

    );



  const totalElevation =
    routes.reduce(

      (sum, r) =>
        sum + Number(r.elevation),

      0

    );



  // KM

  kmEl.textContent =
    totalKm.toFixed(1);



  // DÍAS

  daysEl.textContent =
    routes.length;



  // DESNIVEL

  elevationEl.textContent =
    `${Math.round(totalElevation)} m`;

}



// ==========================================
// PANEL DERECHO
// ==========================================

function updateInfoPanel() {


  if (!routes.length) {

    return;

  }



  // Último GPX

  const last =
    routes[routes.length - 1];



  // País

  currentCountry.textContent =
    last.country;



  // Lugar

  currentPlace.textContent =
    last.place;

}



// ==========================================
// VER MAPA COMPLETO
// ==========================================

function fitAllRoutes() {


  if (!layers.length) {

    return;

  }



  const group =
    L.featureGroup(
      layers
    );



  map.fitBounds(
    group.getBounds(),
    {

      padding: [60, 60]

    }
  );

}
