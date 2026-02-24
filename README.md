# STOMS-FE

Minimal React + TypeScript + Vite + Tailwind starter configured for a large API-driven project.

Quick start:

1. Copy environment :

cp .env

2. Install dependencies:

npm install

npm run dev

```

Useful scripts:

- `npm run dev` — start dev server
- `npm run build` — build for production
- `npm run preview` — preview production build
- `npm run typecheck` — run TypeScript checks
- `npm run lint` / `npm run lint:fix` — run ESLint
- `npm run format` — format code with Prettier

Project layout :

- `src/components` — shared presentational components and layout
- `src/pages` — top-level pages (routes)
- `src/features` — domain-specific feature folders (API, ui, hooks)
- `src/services` — API services (axios instances)
- `src/hooks` — custom hooks (react-query wrappers)
- `src/types` — shared TypeScript types
```
