'use client'
import { EyebrowReveal, FadeUp, SlideLeft } from '@/components/ui/Reveal'

const steps = [
  {
    number: '01',
    title: 'Screen',
    body: 'Define your investment criteria — asset class, geography, lot size, planning status. GROUNDED filters the entire UK commercial market to your shortlist.',
    diagram: (
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="mb-2 h-2 w-24 rounded bg-border" />
        <div className="mb-2 h-2 w-32 rounded bg-border" />
        <div className="mb-3 h-2 w-20 rounded bg-border" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-md bg-accent/20 border border-accent/30" />
          <div className="h-6 w-12 rounded-md bg-border" />
        </div>
      </div>
    ),
  },
  {
    number: '02',
    title: 'Score',
    body: 'Every site is scored against 40+ location signals: footfall trends, transport connectivity, planning activity, demographic shifts, and comparable transactions.',
    diagram: (
      <div className="rounded-lg border border-border bg-white p-4">
        <div className="flex items-end gap-1 h-14">
          {[30, 55, 40, 70, 45, 85, 60].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                backgroundColor: i === 5 ? '#5F8D76' : '#E3E6E2',
              }}
            />
          ))}
        </div>
        <div className="mt-2 h-2 w-20 rounded bg-border" />
      </div>
    ),
  },
  {
    number: '03',
    title: 'Compound',
    body: "Every annotation, visit, and deal decision is stored on the map. Your team's institutional knowledge accumulates automatically — visible, searchable, and growing.",
    diagram: (
      <div className="rounded-lg border border-border bg-white p-4 relative overflow-hidden">
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-6 rounded-sm"
              style={{
                backgroundColor:
                  i === 4
                    ? '#5F8D76'
                    : i % 3 === 0
                    ? '#D4D9D2'
                    : '#E8EBE7',
                opacity: 0.7 + i * 0.03,
              }}
            />
          ))}
        </div>
        <div className="mt-2 h-2 w-16 rounded bg-border" />
      </div>
    ),
  },
]

export function HowItWorksSection() {
  return (
    <section id="solution" className="bg-[#F7F7F4] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Header: eyebrow wipe then heading fades up */}
        <EyebrowReveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
            How it works
          </p>
        </EyebrowReveal>
        <FadeUp delay={0.05}>
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            From market to decision in minutes.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-secondary">
            No custom data pipelines. No expensive consultants. Just a clear,
            repeatable process built into the map.
          </p>
        </FadeUp>

        {/* Steps slide in from the left, each with increasing delay */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <SlideLeft key={step.number} delay={i * 0.13}>
              <div className="relative rounded-2xl border border-border bg-white p-8 h-full">
                <span className="absolute top-6 right-7 text-5xl font-black text-ink/5 select-none leading-none">
                  {step.number}
                </span>
                <div className="mb-6">{step.diagram}</div>
                <h3 className="mb-3 text-lg font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink-secondary">
                  {step.body}
                </p>
              </div>
            </SlideLeft>
          ))}
        </div>

        <div className="mt-8 hidden md:flex items-center justify-center gap-1 text-xs text-ink-muted">
          <span>Screen</span>
          <span className="mx-2 flex-1 border-t border-dashed border-border max-w-[80px]" />
          <span>Score</span>
          <span className="mx-2 flex-1 border-t border-dashed border-border max-w-[80px]" />
          <span>Compound</span>
        </div>
      </div>
    </section>
  )
}
