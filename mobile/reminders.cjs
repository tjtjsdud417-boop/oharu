const PREFIX = 'oharu.todo.';
const MAX_PENDING = 60; // Leave room below iOS's pending notification limit.
function validateMessage(raw, syncType = 'oharu:reminders:sync') {
  if (typeof raw !== 'string' || raw.length > 512000) throw new Error('invalid-message');
  const m = JSON.parse(raw);
  if (!m || m.version !== 1 || typeof m.requestId !== 'string' || !/^[\w:.-]{1,100}$/.test(m.requestId)) throw new Error('invalid-message');
  if (m.type === 'oharu:reminders:permission') return m;
  if (m.type !== syncType || typeof m.enabled !== 'boolean' || !Array.isArray(m.tasks) || m.tasks.length > 2000) throw new Error('invalid-message');
  const ids = new Set();
  for (const t of m.tasks) {
    if (!t || typeof t.id !== 'string' || !/^[\w:.-]{1,128}$/.test(t.id) || ids.has(t.id) || typeof t.title !== 'string' || !t.title.trim() || t.title.length > 500 || typeof t.done !== 'boolean' || !Number.isSafeInteger(t.dueAt) || t.dueAt < 0 || t.dueAt > 8640000000000000) throw new Error('invalid-task');
    ids.add(t.id);
  }
  return m;
}
function permitted(p) {
  return p.ios ? [2, 3, 4].includes(p.ios.status) : p.granted === true;
}
function createReminderService(api, platform, now = Date.now) {
  let queue = Promise.resolve();
  const run = async (m) => {
    if (platform === 'android') await api.setNotificationChannelAsync('todo-reminders', {name: '할 일 알림', importance: api.AndroidImportance.HIGH, sound: 'default'});
    if (m.type === 'oharu:reminders:permission') {
      const current = await api.getPermissionsAsync();
      const permission = permitted(current) || current.canAskAgain === false ? current : await api.requestPermissionsAsync({ios: {allowAlert: true, allowSound: true, allowBadge: false}});
      return {requestId: m.requestId, status: permitted(permission) ? 'granted' : 'denied', canAskAgain: permission.canAskAgain === true};
    }
    const permission = await api.getPermissionsAsync(); // Never prompt during automatic sync.
    const allowed = m.enabled && permitted(permission);
    const future = allowed ? m.tasks.filter(t => !t.done && t.dueAt > now()).sort((a,b) => a.dueAt-b.dueAt || a.id.localeCompare(b.id)) : [];
    const wanted = new Map(future.slice(0, MAX_PENDING).map(t => [PREFIX+t.id, t]));
    const scheduled = await api.getAllScheduledNotificationsAsync();
    const keep = new Set();
    for (const n of scheduled) {
      if (!n.identifier.startsWith(PREFIX)) continue;
      const t = wanted.get(n.identifier);
      if (t && n.content.data?.dueAt === t.dueAt && n.content.body === t.title) keep.add(n.identifier);
      else await api.cancelScheduledNotificationAsync(n.identifier);
    }
    // Remove visible reminders after completion/deletion/disable as well.
    if (api.getPresentedNotificationsAsync && api.dismissNotificationAsync) {
      const active = new Set(m.enabled ? m.tasks.filter(t => !t.done).map(t => PREFIX+t.id) : []);
      for (const n of await api.getPresentedNotificationsAsync()) {
        const id = n.request?.identifier;
        if (id?.startsWith(PREFIX) && !active.has(id)) await api.dismissNotificationAsync(id);
      }
    }
    let failed = 0;
    for (const [identifier,t] of wanted) {
      if (keep.has(identifier)) continue;
      try {
        await api.scheduleNotificationAsync({identifier, content: {title: '오하루 · 할 일', body: t.title, sound: 'default', data: {todoId: t.id, dueAt: t.dueAt}}, trigger: {type: 'date', date: new Date(t.dueAt), ...(platform === 'android' ? {channelId: 'todo-reminders'} : {})}});
        keep.add(identifier);
      } catch { failed++; }
    }
    return {requestId: m.requestId, status: !m.enabled ? 'disabled' : !allowed ? 'denied' : failed ? 'schedule-error' : 'scheduled', scheduled: keep.size, omitted: Math.max(0, future.length-MAX_PENDING), failed, precision: platform === 'android' ? 'system-controlled' : 'scheduled'};
  };
  return {handle(raw) {
    let message;
    try { message = validateMessage(raw); } catch { return Promise.resolve({status:'invalid-message'}); }
    const result = queue.then(() => run(message)).catch(() => ({requestId: message.requestId, status:'unavailable'}));
    queue = result;
    return result;
  }};
}
module.exports = {validateMessage, createReminderService, permitted, MAX_PENDING};
