require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("./db/database.js");
const { calcularMatch, calcularCompatibilidadUsuarios } = require("./matching.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const RESET_TOKEN_MINUTES = 15;
const PASSWORD_MIN_LENGTH = 8;
const GENERIC_RESET_MESSAGE =
  "Si el correo existe, enviaremos instrucciones para restablecer la contraseña.";
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 3;

// ── Middlewares ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── DB Helpers ────────────────────────────────────────────────────
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

// ── User helpers ──────────────────────────────────────────────────
function buildFullName(u) {
  return [u.nombres, u.apellido_paterno, u.apellido_materno]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function splitFullName(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { nombres: "", apellidoPaterno: "", apellidoMaterno: "" };
  if (parts.length === 1) return { nombres: parts[0], apellidoPaterno: "", apellidoMaterno: "" };
  if (parts.length === 2) return { nombres: parts[0], apellidoPaterno: parts[1], apellidoMaterno: "" };
  return {
    nombres: parts.slice(0, -2).join(" "),
    apellidoPaterno: parts[parts.length - 2],
    apellidoMaterno: parts[parts.length - 1],
  };
}

async function getUserByEmail(email) {
  return getQuery(
    `SELECT id, nombres, apellido_paterno, apellido_materno, matricula, carrera,
            correo, intereses, disponibilidad, telefono, semestre,
            intentos_fallidos, bloqueado_hasta, email_verificado
     FROM usuarios WHERE lower(correo) = lower(?)`,
    [email]
  );
}

function formatUserProfile(u) {
  return {
    id: u.id,
    fullName: buildFullName(u),
    nombres: u.nombres || "",
    apellidoPaterno: u.apellido_paterno || "",
    apellidoMaterno: u.apellido_materno || "",
    matricula: u.matricula || "",
    career: u.carrera || "",
    email: u.correo || "",
    interests: u.intereses || "",
    availability: u.disponibilidad || "",
    phone: u.telefono || "",
    semester: u.semestre || "",
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPassword(password) {
  return typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH;
}

// ── Email helpers — nodemailer ────────────────────────────────────
function crearTransporter() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  // Opción A: Gmail con App Password
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }

  // Opción B: SMTP genérico (Outlook, Yahoo, servidor propio…)
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587"),
      secure: SMTP_PORT === "465",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  return null;
}

async function sendResetEmail(recipientEmail, resetLink) {
  const transporter = crearTransporter();

  if (!transporter) {
    // Sin configuración SMTP → modo desarrollo: enlace en consola
    console.warn("\n⚠️  EMAIL NO CONFIGURADO — modo desarrollo");
    console.warn("   Configura GMAIL_USER + GMAIL_APP_PASSWORD en tu .env");
    console.warn(`   👉 Enlace de recuperación: ${resetLink}\n`);
    return;
  }

  const from = process.env.GMAIL_USER || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"SkillSwap" <${from}>`,
    to: recipientEmail,
    subject: "Recupera tu contraseña de SkillSwap",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;
                  background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;">
        <h2 style="color:#2563eb;margin:0 0 4px;">SkillSwap</h2>
        <p style="color:#94a3b8;margin:0 0 24px;font-size:13px;">Plataforma de intercambio de habilidades</p>
        <h3 style="color:#0f172a;margin:0 0 12px;">Recupera tu contraseña</h3>
        <p style="color:#475569;margin:0 0 20px;line-height:1.6;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta.
          Haz clic en el botón de abajo. Este enlace expira en
          <strong>${RESET_TOKEN_MINUTES} minutos</strong>.
        </p>
        <a href="${resetLink}"
           style="display:inline-block;padding:14px 28px;background:#2563eb;color:#fff;
                  border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;">
          Restablecer contraseña
        </a>
        <p style="margin-top:28px;color:#94a3b8;font-size:13px;line-height:1.5;">
          Si no solicitaste este cambio, ignora este correo. Tu contraseña no se modificará.
        </p>
      </div>
    `,
  });
  console.log(`✅ Correo de recuperación enviado a ${recipientEmail}`);
}

