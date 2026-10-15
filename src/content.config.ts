import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const text = z.string().min(1);

const node = z.strictObject({
  id: text,
  label: text,
  detail: text,
  external: z.boolean().default(false),
});

const column = node.extend({
  above: node.optional(),
  below: node.optional(),
});

const step = z.strictObject({
  node: text,
  state: text.optional(),
  end: z.literal('fail').optional(),
  mark: z.literal('retry').optional(),
});

const diagram = z
  .object({
    live: z.boolean().default(false),
    caption: text,
    boundary: z.strictObject({ label: text, from: z.number().int().nonnegative(), to: z.number().int().nonnegative() }),
    band: text.optional(),
    columns: z.array(column).min(2),
    states: z.array(text).optional(),
    paths: z.array(z.strictObject({ id: text, label: text, note: text, steps: z.array(step).min(2) })).min(1),
  })
  .superRefine((value, ctx) => {
    const ids = new Set(value.columns.flatMap((col) => [col.id, col.above?.id, col.below?.id].filter(Boolean)));
    for (const path of value.paths) {
      for (const { node: id, state } of path.steps) {
        if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: `Path "${path.id}" references unknown node "${id}"` });
        if (state && !value.states?.includes(state)) {
          ctx.addIssue({ code: 'custom', message: `Path "${path.id}" uses unknown state "${state}"` });
        }
      }
    }
    if (value.boundary.to >= value.columns.length || value.boundary.from > value.boundary.to) {
      ctx.addIssue({ code: 'custom', message: 'Boundary range is outside the columns' });
    }
  });

const projects = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/projects' }),
  schema: z.object({
    name: text,
    order: z.number().int().nonnegative(),
    status: z.enum(['Live 24/7', 'Deployed']),
    host: text,
    summary: text,
    problem: text,
    stack: z.array(text).min(1),
    repo: z.url(),
    numbers: z.array(z.strictObject({ value: text, label: text })).min(3).max(4),
    decisions: z.array(z.strictObject({ chose: text, over: text.nullable(), because: text.nullable() })).min(1).max(3),
    fixes: z.array(z.strictObject({ broke: text, fix: text.nullable() })).min(1).max(2),
    screenshots: z.array(
      z
        .strictObject({
          label: text,
          shape: z.enum(['phone', 'wide', 'portrait']),
          file: text.nullable().optional(),
          alt: text.nullable().optional(),
        })
        .refine((shot) => !shot.file || shot.alt, { message: 'A screenshot with a file needs alt text', path: ['alt'] }),
    ),
    receipt: z
      .strictObject({
        label: text,
        before: text.nullable().optional(),
        after: text.nullable().optional(),
        alt: text.nullable().optional(),
      })
      .refine((value) => Boolean(value.before) === Boolean(value.after), { message: 'Give both before and after, or neither' })
      .refine((value) => !value.before || value.alt, { message: 'Receipt images need alt text', path: ['alt'] })
      .optional(),
    diagram,
  }),
});

export const collections = { projects };
