# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Projects

## Current Goal

- Feature 05: Prisma — project data models, Prisma client singleton, and first migration.

## Completed

- Feature 01: Design System — shadcn/ui initialized (base-nova preset, Base UI + Lucide), primitive components installed (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea), `lib/utils.ts` with `cn()` created, `globals.css` configured with dark-only theme (all project CSS variables + shadcn token overrides), `<html class="dark">` set for dark-variant activation. Build passes clean.
- Feature 02: Editor Chrome — `components/editor/editor-navbar.tsx` (fixed-height navbar with left/center/right sections, sidebar toggle using `PanelLeftOpen`/`PanelLeftClose`, dark `bg-surface` background with bottom border) and `components/editor/project-sidebar.tsx` (floating overlay sidebar that slides in from the left without pushing page content, header with title + close, shadcn `Tabs` for My Projects / Shared with empty placeholders, full-width `New Project` CTA with `Plus` icon). Dialog pattern available via existing `components/ui/dialog.tsx` (Title, Description, Header, Footer slots — uses globals.css tokens). TypeScript and ESLint pass clean.
- Feature 03: Authentication (Clerk) and route protection — `app/layout.tsx` wraps the tree in `ClerkProvider` with `@clerk/ui/themes` `dark` as base and `appearance.variables` overridden via project CSS tokens (`var(--bg-surface)`, `var(--accent-primary)`, etc.). `proxy.ts` at the project root uses `clerkMiddleware` + `createRouteMatcher` to keep `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` public and call `auth.protect()` on everything else. Sign-in (`app/sign-in/[[...sign-in]]/page.tsx`) and sign-up (`app/sign-up/[[...sign-up]]/page.tsx`) render Clerk's `<SignIn>` / `<SignUp>` inside a shared `components/auth/auth-panel.tsx` two-panel layout — left feature blurb (lg+ only), right centered form, single-column on small screens. `app/page.tsx` redirects authenticated users to `/editor` and unauthenticated users to `/sign-in`. Editor navbar right section now renders Clerk's `<UserButton />`. `@clerk/ui` installed. Build passes clean.
- Feature 04: Project Dialogs — `/editor` home screen now renders a centered empty state (heading, description, `New Project` button with `Plus` icon) when no project is open. `hooks/use-project-dialogs.ts` is a single hook managing dialog mode (`create | rename | delete | null`), the active target, form name state, and a simulated `isSubmitting` flag. Three app-level dialogs in `components/editor/` consume that hook: `create-project-dialog.tsx` (name input + live slug preview via `lib/slug.ts`), `rename-project-dialog.tsx` (prefilled + auto-focused input, current name shown in description, Enter submits via native form, dirty-check disables submit when unchanged), and `delete-project-dialog.tsx` (no input, destructive-variant confirm). `components/editor/project-sidebar.tsx` now renders mock data from `lib/mock-projects.ts` (owned + shared) with hover-revealed Pencil/Trash icons on owned rows only — shared rows are read-only. Mobile gets a `md:hidden` backdrop scrim button behind the sidebar; tapping it closes the sidebar. Sidebar `New Project` and editor-home `New Project` both call `dialogs.openCreate()`. No API calls, no persistence — submit just simulates a brief loading state and closes. Build, type check, and lint all pass clean.
- Feature 05: Prisma — `prisma/models/project.prisma` defines a `ProjectStatus` enum (`DRAFT`, `ARCHIVED`) and two models: `Project` (cuid id, `ownerId` Clerk user, `name`, optional `description`, `status` defaulting to `DRAFT`, optional `canvasJsonPath`, `createdAt` / `updatedAt`, indexes on `ownerId` and `createdAt`) and `ProjectCollaborator` (cuid id, cascade-deleting `project` relation, `email`, `createdAt`, unique `[projectId, email]`, indexes on `email` and `[projectId, createdAt]`). `lib/prisma.ts` exports a single `prisma` instance cached on `globalThis` in non-production, instantiated from `app/generated/prisma/client` — when `DATABASE_URL` starts with `prisma+postgres://` it passes `accelerateUrl`, otherwise it wires `@prisma/adapter-pg`'s `PrismaPg` adapter. `prisma.config.ts` now loads `.env.local` (in addition to `.env`) so Prisma CLI commands pick up the project's existing env file. Initial migration `prisma/migrations/20260515013601_init` applied successfully; `npm run build` and `npm run lint` pass clean.

## In Progress

- None.

## Next Up

- Feature 06: TBD.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Tailwind v4 with `@theme inline` CSS variable mapping — no tailwind.config.js.
- shadcn/ui v4 with base-nova preset (Base UI + Lucide) — components live in `components/ui/` and must not be modified after generation.
- Dark-only — `:root` set to dark values, `<html class="dark">` activates shadcn dark: variants. No light/dark toggle.
- Ghost AI design tokens (`--bg-base`, `--text-primary`, `--accent-primary`, etc.) defined on `:root` and mapped to Tailwind utilities via `@theme inline` (e.g. `bg-base`, `text-copy-primary`, `text-brand`, `bg-accent-dim`).
- Next.js 16 renames `middleware.ts` to `proxy.ts` — Clerk's `clerkMiddleware` is still exported under that name from `@clerk/nextjs/server` but is consumed as the default export of `proxy.ts` at the project root.
- Clerk appearance uses `theme` (not `baseTheme`) in `@clerk/ui` v1.x; override Clerk's `variables` with project CSS custom properties so the auth UI tracks the rest of the design system with zero hardcoded colors.

## Session Notes

- Stack: Next.js 16 + React 19 + Tailwind v4 + TypeScript strict mode.
- globals.css uses `@import "tailwindcss"` + `@import "shadcn/tailwind.css"` (Tailwind v4 syntax).
- lucide-react is included via shadcn Nova preset — no separate install needed.