// ── MOTOR DE MATCHING ─────────────────────────────────────────────
async function generarMatchesUsuario(usuarioId) {
  const usuario = await getQuery(
    `SELECT id, intereses, disponibilidad, carrera FROM usuarios WHERE id = ?`,
    [usuarioId]
  );
  if (!usuario) return;

  const semanaActual = obtenerSemanaISO();

  const habilidades = await allQuery(
    `SELECT h.*,
            COALESCE(AVG(c.estrellas), 0) AS avg_rating,
            COUNT(DISTINCT i.id) AS students_count
     FROM habilidades h
     LEFT JOIN calificaciones c ON c.habilidad_id = h.id
     LEFT JOIN inscripciones i ON i.habilidad_id = h.id AND i.estado = 'activa'
     WHERE h.activo = 1
       AND h.usuario_id != ?
       AND h.id NOT IN (
             SELECT habilidad_id FROM inscripciones
             WHERE usuario_id = ? AND estado = 'activa'
           )
     GROUP BY h.id`,
    [usuarioId, usuarioId]
  );

  for (const hab of habilidades) {
    const existente = await getQuery(
      `SELECT id, rechazado FROM matches
       WHERE usuario_id = ? AND habilidad_id = ? AND semana = ?`,
      [usuarioId, hab.id, semanaActual]
    );

    if (existente && existente.rechazado) continue;

    const { percent, razon, tipo } = calcularMatch(usuario, hab);
    if (percent < 30) continue;

    if (existente) {
      await runQuery(
        `UPDATE matches SET match_percent = ?, razon = ?, tipo = ? WHERE id = ?`,
        [percent, razon, tipo, existente.id]
      );
    } else {
      await runQuery(
        `INSERT INTO matches (usuario_id, habilidad_id, tipo, match_percent, razon, semana)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [usuarioId, hab.id, tipo, percent, razon, semanaActual]
      );
    }
  }

  const otrosUsuarios = await allQuery(
    `SELECT id, intereses, disponibilidad, carrera,
            nombres, apellido_paterno, apellido_materno
     FROM usuarios WHERE id != ? AND id > 0`,
    [usuarioId]
  );

  for (const otro of otrosUsuarios) {
    const existente = await getQuery(
      `SELECT id, rechazado FROM user_matches
       WHERE usuario_id = ? AND usuario_match_id = ? AND semana = ?`,
      [usuarioId, otro.id, semanaActual]
    );

    if (existente && existente.rechazado) continue;

    const compat = calcularCompatibilidadUsuarios(usuario, otro);
    if (compat < 30) continue;

    if (existente) {
      await runQuery(
        `UPDATE user_matches SET compatibilidad = ? WHERE id = ?`,
        [compat, existente.id]
      );
    } else {
      await runQuery(
        `INSERT INTO user_matches (usuario_id, usuario_match_id, compatibilidad, semana)
         VALUES (?, ?, ?, ?)`,
        [usuarioId, otro.id, compat, semanaActual]
      );
    }
  }
}

function obtenerSemanaISO() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

const ICONOS = {
  math: "∑", programacion: "</>", programming: "</>",
  physics: "λ", chemistry: "⚗", language: "A", writing: "✎", general: "•",
};

function iconoCategoria(cat) {
  return ICONOS[String(cat || "").toLowerCase()] || "•";
}

function colorUsuario(id) {
  const colores = ["blue", "purple", "teal"];
  return colores[id % colores.length];
}

// ── SOCKET.IO ─────────────────────────────────────────────────────
const usuariosConectados = {};

io.on("connection", (socket) => {
  socket.on("unirse", async ({ nombre, sala }) => {
    usuariosConectados[socket.id] = { nombre, sala, usuarioId: null };
    socket.join(sala);

    let salaRow = await getQuery("SELECT id FROM chat_salas WHERE nombre = ?", [sala]).catch(() => null);
    if (!salaRow) {
      const res = await runQuery("INSERT INTO chat_salas (nombre, descripcion) VALUES (?, ?)", [sala, sala]).catch(() => null);
      if (res) salaRow = { id: res.lastID };
    }

    if (salaRow) {
      usuariosConectados[socket.id].salaId = salaRow.id;
      const historial = await allQuery(
        `SELECT nombre_usuario AS nombre, texto,
                strftime('%H:%M', creado_en, 'localtime') AS hora
         FROM chat_mensajes WHERE sala_id = ? ORDER BY id DESC LIMIT 100`,
        [salaRow.id]
      ).catch(() => []);
      socket.emit("historial", historial.reverse());
    }

    io.to(sala).emit("usuarioConectado", { nombre, usuarios: obtenerUsuariosDeSala(sala) });
  });

  socket.on("mensaje", async ({ texto }) => {
    const usuario = usuariosConectados[socket.id];
    if (!usuario) return;
    const mensaje = {
      id: Date.now(), nombre: usuario.nombre, texto,
      hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    };
    if (usuario.salaId) {
      await runQuery(`INSERT INTO chat_mensajes (sala_id, nombre_usuario, texto) VALUES (?, ?, ?)`,
        [usuario.salaId, usuario.nombre, texto]).catch(console.error);
    }
    io.to(usuario.sala).emit("nuevoMensaje", mensaje);
  });

  socket.on("escribiendo", () => {
    const u = usuariosConectados[socket.id];
    if (u) socket.to(u.sala).emit("usuarioEscribiendo", { nombre: u.nombre });
  });

  socket.on("dejoDeEscribir", () => {
    const u = usuariosConectados[socket.id];
    if (u) socket.to(u.sala).emit("usuarioDejoDeEscribir");
  });

  socket.on("disconnect", () => {
    const u = usuariosConectados[socket.id];
    if (u) {
      delete usuariosConectados[socket.id];
      io.to(u.sala).emit("usuarioDesconectado", { nombre: u.nombre, usuarios: obtenerUsuariosDeSala(u.sala) });
    }
  });
});

function obtenerUsuariosDeSala(sala) {
  return Object.entries(usuariosConectados)
    .filter(([, u]) => u.sala === sala)
    .map(([socketId, u]) => ({ socketId, nombre: u.nombre }));
}

// ── RUTAS ESTÁTICAS ───────────────────────────────────────────────
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/pages/index.html")));
app.get("/registrar", (req, res) => res.sendFile(path.join(__dirname, "public/pages/registrar.html")));
app.get("/RecContrasena", (req, res) => res.sendFile(path.join(__dirname, "public/pages/RecContrasena.html")));
app.get("/reset-password/:token", (req, res) => res.sendFile(path.join(__dirname, "public/pages/reset.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "public/pages/dashboard.html")));
app.get("/perfil", (req, res) => res.sendFile(path.join(__dirname, "public/pages/perfil.html")));
app.get("/mensajeria", (req, res) => res.sendFile(path.join(__dirname, "public/pages/mensajeria.html")));
app.get("/notificaciones", (req, res) => res.sendFile(path.join(__dirname, "public/pages/notificaciones.html")));

// ── AUTH ──────────────────────────────────────────────────────────
app.post("/registrar", async (req, res) => {
  const { nombres, apellidoPaterno, apellidoMaterno, matricula, carrera, correo, intereses, disponibilidad, password } = req.body;
  try {
    if (!nombres || !apellidoPaterno || !correo || !password)
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    if (!isValidEmail(correo))
      return res.status(400).json({ message: "Correo inválido." });
    if (!isValidPassword(password))
      return res.status(400).json({ message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` });

    const existe = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [correo]);
    if (existe) return res.status(409).json({ message: "El correo ya está registrado." });

    const hash = await bcrypt.hash(password, 10);
    const result = await runQuery(
      `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, matricula, carrera, correo, intereses, disponibilidad, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombres, apellidoPaterno, apellidoMaterno, matricula, carrera, correo, intereses, disponibilidad, hash]
    );
    if (result.lastID) generarMatchesUsuario(result.lastID).catch(console.error);
    return res.status(201).json({ message: "Usuario registrado correctamente." });
  } catch (err) {
    console.error("Error en registro:", err);
    return res.status(500).json({ message: "No fue posible completar el registro." });
  }
});

app.post("/login", async (req, res) => {
  const correo = typeof req.body.correo === "string" ? req.body.correo.trim().toLowerCase()
    : typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!correo || !password) return res.status(400).json({ message: "Correo y contraseña son obligatorios." });

  try {
    const row = await getQuery("SELECT * FROM usuarios WHERE lower(correo) = ?", [correo]);
    if (!row) return res.status(401).json({ message: "Usuario no encontrado." });

    if (row.bloqueado_hasta && Date.now() < row.bloqueado_hasta) {
      const restante = Math.ceil((row.bloqueado_hasta - Date.now()) / 60000);
      return res.status(429).json({ message: `Cuenta bloqueada temporalmente. Intenta en ${restante} min.` });
    }

    const match = await bcrypt.compare(password, row.password);
    if (!match) {
      const intentos = (row.intentos_fallidos || 0) + 1;
      if (intentos >= MAX_LOGIN_ATTEMPTS) {
        const hasta = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
        await runQuery("UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?", [intentos, hasta, row.id]);
        return res.status(429).json({ message: `Demasiados intentos. Cuenta bloqueada por ${LOCKOUT_MINUTES} minutos.` });
      }
      await runQuery("UPDATE usuarios SET intentos_fallidos = ? WHERE id = ?", [intentos, row.id]);
      return res.status(401).json({ message: `Contraseña incorrecta. Intentos restantes: ${MAX_LOGIN_ATTEMPTS - intentos}.` });
    }

    await runQuery("UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?", [row.id]);
    generarMatchesUsuario(row.id).catch(console.error);

    return res.status(200).json({ message: "Login exitoso", user: formatUserProfile(row) });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ message: "Error en el servidor." });
  }
});

app.post("/api/recuperar", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email) return res.status(400).json({ message: "El correo es obligatorio." });
  if (!isValidEmail(email)) return res.status(400).json({ message: "Ingresa un correo válido." });
  try {
    const user = await getQuery("SELECT id, correo FROM usuarios WHERE lower(correo) = ?", [email]);
    if (!user) return res.status(200).json({ message: GENERIC_RESET_MESSAGE });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExp = Date.now() + RESET_TOKEN_MINUTES * 60 * 1000;
    const resetLink = `${req.protocol}://${req.get("host")}/reset-password/${resetToken}`;

    await runQuery("UPDATE usuarios SET reset_token = ?, reset_exp = ? WHERE id = ?", [resetToken, resetExp, user.id]);
    await sendResetEmail(user.correo, resetLink);
    return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
  } catch (err) {
    console.error("Error en recuperación:", err);
    return res.status(500).json({ message: "No fue posible procesar la solicitud." });
  }
});

