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
