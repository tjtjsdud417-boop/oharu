// Anonymous identity scopes device storage only. It is NEVER a backend credential.
export async function createRepository(storage, identity, today) {
  if (identity?.type !== 'HASH' || !identity.hash) throw new Error('IDENTITY_UNAVAILABLE');
  const key = `oharu.toss.v1:${identity.hash}:todos`;
  const raw = await storage.getItem(key);
  let state = raw === null ? { todos: [] } : JSON.parse(raw);
  if (!state || !Array.isArray(state.todos)) throw new Error('INVALID_SAVED_DATA');
  if (state.todos.some(t => !t || typeof t.id !== 'string' || typeof t.text !== 'string' || typeof t.todoDate !== 'string')) throw new Error('INVALID_SAVED_DATA');
  let queue = Promise.resolve();
  const mutate = transform => {
    const operation = queue.then(async () => {
      const next = { todos: transform(structuredClone(state.todos)) };
      await storage.setItem(key, JSON.stringify(next));
      state = next;
    });
    queue = operation.catch(() => {});
    return operation;
  };
  return {
    load: async () => { await queue; return structuredClone(state.todos); },
    add: t => mutate(items => [...items, t]),
    update: t => mutate(items => items.map(x => x.id === t.id ? t : x)),
    remove: id => mutate(items => items.filter(x => x.id !== id)),
    setOrder: (id, sortOrder) => mutate(items => items.map(x => x.id === id ? { ...x, sortOrder } : x)),
    rollover: async () => {},
    carryOver: () => mutate(items => items.map(x => !x.done && x.todoDate < today() ? { ...x, todoDate: today(), time: null } : x)),
  };
}