app.post("/api/reset-password", async (req, res) => {
  const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!token) return res.status(400).json({ success: false, message: "Token inválido o faltante." });
  if (!isValidPassword(password))
    return res.status(400).json({ success: false, message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` });
  try {
    const user = await getQuery("SELECT id, reset_exp FROM usuarios WHERE reset_token = ?", [token]);
    if (!user) return res.status(400).json({ success: false, message: "El enlace no es válido." });
    if (!user.reset_exp || Number(user.reset_exp) < Date.now()) {
      await runQuery("UPDATE usuarios SET reset_token = NULL, reset_exp = NULL WHERE id = ?", [user.id]);
      return res.status(400).json({ success: false, message: "El enlace ha expirado." });
    }
    const hash = await bcrypt.hash(password, 10);
    await runQuery("UPDATE usuarios SET password = ?, reset_token = NULL, reset_exp = NULL WHERE id = ?", [hash, user.id]);
    return res.status(200).json({ success: true, message: "Contraseña actualizada." });
  } catch (err) {
    console.error("Error en reset:", err);
    return res.status(500).json({ success: false, message: "No fue posible actualizar la contraseña." });
  }
});

// ── DASHBOARD ─────────────────────────────────────────────────────
app.get("/api/dashboard", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";

  try {
    let usuario = null;
    if (email) {
      usuario = await getQuery("SELECT id, intereses, disponibilidad FROM usuarios WHERE lower(correo) = ?", [email]);
    }

    if (usuario) {
      const semana = obtenerSemanaISO();

      const recommended = await allQuery(
        `SELECT h.id, h.titulo AS title, h.categoria AS category, h.nivel AS level,
                h.horario_dia || ' · ' || h.horario_hora_inicio || '-' || h.horario_hora_fin AS schedule,
                h.icono AS icon,
                u.nombres || ' ' || u.apellido_paterno AS instructor,
                COALESCE(AVG(cal.estrellas), 0) AS rating,
                COUNT(DISTINCT ins.id) AS students_count,
                m.match_percent, m.razon AS reason
         FROM matches m
         JOIN habilidades h ON h.id = m.habilidad_id
         JOIN usuarios u ON u.id = h.usuario_id
         LEFT JOIN calificaciones cal ON cal.habilidad_id = h.id
         LEFT JOIN inscripciones ins ON ins.habilidad_id = h.id AND ins.estado = 'activa'
         WHERE m.usuario_id = ? AND m.tipo = 'recommended' AND m.rechazado = 0
           AND m.semana = ? AND h.activo = 1
         GROUP BY h.id ORDER BY m.match_percent DESC LIMIT 6`,
        [usuario.id, semana]
      );

      const schedule = await allQuery(
        `SELECT h.id, h.titulo AS title, h.categoria AS category, h.nivel AS level,
                h.horario_dia || ' · ' || h.horario_hora_inicio || '-' || h.horario_hora_fin AS schedule,
                h.icono AS icon,
                u.nombres || ' ' || u.apellido_paterno AS instructor,
                COALESCE(AVG(cal.estrellas), 0) AS rating,
                COUNT(DISTINCT ins.id) AS students_count,
                m.match_percent, m.razon AS reason
         FROM matches m
         JOIN habilidades h ON h.id = m.habilidad_id
         JOIN usuarios u ON u.id = h.usuario_id
         LEFT JOIN calificaciones cal ON cal.habilidad_id = h.id
         LEFT JOIN inscripciones ins ON ins.habilidad_id = h.id AND ins.estado = 'activa'
         WHERE m.usuario_id = ? AND m.tipo = 'schedule' AND m.rechazado = 0
           AND m.semana = ? AND h.activo = 1
         GROUP BY h.id ORDER BY m.match_percent DESC LIMIT 6`,
        [usuario.id, semana]
      );

      const userMatches = await allQuery(
        `SELECT u2.id, u2.nombres || ' ' || u2.apellido_paterno AS name,
                u2.carrera AS career, u2.intereses,
                um.compatibilidad AS compatibility,
                (SELECT h.categoria FROM habilidades h WHERE h.usuario_id = u2.id AND h.activo = 1 LIMIT 1) AS teaches,
                NULL AS learns
         FROM user_matches um
         JOIN usuarios u2 ON u2.id = um.usuario_match_id
         WHERE um.usuario_id = ? AND um.rechazado = 0 AND um.semana = ?
         ORDER BY um.compatibilidad DESC LIMIT 8`,
        [usuario.id, semana]
      );

      const enriched = userMatches.map((u) => ({
        ...u,
        tag_primary: u.teaches || "Habilidad",
        tag_secondary: u.career ? u.career.split(" ")[0] : "Estudiante",
        color: colorUsuario(u.id),
        teaches: u.teaches || "Por definir",
        learns: "Por definir",
      }));

      const allPct = [
        ...recommended.map((r) => r.match_percent),
        ...schedule.map((r) => r.match_percent),
        ...userMatches.map((u) => u.compatibility),
      ].filter(Boolean);
      const avgCompat = allPct.length ? Math.round(allPct.reduce((a, b) => a + b, 0) / allPct.length) : 0;

      const normalizeMatch = (m) => ({
        ...m,
        icon: m.icon || iconoCategoria(m.category),
        rating: parseFloat(m.rating) || 0,
        students_count: Number(m.students_count) || 0,
        match_percent: Number(m.match_percent) || 0,
        schedule: m.schedule?.includes("null") ? "Horario por confirmar" : (m.schedule || "Horario por confirmar"),
      });

      return res.json({
        summary: { newMatches: recommended.length, averageCompatibility: avgCompat },
        recommendedMatches: recommended.map(normalizeMatch),
        scheduleMatches: schedule.map(normalizeMatch),
        userMatches: enriched,
      });
    }

    const habilidades = await allQuery(
      `SELECT h.id, h.titulo AS title, h.categoria AS category, h.nivel AS level,
              h.horario_dia || ' · ' || h.horario_hora_inicio || '-' || h.horario_hora_fin AS schedule,
              h.icono AS icon,
              u.nombres || ' ' || u.apellido_paterno AS instructor,
              COALESCE(AVG(cal.estrellas), 0) AS rating,
              COUNT(DISTINCT ins.id) AS students_count,
              0 AS match_percent, 'Habilidad disponible' AS reason
       FROM habilidades h
       JOIN usuarios u ON u.id = h.usuario_id
       LEFT JOIN calificaciones cal ON cal.habilidad_id = h.id
       LEFT JOIN inscripciones ins ON ins.habilidad_id = h.id AND ins.estado = 'activa'
       WHERE h.activo = 1 GROUP BY h.id ORDER BY rating DESC LIMIT 9`
    );

    return res.json({
      summary: { newMatches: habilidades.length, averageCompatibility: 0 },
      recommendedMatches: habilidades.slice(0, 3).map((h) => ({
        ...h, icon: h.icon || iconoCategoria(h.category),
        rating: parseFloat(h.rating) || 0, students_count: Number(h.students_count) || 0,
        schedule: h.schedule?.includes("null") ? "Horario por confirmar" : (h.schedule || "Horario por confirmar"),
      })),
      scheduleMatches: habilidades.slice(3, 6).map((h) => ({
        ...h, icon: h.icon || iconoCategoria(h.category),
        rating: parseFloat(h.rating) || 0, students_count: Number(h.students_count) || 0,
        schedule: h.schedule?.includes("null") ? "Horario por confirmar" : (h.schedule || "Horario por confirmar"),
      })),
      userMatches: [],
    });
  } catch (err) {
    console.error("Error en dashboard:", err);
    return res.status(500).json({ message: "No fue posible cargar el dashboard." });
  }
});

// ── HABILIDADES (CRUD) ────────────────────────────────────────────
app.get("/api/habilidades", async (req, res) => {
  try {
    const { email, categoria, nivel } = req.query;
    let sql = `
      SELECT h.*, u.nombres || ' ' || u.apellido_paterno AS instructor_nombre,
             COALESCE(AVG(c.estrellas), 0) AS rating,
             COUNT(DISTINCT i.id) AS students_count
      FROM habilidades h
      JOIN usuarios u ON u.id = h.usuario_id
      LEFT JOIN calificaciones c ON c.habilidad_id = h.id
      LEFT JOIN inscripciones i ON i.habilidad_id = h.id AND i.estado = 'activa'
      WHERE h.activo = 1
    `;
    const params = [];
    if (categoria && categoria !== "all") { sql += " AND lower(h.categoria) = lower(?)"; params.push(categoria); }
    if (nivel && nivel !== "all") { sql += " AND lower(h.nivel) LIKE lower(?) || '%'"; params.push(nivel); }
    sql += " GROUP BY h.id ORDER BY h.creado_en DESC";
    const rows = await allQuery(sql, params);
    return res.json({ habilidades: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error cargando habilidades." });
  }
});

app.post("/api/habilidades", async (req, res) => {
  const { email, titulo, descripcion, categoria, nivel, horario_dia, horario_hora_inicio, horario_hora_fin, max_alumnos } = req.body;
  try {
    if (!email || !titulo) return res.status(400).json({ message: "Email y título son obligatorios." });
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

    const icono = iconoCategoria(categoria);
    const result = await runQuery(
      `INSERT INTO habilidades (usuario_id, titulo, descripcion, categoria, nivel, horario_dia, horario_hora_inicio, horario_hora_fin, max_alumnos, icono)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuario.id, titulo, descripcion, categoria || "general", nivel || "Basico", horario_dia, horario_hora_inicio, horario_hora_fin, max_alumnos || 10, icono]
    );

    const todosUsuarios = await allQuery("SELECT id FROM usuarios");
    for (const u of todosUsuarios) generarMatchesUsuario(u.id).catch(console.error);

    return res.status(201).json({ message: "Habilidad creada correctamente.", id: result.lastID });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error creando habilidad." });
  }
});

