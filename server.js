require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const db = require('./db/database.js');

const app = express();
const server = http.createServer(app); // <-- envuelve express para Socket.io
const io = new Server(server);         // <-- Socket.io sobre el server HTTP

const port = 3000;
const RESET_TOKEN_MINUTES = 15;
const PASSWORD_MIN_LENGTH = 8;
const GENERIC_RESET_MESSAGE = 'Si el correo existe, enviaremos instrucciones para restablecer la contraseña.';

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) { reject(err); return; }
            resolve(this);
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) { reject(err); return; }
            resolve(row);
        });
    });
}

function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) { reject(err); return; }
            resolve(rows);
        });
    });
}

function buildFullName(user) {
    return [user.nombres, user.apellido_paterno, user.apellido_materno]
        .filter(Boolean).join(' ').trim();
}

function splitFullName(fullName = '') {
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { nombres: '', apellidoPaterno: '', apellidoMaterno: '' };
    if (parts.length === 1) return { nombres: parts[0], apellidoPaterno: '', apellidoMaterno: '' };
    if (parts.length === 2) return { nombres: parts[0], apellidoPaterno: parts[1], apellidoMaterno: '' };
    return {
        nombres: parts.slice(0, -2).join(' '),
        apellidoPaterno: parts[parts.length - 2],
        apellidoMaterno: parts[parts.length - 1]
    };
}

async function getUserByEmail(email) {
    return getQuery(
        `SELECT id, nombres, apellido_paterno, apellido_materno, matricula, carrera, correo, intereses, disponibilidad, telefono, semestre
         FROM usuarios WHERE lower(correo) = lower(?)`,
        [email]
    );
}

function formatUserProfile(user) {
    return {
        id: user.id,
        fullName: buildFullName(user),
        nombres: user.nombres || '',
        apellidoPaterno: user.apellido_paterno || '',
        apellidoMaterno: user.apellido_materno || '',
        matricula: user.matricula || '',
        career: user.carrera || '',
        email: user.correo || '',
        interests: user.intereses || '',
        availability: user.disponibilidad || '',
        phone: user.telefono || '',
        semester: user.semestre || ''
    };
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
    return typeof password === 'string' && password.length >= PASSWORD_MIN_LENGTH;
}

function getResetMailConfig() {
    const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, GMAIL_USER } = process.env;
    const fromEmail = SENDGRID_FROM_EMAIL || GMAIL_USER;
    if (!SENDGRID_API_KEY || !fromEmail) return null;
    sgMail.setApiKey(SENDGRID_API_KEY);
    return { fromEmail };
}

