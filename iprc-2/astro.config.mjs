import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dynamic-crisp-a60f33.netlify.app',
  output: 'static',
  build: { format: 'directory' },
  server: { host: true },
});
