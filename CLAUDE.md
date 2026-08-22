# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

IDEA_003 is a digital "paper draw" lottery (종이뽑기) app for a single touchscreen. An operator configures participant count (50-500), prize tiers (1st-5th), and a win ratio per tier; the board is generated and participants tap cells to reveal results. The scaffold is in place but feature code has not been built yet.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run start    # run the production build
npm run lint     # ESLint (flat config: eslint-config-next core-web-vitals + typescript)
npx tsc --noEmit # type-check (no dedicated script)
```

No test framework is configured yet.

## Architecture

- Next.js 16 App Router + TypeScript + Tailwind CSS 4. Path alias `@/*` maps to `./src/*` (`tsconfig.json`).
- Tailwind v4 has no `tailwind.config.js` — theme tokens and the `@theme` block live directly in `src/app/globals.css`, imported via `@import "tailwindcss"` and the `@tailwindcss/postcss` plugin.
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`) is split across `src/lib/supabase/` by execution context — always import the one matching where the code runs, not just whichever is convenient:
  - `client.ts` — browser client for Client Components.
  - `server.ts` — async server client for Server Components/Actions; reads and writes cookies via `next/headers`.
  - `middleware.ts` — `updateSession()`, which refreshes the Supabase auth session on every request. Wired into the root `middleware.ts`, whose `matcher` excludes `_next/static`, `_next/image`, `favicon.ico`, and image assets.
- Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (gitignored via the blanket `.env*` rule; template in `.env.local.example`). Any Supabase-backed code will fail without these set.

## Conventions

- Write code comments in Korean.
- Ask before adding a new external library/dependency — don't just install one.
- Component files go in `src/components/`.
- After changing code, run `npm run lint` and make sure there are no warnings.
