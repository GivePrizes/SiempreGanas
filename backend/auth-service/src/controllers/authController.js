const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
async function registro(req, res) {
  const { nombre, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query('INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING *', [nombre, email, hash]);
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) { res.status(500).json({ error: err.message }); }
}