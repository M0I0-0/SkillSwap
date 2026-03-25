const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./db/database.js');

const app = express();
const port = 3000;

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});

app.get('/registrar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'registrar.html'));
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});