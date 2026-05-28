const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// konfiguracja polaczenia z baza danych ze zmiennych srodowiskowych
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'appdb',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password123',
});

// tworzenie tabeli tasks jesli nie istnieje
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('tabela tasks zainicjalizowana');
    } catch (err) {
        console.error('blad inicjalizacji bazy, ponawiam...', err.message);
        setTimeout(initDb, 3000);
    }
};
initDb();

// endpoint health - zwraca stan aplikacji i polaczenia z baza
// 200 gdy wszystko ok, 503 gdy baza niedostepna
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

// get /tasks - zwraca liste wszystkich zadan
app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// post /tasks - tworzy nowe zadanie
app.post('/tasks', async (req, res) => {
    const { title, description } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'title jest wymagany' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
            [title, description || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// patch /tasks/:id - aktualizuje status zadania
app.patch('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ error: 'status jest wymagany' });
    }
    try {
        const result = await pool.query(
            'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'zadanie nie znalezione' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// delete /tasks/:id - usuwa zadanie
app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'zadanie nie znalezione' });
        }
        res.json({ message: 'zadanie usuniete', task: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`backend listening on port ${PORT}`);
});
