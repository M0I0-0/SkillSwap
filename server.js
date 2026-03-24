const express = require('express');
const path = require('path');
const db = require('./db/database.js');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});

app.get('/registrar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'registrar.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'dashboard.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

app.post("/registrar", (req, res) => {
    const { correo, password } = req.body;
    if (!correo || !password) {
        return res.status(400).send("Correo y contraseña requeridos");
    }
    db.run("INSERT INTO users (email, password) VALUES (?, ?)", [correo, password], function(err) {
        if (err) {
            console.error(err);
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                res.status(409).send("El correo ya está registrado");
            } else {
                res.status(500).send("Error registrando usuario");
            }
        } else {
            console.log(`Usuario registrado: ${correo}`);
            res.redirect('/');
        }
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT password FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error en el servidor' });
        }
        if (!row) {
            res.status(401).json({ message: 'Usuario no encontrado' });
        } else if (row.password !== password) {
            res.status(401).json({ message: 'Contraseña incorrecta' });
        } else {
            res.status(200).json({ message: 'Login exitoso' });
        }
    });
});