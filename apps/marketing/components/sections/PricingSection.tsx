'use client'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EyebrowReveal, FadeUp, ScaleIn } from '@/components/ui/Reveal'

const plans = [
  {
    name: 'Scout',
    price: '£299',
    period: '/month',
    description: 'For solo analysts and independent advisers.',
    features: [
      'Single user',
      '1,000 site lookups / month',
      'Core scoring layers',
      'Map annotations',
      'PDF deal exports',
    ],
    cta: 'Start free trial',
    href: '#cta',
    highlight: false,
  },
  {
    name: 'Team',
    price: '£799',
    period: '/month',
    description: 'For investment teams of 2–10 people.',
    features: [
      'Up to 10 users',
      'Unlimited site lookups',
      'All scoring layers',
      'Shared workspaces',
      'Deal pipeline board',
      'Priority support',
    ],
    cta: 'Start free trial',
    href: '#cta',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large funds and advisory firms.',
    features: [
      'Unlimited users',
      'Custom data integrations',
      'White-label options',
      'SLA guarantee',
      'Dedicated account manager',
      'On-site onboarding',
    ],
    cta: 'Talk to us',
    href: 'mailto:hello@grounded.com',
    highlight: false,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Eyebrow wipe + heading */}
        <EyebrowReveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
            Pricing
          </p>
        </EyebrowReveal>
        <FadeUp delay={0.05}>
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Simple, transparent pricing.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-secondary">
            No setup fees. No data-licence paywalls. Cancel any time.
          </p>
        </FadeUp>

        {/* Cards scale in — middle card slightly later for visual emphasis */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <ScaleIn key={plan.name} delay={i === 1 ? 0.15 : i * 0.09}>
              <div
                className={cn(
                  'flex flex-col rounded-2xl border p-8 h-full',
                  plan.highlight
                    ? 'border-accent bg-[#F7F7F4] shadow-sm'
                    : 'border-border bg-white'
                )}
              >
                {plan.highlight && (
                  <span className="mb-4 inline-block self-start rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    Most popular
                  </span>
                )}

                <p className="text-sm font-semibold text-ink-secondary">
                  {plan.name}
                </p>

                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-bold text-ink">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="mb-1 text-sm text-ink-muted">
                      {plan.period}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-ink-secondary">
                  {plan.description}
                </p>

                <hr className="my-6 border-border" />

                <ul className="flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                      <Check size={14} className="mt-0.5 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    asChild
                    variant={plan.highlight ? 'default' : 'ghost'}
                    className="w-full"
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </div>
              </div>
            </ScaleIn>
          ))}
        </div>
      </div>
    </section>
  )
}
