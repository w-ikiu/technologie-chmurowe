const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');
const os = require('os');
const fs = require('fs');

const app = express();
app.use(express.json());

// funkcja pomocnicza do czytania sekretu z pliku
// docker compose montuje sekrety jako pliki w /run/secrets/
// jesli plik nie istnieje uzywamy wartosci ze zmiennej srodowiskowej (fallback)
function readSecret(secretName, envFallback) {
    const secretPath = `/run/secrets/${secretName}`;
    try {
        return fs.readFileSync(secretPath, 'utf8').trim();
    } catch (err) {
        return process.env[envFallback] || '';
    }
}

// uzytkownik i haslo czytane z sekretow a nie ze zmiennych srodowiskowych
const dbUser = readSecret('db_user', 'POSTGRES_USER');
const dbPassword = readSecret('db_password', 'POSTGRES_PASSWORD');

// port backendu sterowany zmienna srodowiskowa - rozni instancje backend_1 i backend_2
const PORT = process.env.BACKEND_PORT || 3000;

// wczytanie pliku konfiguracyjnego dostarczonego przez compose config
let appConfig = {};
try {
    appConfig = JSON.parse(fs.readFileSync('/app/app.config.json', 'utf8'));
    console.log('app config zaladowany:', appConfig);
} catch (err) {
    console.log('brak app.config.json, uzywam domyslnych ustawien');
}

// konfiguracja polaczenia z postgresql
const pool = new Pool({
    user: dbUser,
    host: process.env.POSTGRES_HOST || 'postgres',
    database: process.env.POSTGRES_DB || 'products',
    password: dbPassword,
    port: 5432,
});

// tworzenie tabeli przy starcie jesli nie istnieje
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                price NUMERIC NOT NULL
            )
        `);
        console.log('db initialized');
    } catch (err) {
        console.error('db connection failed, retrying...', err);
        setTimeout(initDb, 3000);
    }
};
initDb();

// konfiguracja polaczenia z redis
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});
redisClient.on('error', (err) => console.error('redis error', err));
redisClient.connect().catch(console.error);

// endpoint health - stan polaczen z postgres i redis oraz id instancji
app.get('/health', async (req, res) => {
    let pgStatus = 'disconnected';
    let redisStatus = redisClient.isReady ? 'connected' : 'disconnected';

    try {
        await pool.query('SELECT 1');
        pgStatus = 'connected';
    } catch (err) {}

    res.json({
        status: 'ok',
        instanceId: os.hostname(),
        configName: appConfig.instanceName || 'unknown',
        postgres: pgStatus,
        redis: redisStatus
    });
});

// endpoint get /items - instanceId pokazuje ktory backend obsluzyl zadanie
app.get('/items', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM items');
        res.json({
            instanceId: os.hostname(),
            items: result.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// endpoint post /items - dodaje nowy produkt do bazy
app.post('/items', async (req, res) => {
    const { name, price } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO items (name, price) VALUES ($1, $2) RETURNING *',
            [name, price]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// endpoint get /stats - statystyki z cache redis (ttl 10s)
app.get('/stats', async (req, res) => {
    try {
        const cacheKey = 'app_stats';
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(JSON.parse(cachedData));
        }

        const result = await pool.query('SELECT COUNT(*) FROM items');
        const stats = {
            totalItems: parseInt(result.rows[0].count),
            instanceId: os.hostname(),
            timestamp: new Date().toISOString()
        };

        await redisClient.setEx(cacheKey, 10, JSON.stringify(stats));

        res.setHeader('X-Cache', 'MISS');
        res.json(stats);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`backend listening on port ${PORT} | instance: ${os.hostname()}`);
});
