const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// ruta al archivo real dentro de la misma carpeta DB
const dbPath = path.join(__dirname, "skillswap.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error conectando a la base:", err.message);
  } else {
    console.log("✅ Conectado a skillswap.db");
  }
});

module.exports = db;

// Crear tabla de usuarios si no existe
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  )`, (err) => {
    if (err) {
      console.error("Error creando tabla:", err.message);
    } else {
      console.log("Tabla 'users' creada o ya existe.");
    }
  });
});