// frontend/assets/js/admin/cuentas/adapter.js

/**
 * Normaliza cualquier respuesta del backend a un formato estable:
 * [
 *  {
 *    sorteo_id,
 *    sorteo_titulo,
 *    sorteo_premio,
 *    pendientes,
 *    entregadas,
 *    usuarios: [
 *      { usuario_id, nombre, email, telefono, numeros:[], estado }
 *    ]
 *  }
 * ]
 */
export function normalizeCuentasApi(raw) {
  if (!Array.isArray(raw)) return [];

  // ✅ Caso 1: backend ya devuelve { participantes, resumen }
  if (raw.length && Array.isArray(raw[0].participantes)) {
    return raw.map(s => {
      const usuarios = (s.participantes || []).map(p => ({
        usuario_id: p.usuarioId ?? p.usuario_id ?? p.id,
        nombre: p.nombre || 'Sin nombre',
        email: p.email || '',
        telefono: p.telefono || '',
        numeros: Array.isArray(p.numeros) ? p.numeros : [],
        estado: p.entregaEstado ?? p.estado ?? 'pendiente',
      }));

      const pendientes = s.resumen?.pendientes ?? usuarios.filter(u => u.estado === 'pendiente').length;
      const entregadas = s.resumen?.entregadas ?? usuarios.filter(u => u.estado === 'entregada').length;

      return {
        sorteo_id: s.sorteoId ?? s.sorteo_id ?? s.id,
        sorteo_titulo: s.descripcion ?? s.sorteo_titulo ?? `Sorteo #${s.sorteoId ?? s.id}`,
        sorteo_premio: s.premio ?? '',
        pendientes,
        entregadas,
        usuarios,
      };
    });
  }

  // ✅ Caso 2: backend ya devuelve agrupado como {usuarios}
  if (raw.length && (raw[0].usuarios || raw[0].users)) {
    return raw.map(s => {
      const usuariosRaw = s.usuarios || s.users || [];
      const usuarios = usuariosRaw.map(u => ({
        usuario_id: u.usuario_id ?? u.id ?? u.user_id,
        nombre: u.nombre ?? u.name ?? 'Sin nombre',
        email: u.email ?? '',
        telefono: u.telefono ?? '',
        numeros: Array.isArray(u.numeros) ? u.numeros : [],
        estado: u.estado ?? 'pendiente',
      }));

      return {
        sorteo_id: s.sorteo_id ?? s.id,
        sorteo_titulo: s.descripcion ?? s.titulo ?? `Sorteo #${s.sorteo_id ?? s.id}`,
        sorteo_premio: s.premio ?? '',
        pendientes: usuarios.filter(x => x.estado === 'pendiente').length,
        entregadas: usuarios.filter(x => x.estado === 'entregada').length,
        usuarios,
      };
    });
  }

  // ✅ Caso 3: plano row-based (fallback)
  const map = new Map();
  for (const row of raw) {
    const sorteo_id = row.sorteo_id ?? row.sorteoId ?? row.id_sorteo;
    if (!sorteo_id) continue;

    const key = String(sorteo_id);
    if (!map.has(key)) {
      map.set(key, {
        sorteo_id,
        sorteo_titulo: row.sorteo ?? row.descripcion ?? `Sorteo #${sorteo_id}`,
        sorteo_premio: row.premio ?? '',
        usuarios: [],
      });
    }

    map.get(key).usuarios.push({
      usuario_id: row.usuario_id ?? row.user_id,
      nombre: row.nombre ?? 'Sin nombre',
      email: row.email ?? '',
      telefono: row.telefono ?? '',
      numeros: Array.isArray(row.numeros) ? row.numeros : [],
      estado: row.estado ?? 'pendiente',
    });
  }

  const out = Array.from(map.values());
  for (const s of out) {
    s.pendientes = s.usuarios.filter(x => x.estado === 'pendiente').length;
    s.entregadas = s.usuarios.filter(x => x.estado === 'entregada').length;
  }
  out.sort((a, b) => b.pendientes - a.pendientes);
  return out;
}
