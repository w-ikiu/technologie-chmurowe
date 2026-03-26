// API - 2 endpointy do items (get, post), 1 endpoint do stats (get)

const express = require('express');
const os = require('os');
const app = express();

app.use(express.json());

let products = ['Laptop', 'Myszka', 'Klawiatura'];

app.get('/items', (req, res) => {
    res.json({ items: products });
});

app.post('/items', (req, res) => {
    if (req.body.name) {
        products.push(req.body.name);
        res.status(201).json({ message: 'Dodano produkt' });
    } else {
        res.status(400).json({ error: 'Brak nazwy' });
    }
});

app.get('/stats', (req, res) => {
    res.json({
        totalProducts: products.length,
        instanceId: os.hostname()
    });
});

app.listen(3000, () => console.log('Backend dziala na porcie 3000'));