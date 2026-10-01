// Pin the native bootstrap dependency; a fresh offline install must not import a CDN module.
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const filename = path.join(root, 'assets/web/app.html');
const sdkRoot = path.join(root, 'node_modules/@supabase/supabase-js');
const version = JSON.parse(fs.readFileSync(path.join(sdkRoot, 'package.json'))).version;
const sdk = fs.readFileSync(path.join(sdkRoot, 'dist/umd/supabase.js'), 'utf8');
const license = fs.readFileSync(path.join(sdkRoot, 'LICENSE'), 'utf8');
const block = `<!-- oharu-native-sdk:start -->\n<script>/* @supabase/supabase-js ${version}\n${license.replace(/\*\//g, '* /')} */\n(function(){${sdk.replace(/<\/script/gi, '<\\/script')}\nwindow.OharuSupabase=supabase;})();</script>\n<!-- oharu-native-sdk:end -->`;
let html = fs.readFileSync(filename, 'utf8');
if (html.includes('<!-- oharu-native-sdk:start -->')) html = html.replace(/<!-- oharu-native-sdk:start -->[\s\S]*?<!-- oharu-native-sdk:end -->/, () => block);
else html = html.replace('<script type="module">', () => `${block}\n<script type="module">`);
html = html.replace('const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");', 'const { createClient } = window.OharuSupabase;');
fs.writeFileSync(filename, html);
console.log(`Bundled Supabase ${version} with license into native HTML.`);
