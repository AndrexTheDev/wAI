import { Hero } from '../sections/Hero';
import { Problem } from '../sections/Problem';
import { HowItWorks } from '../sections/HowItWorks';
import { Features } from '../sections/Features';
import { MultiView } from '../sections/MultiView';
import { UseCases } from '../sections/UseCases';
import { Privacy } from '../sections/Privacy';
import { Comparison } from '../sections/Comparison';
import { Crypto } from '../sections/Crypto';
import { Faq } from '../sections/Faq';
import { Download } from '../sections/Download';

export function LandingPage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <MultiView />
      <UseCases />
      <Privacy />
      <Comparison />
      <Crypto />
      <Faq />
      <Download />
    </>
  );
}
