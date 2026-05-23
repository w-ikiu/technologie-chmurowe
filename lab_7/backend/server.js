const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');
const os = require('os');

const app = express();
app.use(express.json());

// konfiguracja polaczenia z postgresql
const pool = new Pool({
    user: process.env.POSTGRES_USER || 'admin',
    host: process.env.POSTGRES_HOST || 'postgres',
    database: process.env.POSTGRES_DB || 'products',
    password: process.env.POSTGRES_PASSWORD || 'admin',
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

// endpoint health - zwraca stan polaczen z postgres i redis oraz id instancji
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
        postgres: pgStatus,
        redis: redisStatus
    });
});

// endpoint get /items - pobiera wszystkie produkty z bazy
// instanceId w odpowiedzi pozwala zobaczyc ktory backend obsluzy zadanie (load balancing)
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

let requestsHandled = 0;
app.use((req, res, next) => { requestsHandled++; next(); });

// endpoint get /stats - zwraca statystyki z cache redis (ttl 10s)
// naglowek x-cache: hit oznacza dane z cache, miss oznacza swiezo pobrane z bazy
app.get('/stats', async (req, res) => {
    try {
        const cacheKey = 'app_stats';
        const cachedData = redisClient.isReady ? await redisClient.get(cacheKey) : null;

        if (cachedData) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(JSON.parse(cachedData));
        }

        const result = await pool.query('SELECT COUNT(*) FROM items');
        const stats = {
            totalProducts: parseInt(result.rows[0].count),
            totalItems: parseInt(result.rows[0].count),
            instanceId: os.hostname(),
            uptime: process.uptime(),
            requestsHandled,
            serverTime: new Date().toISOString(),
            timestamp: new Date().toISOString()
        };

        if (redisClient.isReady) {
            await redisClient.setEx(cacheKey, 10, JSON.stringify(stats));
        }

        res.setHeader('X-Cache', 'MISS');
        res.json(stats);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

if (require.main === module) {
    app.listen(3000, '0.0.0.0', () => {
        console.log(`backend listening on port 3000 | instance: ${os.hostname()}`);
    });
}

module.exports = app;