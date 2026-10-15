# prielkrishtal.github.io

Source of https://prielkrishtal.github.io, a one-page portfolio built with Astro and Tailwind.

## Run it

```sh
corepack enable
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # writes dist/ and runs the build guard
pnpm preview    # serves dist/
pnpm check      # type-checks the Astro and TypeScript code
```

Node 22.12 or newer.

## Where things live

- `src/content/projects/*.yaml`: the two project sections (text, numbers, cards, diagram). Edit these, not the components.
- `src/assets/screenshots/`: drop screenshots here, then reference the file name from the project YAML.
- `src/data/profile.ts`: name, links, skills, education.
- `src/components/`: the page sections. `src/scripts/`: the small scripts they load.
- `integrations/guard.mjs`: runs after every build and fails it if something unfinished or private would be published.

## Add a project

1. Copy `src/content/projects/filingbot.yaml` to a new file and fill it in. The schema in `src/content.config.ts` tells you what is required.
2. Add `<Project id="your-file-name" />` to `src/pages/index.astro` and extend the `id` type in `src/components/Project.astro`.

A decision or reliability card only appears once its reason or fix is filled in, and a screenshot only appears once its image file exists.

## Deploy

Pushing to `main` builds and publishes through GitHub Actions (`.github/workflows/deploy.yml`). In the repository settings, Pages must use "GitHub Actions" as its source.

## Optional: live status

Set the repository variable `PUBLIC_FILINGBOT_STATUS_URL` to an https endpoint that returns the status JSON. Without it, the pipeline shows clearly labelled example data. The browser can only reach that one origin, because the build writes it into the page's Content Security Policy.
