// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
// SITE_URL and BASE_PATH are set by the GitHub Pages workflow so a preview
// build works under username.github.io/repo/. Without them the site builds
// for the production domain at the root path.
export default defineConfig({
  site: process.env.SITE_URL || 'https://www.atspl.com.au',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
