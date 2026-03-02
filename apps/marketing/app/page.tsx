import { HeroSection } from '@/components/blocks/hero-section-5'
import { PillarSection } from '@/components/sections/PillarSection'
import { HowItWorksSection } from '@/components/sections/HowItWorksSection'
import { DataOwnershipSection } from '@/components/sections/DataOwnershipSection'
import { WhyNowSection } from '@/components/sections/WhyNowSection'
import { SocialProofSection } from '@/components/sections/SocialProofSection'
import { PricingSection } from '@/components/sections/PricingSection'
import { CtaSection } from '@/components/sections/CtaSection'
import { Footer } from '@/components/sections/Footer'

export default function Home() {
  return (
    <>
      <HeroSection />
      <PillarSection />
      <HowItWorksSection />
      <DataOwnershipSection />
      <WhyNowSection />
      <SocialProofSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </>
  )
}
