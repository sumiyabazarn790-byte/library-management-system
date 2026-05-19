import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { openAIAssistant, scrollToSection } from "@/lib/navigation";

const columns = [
  {
    heading: "Discovery",
    links: [
      { label: "Latest Additions", action: () => scrollToSection("browse") },
      { label: "Master Archives", action: () => scrollToSection("collections") },
      { label: "Audio Insights", action: () => scrollToSection("ai-insights") },
      { label: "Visual Essays", action: () => scrollToSection("collections") },
    ],
  },
  {
    heading: "Ecosystem",
    links: [
      { label: "Membership Tiers", action: () => scrollToSection("library") },
      { label: "Corporate Reels", action: () => scrollToSection("collections") },
      { label: "Institutional Access", action: () => scrollToSection("browse") },
      { label: "Preservation Lab", action: () => openAIAssistant() },
    ],
  },
];

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string | null;
        status?: "subscribed" | "already_subscribed";
      } | null;

      if (!response.ok || result?.error) {
        toast.error(result?.error || "Newsletter signup failed. Please try again.");
        return;
      }

      setEmail("");

      if (result?.status === "already_subscribed") {
        toast.info("This email is already subscribed.");
      } else {
        toast.success("You are subscribed to the Aetheria dispatch.");
      }
    } catch {
      toast.error("Newsletter signup failed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer id="footer" className="border-t border-border/40 mt-12 pt-16 pb-10 scroll-mt-24">
      <div className="grid md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <h3 className="font-display font-bold text-lg text-gradient-accent">AETHERIA</h3>
          <p className="text-sm text-muted-foreground mt-4 max-w-xs leading-relaxed">
            The premier digital vault for human knowledge. High-resolution preservation of rare manuscripts
            and curated intellectual pathways for the curious mind.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.heading} className="md:col-span-2">
            <h4 className="text-label text-primary mb-5">{column.heading}</h4>
            <ul className="space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={link.action}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="md:col-span-4">
          <h4 className="text-label text-primary mb-5">Connect</h4>
          <p className="text-sm text-muted-foreground mb-4">Join the dispatch.</p>
          <form onSubmit={subscribe} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@archive.com"
              autoComplete="email"
              inputMode="email"
              required
              disabled={submitting}
              className="flex-1 h-11 px-4 rounded-md bg-surface-elevated border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm placeholder:text-muted-foreground/60 transition-colors disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={submitting}
              aria-label="Subscribe"
              className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_50px_hsl(var(--primary)/0.55)] disabled:opacity-60 sm:w-11"
            >
              <ArrowRight className="size-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="mt-14 flex flex-col gap-4 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p>&copy; 2026 Aetheria Knowledge Systems. All rights reserved.</p>
        <div className="flex flex-wrap gap-4 sm:gap-6">
          <button onClick={() => scrollToSection("footer")} className="hover:text-foreground transition-colors">
            Privacy Codex
          </button>
          <button onClick={() => scrollToSection("footer")} className="hover:text-foreground transition-colors">
            Terms of Access
          </button>
          <button onClick={() => openAIAssistant()} className="hover:text-foreground transition-colors">
            Research Ethics
          </button>
        </div>
      </div>
    </footer>
  );
};
