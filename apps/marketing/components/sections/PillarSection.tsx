'use client'
import { BarChart2, Users, Layers } from 'lucide-react'
import { EyebrowReveal, FadeUp, ScaleIn } from '@/components/ui/Reveal'

const pillars = [
  {
    icon: BarChart2,
    title: 'Analyse',
    body: 'Layer open-data APIs, planning records, and market signals on a single spatial canvas. Surface patterns that spreadsheets cannot show.',
  },
  {
    icon: Users,
    title: 'Collaborate',
    body: 'Share annotated maps, deal memos, and site assessments with your team in real time. Every judgement call stays attached to the map.',
  },
  {
    icon: Layers,
    title: 'Accumulate',
    body: 'Each deal, visit, and annotation compounds into a proprietary dataset that only your team owns. Your edge grows with every decision.',
  },
]

export function PillarSection() {
  return (
    <section id="product" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Eyebrow wipes in left-to-right, then heading fades up */}
        <EyebrowReveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
            Product
          </p>
        </EyebrowReveal>
        <FadeUp delay={0.05}>
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Three things that compound.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-secondary">
            GROUNDED is structured around a single idea: spatial knowledge
            gets more valuable the more it is used. Each pillar feeds the next.
          </p>
        </FadeUp>

        {/* Cards scale up into place, staggered */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon
            return (
              <ScaleIn key={pillar.title} delay={i * 0.1}>
                <div className="rounded-2xl border border-border bg-[#F7F7F4] p-8 transition-colors hover:border-accent/40 h-full">
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <Icon size={20} className="text-accent" />
                  </div>
                  <h3 className="mb-3 text-lg font-semibold text-ink">
                    {pillar.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-secondary">
                    {pillar.body}
                  </p>
                </div>
              </ScaleIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
