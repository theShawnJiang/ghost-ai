# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Editor Chrome

## Current Goal

- Feature 03: Authentication (Clerk) and route protection.

## Completed

- Feature 01: Design System — shadcn/ui initialized (base-nova preset, Base UI + Lucide), primitive components installed (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea), `lib/utils.ts` with `cn()` created, `globals.css` configured with dark-only theme (all project CSS variables + shadcn token overrides), `<html class="dark">` set for dark-variant activation. Build passes clean.
- Feature 02: Editor Chrome — `components/editor/editor-navbar.tsx` (fixed-height navbar with left/center/right sections, sidebar toggle using `PanelLeftOpen`/`PanelLeftClose`, dark `bg-surface` background with bottom border) and `components/editor/project-sidebar.tsx` (floating overlay sidebar that slides in from the left without pushing page content, header with title + close, shadcn `Tabs` for My Projects / Shared with empty placeholders, full-width `New Project` CTA with `Plus` icon). Dialog pattern available via existing `components/ui/dialog.tsx` (Title, Description, Header, Footer slots — uses globals.css tokens). TypeScript and ESLint pass clean.

## In Progress

- None.

## Next Up

- Feature 03: Authentication (Clerk) and route protection.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Tailwind v4 with `@theme inline` CSS variable mapping — no tailwind.config.js.
- shadcn/ui v4 with base-nova preset (Base UI + Lucide) — components live in `components/ui/` and must not be modified after generation.
- Dark-only — `:root` set to dark values, `<html class="dark">` activates shadcn dark: variants. No light/dark toggle.
- Ghost AI design tokens (`--bg-base`, `--text-primary`, `--accent-primary`, etc.) defined on `:root` and mapped to Tailwind utilities via `@theme inline` (e.g. `bg-base`, `text-copy-primary`, `text-brand`, `bg-accent-dim`).

## Session Notes

- Stack: Next.js 16 + React 19 + Tailwind v4 + TypeScript strict mode.
- globals.css uses `@import "tailwindcss"` + `@import "shadcn/tailwind.css"` (Tailwind v4 syntax).
- lucide-react is included via shadcn Nova preset — no separate install needed.
