import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import guard from './integrations/guard.mjs';

const statusUrl = process.env.PUBLIC_FILINGBOT_STATUS_URL?.trim();
const connectSources = ["'self'"];

if (statusUrl) {
  let origin;
  try {
    const parsed = new URL(statusUrl);
    if (parsed.protocol !== 'https:') throw new Error('not https');
    origin = parsed.origin;
  } catch {
    throw new Error('PUBLIC_FILINGBOT_STATUS_URL must be a full https:// URL.');
  }
  connectSources.push(origin);
}

export default defineConfig({
  site: 'https://prielkrishtal.github.io',
  trailingSlash: 'ignore',
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'none'",
        `connect-src ${connectSources.join(' ')}`,
        "font-src 'self'",
        "img-src 'self'",
        "manifest-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-src 'none'",
        "object-src 'none'",
        "worker-src 'none'",
        'upgrade-insecure-requests',
      ],
      styleDirective: {
        resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: { sourcemap: false },
  },
  integrations: [guard()],
});
