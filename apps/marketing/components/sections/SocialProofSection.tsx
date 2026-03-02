'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { FadeIn } from '@/components/ui/Reveal'

const logos = [
  'Argent LLP',
  'Brockton Capital',
  'Clearbell',
  'Delin Capital',
  'Ediston',
  'Frogmore',
]

export function SocialProofSection() {
  return (
    <section className="bg-[#F7F7F4] py-16 border-t border-b border-border">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Label fades in first */}
        <FadeIn>
          <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-ink-muted">
            Trusted by forward-thinking investment teams
          </p>
        </FadeIn>

        {/* Each logo fades in sequentially with a tiny upward nudge */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {logos.map((name, i) => (
            <LogoItem key={name} name={name} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function LogoItem({ name, index }: { name: string; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.span
      ref={ref}
      className="text-sm font-semibold text-ink-muted/60 tracking-wide"
      initial={{ opacity: 0, y: 6 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.07 }}
    >
      {name}
    </motion.span>
  )
}
