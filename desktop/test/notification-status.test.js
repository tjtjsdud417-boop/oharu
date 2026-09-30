const {test} = require("node:test");
const assert = require("node:assert/strict");
const {EventEmitter} = require("node:events");
const {NotificationDeliveryStatus, DELIVERY_ERROR} = require("../notification-status");

test("synchronous OS failure propagates in the same sync response and polling", () => {
  const status = new NotificationDeliveryStatus();
  const queue = {sync() { status.failed(status.begin()); return {scheduled: 1, sent: 1}; }};
  assert.equal(status.sync(queue, [], true).error, DELIVERY_ERROR);
  assert.equal(status.snapshot(true).error, DELIVERY_ERROR);
});
test("async native failure remains visible across successful scheduling and clears only on show", () => {
  const status = new NotificationDeliveryStatus();
  const toast = new EventEmitter();
  status.observe(toast, status.begin());
  toast.emit("failed", {}, "do not leak raw OS details");
  const nextToast = new EventEmitter();
  status.observe(nextToast, status.begin());
  assert.equal(status.sync({sync: () => ({scheduled: 2, sent: 0})}, [], true).error, DELIVERY_ERROR);
  assert.equal(status.snapshot(true).error, DELIVERY_ERROR);
  nextToast.emit("show");
  assert.equal(status.snapshot(true).error, null);
});
test("older show cannot erase newer failure and older failure cannot overwrite newer success", () => {
  const status = new NotificationDeliveryStatus();
  const first = new EventEmitter(), second = new EventEmitter();
  status.observe(first, status.begin());
  status.observe(second, status.begin());
  second.emit("failed");
  first.emit("show");
  assert.equal(status.snapshot(true).error, DELIVERY_ERROR);
  const third = new EventEmitter();
  status.observe(third, status.begin());
  third.emit("show");
  first.emit("failed");
  assert.equal(status.snapshot(true).error, null);
});
test("not-ready and unsupported states stay explicit", () => {
  const status = new NotificationDeliveryStatus();
  assert.equal(status.sync(null, [], true).supported, false);
  assert.equal(status.sync(null, [], true).error, "not-ready");
  status.failed(status.begin(), "unsupported");
  assert.equal(status.snapshot(false).error, "unsupported");
  assert.equal(status.snapshot(false).worksWhenQuit, false);
});
