/**
 * seed.js – Pobla la base de datos con datos de prueba.
 * Ejecutar: node seed.js
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("./db/database.js");
const {
  calcularMatch,
  calcularCompatibilidadUsuarios,
} = require("./matching.js");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function obtenerSemanaISO() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

const ICONOS = {
  math: "∑",
  programacion: "</>",
  programming: "</>",
  physics: "λ",
  chemistry: "⚗",
  language: "A",
  writing: "✎",
  general: "•",
};

const USUARIOS_SEED = [
  {
    nombres: "Carlos",
    ap: "Ávila",
    am: "Mendoza",
    matricula: "2021001",
    carrera: "Ingeniería en Sistemas",
    correo: "carlos@skillswap.mx",
    intereses: "programacion,algebra,python",
    disponibilidad: "Vespertino",
  },
  {
    nombres: "María",
    ap: "González",
    am: "López",
    matricula: "2021002",
    carrera: "Ing. Matemáticas",
    correo: "maria@skillswap.mx",
    intereses: "matemáticas,algebra,cálculo",
    disponibilidad: "Matutino",
  },
  {
    nombres: "Andrés",
    ap: "Ruiz",
    am: "Torres",
    matricula: "2021003",
    carrera: "Ingeniería en Sistemas",
    correo: "andres@skillswap.mx",
    intereses: "python,data,programacion",
    disponibilidad: "Vespertino",
  },
  {
    nombres: "Sofía",
    ap: "Medina",
    am: "Vega",
    matricula: "2021004",
    carrera: "Física experimental",
    correo: "sofia@skillswap.mx",
    intereses: "física,electromagnetismo,matemáticas",
    disponibilidad: "Matutino",
  },
  {
    nombres: "Lucía",
    ap: "Torres",
    am: "Ramos",
    matricula: "2021005",
    carrera: "Letras Hispánicas",
    correo: "lucia@skillswap.mx",
    intereses: "redacción,inglés,escritura",
    disponibilidad: "Matutino",
  },
  {
    nombres: "Omar",
    ap: "Pérez",
    am: "Díaz",
    matricula: "2021006",
    carrera: "Ing. Industrial",
    correo: "omar@skillswap.mx",
    intereses: "estadística,programacion,matemáticas",
    disponibilidad: "Vespertino",
  },
  {
    nombres: "Daniela",
    ap: "Vega",
    am: "Cruz",
    matricula: "2021007",
    carrera: "Química",
    correo: "daniela@skillswap.mx",
    intereses: "química,biología,física",
    disponibilidad: "Matutino",
  },
  {
    nombres: "Jorge",
    ap: "Ramírez",
    am: "Fuentes",
    matricula: "2021008",
    carrera: "Ing. en Computación",
    correo: "jorge@skillswap.mx",
    intereses: "algoritmos,programacion,inglés",
    disponibilidad: "Vespertino",
  },
];

const HABILIDADES_SEED = [
  {
    usuario_correo: "maria@skillswap.mx",
    titulo: "Álgebra Lineal para Ingeniería",
    descripcion: "Vectores, matrices y sistemas de ecuaciones",
    categoria: "math",
    nivel: "Intermedio",
    horario_dia: "Lun y Mié",
    horario_hora_inicio: "14:00",
    horario_hora_fin: "15:30",
    max_alumnos: 24,
  },
  {
    usuario_correo: "andres@skillswap.mx",
    titulo: "Python para Análisis de Datos",
    descripcion: "Pandas, NumPy y visualización con matplotlib",
    categoria: "programacion",
    nivel: "Intermedio",
    horario_dia: "Mar y Jue",
    horario_hora_inicio: "16:00",
    horario_hora_fin: "17:30",
    max_alumnos: 18,
  },
  {
    usuario_correo: "sofia@skillswap.mx",
    titulo: "Física II: Electromagnetismo",
    descripcion: "Leyes de Maxwell y circuitos eléctricos",
    categoria: "physics",
    nivel: "Avanzado",
    horario_dia: "Vie",
    horario_hora_inicio: "10:00",
    horario_hora_fin: "12:00",
    max_alumnos: 31,
  },
  {
    usuario_correo: "lucia@skillswap.mx",
    titulo: "Inglés Conversacional B2",
    descripcion: "Práctica de conversación y comprensión auditiva",
    categoria: "language",
    nivel: "Intermedio",
    horario_dia: "Mié",
    horario_hora_inicio: "09:00",
    horario_hora_fin: "10:30",
    max_alumnos: 12,
  },
  {
    usuario_correo: "omar@skillswap.mx",
    titulo: "Redacción de Tesis y Ensayos",
    descripcion: "Estructura, argumentación y normas APA",
    categoria: "writing",
    nivel: "Básico",
    horario_dia: "Jue",
    horario_hora_inicio: "11:00",
    horario_hora_fin: "12:30",
    max_alumnos: 9,
  },
  {
    usuario_correo: "daniela@skillswap.mx",
    titulo: "Química Orgánica Básica",
    descripcion: "Nomenclatura, isomería y reacciones básicas",
    categoria: "chemistry",
    nivel: "Básico",
    horario_dia: "Lun",
    horario_hora_inicio: "08:00",
    horario_hora_fin: "09:30",
    max_alumnos: 15,
  },
  {
    usuario_correo: "jorge@skillswap.mx",
    titulo: "Algoritmos y Estructuras de Datos",
    descripcion: "Listas, árboles, grafos y complejidad",
    categoria: "programacion",
    nivel: "Avanzado",
    horario_dia: "Vie",
    horario_hora_inicio: "15:00",
    horario_hora_fin: "17:00",
    max_alumnos: 20,
  },
  {
    usuario_correo: "maria@skillswap.mx",
    titulo: "Cálculo Diferencial e Integral",
    descripcion: "Límites, derivadas e integrales",
    categoria: "math",
    nivel: "Básico",
    horario_dia: "Mar",
    horario_hora_inicio: "09:00",
    horario_hora_fin: "10:30",
    max_alumnos: 30,
  },
];

async function seed() {
  console.log("🌱 Iniciando seed...\n");

  const hash = await bcrypt.hash("Password1!", 10);

  // Insertar usuarios
  const usuariosIds = {};
  for (const u of USUARIOS_SEED) {
    const existe = await getQuery(
      "SELECT id FROM usuarios WHERE lower(correo) = lower(?)",
      [u.correo],
    );
    if (existe) {
      usuariosIds[u.correo] = existe.id;
      console.log(`  ⚠️  Usuario ${u.correo} ya existe (id=${existe.id})`);
      continue;
    }
    const r = await runQuery(
      `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, matricula, carrera, correo, intereses, disponibilidad, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.nombres,
        u.ap,
        u.am,
        u.matricula,
        u.carrera,
        u.correo,
        u.intereses,
        u.disponibilidad,
        hash,
      ],
    );
    usuariosIds[u.correo] = r.lastID;
    console.log(`  ✅ Usuario ${u.correo} creado (id=${r.lastID})`);
  }

  // Insertar habilidades
  for (const h of HABILIDADES_SEED) {
    const uid = usuariosIds[h.usuario_correo];
    if (!uid) {
      console.warn(`  ❌ Sin usuario para ${h.usuario_correo}`);
      continue;
    }

    const existe = await getQuery(
      "SELECT id FROM habilidades WHERE usuario_id = ? AND titulo = ?",
      [uid, h.titulo],
    );
    if (existe) {
      console.log(`  ⚠️  Habilidad "${h.titulo}" ya existe`);
      continue;
    }

    const icono = ICONOS[h.categoria.toLowerCase()] || "•";
    await runQuery(
      `INSERT INTO habilidades (usuario_id, titulo, descripcion, categoria, nivel, horario_dia, horario_hora_inicio, horario_hora_fin, max_alumnos, icono)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uid,
        h.titulo,
        h.descripcion,
        h.categoria,
        h.nivel,
        h.horario_dia,
        h.horario_hora_inicio,
        h.horario_hora_fin,
        h.max_alumnos,
        icono,
      ],
    );
    console.log(`  ✅ Habilidad "${h.titulo}" creada`);
  }

  // Generar matches para todos los usuarios
  console.log("\n🔗 Generando matches...");
  const semana = obtenerSemanaISO();

  const todosUsuarios = await allQuery(
    "SELECT id, intereses, disponibilidad, carrera FROM usuarios",
  );
  const todasHabilidades = await allQuery(
    `SELECT h.*, COALESCE(AVG(c.estrellas), 0) AS avg_rating,
            COUNT(DISTINCT i.id) AS students_count
     FROM habilidades h
     LEFT JOIN calificaciones c ON c.habilidad_id = h.id
     LEFT JOIN inscripciones i ON i.habilidad_id = h.id AND i.estado = 'activa'
     WHERE h.activo = 1
     GROUP BY h.id`,
  );

  for (const usuario of todosUsuarios) {
    for (const hab of todasHabilidades) {
      if (hab.usuario_id === usuario.id) continue;

      const { percent, razon, tipo } = calcularMatch(usuario, hab);
      if (percent < 30) continue;

      const existe = await getQuery(
        "SELECT id FROM matches WHERE usuario_id = ? AND habilidad_id = ? AND semana = ?",
        [usuario.id, hab.id, semana],
      );
      if (existe) {
        await runQuery(
          "UPDATE matches SET match_percent = ?, razon = ?, tipo = ? WHERE id = ?",
          [percent, razon, tipo, existe.id],
        );
      } else {
        await runQuery(
          "INSERT INTO matches (usuario_id, habilidad_id, tipo, match_percent, razon, semana) VALUES (?, ?, ?, ?, ?, ?)",
          [usuario.id, hab.id, tipo, percent, razon, semana],
        );
      }
    }

    // User-matches
    for (const otro of todosUsuarios) {
      if (otro.id === usuario.id) continue;
      const compat = calcularCompatibilidadUsuarios(usuario, otro);
      if (compat < 30) continue;

      const existe = await getQuery(
        "SELECT id FROM user_matches WHERE usuario_id = ? AND usuario_match_id = ? AND semana = ?",
        [usuario.id, otro.id, semana],
      );
      if (!existe) {
        await runQuery(
          "INSERT INTO user_matches (usuario_id, usuario_match_id, compatibilidad, semana) VALUES (?, ?, ?, ?)",
          [usuario.id, otro.id, compat, semana],
        );
      }
    }
    console.log(`  ✅ Matches generados para usuario id=${usuario.id}`);
  }

  console.log("\n✨ Seed completado con éxito.");
  db.close();
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
