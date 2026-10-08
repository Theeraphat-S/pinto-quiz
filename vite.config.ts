import { defineConfig } from 'vite';
// Fonts stay as files: the CSP allows `font-src 'self'` only, so inlined data: fonts would be blocked.
export default defineConfig({ root: 'web', build: { outDir: '../dist', emptyOutDir: true, assetsInlineLimit: file => /\.woff2?$/.test(file) ? false : undefined }, server: { proxy: { '/api': { target: 'http://localhost:8787', ws: true } } } });
