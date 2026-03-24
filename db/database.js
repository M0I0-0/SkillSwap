const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'skillswap.db'), (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    } else {
        console.log('Conectado a skillswap.db');
    }
});

db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id               INTEGER  PRIMARY KEY AUTOINCREMENT,
        nombres          TEXT     NOT NULL,
        apellido_paterno TEXT     NOT NULL,
        apellido_materno TEXT     NOT NULL,
        matricula        TEXT     NOT NULL UNIQUE,
        carrera          TEXT     NOT NULL,
        correo           TEXT     NOT NULL UNIQUE,
        intereses        TEXT,
        disponibilidad   TEXT     NOT NULL,
        password         TEXT     NOT NULL,
        creado_en        DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) console.error('Error al crear tabla usuarios:', err.message);
    else      console.log('Tabla "usuarios" lista.');
});

module.exports = db;