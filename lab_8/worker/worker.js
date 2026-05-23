const { createClient } = require('redis');
const { Pool } = require('pg');
const fs = require('fs');

// funkcja pomocnicza do czytania sekretu z pliku
// docker compose montuje sekrety jako pliki w /run/secrets/
function readSecret(secretName, envFallback) {
    const secretPath = `/run/secrets/${secretName}`;
    try {
        return fs.readFileSync(secretPath, 'utf8').trim();
    } catch (err) {
        return process.env[envFallback] || '';
    }
}

// uzytkownik i haslo czytane z sekretow
const dbUser = readSecret('db_user', 'POSTGRES_USER');
const dbPassword = readSecret('db_password', 'POSTGRES_PASSWORD');

// polaczenie z postgresql
const pool = new Pool({
    user: dbUser,
    host: process.env.POSTGRES_HOST || 'postgres',
    database: process.env.POSTGRES_DB || 'products',
    password: dbPassword,
    port: 5432,
});

// polaczenie z redis
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});
redisClient.on('error', (err) => console.error('redis error', err));

// worker przetwarza zadania w tle - co 15 sekund liczy produkty i zapisuje wynik do redis
async function processJob() {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM items');
        const count = result.rows[0].count;
        await redisClient.set('worker_last_count', count);
        console.log(`worker przetworzyl zadanie: liczba produktow = ${count}, czas = ${new Date().toISOString()}`);
    } catch (err) {
        console.error('blad przetwarzania zadania:', err.message);
    }
}

async function start() {
    await redisClient.connect();
    console.log('worker uruchomiony, polaczony z redis i postgres');
    // pierwsze przetworzenie od razu, potem co 15 sekund
    processJob();
    setInterval(processJob, 15000);
}

start().catch(console.error);
