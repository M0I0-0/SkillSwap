const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./db/database.js');

const app = express();
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
            if (err) {
                reject(err);
                return;
            }

            resolve(this);
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(row);
        });
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
    return typeof password === 'string' && password.length >= PASSWORD_MIN_LENGTH;
}

function createResetTransporter() {
    const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
        }
    });
}

async function sendResetEmail(recipientEmail, resetLink) {
    const transporter = createResetTransporter();

    if (!transporter) {
        console.warn('No se envio el correo de recuperacion porque faltan GMAIL_USER o GMAIL_APP_PASSWORD.');
        console.warn(`Enlace de recuperacion generado para ${recipientEmail}: ${resetLink}`);
        return;
    }

    await transporter.sendMail({
        from: `"SkillSwap" <${process.env.GMAIL_USER}>`,
        to: recipientEmail,
        subject: 'Recupera tu contraseña de SkillSwap',
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
        `
    });
}

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

// 🔥 REGISTRO COMPLETO
app.post("/registrar", async (req, res) => {
    const {
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        matricula,
        carrera,
        correo,
        intereses,
        disponibilidad,
        password
    } = req.body;

    try {
        const bcrypt = require("bcrypt");
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO usuarios
            (nombres, apellido_paterno, apellido_materno, matricula, carrera, correo, intereses, disponibilidad, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(query, [
            nombres,
            apellidoPaterno,
            apellidoMaterno,
            matricula,
            carrera,
            correo,
            intereses,
            disponibilidad,
            hashedPassword
        ], function (err) {
            if (err) {
                console.error(err);

                if (err.code === "SQLITE_CONSTRAINT") {
                    return res.status(409).json({
                        message: "Correo o matrícula ya registrados"
                    });
                }

                return res.status(500).json({
                    message: "Error en BD"
                });
            }

            res.status(201).json({
                message: "Usuario registrado correctamente"
            });
        });

    } catch (error) {
        res.status(500).json({ message: "Error del servidor" });
    }
});

// 🔐 LOGIN SEGURO
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM usuarios WHERE correo = ?", [email], async (err, row) => {
        if (err) {
            return res.status(500).json({ message: 'Error en el servidor' });
        }

        if (!row) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        const bcrypt = require("bcrypt");
        const match = await bcrypt.compare(password, row.password);

        if (!match) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        res.status(200).json({ message: 'Login exitoso' });
    });
});

app.post('/api/recuperar', async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email) {
        return res.status(400).json({ message: 'El correo es obligatorio.' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Ingresa un correo valido.' });
    }

    try {
        const user = await getQuery('SELECT id, correo FROM usuarios WHERE lower(correo) = lower(?)', [email]);

        if (!user) {
            return res.status(200).json({ message: GENERIC_RESET_MESSAGE });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExp = Date.now() + RESET_TOKEN_MINUTES * 60 * 1000;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const resetLink = `${baseUrl}/reset-password/${resetToken}`;

        await runQuery(
            'UPDATE usuarios SET reset_token = ?, reset_exp = ? WHERE id = ?',
            [resetToken, resetExp, user.id]
        );

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

    if (!token) {
        return res.status(400).json({ success: false, message: 'Token invalido o faltante.' });
    }

    if (!isValidPassword(password)) {
        return res.status(400).json({
            success: false,
            message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
        });
    }

    try {
        const user = await getQuery(
            'SELECT id, reset_exp FROM usuarios WHERE reset_token = ?',
            [token]
        );

        if (!user) {
            return res.status(400).json({ success: false, message: 'El enlace no es valido.' });
        }

        if (!user.reset_exp || Number(user.reset_exp) < Date.now()) {
            await runQuery(
                'UPDATE usuarios SET reset_token = NULL, reset_exp = NULL WHERE id = ?',
                [user.id]
            );

            return res.status(400).json({ success: false, message: 'El enlace ha expirado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await runQuery(
            'UPDATE usuarios SET password = ?, reset_token = NULL, reset_exp = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        return res.status(200).json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        return res.status(500).json({ success: false, message: 'No fue posible actualizar la contraseña.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
