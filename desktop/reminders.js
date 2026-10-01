"use strict";

const GRACE_MS = 5 * 60 * 1000;
function normalizeReminders(items) {
  if (!Array.isArray(items) || items.length > 500) throw new TypeError("Expected at most 500 reminders");
  const result = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== "string" || !item.id || item.id.length > 200) throw new TypeError("Invalid reminder id");
    if (item.done === true) continue;
    if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 500) throw new TypeError("Invalid reminder title");
    // An explicit offset prevents ambiguous parsing of local times and DST transitions.
    if (typeof item.dueAt !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(item.dueAt)) throw new TypeError("dueAt requires a timezone offset");
    const due = Date.parse(item.dueAt);
    if (!Number.isFinite(due)) throw new TypeError("Invalid dueAt");
    if (result.has(item.id)) throw new TypeError("Duplicate reminder id");
    result.set(item.id, { id: item.id, title: item.title.trim(), due });
  }
  return result;
}

class ReminderQueue {
  constructor({ notify, now = Date.now, delivered = [], onDelivered = () => {} }) {
    this.notify = notify;
    this.now = now;
    this.items = new Map();
    this.delivered = new Set(delivered.filter(x => typeof x === "string").slice(-2000));
    this.onDelivered = onDelivered;
  }
  sync(items) {
    // Validate the complete snapshot before replacing it: edits, deletes and completion cancel old entries.
    this.items = normalizeReminders(items);
    return this.tick();
  }
  tick() {
    const now = this.now();
    let sent = 0;
    for (const item of this.items.values()) {
      const key = `${item.id}:${item.due}`;
      if (item.due > now || this.delivered.has(key)) continue;
      if (now - item.due > GRACE_MS) continue;
      // Mark before display; repeated renderer snapshots cannot issue duplicate OS requests.
      this.delivered.add(key);
      if (this.delivered.size > 2000) this.delivered.delete(this.delivered.values().next().value);
      this.onDelivered([...this.delivered]);
      this.notify(item);
      sent++;
    }
    return { scheduled: this.items.size, sent };
  }
}
module.exports = { ReminderQueue, normalizeReminders, GRACE_MS };
