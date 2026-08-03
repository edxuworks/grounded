'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

// Shared viewport settings — trigger when element enters with 80px margin
const VIEW_OPTS = { once: true, margin: '-80px' as const }

// Shared spring-like easing — feels snappy but not bouncy
const EASE = [0.22, 1, 0.36, 1] as const

interface Props {
  children: React.ReactNode
  delay?: number
  className?: string
}

// FadeUp — general purpose: headings, body copy
export function FadeUp({ children, delay = 0, className }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, VIEW_OPTS)
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

// FadeIn — pure opacity, no movement: logos, captions, subtle items
export function FadeIn({ children, delay = 0, className }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, VIEW_OPTS)
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

// SlideLeft — enters from left: left-column content, step items
export function SlideLeft({ children, delay = 0, className }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, VIEW_OPTS)
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, x: -28 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

// SlideRight — enters from right: right-column content, stat cards
export function SlideRight({ children, delay = 0, className }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, VIEW_OPTS)
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, x: 28 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

// ScaleIn — expands into place: cards, panels, call-to-action blocks
export function ScaleIn({ children, delay = 0, className }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, VIEW_OPTS)
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

// EyebrowReveal — clip-path wipe left-to-right: section label tags
export function EyebrowReveal({ children, delay = 0, className }: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, VIEW_OPTS)
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 1, clipPath: 'inset(0 100% 0 0)' }}
      animate={inView ? { clipPath: 'inset(0 0% 0 0)' } : {}}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}