app.delete("/api/habilidades/:id", async (req, res) => {
  const { email } = req.body;
  const id = parseInt(req.params.id, 10);
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(403).json({ message: "No autorizado." });
    const hab = await getQuery("SELECT id FROM habilidades WHERE id = ? AND usuario_id = ?", [id, usuario.id]);
    if (!hab) return res.status(404).json({ message: "Habilidad no encontrada o no es tuya." });
    await runQuery("UPDATE habilidades SET activo = 0 WHERE id = ?", [id]);
    return res.json({ message: "Habilidad eliminada." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error eliminando habilidad." });
  }
});

// ── ALUMNOS POR HABILIDAD (para el instructor) ────────────────────
app.get("/api/habilidades/:id/alumnos", async (req, res) => {
  const habId = parseInt(req.params.id, 10);
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!email) return res.status(400).json({ message: "Email requerido." });

  try {
    const instructor = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!instructor) return res.status(403).json({ message: "No autorizado." });

    const hab = await getQuery(
      "SELECT id, titulo, max_alumnos FROM habilidades WHERE id = ? AND usuario_id = ? AND activo = 1",
      [habId, instructor.id]
    );
    if (!hab) return res.status(404).json({ message: "Habilidad no encontrada o no te pertenece." });

    const alumnos = await allQuery(
      `SELECT
         i.id             AS inscripcion_id,
         i.estado,
         i.progreso,
         i.creado_en      AS fecha_inscripcion,
         u.id             AS usuario_id,
         u.nombres,
         u.apellido_paterno,
         u.apellido_materno,
         u.correo,
         u.carrera,
         u.intereses,
         COALESCE(c.estrellas, NULL) AS calificacion
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN calificaciones c ON c.habilidad_id = i.habilidad_id AND c.usuario_id = i.usuario_id
       WHERE i.habilidad_id = ? AND i.estado IN ('activa', 'completado')
       ORDER BY i.creado_en DESC`,
      [habId]
    );

    return res.json({ habilidad: { id: hab.id, titulo: hab.titulo, max_alumnos: hab.max_alumnos }, alumnos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error cargando alumnos." });
  }
});

// ── ACTUALIZAR PROGRESO DE ALUMNO (solo el instructor) ────────────
app.put("/api/inscripciones/:id/progreso", async (req, res) => {
  const inscId = parseInt(req.params.id, 10);
  const { email, progreso } = req.body;
  if (!email) return res.status(400).json({ message: "Email requerido." });

  const prog = Math.min(100, Math.max(0, parseInt(progreso, 10) || 0));

  try {
    const instructor = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!instructor) return res.status(403).json({ message: "No autorizado." });

    // Verificar que la inscripción pertenece a una habilidad del instructor
    const inscripcion = await getQuery(
      `SELECT i.id, i.usuario_id, i.habilidad_id, i.estado, i.progreso AS progreso_actual
       FROM inscripciones i
       JOIN habilidades h ON h.id = i.habilidad_id
       WHERE i.id = ? AND h.usuario_id = ?`,
      [inscId, instructor.id]
    );
    if (!inscripcion) return res.status(404).json({ message: "Inscripción no encontrada o no autorizada." });

    const nuevoEstado = prog >= 100 ? "completado" : "activa";
    await runQuery("UPDATE inscripciones SET progreso = ?, estado = ? WHERE id = ?", [prog, nuevoEstado, inscId]);

    // Notificar al alumno cuando pasa el 60% (puede calificar) o llega a 100%
    const progresoAnterior = inscripcion.progreso_actual || 0;
    const hab = await getQuery("SELECT titulo FROM habilidades WHERE id = ?", [inscripcion.habilidad_id]);

    if (progresoAnterior < 60 && prog >= 60) {
      await runQuery(
        `INSERT INTO notificaciones (usuario_id, tipo, mensaje) VALUES (?, 'progreso', ?)`,
        [inscripcion.usuario_id, `¡Alcanzaste el 60% en "${hab?.titulo}"! Ya puedes calificarlo. ⭐`]
      );
    }
    if (progresoAnterior < 100 && prog >= 100) {
      await runQuery(
        `INSERT INTO notificaciones (usuario_id, tipo, mensaje) VALUES (?, 'completado', ?)`,
        [inscripcion.usuario_id, `¡Completaste el curso "${hab?.titulo}"! 🎉`]
      );
    }

    return res.json({ message: "Progreso actualizado.", progreso: prog, estado: nuevoEstado });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error actualizando progreso." });
  }
});

