// Isolated draft. Nothing imports this file in the production application.
const MAX_TASKS = 60;
const MAX_BYTES = 32768;
const WINDOW_MS = 7 * 86400000;
function normalizeSnapshot(input, now = Date.now()) {
  if (!input || input.schemaVersion !== 1 || typeof input.enabled !== 'boolean') throw Error('invalid-widget-snapshot');
  if (!input.enabled) return {schemaVersion: 1, enabled: false, showTitlesOnHome: false, tasks: []};
  if (!Array.isArray(input.tasks) || input.tasks.length > MAX_TASKS) throw Error('too-many-widget-tasks');
  const showTitlesOnHome = input.showTitlesOnHome === true;
  const ids = new Set();
  const tasks = [];
  for (const item of input.tasks) {
    if (!item || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(item.id) || ids.has(item.id)) throw Error('invalid-widget-id');
    ids.add(item.id);
    if (item.done === true) continue;
    if (typeof item.dueAt !== 'number' || !Number.isSafeInteger(item.dueAt)) throw Error('invalid-widget-time');
    if (item.dueAt <= now || item.dueAt > now + WINDOW_MS) continue;
    if (typeof item.title !== 'string' || item.title.length > 500) throw Error('invalid-widget-title');
    const title = showTitlesOnHome ? item.title.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, ' ').trim().slice(0, 140) : '';
    tasks.push({id: item.id, title, dueAt: item.dueAt});
  }
  tasks.sort((a,b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id));
  const result = {schemaVersion: 1, enabled: true, showTitlesOnHome, tasks};
  // React Native has no guaranteed global Buffer.
  const bytes = encodeURIComponent(JSON.stringify(result)).replace(/%[A-F\d]{2}/gi, '_').length;
  if (bytes > MAX_BYTES) throw Error('widget-snapshot-too-large');
  return result;
}
function createIOSWidgetBridge(nativeModule) {
  let pending = Promise.resolve();
  return {
    update(input) {
      let payload;
      try { payload = JSON.stringify(normalizeSnapshot(input)); }
      catch { return Promise.resolve({status: 'invalid-message'}); }
      const operation = pending.then(async () => {
        if (!nativeModule?.updateSnapshot) return {status: 'unavailable'};
        return nativeModule.updateSnapshot(payload);
      }).catch(() => ({status: 'unavailable'}));
      pending = operation;
      return operation;
    },
  };
}
module.exports = {normalizeSnapshot, createIOSWidgetBridge};
