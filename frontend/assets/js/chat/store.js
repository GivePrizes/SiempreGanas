// frontend/assets/js/chat/store.js
export function createChatStore({ myUsuarioId }) {
  const byId = new Map();
  let filter = 'all';

  function upsertMany(list = []) { list.forEach(m => m?.id && byId.set(m.id, m)); }

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

  return { upsertMany, getFiltered, setFilter: (f)=>filter=f, getFilter: ()=>filter };
}
