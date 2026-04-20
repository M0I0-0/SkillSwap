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

// Asegura que exista la tabla principal.
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

// Tablas para poblar el dashboard con datos reales.
db.run(`CREATE TABLE IF NOT EXISTS dashboard_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL CHECK(section IN ('recommended', 'schedule')),
    title TEXT NOT NULL,
    instructor TEXT NOT NULL,
    reason TEXT,
    rating REAL DEFAULT 0,
    students_count INTEGER DEFAULT 0,
    level TEXT DEFAULT 'Basico',
    schedule TEXT,
    match_percent INTEGER DEFAULT 0,
    category TEXT DEFAULT 'general',
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE TABLE IF NOT EXISTS dashboard_user_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    career TEXT,
    teaches TEXT,
    learns TEXT,
    compatibility INTEGER DEFAULT 0,
    tag_primary TEXT,
    tag_secondary TEXT,
    color TEXT DEFAULT 'blue',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

function ensureColumn(tableName, columnName, definition) {
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err) {
      console.error(`Error leyendo columnas de ${tableName}:`, err.message);
      return;
    }

    const exists = columns.some((column) => column.name === columnName);
    if (exists) {
      return;
    }

    db.run(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
      (alterErr) => {
        if (alterErr) {
          console.error(
            `Error agregando columna ${columnName} en ${tableName}:`,
            alterErr.message
          );
          return;
        }

        console.log(`✅ Columna ${columnName} agregada a ${tableName}`);
      }
    );
  });
}

// Migración automática para recuperación de contraseña.
ensureColumn("usuarios", "reset_token", "TEXT");
ensureColumn("usuarios", "reset_exp", "INTEGER");
