"use client";

import { useEffect, useState, type ComponentType } from "react";
import { primeSupabaseAvailability } from "@/integrations/supabase/availability";

export function ClientOnlyApp() {
  const [AppComponent, setAppComponent] = useState<ComponentType | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await primeSupabaseAvailability();
        const { default: LoadedApp } = await import("../src/App");
        if (active) {
          setAppComponent(() => LoadedApp);
        }
      } catch (error) {
        console.error("Failed to boot client app:", error);
        if (active) {
          setBootError("Failed to load the app. Please refresh and try again.");
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (!AppComponent) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        {bootError ? <p className="max-w-md text-sm text-muted-foreground">{bootError}</p> : null}
      </div>
    );
  }

  return <AppComponent />;
}
