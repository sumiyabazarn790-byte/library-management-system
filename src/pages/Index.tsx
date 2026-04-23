import { TopNav } from "@/components/aetheria/TopNav";
import { SideRail } from "@/components/aetheria/SideRail";
import { Hero } from "@/components/aetheria/Hero";
import { Catalog } from "@/components/aetheria/Catalog";
import { Recommendations } from "@/components/aetheria/Recommendations";
import { MyLoans } from "@/components/aetheria/MyLoans";
import { CuratedCuriosities } from "@/components/aetheria/CuratedCuriosities";
import { ArchiveSpotlight } from "@/components/aetheria/ArchiveSpotlight";
import { Footer } from "@/components/aetheria/Footer";
import { AIAssistant } from "@/components/aetheria/AIAssistant";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <SideRail />

      <main className="pt-20 lg:pl-14">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 space-y-20 md:space-y-24 pb-16">
          <Hero />
          <Catalog />
          <Recommendations />
          <MyLoans />
          <CuratedCuriosities />
          <ArchiveSpotlight />
          <Footer />
        </div>
      </main>

      <AIAssistant />
    </div>
  );
};

export default Index;
