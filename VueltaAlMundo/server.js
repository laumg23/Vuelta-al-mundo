const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Crear carpetas si no existen
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("routes.json")) fs.writeFileSync("routes.json", "[]");

// Configuración de Multer
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const name = Date.now() + "_" + file.originalname.replace(/\s+/g, "_");
    cb(null, name);
  }
});

const upload = multer({ storage });

// Servir archivos estáticos
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Obtener todas las rutas
app.get("/routes", (req, res) => {
  const routes = JSON.parse(fs.readFileSync("routes.json", "utf8"));
  res.json(routes);
});

// Subir GPX
app.post("/upload", upload.single("gpx"), (req, res) => {

  const routes = JSON.parse(fs.readFileSync("routes.json", "utf8"));

  const newRoute = {
    id: Date.now(),
    name: req.file.originalname.replace(".gpx", ""),
    file: "/uploads/" + req.file.filename,
    date: new Date().toISOString()
  };

  routes.push(newRoute);

  fs.writeFileSync("routes.json", JSON.stringify(routes, null, 2));

  res.json(newRoute);

});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado → http://localhost:${PORT}`);
});