import pool from '../utils/db.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const guardarNumeros = async (req, res) => {
  const { sorteo_id, numeros, comprobante } = req.body;
  const usuario_id = req.user.id;

  if (!Array.isArray(numeros) || numeros.length < 1 || numeros.length > 5)
    return res.status(400).json({ error: 'Debes elegir entre 1 y 5 números' });

  try {
    // 1. Verificar sorteo activo
    const sorteoRes = await pool.query('SELECT * FROM sorteo WHERE id = $1 AND estado = $2', [sorteo_id, 'activo']);
    if (sorteoRes.rows.length === 0) return res.status(400).json({ error: 'Sorteo no disponible' });

    const sorteo = sorteoRes.rows[0];

    // 2. Subir comprobante a Supabase Storage
    let comprobante_url = null;
    if (comprobante) {
      const base64Data = comprobante.replace(/^data:.+;base64,/, '');
      const fileExt = comprobante.split(';')[0].split('/')[1];
      const fileName = `comprobantes/${usuario_id}-${sorteo_id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, Buffer.from(base64Data, 'base64'), {
          contentType: comprobante.split(';')[0].split(':')[1],
          upsert: false
        });

      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('comprobantes').getPublicUrl(fileName);
      comprobante_url = publicUrl;
    }

    // 3. Guardar cada número (transacción)
    await pool.query('BEGIN');

    for (const num of numeros) {
      if (num < 1 || num > sorteo.cantidad_numeros)
        throw new Error(`Número ${num} fuera de rango`);

      // Verificar que no esté ocupado
      const existe = await pool.query(
        'SELECT 1 FROM numero_participacion WHERE sorteo_id = $1 AND numero = $2 AND estado = $3',
        [sorteo_id, num, 'aprobado']
      );
      if (existe.rows.length > 0)
        throw new Error(`El número ${num} ya está ocupado`);
    }

    // Insertar todos
    for (const num of numeros) {
      await pool.query(`
        INSERT INTO numero_participacion 
        (usuario_id, sorteo_id, numero, estado, comprobante_url)
        VALUES ($1, $2, $3, 'pendiente', $4)
      `, [usuario_id, sorteo_id, num, comprobante_url]);
    }

    await pool.query('COMMIT');
    res.json({ success: true, message: '¡Participación enviada! Esperando aprobación...' });

  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  }
};

export const misParticipaciones = async (req, res) => {
  const usuario_id = req.user.id;
  try {
    const result = await pool.query(`
      SELECT np.*, s.descripcion, s.premio
      FROM numero_participacion np
      JOIN sorteo s ON np.sorteo_id = s.id
      WHERE np.usuario_id = $1
      ORDER BY np.fecha DESC
    `, [usuario_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};