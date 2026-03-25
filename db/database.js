const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "skillswap.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error conectando a la base:", err.message);
  } else {
    console.log("✅ Conectado a skillswap.db");
  }
});

module.exports = db;

// 👇 SOLO asegurar que exista la tabla correcta
db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombres TEXT,
    apellido_paterno TEXT,
    apellido_materno TEXT,
    matricula TEXT UNIQUE,
    carrera TEXT,
    correo TEXT UNIQUE,
    intereses TEXT,
    disponibilidad TEXT,
    password TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
)`);