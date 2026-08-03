import Link from 'next/link'
import { FadeIn } from '@/components/ui/Reveal'

const links = [
  { label: 'About', href: '#' },
  { label: 'Terms', href: '#' },
  { label: 'Privacy', href: '#' },
  { label: 'Contact', href: 'mailto:hello@grounded.com' },
]

export function Footer() {
  return (
    <footer className="bg-white border-t border-border py-10">
      <FadeIn>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between lg:px-12">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="text-xs font-semibold tracking-widest text-ink uppercase">
              GROUNDED
            </span>
            <span className="text-xs text-ink-muted">London, UK</span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 sm:justify-end">
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-xs text-ink-muted hover:text-ink transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-ink-muted text-center sm:text-right">
            © {new Date().getFullYear()} GROUNDED. All rights reserved.
          </p>
        </div>
      </FadeIn>
    </footer>
  )
}
