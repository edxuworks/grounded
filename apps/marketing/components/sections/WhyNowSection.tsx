'use client'
import { EyebrowReveal, FadeUp, SlideLeft, SlideRight } from '@/components/ui/Reveal'

const stats = [
  { value: '+19%', label: 'Dry powder entering UK mid-market CRE (2024)' },
  { value: '40+', label: 'Open-data APIs now publicly available in the UK' },
  { value: '6×', label: 'More location signals available than five years ago' },
]

const bullets = [
  {
    heading: 'Open data is finally usable.',
    body: 'Ordnance Survey, planning portals, and transport APIs have matured. For the first time, high-quality spatial data is accessible without a £20K annual licence.',
  },
  {
    heading: 'AI unlocks location reasoning.',
    body: 'New agent workflows can interpret planning documents, correlate footfall trends, and flag site anomalies at a speed no analyst team can match.',
  },
  {
    heading: 'Mid-market teams are underserved.',
    body: 'Enterprise tools are built for global funds. Nothing was designed for the £50M–£500M AUM teams who do serious deal work but lack institutional infrastructure.',
  },
]

export function WhyNowSection() {
  return (
    <section id="why-now" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Eyebrow wipe + heading fade */}
        <EyebrowReveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
            Why Now
          </p>
        </EyebrowReveal>
        <FadeUp delay={0.05}>
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            UK mid-market CRE is entering a new era.
          </h2>
        </FadeUp>

        <div className="mt-14 grid gap-12 lg:grid-cols-2">
          {/* Left column: bullets slide in from the left */}
          <div className="space-y-8">
            {bullets.map((b, i) => (
              <SlideLeft key={b.heading} delay={i * 0.12}>
                <div className="border-l-2 border-accent pl-5">
                  <p className="mb-1 text-base font-semibold text-ink">
                    {b.heading}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-secondary">
                    {b.body}
                  </p>
                </div>
              </SlideLeft>
            ))}
          </div>

          {/* Right column: stat card slides in from the right */}
          <SlideRight delay={0.15}>
            <div className="rounded-2xl border border-border bg-[#F7F7F4] p-8">
              <p className="mb-6 text-sm font-medium text-ink-secondary">
                The signals are clear.
              </p>
              <div className="space-y-6">
                {stats.map((s) => (
                  <div key={s.value} className="flex items-start gap-4">
                    <span className="text-3xl font-bold text-accent leading-none">
                      {s.value}
                    </span>
                    <p className="mt-1 text-sm leading-snug text-ink-secondary">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </SlideRight>
        </div>
      </div>
    </section>
  )
}
