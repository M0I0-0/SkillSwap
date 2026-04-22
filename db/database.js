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

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  // ── Usuarios ──────────────────────────────────────────────────
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
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta INTEGER,
    email_verificado INTEGER DEFAULT 0,
    token_verificacion TEXT,
    reset_token TEXT,
    reset_exp INTEGER,
    telefono TEXT,
    semestre INTEGER,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // ── Habilidades / Cursos ───────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS habilidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT DEFAULT 'general',
    nivel TEXT DEFAULT 'Basico',
    horario_dia TEXT,
    horario_hora_inicio TEXT,
    horario_hora_fin TEXT,
    max_alumnos INTEGER DEFAULT 10,
    icono TEXT,
    activo INTEGER DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);

  // ── Inscripciones ──────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS inscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    habilidad_id INTEGER NOT NULL,
    estado TEXT DEFAULT 'activa',
    progreso INTEGER DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, habilidad_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (habilidad_id) REFERENCES habilidades(id)
  )`);

  // ── Calificaciones ─────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS calificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    habilidad_id INTEGER NOT NULL,
    estrellas INTEGER NOT NULL CHECK(estrellas BETWEEN 1 AND 5),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, habilidad_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (habilidad_id) REFERENCES habilidades(id)
  )`);

  // ── Matches de cursos ──────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    habilidad_id INTEGER NOT NULL,
    tipo TEXT DEFAULT 'recommended',
    match_percent INTEGER DEFAULT 0,
    razon TEXT,
    rechazado INTEGER DEFAULT 0,
    semana TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (habilidad_id) REFERENCES habilidades(id)
  )`);

  // ── User matches ───────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS user_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    usuario_match_id INTEGER NOT NULL,
    compatibilidad INTEGER DEFAULT 0,
    rechazado INTEGER DEFAULT 0,
    semana TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_match_id) REFERENCES usuarios(id)
  )`);

  // ── Salas de chat ──────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS chat_salas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // ── Mensajes ───────────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS chat_mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sala_id INTEGER NOT NULL,
    usuario_id INTEGER,
    nombre_usuario TEXT NOT NULL,
    texto TEXT NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sala_id) REFERENCES chat_salas(id)
  )`);

  // ── Solicitudes de intercambio ─────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS solicitudes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    de_usuario_id INTEGER NOT NULL,
    para_usuario_id INTEGER NOT NULL,
    mensaje TEXT,
    estado TEXT DEFAULT 'pendiente',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (de_usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (para_usuario_id) REFERENCES usuarios(id)
  )`);

  // ── Notificaciones ─────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS notificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    leida INTEGER DEFAULT 0,
    datos_extra TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);

  // ── Salas por defecto ──────────────────────────────────────────
  const salasDefault = [
    ["general", "Chat general"],
    ["algebra", "Álgebra y Matemáticas"],
    ["programacion", "Programación"],
    ["diseno", "Diseño"],
  ];
  const stmtSala = db.prepare(
    "INSERT OR IGNORE INTO chat_salas (nombre, descripcion) VALUES (?, ?)"
  );
  salasDefault.forEach(([nombre, desc]) => stmtSala.run(nombre, desc));
  stmtSala.finalize();
});

// ── Migración incremental para tablas existentes ───────────────
function ensureColumn(tableName, columnName, definition) {
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err || !columns) return;
    const exists = columns.some((c) => c.name === columnName);
    if (exists) return;
    db.run(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
      (alterErr) => {
        if (alterErr)
          console.error(`Error agregando ${columnName} a ${tableName}:`, alterErr.message);
        else console.log(`✅ Columna ${columnName} agregada a ${tableName}`);
      }
    );
  });
}

ensureColumn("usuarios", "intentos_fallidos", "INTEGER DEFAULT 0");
ensureColumn("usuarios", "bloqueado_hasta", "INTEGER");
ensureColumn("usuarios", "email_verificado", "INTEGER DEFAULT 0");
ensureColumn("usuarios", "token_verificacion", "TEXT");
ensureColumn("usuarios", "reset_token", "TEXT");
ensureColumn("usuarios", "reset_exp", "INTEGER");
ensureColumn("usuarios", "telefono", "TEXT");
ensureColumn("usuarios", "semestre", "INTEGER");

module.exports = db;