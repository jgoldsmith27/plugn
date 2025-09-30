# Plugn Flow Builder

A plug-and-play block UI inspired by n8n for composing AI data flows. The project is organised as a pnpm workspace with a React + TypeScript web app, shared types, and mock adapters that simulate flow execution.

## Workspace structure

- `apps/web` – React flow editor built with React Flow, Zustand, Tailwind, and shadcn-style components.
- `packages/types` – Shared flow and node schema TypeScript definitions.
- `packages/adapters-mock` – Client-side mock node adapters that emit synthetic data for previews.

## Getting started

```bash
pnpm install
pnpm --filter @plugn/web dev
```

The editor is available at [http://localhost:5173](http://localhost:5173). The `/flows` route lists stored flows, `/flows/:id/editor` opens the canvas, and `/connections` plus `/models` provide mock data for connection/model selectors.

## Available scripts

From the repo root:

- `pnpm dev` – Run the web app in development mode.
- `pnpm build` – Build all workspace packages.
- `pnpm test` – Run unit tests (Vitest) across the workspace.
- `pnpm e2e` – Execute Playwright smoke tests.

Within `apps/web`:

- `pnpm lint` – Lint the app with ESLint.
- `pnpm test` – Run Vitest unit tests (schema + registry).
- `pnpm test:e2e` – Launch Playwright end-to-end smoke tests.

## Mock execution

Running a flow executes a client-side topological runner (`apps/web/src/lib/executor.ts`) that calls mock node adapters from `@plugn/adapters-mock`. Adapters emit synthetic outputs, stream logs to the run console, and respect per-node cache toggles. Validation prevents missing required params or illegal edge kinds from running.

## Persistence

Flows, connections, and models are autosaved to IndexedDB via `idb-keyval`. You can export/import flows as JSON (schema version `0.1.0`). A ready-made RAG template is available from both the flows list and the editor toolbar.
