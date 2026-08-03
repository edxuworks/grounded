import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ScrollReset } from '@/components/ScrollReset'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GROUNDED — Spatial Intelligence for Commercial Real Estate',
  description:
    'The spatial intelligence layer for commercial real estate investment. Analyse opportunities, collaborate on judgement, and accumulate proprietary insight — all on a living map.',
  keywords: [
    'commercial real estate',
    'spatial intelligence',
    'CRE investment',
    'property analytics',
    'UK real estate',
    'geospatial data',
  ],
  openGraph: {
    title: 'GROUNDED — Compound Your Advantage.',
    description:
      'Spatial intelligence, built on real-world context. For UK mid-market CRE investment teams.',
    type: 'website',
    locale: 'en_GB',
    siteName: 'GROUNDED',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GROUNDED — Compound Your Advantage.',
    description: 'Spatial intelligence for commercial real estate investment.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body>
        <ScrollReset />
        {children}
      </body>
    </html>
  )
}
