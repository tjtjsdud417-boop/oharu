const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { chromium } = require('playwright');

test('native guest cold bootstrap and saved tasks work with all external requests blocked', async () => {
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
    await page.goto('http://oharu-bootstrap.test/?mobile=1&nativePlatform=android');
    await page.waitForFunction(() => window.__oharuReady === true, { timeout: 10000 });
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => window.nativeMessages.includes('oharu:ready')), true);
    await page.locator('#input').fill('Bootstrap synthetic task');
    await page.locator('#addBtn').click();
    await page.getByText('Bootstrap synthetic task', { exact: true }).waitFor();
    assert.equal(await page.locator('.item').count(), 1);
    await page.reload();
    await page.waitForFunction(() => window.__oharuReady === true, { timeout: 10000 });
    await page.getByText('Bootstrap synthetic task', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
