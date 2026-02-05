export function createChatStore({ myUsuarioId }) {
  const byId = new Map();
  const byUserId = new Map();
  let filter = 'all';

  function updateUserCache(m) {
    const userId = m?.usuario?.id ?? m?.usuario_id ?? null;
    if (!userId) return;

    const prev = byUserId.get(userId) || {};
    const next = {
      id: userId,
      alias: m.usuario?.alias ?? m.usuario_alias ?? prev.alias,
      nombre: m.usuario?.nombre ?? m.usuario_nombre ?? prev.nombre
    };

    if (next.alias || next.nombre) {
      byUserId.set(userId, next);
    }
  }

  function mergeMessage(existing, incoming) {
    if (!existing) return incoming;
    if (!incoming) return existing;

    const merged = { ...existing, ...incoming };

    const existingUsuario = existing.usuario || {};
    const incomingUsuario = incoming.usuario || null;

    if (incomingUsuario) {
      merged.usuario = {
        ...existingUsuario,
        ...incomingUsuario,
        alias: incomingUsuario.alias ?? existingUsuario.alias,
        nombre: incomingUsuario.nombre ?? existingUsuario.nombre
      };
    } else if (existing.usuario) {
      merged.usuario = existing.usuario;
    }

    merged.usuario_alias = incoming.usuario_alias ?? existing.usuario_alias;
    merged.usuario_nombre = incoming.usuario_nombre ?? existing.usuario_nombre;

    return merged;
  }

  function upsertMany(list = []) {
    list.forEach(m => {
      if (!m?.id) return;
      const prev = byId.get(m.id);
      const merged = mergeMessage(prev, m);
      byId.set(m.id, merged);
      updateUserCache(merged);
    });
  }

  function has(id) {
    return byId.has(id);
  }

  function getAllSorted() {
    return [...byId.values()].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (ta !== tb) return ta - tb;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function getFiltered() {
    const all = getAllSorted();
    if (filter === 'system') return all.filter(m => m.is_system);
    if (filter === 'mine') return all.filter(m => Number(m.usuario_id) === Number(myUsuarioId));
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
    getUser: (id) => byUserId.get(id) || null,

    setFilter: (f) => filter = f,
    getFilter: () => filter
  };

  
}
