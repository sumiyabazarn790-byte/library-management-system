"use client";

import { useEffect, useState } from "react";
import { primeSupabaseAvailability } from "@/integrations/supabase/availability";
import App from "../src/App";

export function ClientOnlyApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await primeSupabaseAvailability();
      } catch (error) {
        console.error("Failed to prime Supabase:", error);
      }
      if (active) {
        setReady(true);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <App />;
}
