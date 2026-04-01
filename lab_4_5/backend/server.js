const express = require('express');
const os = require('os');
const app = express();
const port = 3000;

let requestCount = 0;
// czas uruchomienia serwera
const startTime = Date.now(); 

// middleware liczacy kazde zapytanie
app.use((req, res, next) => {
    requestCount++;
    next();
});

const products = [
    { id: 1, name: 'Laptop', price: 3500 },
    { id: 2, name: 'Myszka', price: 150 },
    { id: 3, name: 'Klawiatura', price: 300 }
];

// nowy endpoint: /health
app.get('/health', (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    res.json({ 
        status: "ok", 
        uptime: `${uptimeSeconds}s` 
    });
});

// zaktualizowany endpoint: /stats
app.get('/stats', (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    res.json({
        totalProducts: products.length,
        instanceId: process.env.INSTANCE_ID || os.hostname(),
        serverTime: new Date().toISOString(),
        requestsHandled: requestCount,
        uptime: `${uptimeSeconds}s`
    });
});

app.get('/', (req, res) => {
    res.json(products);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Backend listening at http://0.0.0.0:${port}`);
});