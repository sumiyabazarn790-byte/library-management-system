import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { TopNav } from "@/components/aetheria/TopNav";
import { Hero } from "@/components/aetheria/Hero";
import { FreeReadingShelf } from "@/components/aetheria/FreeReadingShelf";
import { Catalog } from "@/components/aetheria/Catalog";
import { Recommendations } from "@/components/aetheria/Recommendations";
import { ContinueReading } from "@/components/aetheria/ContinueReading";
import { UserProfilePanel } from "@/components/aetheria/UserProfilePanel";
import { MyLoans } from "@/components/aetheria/MyLoans";
import { SavedBooksShelf } from "@/components/aetheria/SavedBooksShelf";
import { AdminPanel } from "@/components/aetheria/AdminPanel";
import { CuratedCuriosities } from "@/components/aetheria/CuratedCuriosities";
import { ArchiveSpotlight } from "@/components/aetheria/ArchiveSpotlight";
import { Footer } from "@/components/aetheria/Footer";
import { AIAssistant } from "@/components/aetheria/AIAssistant";
import { useAuth } from "@/contexts/AuthContext";
import { openAIAssistant, scrollToSection, SECTION_CHANGE_EVENT } from "@/lib/navigation";

type LoggedInPageId = "browse" | "library" | "profile" | "collections" | "ai-insights" | "admin";

const loggedInPageIds = ["browse", "library", "profile", "collections", "ai-insights", "admin"] as const;

const readHashSection = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.hash.replace(/^#/, "").trim();
};

const isLoggedInPageId = (value: string, isAdmin: boolean): value is LoggedInPageId => {
  if (value === "admin") {
    return isAdmin;
  }

  return loggedInPageIds.some((pageId) => pageId === value && pageId !== "admin");
};

const Index = () => {
  const location = useLocation();
  const { loading, user, isAdmin } = useAuth();
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState(() => readHashSection() || "home");
  const [activePageId, setActivePageId] = useState<LoggedInPageId>(() => {
    const initialHash = readHashSection();
    return initialHash === "admin" ? "browse" : (initialHash as LoggedInPageId) || "browse";
  });

  const refreshLibrary = () => {
    setLibraryRefreshKey((current) => current + 1);
  };

  useEffect(() => {
    if (loading) {
      return;
    }

    const targetSectionId = location.hash.replace(/^#/, "").trim();

    if (!user) {
      setActiveSectionId(targetSectionId || "home");

      if (!targetSectionId) {
        return;
      }

      const animationFrame = window.requestAnimationFrame(() => {
        scrollToSection(targetSectionId);

        if (targetSectionId === "ai-insights") {
          openAIAssistant();
        }
      });

      return () => {
        window.cancelAnimationFrame(animationFrame);
      };
    }

    if (!targetSectionId || targetSectionId === "home") {
      const animationFrame = window.requestAnimationFrame(() => {
        scrollToSection("browse");
      });

      return () => {
        window.cancelAnimationFrame(animationFrame);
      };
    }

    if (targetSectionId === "footer") {
      setActiveSectionId("footer");
      return;
    }

    if (!isLoggedInPageId(targetSectionId, isAdmin)) {
      const animationFrame = window.requestAnimationFrame(() => {
        scrollToSection("browse");
      });

      return () => {
        window.cancelAnimationFrame(animationFrame);
      };
    }

    setActiveSectionId(targetSectionId);
    setActivePageId(targetSectionId);
  }, [isAdmin, loading, location.hash, user]);

  useEffect(() => {
    if (loading || typeof window === "undefined") {
      return;
    }

    const handleSectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      const nextSectionId = customEvent.detail?.id?.trim() || (user ? "browse" : "home");

      if (!user) {
        setActiveSectionId(nextSectionId);
        return;
      }

      if (nextSectionId === "footer") {
        setActiveSectionId("footer");
        return;
      }

      if (isLoggedInPageId(nextSectionId, isAdmin)) {
        setActiveSectionId(nextSectionId);
        setActivePageId(nextSectionId);
      }
    };

    const handleHashChange = () => {
      const nextSectionId = readHashSection();

      if (!user) {
        setActiveSectionId(nextSectionId || "home");
        return;
      }

      if (!nextSectionId) {
        setActiveSectionId("browse");
        setActivePageId("browse");
        return;
      }

      if (nextSectionId === "footer") {
        setActiveSectionId("footer");
        return;
      }

      if (isLoggedInPageId(nextSectionId, isAdmin)) {
        setActiveSectionId(nextSectionId);
        setActivePageId(nextSectionId);
      }
    };

    window.addEventListener(SECTION_CHANGE_EVENT, handleSectionChange);
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener(SECTION_CHANGE_EVENT, handleSectionChange);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [isAdmin, loading, user]);

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    if (activeSectionId === "footer") {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

      if (activePageId === "ai-insights") {
        openAIAssistant();
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activePageId, activeSectionId, loading, user]);

  const loggedInContent = useMemo(() => {
    switch (activePageId) {
      case "browse":
        return (
          <div className="space-y-12 md:space-y-16">
            <Catalog refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
            <FreeReadingShelf refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
            <Recommendations refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
          </div>
        );
      case "library":
        return (
          <div className="space-y-12 md:space-y-16">
            <ContinueReading refreshKey={libraryRefreshKey} />
            <SavedBooksShelf refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
            <MyLoans refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
          </div>
        );
      case "profile":
        return <UserProfilePanel refreshKey={libraryRefreshKey} onProfileChange={refreshLibrary} />;
      case "collections":
        return (
          <div className="space-y-12 md:space-y-16">
            <CuratedCuriosities />
            <ArchiveSpotlight />
          </div>
        );
      case "ai-insights":
        return (
          <div className="space-y-12 md:space-y-16">
            <Recommendations refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
            <ContinueReading refreshKey={libraryRefreshKey} />
          </div>
        );
      case "admin":
        return <AdminPanel refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />;
      default:
        return null;
    }
  }, [activePageId, libraryRefreshKey]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <TopNav />

      <main className="overflow-x-hidden pt-16 sm:pt-20">
        {!user ? (
          <div className="space-y-16 overflow-x-hidden md:space-y-24 lg:space-y-32">
            <Hero />

            <div className="mx-auto max-w-[1440px] space-y-16 px-4 pb-12 sm:px-6 sm:pb-16 md:space-y-24 lg:px-12 lg:space-y-32">
              <FreeReadingShelf refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
              <Catalog refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
              <Recommendations refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
              <ContinueReading refreshKey={libraryRefreshKey} />
              <UserProfilePanel refreshKey={libraryRefreshKey} onProfileChange={refreshLibrary} />
              <MyLoans refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
              <AdminPanel refreshKey={libraryRefreshKey} onLibraryChange={refreshLibrary} />
              <CuratedCuriosities />
              <ArchiveSpotlight />
              <Footer />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-12">
            <div className="min-h-[calc(100vh-9rem)]">
              {loggedInContent}
            </div>
            <Footer />
          </div>
        )}
      </main>

      <AIAssistant />
    </div>
  );
};

export default Index;
