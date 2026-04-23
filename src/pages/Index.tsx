import { TopNav } from "@/components/aetheria/TopNav";
import { SideRail } from "@/components/aetheria/SideRail";
import { Hero } from "@/components/aetheria/Hero";
import { ContinueReading } from "@/components/aetheria/ContinueReading";
import { TrendingNow } from "@/components/aetheria/TrendingNow";
import { CuratedCuriosities } from "@/components/aetheria/CuratedCuriosities";
import { ArchiveSpotlight } from "@/components/aetheria/ArchiveSpotlight";
import { CuratedForYou } from "@/components/aetheria/CuratedForYou";
import { Footer } from "@/components/aetheria/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <SideRail />

      <main className="pt-20 lg:pl-14">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-20 md:space-y-24 pb-16">
          <Hero />
          <ContinueReading />
          <TrendingNow />
          <CuratedCuriosities />
          <ArchiveSpotlight />
          <CuratedForYou />
          <Footer />
        </div>
      </main>
    </div>
  );
};

export default Index;
