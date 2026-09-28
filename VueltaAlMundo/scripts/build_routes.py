import json
import math
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path


# ==========================================
# CONFIGURACIÓN
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent
TRACKS_DIR = BASE_DIR / "tracks"
DATA_DIR = BASE_DIR / "data"
OUTPUT_FILE = DATA_DIR / "routes.json"


# ==========================================
# DISTANCIA ENTRE DOS PUNTOS
# ==========================================

def haversine(lat1, lon1, lat2, lon2):
    earth_radius = 6371000

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(delta_lon / 2) ** 2
    )

    return earth_radius * 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )


# ==========================================
# LEER GPX
# ==========================================

def read_gpx(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()

    points = []

    for element in root.iter():

        if not element.tag.endswith("trkpt"):
            continue

        lat = element.attrib.get("lat")
        lon = element.attrib.get("lon")

        if lat is None or lon is None:
            continue

        elevation = 0

        for child in element:

            if child.tag.endswith("ele") and child.text:

                try:
                    elevation = float(child.text)
                except ValueError:
                    elevation = 0

        points.append({
            "lat": float(lat),
            "lon": float(lon),
            "ele": elevation
        })

    return points


# ==========================================
# CALCULAR DATOS DE LA RUTA
# ==========================================

def calculate_route(points):

    if len(points) < 2:
        return {
            "km": 0,
            "elevation": 0,
            "start": None,
            "end": None
        }

    total_distance = 0
    total_elevation = 0

    for i in range(1, len(points)):

        previous = points[i - 1]
        current = points[i]

        total_distance += haversine(
            previous["lat"],
            previous["lon"],
            current["lat"],
            current["lon"]
        )

        elevation_difference = (
            current["ele"] - previous["ele"]
        )

        if elevation_difference > 0:
            total_elevation += elevation_difference

    start = points[0]
    end = points[-1]

    return {
        "km": round(total_distance / 1000, 2),
        "elevation": round(total_elevation, 1),
        "start": {
            "lat": start["lat"],
            "lon": start["lon"]
        },
        "end": {
            "lat": end["lat"],
            "lon": end["lon"]
        }
    }


# ==========================================
# OBTENER PAÍS Y LUGAR
# ==========================================

def reverse_geocode(lat, lon):

    params = urllib.parse.urlencode({
        "lat": lat,
        "lon": lon,
        "format": "json",
        "zoom": 10,
        "addressdetails": 1
    })

    url = f"https://nominatim.openstreetmap.org/reverse?{params}"

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "DeAlicanteANordkapp/1.0"
        }
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=20
        ) as response:

            data = json.loads(
                response.read().decode("utf-8")
            )

        address = data.get("address", {})

        country = address.get(
            "country",
            "Desconocido"
        )

        place = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("municipality")
            or address.get("county")
            or address.get("state")
            or "Ubicación desconocida"
        )

        return country, place

    except Exception as error:

        print(
            f"No se pudo obtener la ubicación "
            f"para {lat}, {lon}: {error}"
        )

        return (
            "Desconocido",
            "Ubicación desconocida"
        )


# ==========================================
# NÚMERO DE ETAPA
# ==========================================

def get_stage_number(file_path):

    name = file_path.stem

    digits = ""

    for character in name:

        if character.isdigit():
            digits += character

    if digits:
        return int(digits)

    return 999999


# ==========================================
# GENERAR ROUTES.JSON
# ==========================================

def build_routes():

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    if not TRACKS_DIR.exists():

        print(
            "ERROR: no existe la carpeta tracks/"
        )

        return

    gpx_files = sorted(
        TRACKS_DIR.glob("*.gpx"),
        key=get_stage_number
    )

    if not gpx_files:

        print(
            "ERROR: no se encontraron archivos GPX."
        )

        return

    routes = []

    for index, gpx_file in enumerate(
        gpx_files,
        start=1
    ):

        print("")
        print(
            f"Procesando: {gpx_file.name}"
        )

        points = read_gpx(gpx_file)

        if len(points) < 2:

            print(
                "ERROR: el GPX no contiene "
                "suficientes puntos."
            )

            continue

        calculated = calculate_route(points)

        end = calculated["end"]

        country, place = reverse_geocode(
            end["lat"],
            end["lon"]
        )

        route = {
            "day": index,
            "name": gpx_file.stem,
            "country": country,
            "place": place,
            "km": calculated["km"],
            "elevation": calculated["elevation"],
            "track": f"tracks/{gpx_file.name}"
        }

        routes.append(route)

        print(
            f"  Distancia: {calculated['km']} km"
        )

        print(
            f"  Desnivel: {calculated['elevation']} m"
        )

        print(
            f"  País: {country}"
        )

        print(
            f"  Lugar: {place}"
        )

        # Nominatim recomienda limitar
        # las peticiones.
        time.sleep(1)


    # ==========================================
    # GUARDAR ROUTES.JSON
    # ==========================================

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            routes,
            file,
            ensure_ascii=False,
            indent=2
        )


    print("")
    print(
        "=========================================="
    )
    print(
        "routes.json generado correctamente"
    )
    print(
        "=========================================="
    )

    print(
        f"Etapas: {len(routes)}"
    )

    print(
        f"Archivo: {OUTPUT_FILE}"
    )


# ==========================================
# EJECUTAR
# ==========================================

if __name__ == "__main__":
    build_routes()
