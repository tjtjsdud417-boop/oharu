import { defineConfig } from 'vite';
import aitDevtools from '@apps-in-toss/devtools/unplugin';
export default defineConfig({ base: './', plugins: [aitDevtools.vite()], build: { target: 'es2022' }, server: { host: '127.0.0.1' } });
