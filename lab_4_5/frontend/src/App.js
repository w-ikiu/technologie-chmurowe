import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function Home() {
  return <h2>Strona Główna</h2>;
}

function Products() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');

  const fetchItems = () => {
    fetch('/api/items')
      .then(res => res.json())
      .then(data => setItems(data.items || []));
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem })
    }).then(() => {
      setNewItem('');
      fetchItems();
    });
  };

  return (
    <div>
      <h2>Lista Produktów</h2>
      <ul>{items.map((item, idx) => <li key={idx}>{item}</li>)}</ul>
      <form onSubmit={handleSubmit}>
        <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Nazwa" required />
        <button type="submit">Dodaj produkt</button>
      </form>
    </div>
  );
}

function Stats() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div>
      <h2>Statystyki Systemu</h2>
      <p>Liczba produktów: {stats.totalProducts}</p>
      <p>ID instancji backendu: {stats.instanceId}</p>
      <p>Czas pracy serwera (uptime): {stats.uptime}</p>
      <p>Obsłużone żądania: {stats.requestsHandled}</p>
      <p>Czas serwera: {stats.serverTime}</p>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <nav>
        <Link to="/">Home</Link> | <Link to="/products">Produkty</Link> | <Link to="/stats">Statystyki</Link>
      </nav>
      <hr />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </Router>
  );
}