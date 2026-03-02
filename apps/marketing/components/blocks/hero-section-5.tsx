'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AxonometricCity } from '@/components/AxonometricCity'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'

const menuItems = [
  { label: 'Product', href: '#product' },
  { label: 'Solution', href: '#solution' },
  { label: 'Why Now', href: '#why-now' },
  { label: 'Pricing', href: '#pricing' },
]

// App URL — points to the running web app
const APP_URL = 'http://localhost:5173'

export function HeroHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[#F7F7F4]/90 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-12">
        {/* Brand */}
        <Link
          href="/"
          className="text-sm font-semibold tracking-widest text-ink uppercase"
        >
          GROUNDED
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-ink-secondary hover:text-ink transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:block">
          <Button asChild size="sm">
            <a href={APP_URL}>Launch Platform</a>
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden text-ink-secondary"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden bg-[#F7F7F4] border-b border-border px-6 pb-6">
          <nav className="flex flex-col gap-4 pt-2">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-ink-secondary hover:text-ink"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Button asChild size="sm" className="mt-2 self-start">
              <a href={APP_URL}>Launch Platform</a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}

export function HeroSection() {
  const { scrollYProgress } = useScroll()
  const illustrationY = useTransform(scrollYProgress, [0, 0.3], [0, -30])
  const illustrationOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0.4])

  return (
    <>
      <HeroHeader />
      <main className="overflow-x-hidden">
        <section id="hero" className="relative min-h-screen bg-[#F7F7F4]">
          <div className="mx-auto flex max-w-7xl flex-col items-center px-6 pt-28 pb-20 lg:flex-row lg:items-center lg:gap-12 lg:px-12 lg:pt-36 lg:pb-28">

            {/* Left: copy */}
            <motion.div
              className="flex-1 text-center lg:text-left"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <p className="mb-4 text-xs font-semibold tracking-widest text-accent uppercase">
                Spatial Intelligence
              </p>

              <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl xl:text-7xl">
                Compound Your<br />Advantage.
              </h1>

              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-secondary mx-auto lg:mx-0">
                Spatial intelligence, built on real-world context.
              </p>

              <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted mx-auto lg:mx-0">
                Analyse. Collaborate. Accumulate — on a living map.
              </p>

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Button asChild size="lg">
                  <a href={APP_URL}>
                    <span>Launch Platform</span>
                    <ChevronRight size={16} />
                  </a>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="#cta">Request Access</Link>
                </Button>
              </div>

              <p className="mt-5 text-sm text-ink-muted mx-auto lg:mx-0 max-w-sm">
                Built for UK mid-market investment teams (£50M–£500M AUM).{' '}
                No £20K data licences required.
              </p>
            </motion.div>

            {/* Right: illustration */}
            <motion.div
              className="mt-14 w-full flex-1 lg:mt-0 lg:max-w-[540px]"
              style={{ y: illustrationY, opacity: illustrationOpacity }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
            >
              <AxonometricCity className="w-full h-auto drop-shadow-sm" />
            </motion.div>
          </div>

          {/* Soft fade-out at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#F7F7F4] pointer-events-none" />
        </section>
      </main>
    </>
  )
}
