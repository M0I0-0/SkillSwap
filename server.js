const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});

app.get('/registrar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'registrar.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});