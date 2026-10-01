import { Storage, User, SafeArea, graniteEvent, Screen } from '@apps-in-toss/web-framework';
import { createRepository } from './repository.mjs';
// Explicit localhost development mode; constant-folded out of production bundles.
const preview = import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === '1';
const storage = preview ? {
  getItem: async k => localStorage.getItem(k),
  setItem: async (k, v) => localStorage.setItem(k, v),
} : Storage;
const deadline = promise => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('SDK_TIMEOUT')), 10000))]);
export function reportFailure() {
  const notice = document.getElementById('tossStatus');
  notice.textContent = '저장소에 연결하지 못했어요. 앱을 닫고 다시 열어주세요. 기존 기록은 지우지 않았어요.';
  notice.setAttribute('role', 'alert');
  document.querySelectorAll('#mainView input, #mainView button').forEach(el => el.disabled = true);
}
export async function initialize(today, onBack) {
  const identity = preview ? { type: 'HASH', hash: 'local-preview-only' } : await deadline(User.getAnonymousKey());
  const repo = await deadline(createRepository(storage, identity, today));
  if (preview) document.getElementById('tossStatus').textContent = '브라우저 미리보기 · 이 브라우저에만 저장';
  else {
    const applyInsets = insets => Object.entries(insets).forEach(([edge, value]) => {
      document.documentElement.style.setProperty(`--toss-${edge}`, `${Math.max(0, Number(value) || 0)}px`);
    });
    applyInsets(SafeArea.get());
    const cleanups = [SafeArea.subscribe({ onEvent: applyInsets }), graniteEvent.addEventListener('backEvent', {
      onEvent: () => { if (!onBack()) Screen.close().catch(reportFailure); }, onError: reportFailure,
    })];
    window.addEventListener('pagehide', () => cleanups.forEach(fn => fn()), { once: true });
  }
  return repo;
}
window.addEventListener('unhandledrejection', reportFailure);
