'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FadeUp, ScaleIn } from '@/components/ui/Reveal'

export function CtaSection() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="cta" className="bg-[#F7F7F4] py-24 lg:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-12">
        {/* Heading fades up */}
        <FadeUp>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
            Early Access
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Start compounding your advantage.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-secondary">
            GROUNDED is currently in private beta for UK mid-market investment
            teams. Request access and we will be in touch within 48 hours.
          </p>
        </FadeUp>

        {/* Form scales up into place after heading settles */}
        <ScaleIn delay={0.15}>
          {submitted ? (
            <div className="mt-10 rounded-2xl border border-accent/30 bg-white p-8">
              <p className="text-base font-semibold text-ink">
                Thank you — we will be in touch.
              </p>
              <p className="mt-2 text-sm text-ink-secondary">
                Expect a note from us within 48 hours.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-10 rounded-2xl border border-border bg-white p-8 text-left shadow-sm"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-xs font-medium text-ink-secondary">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Alex Chen"
                    className="rounded-lg border border-border bg-[#F7F7F4] px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-medium text-ink-secondary">
                    Work email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="alex@company.com"
                    className="rounded-lg border border-border bg-[#F7F7F4] px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="company" className="text-xs font-medium text-ink-secondary">
                    Company / fund
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    placeholder="Clearbell Capital"
                    className="rounded-lg border border-border bg-[#F7F7F4] px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="mt-6 w-full">
                Request Access
              </Button>
              <p className="mt-4 text-center text-xs text-ink-muted">
                No card required. We will contact you to arrange a 30-minute
                onboarding call.
              </p>
            </form>
          )}
        </ScaleIn>
      </div>
    </section>
  )
}
