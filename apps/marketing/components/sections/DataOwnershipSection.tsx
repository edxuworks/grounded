'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { Layers } from 'lucide-react'

export function DataOwnershipSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="data" className="bg-[#F7F7F4] py-24 lg:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-12">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-2xl border border-border bg-white px-8 py-10 shadow-sm sm:px-12 sm:py-14">

            {/* Eyebrow */}
            <div className="mb-5 flex items-center gap-2">
              <Layers size={13} className="text-accent opacity-70" />
              <p className="text-xs font-semibold uppercase tracking-widest text-accent/80">
                Data Ownership
              </p>
            </div>

            {/* Headline */}
            <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Compound for You. Not for Us.
            </h2>

            {/* Body — thin sage left rule, generous line-height */}
            <div className="mt-8 border-l-2 border-accent/30 pl-6">
              <p className="text-base leading-[1.85] text-ink-secondary md:text-lg">
                We use open-source spatial data.<br />
                Your proprietary research remains yours.<br />
                In the AI era, institutional knowledge is the moat.<br />
                We help you structure it — not harvest it.
              </p>
            </div>

            {/* Microcopy */}
            <p className="mt-8 text-xs text-ink-muted">
              Open data in. Proprietary insight stays with you.
            </p>

          </div>
        </motion.div>
      </div>
    </section>
  )
}