async function sendResetEmail(recipientEmail, resetLink) {
    const mailConfig = getResetMailConfig();
    if (!mailConfig) {
        console.warn('No se envio el correo de recuperacion porque faltan SENDGRID_API_KEY y/o un remitente valido.');
        console.warn(`Enlace de recuperacion generado para ${recipientEmail}: ${resetLink}`);
        return;
    }
    await sgMail.send({
        to: recipientEmail,
        from: { email: mailConfig.fromEmail, name: 'SkillSwap' },
        replyTo: mailConfig.fromEmail,
        subject: 'Recupera tu contraseña de SkillSwap',
        text: [
            'Recibimos una solicitud para cambiar tu contrasena.',
            `Abre este enlace para crear una nueva contrasena: ${resetLink}`,
            `Este enlace expirara en ${RESET_TOKEN_MINUTES} minutos.`,
            'Si no solicitaste este cambio, puedes ignorar este correo.'
        ].join('\n\n'),
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
                <h2>Restablecer contraseña</h2>
                <p>Recibimos una solicitud para cambiar tu contraseña.</p>
                <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
                <p>
                    <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#1463f3;color:#ffffff;text-decoration:none;border-radius:8px;">
                        Restablecer contraseña
                    </a>
                </p>
                <p>Este enlace expirará en ${RESET_TOKEN_MINUTES} minutos.</p>
                <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
            </div>
        `,
        trackingSettings: {
            clickTracking: { enable: false, enableText: false },
            openTracking: { enable: false }
        }
    });
}

// ══════════════════════════════════════════════
// SOCKET.IO — Mensajería en tiempo real
// ══════════════════════════════════════════════
const usuariosConectados = {}; // socketId -> { nombre, sala }
const historialMensajes = {};  // sala -> [ ...mensajes ]

io.on('connection', (socket) => {
    console.log(`Socket conectado: ${socket.id}`);

    socket.on('unirse', ({ nombre, sala }) => {
        usuariosConectados[socket.id] = { nombre, sala };
        socket.join(sala);

        if (!historialMensajes[sala]) historialMensajes[sala] = [];

        // Enviar historial solo al que acaba de entrar
        socket.emit('historial', historialMensajes[sala]);

        // Notificar a todos en la sala
        io.to(sala).emit('usuarioConectado', {
            nombre,
            usuarios: obtenerUsuariosDeSala(sala)
        });

        console.log(`${nombre} se unió a la sala: ${sala}`);
    });

    socket.on('mensaje', ({ texto }) => {
        const usuario = usuariosConectados[socket.id];
        if (!usuario) return;

        const mensaje = {
            id: Date.now(),
            nombre: usuario.nombre,
            texto,
            hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            socketId: socket.id
        };

        // Guardar en historial (máx 100 por sala)
        historialMensajes[usuario.sala].push(mensaje);
        if (historialMensajes[usuario.sala].length > 100) historialMensajes[usuario.sala].shift();

        io.to(usuario.sala).emit('nuevoMensaje', mensaje);
    });

    socket.on('escribiendo', () => {
        const usuario = usuariosConectados[socket.id];
        if (!usuario) return;
        socket.to(usuario.sala).emit('usuarioEscribiendo', { nombre: usuario.nombre });
    });

    socket.on('dejoDeEscribir', () => {
        const usuario = usuariosConectados[socket.id];
        if (!usuario) return;
        socket.to(usuario.sala).emit('usuarioDejoDeEscribir');
    });

    socket.on('disconnect', () => {
        const usuario = usuariosConectados[socket.id];
        if (usuario) {
            delete usuariosConectados[socket.id];
            io.to(usuario.sala).emit('usuarioDesconectado', {
                nombre: usuario.nombre,
                usuarios: obtenerUsuariosDeSala(usuario.sala)
            });
            console.log(`${usuario.nombre} se desconectó`);
        }
    });
});

function obtenerUsuariosDeSala(sala) {
    return Object.entries(usuariosConectados)
        .filter(([, u]) => u.sala === sala)
        .map(([socketId, u]) => ({ socketId, nombre: u.nombre }));
}
// ══════════════════════════════════════════════

// Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});

app.get('/registrar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'registrar.html'));
});

app.get('/RecContrasena', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'RecContrasena.html'));
});

app.get('/reset-password/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'reset.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard.html'));
});

app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'perfil.html'));
});

app.get('/mensajeria', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'mensajeria.html'));
});

// REGISTRO
app.post("/registrar", async (req, res) => {
    const { nombres, apellidoPaterno, apellidoMaterno, matricula, carrera, correo, intereses, disponibilidad, password } = req.body;
    try {
        if (!nombres || !apellidoPaterno || !correo || !password) {
            return res.status(400).json({ message: 'Faltan campos obligatorios.' });
        }
        if (!isValidEmail(correo)) {
            return res.status(400).json({ message: 'Correo inválido.' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` });
        }
        const existingUser = await getQuery('SELECT id FROM usuarios WHERE lower(correo) = lower(?)', [correo]);
        if (existingUser) {
            return res.status(409).json({ message: 'El correo ya está registrado.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await runQuery(
            `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, matricula, carrera, correo, intereses, disponibilidad, password)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombres, apellidoPaterno, apellidoMaterno, matricula, carrera, correo, intereses, disponibilidad, hashedPassword]
        );
        return res.status(201).json({ message: 'Usuario registrado correctamente.' });
    } catch (error) {
        console.error('Error en registro:', error);
        return res.status(500).json({ message: 'No fue posible completar el registro.' });
    }
});

app.post('/login', (req, res) => {
    const correo = typeof req.body.correo === 'string'
        ? req.body.correo.trim().toLowerCase()
        : typeof req.body.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!correo || !password) {
        return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
    }

    db.get('SELECT * FROM usuarios WHERE correo = ?', [correo], async (err, row) => {
        if (err) return res.status(500).json({ message: 'Error en el servidor' });
        if (!row) return res.status(401).json({ message: 'Usuario no encontrado' });
        const match = await bcrypt.compare(password, row.password);
        if (!match) return res.status(401).json({ message: 'Contraseña incorrecta' });
        res.status(200).json({
            message: 'Login exitoso',
            user: formatUserProfile(row)
        });
    });
});

app.post('/api/recuperar', async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) return res.status(400).json({ message: 'El correo es obligatorio.' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Ingresa un correo valido.' });
    try {
        const user = await getQuery('SELECT id, correo FROM usuarios WHERE lower(correo) = lower(?)', [email]);
        if (!user) return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExp = Date.now() + RESET_TOKEN_MINUTES * 60 * 1000;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const resetLink = `${baseUrl}/reset-password/${resetToken}`;
        await runQuery('UPDATE usuarios SET reset_token = ?, reset_exp = ? WHERE id = ?', [resetToken, resetExp, user.id]);
        await sendResetEmail(user.correo, resetLink);
        return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
    } catch (error) {
        console.error('Error en recuperacion de contraseña:', error);
        return res.status(500).json({ message: 'No fue posible procesar la solicitud.' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!token) return res.status(400).json({ success: false, message: 'Token invalido o faltante.' });
    if (!isValidPassword(password)) return res.status(400).json({ success: false, message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` });
    try {
        const user = await getQuery('SELECT id, reset_exp FROM usuarios WHERE reset_token = ?', [token]);
        if (!user) return res.status(400).json({ success: false, message: 'El enlace no es valido.' });
        if (!user.reset_exp || Number(user.reset_exp) < Date.now()) {
            await runQuery('UPDATE usuarios SET reset_token = NULL, reset_exp = NULL WHERE id = ?', [user.id]);
            return res.status(400).json({ success: false, message: 'El enlace ha expirado.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await runQuery('UPDATE usuarios SET password = ?, reset_token = NULL, reset_exp = NULL WHERE id = ?', [hashedPassword, user.id]);
        return res.status(200).json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        return res.status(500).json({ success: false, message: 'No fue posible actualizar la contraseña.' });
    }
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const [recommendedMatches, scheduleMatches, userMatches] = await Promise.all([
            allQuery(`SELECT id, title, instructor, reason, rating, students_count, level, schedule, match_percent, category, icon FROM dashboard_matches WHERE section = 'recommended' ORDER BY match_percent DESC, id DESC`),
            allQuery(`SELECT id, title, instructor, reason, rating, students_count, level, schedule, match_percent, category, icon FROM dashboard_matches WHERE section = 'schedule' ORDER BY match_percent DESC, id DESC`),
            allQuery(`SELECT id, name, career, teaches, learns, compatibility, tag_primary, tag_secondary, color FROM dashboard_user_matches ORDER BY compatibility DESC, id DESC`)
        ]);
        const allCompatibilities = [
            ...recommendedMatches.map((item) => Number(item.match_percent) || 0),
            ...scheduleMatches.map((item) => Number(item.match_percent) || 0),
            ...userMatches.map((item) => Number(item.compatibility) || 0)
        ].filter((value) => value > 0);
        const averageCompatibility = allCompatibilities.length
            ? Math.round(allCompatibilities.reduce((sum, value) => sum + value, 0) / allCompatibilities.length)
            : 0;
        return res.json({
            summary: { newMatches: recommendedMatches.length, averageCompatibility },
            recommendedMatches, scheduleMatches, userMatches
        });
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        return res.status(500).json({ message: 'No fue posible cargar la informacion del dashboard.' });
    }
});

app.get('/api/users/me', async (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    if (!email) return res.status(400).json({ message: 'El correo es obligatorio.' });
    try {
        const user = await getUserByEmail(email);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        return res.json({ user: formatUserProfile(user) });
    } catch (error) {
        console.error('Error consultando perfil:', error);
        return res.status(500).json({ message: 'No fue posible cargar el perfil.' });
    }
});

app.put('/api/users/me', async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const career = typeof req.body.career === 'string' ? req.body.career.trim() : '';
    const interests = typeof req.body.interests === 'string' ? req.body.interests.trim() : '';
    const availability = typeof req.body.availability === 'string' ? req.body.availability.trim() : '';
    const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
    const semesterValue = typeof req.body.semester === 'string' || typeof req.body.semester === 'number'
        ? String(req.body.semester).trim() : '';
    if (!email) return res.status(400).json({ message: 'El correo es obligatorio.' });
    if (!fullName) return res.status(400).json({ message: 'El nombre completo es obligatorio.' });
    const { nombres, apellidoPaterno, apellidoMaterno } = splitFullName(fullName);
    const semester = semesterValue === '' ? null : Number(semesterValue);
    if (!nombres || !apellidoPaterno) return res.status(400).json({ message: 'Ingresa al menos nombre y apellido paterno.' });
    if (semesterValue !== '' && Number.isNaN(semester)) return res.status(400).json({ message: 'El semestre debe ser numerico.' });
    try {
        const existingUser = await getUserByEmail(email);
        if (!existingUser) return res.status(404).json({ message: 'Usuario no encontrado.' });
        await runQuery(
            `UPDATE usuarios SET nombres = ?, apellido_paterno = ?, apellido_materno = ?, carrera = ?, intereses = ?, disponibilidad = ?, telefono = ?, semestre = ? WHERE id = ?`,
            [nombres, apellidoPaterno, apellidoMaterno, career, interests, availability, phone, semester, existingUser.id]
        );
        const updatedUser = await getUserByEmail(email);
        return res.json({ message: 'Perfil actualizado correctamente.', user: formatUserProfile(updatedUser) });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        return res.status(500).json({ message: 'No fue posible actualizar el perfil.' });
    }
});

// IMPORTANTE: usar server.listen, NO app.listen (necesario para Socket.io)
server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
