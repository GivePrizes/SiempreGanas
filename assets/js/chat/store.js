export function createChatStore({ myUsuarioId }) {
  const byId = new Map();
  let filter = 'all';

  function upsertMany(list = []) {
    list.forEach(m => m?.id && byId.set(m.id, m));
  }

  function has(id) {
    return byId.has(id);
  }

  function getAllSorted() {
    return [...byId.values()].sort((a, b) => {
      const ta = new Date(a.created_at || a.createdAt || 0).getTime();
      const tb = new Date(b.created_at || b.createdAt || 0).getTime();
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function getFiltered() {
    const all = getAllSorted();
    if (filter === 'system') return all.filter(m => Boolean(m.is_system ?? m.isSystem));
    if (filter === 'mine') {
      return all.filter(m => Number(m.usuario_id ?? m.usuario?.id) === Number(myUsuarioId));
    }
    return all;
  }

  function removeOptimisticByUserAndText(usuarioId, mensaje) {
    for (const [id, m] of byId.entries()) {
      if (
        m._optimistic &&
        Number(m.usuario?.id) === Number(usuarioId) &&
        m.mensaje === mensaje
      ) {
        byId.delete(id);
        return m;
      }
    }
    return null;
  }

  // Remove by id
  function remove(id) {
    byId.delete(id);
  }



  return {
    upsertMany,
    has,
    remove,
    removeOptimisticByUserAndText,
    getFiltered,

    setFilter: (f) => filter = f,
    getFilter: () => filter
  };

  
}
