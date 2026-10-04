import FieldNotes from "@/components/FieldNotes";
import HeroScene from "@/components/HeroScene";
import HowItWorks from "@/components/HowItWorks";
import MetricsSection from "@/components/MetricsSection";
import Pilot from "@/components/Pilot";
import SiteFooter from "@/components/SiteFooter";

export default function HomePage() {
  return (
    <>
      <main>
        <HeroScene />
        <HowItWorks />
        <MetricsSection />
        <FieldNotes />
        <Pilot />
      </main>
      <SiteFooter />
    </>
  );
}
