(function (root) {
  'use strict';
  const GRACE_MS = 5 * 60 * 1000;
  function snapshot(todos) {
    const unique = new Map();
    for (const todo of todos || []) {
      if (!todo || typeof todo.id !== 'string' || todo.done || !/^\d{4}-\d{2}-\d{2}$/.test(todo.todoDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(todo.time)) continue;
      const [y, m, d] = todo.todoDate.split('-').map(Number);
      const [h, min] = todo.time.split(':').map(Number);
      const date = new Date(y, m - 1, d, h, min);
      // Reject invalid dates and nonexistent daylight-saving wall-clock times.
      if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || date.getHours() !== h || date.getMinutes() !== min) continue;
      unique.set(todo.id, { id: todo.id, title: String(todo.text || '').slice(0, 200), dueAt: date.getTime(), done: false });
    }
    return [...unique.values()].sort((a, b) => a.dueAt - b.dueAt).slice(0, 500);
  }
  function due(tasks, delivered, now) {
    return tasks.filter(task => task.dueAt <= now && task.dueAt > now - GRACE_MS && !delivered[`${task.id}:${task.dueAt}`]);
  }
  const api = { snapshot, due, GRACE_MS };
  if (typeof module !== 'undefined') module.exports = api;
  if (!root.document) return;
  const KEY = 'oharu.reminders.v1';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  let enabled = read(KEY, false) === true, tasks = [], identity = 'guest', busy = false, suspended = false;
  let getter = () => [], lastNative = '', request = 0;
  const native = () => !!root.ReactNativeWebView;
  const desktop = () => !!root.desktopBridge?.syncReminders;
  const status = text => { const el = document.getElementById('reminderStatus'); if (el) el.textContent = text; };
  function paint() {
    const button = document.getElementById('reminderEnable');
    if (button) button.textContent = enabled ? '알림 끄기' : '알림 켜기';
    if (!enabled) status('이 기기의 알림이 꺼져 있어요.');
    else if (native()) status('OS 예약 상태를 확인하고 있어요.');
    else if (desktop()) status('앱·트레이 실행 중 알림. 앱 종료·PC 종료 중에는 전달되지 않아요.');
    else status('웹페이지가 실행 중일 때 알림. 브라우저 종료·절전 중에는 정시 전달을 보장하지 않아요.');
  }
  async function sync(items, user = identity) {
    // A failed/not-yet-loaded remote snapshot is unknown, not an empty task list.
    if (!Array.isArray(items)) return;
    identity = user || 'guest';
    tasks = enabled && !suspended ? snapshot(items) : [];
    const widgetTasks = suspended ? [] : snapshot(items);
    const signature = JSON.stringify({ identity, tasks, widgetTasks, enabled });
    if (signature === lastNative) return;
    try {
      if (native()) {
        root.ReactNativeWebView.postMessage(JSON.stringify({ type: 'oharu:reminders:sync', version: 1, requestId: String(++request), tasks, enabled }));
        root.ReactNativeWebView.postMessage(JSON.stringify({ type: 'oharu:widgets:sync', version: 1, requestId: String(++request), tasks: widgetTasks, enabled: !suspended }));
      }
      else if (desktop()) {
        const result = await root.desktopBridge.syncReminders(tasks.map(t => ({ ...t, dueAt: new Date(t.dueAt).toISOString() })));
        if (enabled && (result?.supported === false || result?.error)) status('Windows 알림을 표시할 수 없어요. 시스템 알림 설정을 확인해주세요.');
      }
      lastNative = signature;
    } catch { status('알림 예약을 갱신하지 못했어요. 앱을 다시 열어주세요.'); }
  }
  async function tick() {
    if (!enabled || native() || desktop() || busy || !root.Notification || Notification.permission !== 'granted') return;
    busy = true;
    const deliver = async () => {
      const key = `${KEY}.delivered.${identity}`;
      const delivered = read(key, {});
      for (const [id, time] of Object.entries(delivered)) if (time < Date.now() - 86400000) delete delivered[id];
      for (const task of due(tasks, delivered, Date.now())) {
        try {
          const options = { body: task.title, tag: `oharu:${identity}:${task.id}:${task.dueAt}`, icon: '/icon-192.png' };
          const registration = await navigator.serviceWorker?.getRegistration();
          if (registration) await registration.showNotification('오하루 · 할 일 시간이에요', options);
          else new Notification('오하루 · 할 일 시간이에요', options);
          delivered[`${task.id}:${task.dueAt}`] = Date.now();
          write(key, delivered);
        } catch { status('알림을 표시하지 못했어요. 브라우저 알림 권한을 확인해주세요.'); }
      }
    };
    try {
      // Same-origin tabs share one delivery lock; notification tags also coalesce.
      if (navigator.locks) await navigator.locks.request('oharu-reminder-delivery', deliver);
      else await deliver();
    } finally { busy = false; }
  }
  async function toggle() {
    if (enabled) { enabled = false; write(KEY, false); paint(); await sync([]); return; }
    if (native()) {
      root.ReactNativeWebView.postMessage(JSON.stringify({ type: 'oharu:reminders:permission', version: 1, requestId: String(++request) }));
      return;
    }
    if (!desktop()) {
      if (!root.Notification) { status('이 브라우저는 알림을 지원하지 않아요. iPhone은 홈 화면에 추가한 웹앱이나 모바일 앱을 이용해주세요.'); return; }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { status('알림이 허용되지 않았어요. 브라우저 설정에서 허용한 뒤 다시 눌러주세요.'); return; }
    }
    enabled = true; write(KEY, true); paint(); await sync(getter());
  }
  function mount(getTodos) {
    getter = getTodos;
    if (document.getElementById('reminderEnable')) return;
    const card = document.createElement('div'); card.className = 'set-card';
    card.innerHTML = '<div class="set-title">시간 알림</div><div class="set-row"><span>이 기기에서 알림 받기</span><button type="button" class="set-btn" id="reminderEnable">알림 켜기</button></div><p id="reminderStatus" role="status" style="font-size:13px;line-height:1.6"></p><p style="font-size:12px;line-height:1.6">시간은 현재 기기의 시간대 기준이에요. 다른 기기에서 바꾼 일정은 앱을 열어 동기화해주세요. 5분 넘게 지난 알림은 반복 표시하지 않아요. OS 집중 모드·절전 설정에 따라 알림이 늦어질 수 있어요.</p>';
    document.getElementById('setDesign').after(card);
    document.getElementById('reminderEnable').onclick = () => toggle().catch(() => status('알림 설정을 변경하지 못했어요. 다시 시도해주세요.'));
    paint();
    if (!native() && !desktop() && location.protocol === 'https:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    setInterval(() => { sync(getter()); tick(); }, 1000);
    root.addEventListener('oharu:reminders:resync', () => { lastNative = ''; sync(getter()); });
    root.addEventListener('oharu:native-reminders', event => {
      const result = event.detail || {};
      if (result.status === 'granted') { enabled = true; write(KEY, true); paint(); lastNative = ''; sync(getter()); }
      else if (result.status === 'denied') status('알림 권한이 거부되어 예약할 수 없어요. 휴대폰 설정에서 허용해주세요.');
      else if (result.status === 'schedule-error' || result.status === 'error' || result.status === 'unavailable' || result.status === 'invalid-message') status('알림 예약 실패. 휴대폰 설정과 권한을 확인해주세요.');
      else if (typeof result.scheduled === 'number' && enabled) status(`예약된 알림 ${result.scheduled}개${result.omitted ? ` · 제한으로 제외 ${result.omitted}개` : ''}. 변경 뒤 앱을 열어 동기화해주세요.`);
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastNative = ''; sync(getter()); tick(); } });
    root.addEventListener('storage', event => { if (event.key === KEY) { enabled = read(KEY, false) === true; paint(); sync(getter()); } });
  }
  root.OharuReminders = { ...api, mount, sync, clear: () => { suspended = true; tasks = []; lastNative = ''; return sync([]); } };
})(typeof window !== 'undefined' ? window : globalThis);
