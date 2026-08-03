# @grounded/marketing

The public marketing landing page for **GROUNDED** — the spatial intelligence layer for commercial real estate investment.

## Overview

This package is the statically-exported marketing site for the Grounded platform. It presents the product story — the problem, the pillars, how it works, pricing, and calls to action — and links visitors through to the live web platform via a **Launch Platform** button.

Built with the Next.js App Router and pre-rendered to static HTML, the site ships as a fully static bundle and is deployed to GitHub Pages through GitHub Actions.

## Tech stack

- **Next.js** `^15.1.0` (App Router, static export)
- **React** `^19.0.0` / **React DOM** `^19.0.0`
- **TypeScript** `^5.7.3`
- **Tailwind CSS** `^3.4.17` with `tailwindcss-animate` `^1.0.7`
- **motion** (Framer Motion) `^12.0.0` — animations and scroll effects
- **lucide-react** `^0.468.0` — icons
- **@radix-ui/react-slot** `^1.1.1` — composable primitives
- **class-variance-authority** `^0.7.1`, **clsx** `^2.1.1`, **tailwind-merge** `^2.6.0` — styling utilities

## Page sections

The landing page is composed in [`app/page.tsx`](./app/page.tsx) from the following sections, in order:

1. **Hero** — `HeroSection` (from `components/blocks/hero-section-5.tsx`)
2. **Problem** — [`ProblemSection`](./components/sections/ProblemSection.tsx)
3. **Pillars** — [`PillarSection`](./components/sections/PillarSection.tsx)
4. **How It Works** — [`HowItWorksSection`](./components/sections/HowItWorksSection.tsx)
5. **Data Ownership** — [`DataOwnershipSection`](./components/sections/DataOwnershipSection.tsx)
6. **Why Now** — [`WhyNowSection`](./components/sections/WhyNowSection.tsx)
7. **Social Proof** — [`SocialProofSection`](./components/sections/SocialProofSection.tsx)
8. **Pricing** — [`PricingSection`](./components/sections/PricingSection.tsx)
9. **CTA** — [`CtaSection`](./components/sections/CtaSection.tsx)
10. **Footer** — [`Footer`](./components/sections/Footer.tsx)

Global concerns live in [`app/layout.tsx`](./app/layout.tsx) (metadata, Inter font, scroll reset).

## Configuration

The site is configured in [`next.config.ts`](./next.config.ts):

- **`output: 'export'`** — produces a static site exported to the `out/` directory.
- **`trailingSlash: true`** — emits directory-style URLs suited to static hosting.
- **`basePath`** — read from the `BASE_PATH` env var (defaults to `''`). Set `BASE_PATH=/grounded` when hosting under a subpath such as GitHub Pages; leave unset for root-domain hosts like Vercel.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `BASE_PATH` | `''` | Subpath prefix for the exported site (e.g. `/grounded`). |
| `NEXT_PUBLIC_APP_URL` | `https://grounded-cre-app.vercel.app` | Destination of the **Launch Platform** links in the hero. |

## Development

Run from the monorepo root:

```bash
# Start the dev server on http://localhost:3000
pnpm --filter @grounded/marketing dev

# Build the static export into apps/marketing/out
pnpm --filter @grounded/marketing build

# Serve a production build on http://localhost:3000
pnpm --filter @grounded/marketing start

# Type-check without emitting
pnpm --filter @grounded/marketing check-types
```

## Deployment

Deployment is automated by [`.github/workflows/deploy-marketing.yml`](../../.github/workflows/deploy-marketing.yml):

- **Trigger** — pushes to `master` or `main` that touch `apps/marketing/**`.
- **Build** — installs dependencies with `pnpm install --frozen-lockfile`, then runs `pnpm --filter @grounded/marketing build` to generate the static export.
- **Artifact** — uploads `apps/marketing/out` via `actions/upload-pages-artifact`.
- **Deploy** — publishes the artifact to **GitHub Pages** using `actions/deploy-pages`.

The workflow uses `concurrency: pages` with `cancel-in-progress`, so only the latest push deploys.
