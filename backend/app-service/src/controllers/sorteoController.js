import pool from '../utils/db.js';

export const getSorteos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
             COALESCE(COUNT(np.numero), 0) as ocupados
      FROM sorteo s
      LEFT JOIN numero_participacion np ON s.id = np.sorteo_id AND np.estado = 'aprobado'
      WHERE s.estado = 'activo'
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSorteoById = async (req, res) => {
  const { id } = req.params;
  try {
    const sorteo = await pool.query('SELECT * FROM sorteo WHERE id = $1', [id]);
    if (sorteo.rows.length === 0) return res.status(404).json({ error: 'Sorteo no encontrado' });

    const ocupados = await pool.query(`
      SELECT numero FROM numero_participacion 
      WHERE sorteo_id = $1 AND estado = 'aprobado'
    `, [id]);

    res.json({
      ...sorteo.rows[0],
      numeros_ocupados: ocupados.rows.map(r => r.numero)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};