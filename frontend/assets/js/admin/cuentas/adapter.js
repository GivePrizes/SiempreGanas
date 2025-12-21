// assets/js/admin/cuentas/adapter.js
export function normalizeCuentasApi(payload) {
  const sorteos = Array.isArray(payload) ? payload : [];

  return sorteos.map((s) => {
    const sorteoId = s.sorteoId ?? s.sorteo_id ?? s.id ?? null;

    const descripcion =
      s.descripcion ?? s.sorteo_descripcion ?? s.sorteo ?? 'Sorteo';

    const estado = s.estado ?? s.sorteo_estado ?? 'activo';

    const participantesRaw = s.participantes ?? s.usuarios ?? [];

    const participantes = participantesRaw.map((p) => {
      const usuarioId = p.usuarioId ?? p.usuario_id ?? p.id ?? null;

      const nombre = (p.nombre ?? p.usuario_nombre ?? p.usuario ?? '').trim();
      const email = (p.email ?? p.usuario_email ?? '').trim();
      const telefono = (p.telefono ?? p.usuario_telefono ?? '').toString().trim();

      const telefonoE164 =
        (p.telefonoE164 ?? p.telefono_e164 ?? '').toString().trim();

      const numeros = p.numeros ?? p.numbers ?? [];
      const entregaEstado = p.entregaEstado ?? p.entrega_estado ?? p.estado ?? 'pendiente';
      const entregadaAt = p.entregadaAt ?? p.entregada_at ?? null;

      return {
        usuarioId,
        nombre,
        email,
        telefono,
        telefonoE164,
        numeros: Array.isArray(numeros) ? numeros : [],
        entregaEstado,
        entregadaAt
      };
    });

    // Recalcular resumen SIEMPRE desde los items (para evitar “Pendientes: 0” cuando hay 1)
    const resumen = {
      pendientes: participantes.filter(x => (x.entregaEstado || 'pendiente') === 'pendiente').length,
      entregadas: participantes.filter(x => x.entregaEstado === 'entregada').length,
    };

    return {
      sorteoId,
      descripcion,
      estado,
      cantidadNumeros: s.cantidadNumeros ?? s.cantidad_numeros ?? null,
      resumen,
      participantes
    };
  });
}
