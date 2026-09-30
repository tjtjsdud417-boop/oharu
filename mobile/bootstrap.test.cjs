const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { chromium } = require('playwright');

for (const platform of ['android', 'ios']) test(`native ${platform} guest cold bootstrap and two distinct saved tasks work offline`, async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.nativeMessages = [];
      window.ReactNativeWebView = { postMessage: message => window.nativeMessages.push(message) };
    });
    const html = fs.readFileSync(path.join(__dirname, 'assets/web/app.html'), 'utf8');
    await page.route('**/*', route => {
      const url = route.request().url();
      if (route.request().resourceType() === 'document') return route.fulfill({ contentType: 'text/html', body: html });
      return route.abort();
    });
    await page.goto(`http://oharu-bootstrap.test/?mobile=1&nativePlatform=${platform}`);
    await page.waitForFunction(() => window.__oharuReady === true, { timeout: 10000 });
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => window.nativeMessages.includes('oharu:ready')), true);
    await page.locator('#input').fill('Bootstrap synthetic task');
    await page.locator('#addBtn').click();
    await page.getByText('Bootstrap synthetic task', { exact: true }).waitFor();
    assert.equal(await page.locator('.item').count(), 1);
    await page.locator('#input').fill('Second synthetic task');
    await page.locator('#addBtn').click();
    await page.getByText('Second synthetic task', { exact: true }).waitFor();
    assert.equal(await page.locator('.item').count(), 2);
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('oneul.v3')).todos);
    assert.equal(persisted.length, 2);
    assert.equal(new Set(persisted.map(task => task.id)).size, 2);
    await page.reload();
    await page.waitForFunction(() => window.__oharuReady === true, { timeout: 10000 });
    await page.getByText('Bootstrap synthetic task', { exact: true }).waitFor();
    await page.getByText('Second synthetic task', { exact: true }).waitFor();
    assert.equal(await page.locator('.item').count(), 2);
    assert.equal(await page.evaluate(() => new Set(JSON.parse(localStorage.getItem('oneul.v3')).todos.map(task => task.id)).size), 2);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
