# GROUNDED — Marketing Site

Single-page marketing landing site for GROUNDED. Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Motion.

## Setup

From the monorepo root:

```bash
pnpm install
pnpm --filter @grounded/marketing dev
```

Opens at **http://localhost:3000**.

## Setting the app URL

The "Launch Platform" button points to `/app` by default.
To change it, edit the `APP_URL` constant in:

```
components/blocks/hero-section-5.tsx
```

```ts
const APP_URL = 'https://app.grounded.com'  // <- replace with your URL
```

## Swapping the illustration

The hero uses an inline SVG axonometric city (`components/AxonometricCity.tsx`).

To replace it with a static image:
1. Place your image at `public/axon-city.png`
2. In `components/blocks/hero-section-5.tsx`, replace `<AxonometricCity />` with:

```tsx
import Image from 'next/image'
// ...
<Image
  src="/axon-city.png"
  alt="Axonometric city illustration"
  width={640}
  height={480}
  className="w-full h-auto"
  priority
/>
```

## Structure

```
apps/marketing/
├── app/
│   ├── layout.tsx        # Fonts, metadata, OpenGraph
│   ├── page.tsx          # Section composition
│   └── globals.css       # Tailwind + base styles
├── components/
│   ├── AxonometricCity.tsx
│   ├── blocks/
│   │   └── hero-section-5.tsx
│   ├── sections/
│   │   ├── PillarSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── WhyNowSection.tsx
│   │   ├── SocialProofSection.tsx
│   │   ├── PricingSection.tsx
│   │   ├── CtaSection.tsx
│   │   └── Footer.tsx
│   └── ui/
│       └── button.tsx
└── lib/
    └── utils.ts
```

## CTA form

The request-access form in `CtaSection.tsx` is stubbed. Replace the `handleSubmit` function with your preferred endpoint (e.g. Resend, Loops, HubSpot).