// ── INSCRIPCIONES ─────────────────────────────────────────────────
app.post("/api/inscripciones", async (req, res) => {
  const { email, habilidad_id } = req.body;
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    const hab = await getQuery("SELECT id, max_alumnos FROM habilidades WHERE id = ? AND activo = 1", [habilidad_id]);
    if (!hab) return res.status(404).json({ message: "Habilidad no encontrada." });
    const inscritos = await getQuery("SELECT COUNT(*) AS cnt FROM inscripciones WHERE habilidad_id = ? AND estado = 'activa'", [habilidad_id]);
    if (inscritos.cnt >= hab.max_alumnos) return res.status(409).json({ message: "La habilidad está llena." });
    await runQuery("INSERT OR IGNORE INTO inscripciones (usuario_id, habilidad_id) VALUES (?, ?)", [usuario.id, habilidad_id]);
    return res.status(201).json({ message: "Inscripción realizada." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error en inscripción." });
  }
});

// ── SOLICITUDES ───────────────────────────────────────────────────
app.post("/api/solicitudes", async (req, res) => {
  const { de_email, para_email, para_usuario_id, mensaje } = req.body;
  try {
    const de = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [de_email]);
    const para = para_usuario_id
      ? await getQuery("SELECT id FROM usuarios WHERE id = ?", [para_usuario_id])
      : await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [para_email]);
    if (!de || !para) return res.status(404).json({ message: "Usuario(s) no encontrado(s)." });
    if (de.id === para.id) return res.status(400).json({ message: "No puedes enviarte una solicitud a ti mismo." });

    const existente = await getQuery(
      `SELECT id FROM solicitudes WHERE de_usuario_id = ? AND para_usuario_id = ? AND estado = 'pendiente'`,
      [de.id, para.id]
    );
    if (existente) return res.status(409).json({ message: "Ya enviaste una solicitud a este usuario." });

    const inversa = await getQuery(
      `SELECT id FROM solicitudes WHERE de_usuario_id = ? AND para_usuario_id = ? AND estado = 'pendiente'`,
      [para.id, de.id]
    );

    if (inversa) {
      await runQuery("UPDATE solicitudes SET estado = 'aceptada' WHERE id = ?", [inversa.id]);
      await runQuery(`INSERT INTO solicitudes (de_usuario_id, para_usuario_id, mensaje, estado) VALUES (?, ?, ?, 'aceptada')`, [de.id, para.id, mensaje]);
      await runQuery(`INSERT INTO notificaciones (usuario_id, tipo, mensaje) VALUES (?, 'solicitud', 'Coincidencia mutua: ambos se enviaron solicitud de intercambio 🎉')`, [de.id]);
      await runQuery(`INSERT INTO notificaciones (usuario_id, tipo, mensaje) VALUES (?, 'solicitud', 'Coincidencia mutua: ambos se enviaron solicitud de intercambio 🎉')`, [para.id]);
      return res.status(201).json({ message: "¡Coincidencia! Solicitud aceptada automáticamente.", estado: "aceptada" });
    }

    const result = await runQuery(`INSERT INTO solicitudes (de_usuario_id, para_usuario_id, mensaje) VALUES (?, ?, ?)`, [de.id, para.id, mensaje]);
    const nombreDe = await getQuery("SELECT nombres || ' ' || apellido_paterno AS nombre FROM usuarios WHERE id = ?", [de.id]);
    await runQuery(
      `INSERT INTO notificaciones (usuario_id, tipo, mensaje, datos_extra) VALUES (?, 'solicitud', ?, ?)`,
      [para.id, `${nombreDe?.nombre || "Alguien"} te envió una solicitud de intercambio`,
       JSON.stringify({ solicitud_id: result.lastID, de_usuario_id: de.id })]
    );
    return res.status(201).json({ message: "Solicitud enviada.", estado: "pendiente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error enviando solicitud." });
  }
});

