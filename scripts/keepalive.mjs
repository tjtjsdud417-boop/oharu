import { readFile } from 'node:fs/promises';
import { resolve4 } from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function frontendProject(html, configuredUrl) {
  const urls = [...html.matchAll(/\bSUPABASE_URL\s*=\s*["']([^"']+)["']/g)].map(match => match[1]);
  const unique = [...new Set(urls)];
  if (unique.length !== 1) throw new Error('Frontend must declare exactly one consistent Supabase project URL.');
  const url = new URL(unique[0]);
  if (url.protocol !== 'https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Frontend Supabase URL is not an expected HTTPS project origin.');
  }
  if (configuredUrl && configuredUrl.trim().replace(/\/$/, '') !== url.origin) {
    throw new Error('SUPABASE_URL secret differs from the public frontend project. Review configuration; no secret value was logged.');
  }
  return url;
}

export async function checkProject({ html, configuredUrl, key, dns = resolve4, request = fetch, pause = ms => new Promise(r => setTimeout(r, ms)), log = console.log }) {
  const url = frontendProject(html, configuredUrl);
  if (!key || /[\r\n]/.test(key)) throw new Error('SUPABASE_ANON_KEY is missing or malformed. Existing repository secret must be reviewed.');
  log(`Public frontend project: ${url.hostname}`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { await dns(url.hostname); break; }
    catch {
      if (attempt === 3) throw new Error('DNS resolution failed for the frontend Supabase project after 3 attempts. Check project status and public DNS; this is not an HTTP/authentication failure.');
      await pause(attempt * 2000);
    }
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response;
    try {
      response = await request(`${url.origin}/rest/v1/todos?select=id&limit=1`, {
        method: 'HEAD',
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      if (attempt === 3) throw new Error('Supabase network/TLS/timeout failure after 3 attempts. No credentials or response content logged.');
      await pause(attempt * 2000);
      continue;
    }
    log(`Supabase HTTP ${response.status} (attempt ${attempt})`);
    if (response.status === 200) return;
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await pause(attempt * 2000);
      continue;
    }
    throw new Error(`Supabase HTTP ${response.status}. Review project availability, existing anon-key configuration and RLS; do not disable RLS or substitute a service-role key.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await checkProject({ html: await readFile(new URL('../web/index.html', import.meta.url), 'utf8'), configuredUrl: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY });
  } catch (error) {
    console.error(`Keepalive failed: ${error.message}`);
    process.exitCode = 1;
  }
}
