import { BookMarked, Compass, Home, Settings, Sparkles, type LucideIcon } from "lucide-react";

export const AI_ASSISTANT_OPEN_EVENT = "aetheria:assistant-open";
export const SECTION_CHANGE_EVENT = "aetheria:section-change";

export const navSections = [
  { label: "Home", id: "home" },
  { label: "Browse", id: "browse" },
  { label: "Library", id: "library" },
  { label: "Collections", id: "collections" },
  { label: "AI Insights", id: "ai-insights" },
] as const;

export const sideRailSections: Array<{ label: string; id: string; icon: LucideIcon }> = [
  { label: "Home", id: "home", icon: Home },
  { label: "Browse", id: "browse", icon: Compass },
  { label: "Library", id: "library", icon: BookMarked },
  { label: "AI", id: "ai-insights", icon: Sparkles },
  { label: "Settings", id: "footer", icon: Settings },
];

export const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  const nextHash = id === "home" ? window.location.pathname : `${window.location.pathname}#${id}`;
  window.history.replaceState(null, "", nextHash);
  window.dispatchEvent(new CustomEvent(SECTION_CHANGE_EVENT, { detail: { id } }));

  if (!element) return;

  element.scrollIntoView({ behavior: "smooth", block: "start" });
};

export const focusCatalogSearch = () => {
  scrollToSection("browse");
  window.setTimeout(() => {
    const input = document.getElementById("catalog-search") as HTMLInputElement | null;
    input?.focus();
    input?.select();
  }, 350);
};

export const openAIAssistant = () => {
  window.dispatchEvent(new CustomEvent(AI_ASSISTANT_OPEN_EVENT));
};
