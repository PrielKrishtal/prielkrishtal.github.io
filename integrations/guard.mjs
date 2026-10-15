import { Buffer } from 'node:buffer';
import { readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml', '.webmanifest']);
const BINARY_IMAGES = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const ALLOWED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, ...BINARY_IMAGES, '.woff2', '.woff', '.ico']);

const FORBIDDEN_TEXT = [
  { name: 'unfinished TODO marker', pattern: /\b(?:TODO|VERIFY)\([A-Za-z0-9_-]*\)/i },
  { name: 'TODO or FIXME note', pattern: /\b(?:TODO|FIXME|XXX)\b[:(]/ },
  { name: 'placeholder text', pattern: /lorem ipsum/i },
  { name: 'GPA or grade point average (never shown on this site)', pattern: /\bGPA\b|grade point average/i },
  { name: 'source map reference', pattern: /sourceMappingURL/ },
  { name: 'local address', pattern: /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)[:/]/ },
];

const SECRET_PATTERNS = [
  { name: 'GitHub token', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|github_pat_[A-Za-z0-9_]{30,}/ },
  { name: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'OpenAI style key', pattern: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: 'Stripe key', pattern: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: 'JSON web token', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'credential assignment', pattern: /\b(?:api[_-]?key|secret|passwd|password|access[_-]?token)\s*[:=]\s*["'][^"'\s]{8,}["']/i },
];

const PRIVACY_PATTERNS = [
  { name: 'plain email address', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/ },
  { name: 'phone number', pattern: /(?<![\w.])(?:\+?972[-\s]?|0)(?:5\d|[2-489]|7\d)[-\s]?\d{3}[-\s]?\d{4}(?!\d)/ },
];

const EXTERNAL_RESOURCE = [
  { name: 'external script', pattern: /<script\b[^>]*\bsrc\s*=\s*["']?(?:https?:)?\/\//i },
  { name: 'external stylesheet or preload', pattern: /<link\b[^>]*\b(?:rel\s*=\s*["']?(?:stylesheet|preload|modulepreload|prefetch)["']?)[^>]*\bhref\s*=\s*["']?(?:https?:)?\/\//i },
  { name: 'external image, frame or media', pattern: /<(?:img|iframe|video|audio|source|embed|object)\b[^>]*\bsrc\s*=\s*["']?(?:https?:)?\/\//i },
  { name: 'external CSS url()', pattern: /url\(\s*["']?(?:https?:)?\/\//i },
  { name: 'CSS @import of a remote file', pattern: /@import\s+(?:url\()?["']?(?:https?:)?\/\//i },
];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function hasExifOrGps(buffer, extension) {
  if (extension === '.jpg' || extension === '.jpeg') return buffer.includes(Buffer.from('Exif\0\0'));
  if (extension === '.webp') return buffer.includes(Buffer.from('EXIF'));
  if (extension === '.png') return buffer.includes(Buffer.from('eXIf'));
  if (extension === '.avif') return buffer.includes(Buffer.from('Exif'));
  return false;
}

export default function guard() {
  return {
    name: 'site-guard',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const problems = [];

        const everything = walk(root);
        const referencedText = everything
          .filter((file) => ['.html', '.css', '.js'].includes(extname(file).toLowerCase()))
          .map((file) => readFileSync(file, 'utf8'))
          .join('\n');
        for (const file of everything) {
          const extension = extname(file).toLowerCase();
          const portablePath = file.replaceAll('\\', '/');
          if (!BINARY_IMAGES.has(extension) || !portablePath.includes('/_astro/')) continue;
          const name = portablePath.split('/').pop();
          if (!referencedText.includes(name)) {
            unlinkSync(file);
            logger.info(`Removed unreferenced image ${name}.`);
          }
        }

        const report = (file, message) => problems.push(`${relative(root, file).replaceAll('\\', '/')}: ${message}`);

        for (const file of walk(root)) {
          const extension = extname(file).toLowerCase();
          if (extension === '.map') report(file, 'source map shipped');
          if (!ALLOWED_EXTENSIONS.has(extension)) report(file, `unexpected file type "${extension}"`);

          if (BINARY_IMAGES.has(extension)) {
            if (hasExifOrGps(readFileSync(file), extension)) report(file, 'image still carries metadata (EXIF), strip it');
            continue;
          }
          if (!TEXT_EXTENSIONS.has(extension)) continue;

          const text = readFileSync(file, 'utf8');
          const isPage = extension === '.html';

          for (const { name, pattern } of [...FORBIDDEN_TEXT, ...SECRET_PATTERNS]) {
            if (pattern.test(text)) report(file, name);
          }
          if (extension !== '.json') {
            for (const { name, pattern } of PRIVACY_PATTERNS) {
              if (pattern.test(text)) report(file, name);
            }
          }
          if (extension === '.css') {
            for (const { name, pattern } of EXTERNAL_RESOURCE.filter((rule) => /CSS/.test(rule.name))) {
              if (pattern.test(text)) report(file, name);
            }
          }
          if (isPage) {
            if (/<!--/.test(text)) report(file, 'HTML comment left in the page');
            for (const { name, pattern } of EXTERNAL_RESOURCE) {
              if (pattern.test(text)) report(file, name);
            }
            const csp = text.match(/<meta[^>]+http-equiv="content-security-policy"[^>]*content="([^"]*)"/i);
            if (!csp) report(file, 'missing Content-Security-Policy meta tag');
            else {
              const policy = csp[1];
              if (/unsafe-eval/.test(policy)) report(file, 'CSP allows unsafe-eval');
              const scriptSrc = policy.split(';').find((part) => part.trim().startsWith('script-src'));
              if (!scriptSrc) report(file, 'CSP has no script-src');
              else if (/unsafe-inline|\*|https?:/.test(scriptSrc)) report(file, `CSP script-src is too loose: ${scriptSrc.trim()}`);
              if (!/default-src\s+'none'/.test(policy)) report(file, "CSP default-src is not 'none'");
            }
          }
          if (extension === '.js' && /\beval\s*\(|new Function\s*\(/.test(text)) report(file, 'script uses eval or new Function');
        }

        if (problems.length > 0) {
          throw new Error(`Build guard failed. Nothing was published.\n  - ${problems.join('\n  - ')}`);
        }
        logger.info(`Build guard passed (${walk(root).length} files checked).`);
      },
    },
  };
}