app.put("/api/solicitudes/:id", async (req, res) => {
  const { email, estado } = req.body;
  const id = parseInt(req.params.id, 10);
  if (!["aceptada", "rechazada", "cancelada"].includes(estado))
    return res.status(400).json({ message: "Estado inválido." });
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(403).json({ message: "No autorizado." });
    await runQuery("UPDATE solicitudes SET estado = ? WHERE id = ?", [estado, id]);
    return res.json({ message: `Solicitud ${estado}.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error actualizando solicitud." });
  }
});

// ── MATCHES — RECHAZAR ────────────────────────────────────────────
app.post("/api/matches/rechazar", async (req, res) => {
  const { email, habilidad_id, usuario_match_id } = req.body;
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    if (habilidad_id) {
      await runQuery("UPDATE matches SET rechazado = 1 WHERE usuario_id = ? AND habilidad_id = ?", [usuario.id, habilidad_id]);
    } else if (usuario_match_id) {
      await runQuery("UPDATE user_matches SET rechazado = 1 WHERE usuario_id = ? AND usuario_match_id = ?", [usuario.id, usuario_match_id]);
    }
    return res.json({ message: "Match rechazado." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error rechazando match." });
  }
});

// ── NOTIFICACIONES ────────────────────────────────────────────────
app.get("/api/notificaciones", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    const notifs = await allQuery(`SELECT * FROM notificaciones WHERE usuario_id = ? ORDER BY creado_en DESC LIMIT 50`, [usuario.id]);
    return res.json({ notificaciones: notifs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error cargando notificaciones." });
  }
});

app.put("/api/notificaciones/leer", async (req, res) => {
  const { email } = req.body;
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    await runQuery("UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?", [usuario.id]);
    return res.json({ message: "Notificaciones marcadas como leídas." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error." });
  }
});

// ── HISTORIAL DE MENSAJES ─────────────────────────────────────────
app.get("/api/mensajes/:sala", async (req, res) => {
  const { sala } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  try {
    const salaRow = await getQuery("SELECT id FROM chat_salas WHERE nombre = ?", [sala]);
    if (!salaRow) return res.json({ mensajes: [] });
    const mensajes = await allQuery(
      `SELECT nombre_usuario AS nombre, texto, strftime('%H:%M', creado_en, 'localtime') AS hora, creado_en
       FROM chat_mensajes WHERE sala_id = ? ORDER BY id DESC LIMIT ?`,
      [salaRow.id, limit]
    );
    return res.json({ mensajes: mensajes.reverse() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error cargando mensajes." });
  }
});

// ── USUARIO: GET & PUT ────────────────────────────────────────────
app.get("/api/users/me", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!email) return res.status(400).json({ message: "El correo es obligatorio." });
  try {
    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
    return res.json({ user: formatUserProfile(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "No fue posible cargar el perfil." });
  }
});

app.put("/api/users/me", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
  const career = typeof req.body.career === "string" ? req.body.career.trim() : "";
  const interests = typeof req.body.interests === "string" ? req.body.interests.trim() : "";
  const availability = typeof req.body.availability === "string" ? req.body.availability.trim() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  const semesterVal = typeof req.body.semester === "string" || typeof req.body.semester === "number" ? String(req.body.semester).trim() : "";

  if (!email) return res.status(400).json({ message: "El correo es obligatorio." });
  if (!fullName) return res.status(400).json({ message: "El nombre completo es obligatorio." });

  const { nombres, apellidoPaterno, apellidoMaterno } = splitFullName(fullName);
  const semester = semesterVal === "" ? null : Number(semesterVal);
  if (!nombres || !apellidoPaterno) return res.status(400).json({ message: "Ingresa al menos nombre y apellido paterno." });
  if (semesterVal !== "" && Number.isNaN(semester)) return res.status(400).json({ message: "El semestre debe ser numérico." });

  try {
    const existente = await getUserByEmail(email);
    if (!existente) return res.status(404).json({ message: "Usuario no encontrado." });
    await runQuery(
      `UPDATE usuarios SET nombres = ?, apellido_paterno = ?, apellido_materno = ?,
             carrera = ?, intereses = ?, disponibilidad = ?, telefono = ?, semestre = ? WHERE id = ?`,
      [nombres, apellidoPaterno, apellidoMaterno, career, interests, availability, phone, semester, existente.id]
    );
    generarMatchesUsuario(existente.id).catch(console.error);
    const updatedUser = await getUserByEmail(email);
    return res.json({ message: "Perfil actualizado correctamente.", user: formatUserProfile(updatedUser) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "No fue posible actualizar el perfil." });
  }
});

// ── Habilidades MÍA ───────────────────────────────────────────────
app.get("/api/habilidades/mias", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!email) return res.status(400).json({ message: "Email requerido." });
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    const habs = await allQuery(
      `SELECT h.*, COALESCE(AVG(c.estrellas), 0) AS rating, COUNT(DISTINCT i.id) AS students_count
       FROM habilidades h
       LEFT JOIN calificaciones c ON c.habilidad_id = h.id
       LEFT JOIN inscripciones i ON i.habilidad_id = h.id AND i.estado = 'activa'
       WHERE h.usuario_id = ? AND h.activo = 1
       GROUP BY h.id ORDER BY h.creado_en DESC`,
      [usuario.id]
    );
    return res.json({ habilidades: habs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error cargando tus habilidades." });
  }
});

// ── Mis inscripciones ─────────────────────────────────────────────
app.get("/api/inscripciones/mias", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!email) return res.status(400).json({ message: "Email requerido." });
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    const rows = await allQuery(
      `SELECT i.id AS inscripcion_id, i.estado, i.progreso, i.creado_en AS fecha_inscripcion,
              h.id AS habilidad_id, h.titulo, h.categoria, h.nivel, h.horario_dia,
              h.horario_hora_inicio, h.horario_hora_fin, h.max_alumnos,
              u.nombres || ' ' || u.apellido_paterno AS instructor,
              COALESCE(c.estrellas, NULL) AS calificacion
       FROM inscripciones i
       JOIN habilidades h ON h.id = i.habilidad_id
       JOIN usuarios u ON u.id = h.usuario_id
       LEFT JOIN calificaciones c ON c.habilidad_id = i.habilidad_id AND c.usuario_id = i.usuario_id
       WHERE i.usuario_id = ? ORDER BY i.creado_en DESC`,
      [usuario.id]
    );
    return res.json({ inscripciones: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error cargando inscripciones." });
  }
});

// ── Baja de un curso ──────────────────────────────────────────────
app.put("/api/inscripciones/baja", async (req, res) => {
  const { email, habilidad_id } = req.body;
  if (!email || !habilidad_id) return res.status(400).json({ message: "Email y habilidad_id requeridos." });
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    await runQuery(`UPDATE inscripciones SET estado = 'baja' WHERE usuario_id = ? AND habilidad_id = ?`, [usuario.id, habilidad_id]);
    const hab = await getQuery("SELECT titulo FROM habilidades WHERE id = ?", [habilidad_id]);
    await runQuery(`INSERT INTO notificaciones (usuario_id, tipo, mensaje) VALUES (?, 'baja', ?)`,
      [usuario.id, `Te diste de baja de "${hab?.titulo || "un curso"}"`]);
    return res.json({ message: "Baja registrada correctamente." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al procesar la baja." });
  }
});

// ── Calificaciones ────────────────────────────────────────────────
app.post("/api/calificaciones", async (req, res) => {
  const { email, habilidad_id, estrellas } = req.body;
  if (!email || !habilidad_id || !estrellas) return res.status(400).json({ message: "Faltan campos." });
  if (![1, 2, 3, 4, 5].includes(Number(estrellas))) return res.status(400).json({ message: "Estrellas debe ser 1–5." });
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });

    const inscripcion = await getQuery(
      `SELECT progreso FROM inscripciones WHERE usuario_id = ? AND habilidad_id = ? AND estado IN ('activa','completado')`,
      [usuario.id, habilidad_id]
    );
    if (!inscripcion) return res.status(403).json({ message: "No estás inscrito en este curso." });
    if ((inscripcion.progreso || 0) < 60) return res.status(403).json({ message: "Debes completar al menos el 60% para calificar." });

    const existe = await getQuery("SELECT id FROM calificaciones WHERE usuario_id = ? AND habilidad_id = ?", [usuario.id, habilidad_id]);
    if (existe) return res.status(409).json({ message: "Ya calificaste este curso." });

    await runQuery("INSERT INTO calificaciones (usuario_id, habilidad_id, estrellas) VALUES (?, ?, ?)", [usuario.id, habilidad_id, Number(estrellas)]);
    const hab = await getQuery("SELECT titulo FROM habilidades WHERE id = ?", [habilidad_id]);
    await runQuery(`INSERT INTO notificaciones (usuario_id, tipo, mensaje) VALUES (?, 'calificacion', ?)`,
      [usuario.id, `Calificaste "${hab?.titulo || "un curso"}" con ${estrellas} ⭐`]);

    return res.status(201).json({ message: "Calificación registrada." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error registrando calificación." });
  }
});

// ── Historial ─────────────────────────────────────────────────────
app.get("/api/historial", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!email) return res.status(400).json({ message: "Email requerido." });
  try {
    const usuario = await getQuery("SELECT id FROM usuarios WHERE lower(correo) = lower(?)", [email]);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado." });
    const uid = usuario.id;
    const eventos = [];

    const matchRows = await allQuery(
      `SELECT m.creado_en AS fecha, h.titulo, h.categoria, m.match_percent, m.razon
       FROM matches m JOIN habilidades h ON h.id = m.habilidad_id
       WHERE m.usuario_id = ? AND m.rechazado = 0 ORDER BY m.creado_en DESC LIMIT 30`,
      [uid]
    );
    matchRows.forEach(r => eventos.push({ tipo: "match", titulo: `Match con "${r.titulo}"`, subtitulo: r.razon || `${r.match_percent}% de compatibilidad`, fecha: r.fecha }));

    const inscRows = await allQuery(
      `SELECT i.creado_en AS fecha, i.estado, h.titulo, h.categoria, u.nombres || ' ' || u.apellido_paterno AS instructor
       FROM inscripciones i JOIN habilidades h ON h.id = i.habilidad_id JOIN usuarios u ON u.id = h.usuario_id
       WHERE i.usuario_id = ? ORDER BY i.creado_en DESC`,
      [uid]
    );
    inscRows.forEach(r => {
      const tipo = r.estado === "baja" ? "baja" : "inscrito";
      eventos.push({ tipo, titulo: tipo === "baja" ? `Baja de "${r.titulo}"` : `Inscripción en "${r.titulo}"`, subtitulo: `Con ${r.instructor}`, fecha: r.fecha });
    });

    const solRows = await allQuery(
      `SELECT s.creado_en AS fecha, s.estado, u.nombres || ' ' || u.apellido_paterno AS para_nombre
       FROM solicitudes s JOIN usuarios u ON u.id = s.para_usuario_id WHERE s.de_usuario_id = ? ORDER BY s.creado_en DESC`,
      [uid]
    );
    solRows.forEach(r => eventos.push({ tipo: "solicitud", titulo: `Solicitud enviada a ${r.para_nombre}`, subtitulo: `Estado: ${r.estado}`, fecha: r.fecha }));

    const solRecRows = await allQuery(
      `SELECT s.creado_en AS fecha, s.estado, u.nombres || ' ' || u.apellido_paterno AS de_nombre
       FROM solicitudes s JOIN usuarios u ON u.id = s.de_usuario_id WHERE s.para_usuario_id = ? ORDER BY s.creado_en DESC`,
      [uid]
    );
    solRecRows.forEach(r => eventos.push({ tipo: "solicitud", titulo: `Solicitud recibida de ${r.de_nombre}`, subtitulo: `Estado: ${r.estado}`, fecha: r.fecha }));

    const habRows = await allQuery(
      `SELECT creado_en AS fecha, titulo, categoria, nivel, activo FROM habilidades WHERE usuario_id = ? ORDER BY creado_en DESC`,
      [uid]
    );
    habRows.forEach(r => eventos.push({ tipo: "publicada", titulo: `Publicaste "${r.titulo}"`, subtitulo: `${r.categoria} · ${r.nivel}${!r.activo ? " (eliminada)" : ""}`, fecha: r.fecha }));

    const calRows = await allQuery(
      `SELECT c.creado_en AS fecha, c.estrellas, h.titulo FROM calificaciones c JOIN habilidades h ON h.id = c.habilidad_id WHERE c.usuario_id = ? ORDER BY c.creado_en DESC`,
      [uid]
    );
    calRows.forEach(r => eventos.push({ tipo: "calificacion", titulo: `Calificaste "${r.titulo}"`, subtitulo: `${"⭐".repeat(r.estrellas)} ${r.estrellas}/5`, fecha: r.fecha }));

    eventos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return res.json({ historial: eventos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error cargando historial." });
  }
});

// ── INICIAR SERVIDOR ──────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 SkillSwap corriendo en http://localhost:${PORT}`);
});