import type { ImageMetadata } from 'astro';

const loaders = import.meta.glob<{ default: ImageMetadata }>('/src/assets/screenshots/*.{png,jpg,jpeg,webp,avif}');
const warned = new Set<string>();

export async function findScreenshot(name: string | null | undefined): Promise<ImageMetadata | null> {
  if (!name) return null;
  const load = loaders[`/src/assets/screenshots/${name}`];
  if (load) return (await load()).default;
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`[content] "${name}" is not in src/assets/screenshots/, so it stays hidden until you add it.`);
  }
  return null;
}
