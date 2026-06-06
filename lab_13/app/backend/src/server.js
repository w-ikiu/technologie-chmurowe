const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const VERSION = '1.0.0';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'appdb',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password123',
});

const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                priority VARCHAR(20) DEFAULT 'medium',
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

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'ok', database: 'connected', version: VERSION });
    } catch (err) {
        res.status(503).json({ status: 'error', database: 'disconnected', version: VERSION });
    }
});

app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/tasks', async (req, res) => {
    const { title, description, priority } = req.body;
    if (!title) return res.status(400).json({ error: 'title jest wymagany' });
    const validPriorities = ['low', 'medium', 'high'];
    const taskPriority = validPriorities.includes(priority) ? priority : 'medium';
    try {
        const result = await pool.query(
            'INSERT INTO tasks (title, description, priority) VALUES ($1, $2, $3) RETURNING *',
            [title, description || '', taskPriority]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status jest wymagany' });
    try {
        const result = await pool.query(
            'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'zadanie nie znalezione' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'zadanie nie znalezione' });
        res.json({ message: 'zadanie usuniete', task: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`backend v${VERSION} listening on port ${PORT}`));
