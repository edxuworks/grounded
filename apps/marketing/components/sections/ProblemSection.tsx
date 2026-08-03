'use client'
import { useRef } from 'react'
import { motion, useScroll, useMotionValueEvent, useAnimationControls } from 'motion/react'
import { FadeUp } from '@/components/ui/Reveal'

const W = 360
const H = 240

const DOCS = [
  {
    src: '/bad-maps/bad_map1.png',
    alt: 'Deal map with numbered pins',
    final: { x: -175, y: -105, rotate: 0 },
    zIndex: 10,
    threshold: 0.08,
  },
  {
    src: '/bad-maps/bad_map2.png',
    alt: 'Aerial property overview',
    final: { x: 75, y: -90, rotate: 0 },
    zIndex: 20,
    threshold: 0.30,
  },
  {
    src: '/bad-maps/bad_map3.png',
    alt: 'Tenant mix map',
    final: { x: -160, y: 105, rotate: 0 },
    zIndex: 30,
    threshold: 0.54,
  },
  {
    src: '/bad-maps/bad_map4.png',
    alt: 'Color-coded asset map',
    final: { x: 90, y: 115, rotate: 0 },
    zIndex: 40,
    threshold: 0.76,
  },
]

const SPRING = { type: 'spring', stiffness: 90, damping: 14, mass: 1.3 } as const

const ENTRY_DX = 220
const ENTRY_DY = 160

interface DocCardProps {
  doc: typeof DOCS[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scrollYProgress: any
}

function DocCard({ doc, scrollYProgress }: DocCardProps) {
  const controls = useAnimationControls()
  const isDealt = useRef(false)
  // Each card's "off-screen" start is its final position + the shared entry offset
  // Card 1 slides in; the rest fade in from their final position
  const entryPos = doc.zIndex === 10
    ? { x: doc.final.x + ENTRY_DX, y: doc.final.y + ENTRY_DY, rotate: 0, opacity: 0, scale: 0.95 }
    : { x: doc.final.x, y: doc.final.y, rotate: 0, opacity: 0, scale: 1 }

  // Bidirectional: animate forward AND back when scrolling in reverse
  useMotionValueEvent(scrollYProgress, 'change', (v: number) => {
    const shouldDeal = v >= doc.threshold
    if (shouldDeal && !isDealt.current) {
      isDealt.current = true
      controls.start({ ...doc.final, opacity: 1, scale: 1, transition: SPRING })
    } else if (!shouldDeal && isDealt.current) {
      isDealt.current = false
      controls.start({ ...entryPos, transition: SPRING })
    }
  })

  return (
    <motion.div
      className="absolute overflow-hidden rounded-sm border border-border bg-white shadow-lg"
      style={{
        zIndex: doc.zIndex,
        left: '50%',
        top: '50%',
        marginLeft: -W / 2,
        marginTop: -H / 2,
        width: W,
      }}
      initial={entryPos}
      animate={controls}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={doc.src}
        alt={doc.alt}
        style={{ display: 'block', width: W, height: H, objectFit: 'cover' }}
      />
    </motion.div>
  )
}

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  return (
    <section ref={ref} className="relative h-[360vh] bg-white">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-12 w-full">

          <div className="grid gap-12 lg:grid-cols-[1fr_1.8fr] items-center">

            {/* Left: text */}
            <div>
              <FadeUp>
                <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                  Still running deals from screenshots, slides, and email chains?
                </h2>
              </FadeUp>
            </div>

            {/* Right: document canvas */}
            <div className="relative w-full" style={{ height: 500 }}>
              {DOCS.map((doc) => (
                <DocCard key={doc.src} doc={doc} scrollYProgress={scrollYProgress} />
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
