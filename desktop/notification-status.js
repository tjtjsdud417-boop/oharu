"use strict";
const DELIVERY_ERROR = "Windows notification delivery failed. Check notification settings.";

class NotificationDeliveryStatus {
  constructor() {
    this.nextAttempt = 0;
    this.lastSettled = 0;
    this.error = null;
  }
  begin() { return ++this.nextAttempt; }
  failed(attempt, message = DELIVERY_ERROR) {
    if (attempt < this.lastSettled) return;
    this.lastSettled = attempt;
    this.error = message;
  }
  shown(attempt) {
    // A delayed event from an older toast must not erase a newer failure.
    if (attempt < this.lastSettled) return;
    this.lastSettled = attempt;
    this.error = null;
  }
  observe(notification, attempt) {
    notification.once("failed", () => this.failed(attempt));
    notification.once("show", () => this.shown(attempt));
  }
  snapshot(supported) {
    return {
      supported,
      mode: "while-running",
      worksWhenQuit: false,
      permission: "system-settings",
      error: this.error,
    };
  }
  sync(queue, items, supported) {
    if (!queue) return { ...this.snapshot(false), scheduled: 0, error: this.error || "not-ready" };
    const result = queue.sync(items);
    // Read AFTER sync: notification construction/show can fail synchronously.
    return { ...this.snapshot(supported), ...result };
  }
}
module.exports = { NotificationDeliveryStatus, DELIVERY_ERROR };
