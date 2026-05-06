import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAuthCallbackError } from "@/lib/auth";

const POST_LOGIN_REDIRECT = { pathname: "/app", hash: "#browse" } as const;
const CALLBACK_POLL_INTERVAL_MS = 250;
const CALLBACK_TIMEOUT_MS = 8000;
const GENERIC_CALLBACK_ERROR = "Нэвтрэх явцад алдаа гарлаа. Та дахин оролдоно уу.";

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, authUnavailableMessage } = useAuth();
  const [statusMessage, setStatusMessage] = useState("Google нэвтрэлтийг шалгаж байна...");
  const didFinishRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || didFinishRef.current) {
      return;
    }

    let active = true;

    const finish = (target: "auth" | "app", toastMessage?: string) => {
      if (!active || didFinishRef.current) {
        return;
      }

      didFinishRef.current = true;

      if (toastMessage) {
        if (target === "app") {
          toast.success(toastMessage);
        } else {
          toast.error(toastMessage);
        }
      }

      navigate(target === "app" ? POST_LOGIN_REDIRECT : "/auth", { replace: true });
    };

    const waitForSession = async () => {
      const deadline = Date.now() + CALLBACK_TIMEOUT_MS;

      while (active && Date.now() < deadline) {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session?.user) {
          return session;
        }

        await wait(CALLBACK_POLL_INTERVAL_MS);
      }

      return null;
    };

    const run = async () => {
      if (authUnavailableMessage) {
        finish("auth", authUnavailableMessage);
        return;
      }

      const callbackError = getAuthCallbackError();
      if (callbackError) {
        finish("auth", callbackError);
        return;
      }

      if (user) {
        finish("app", "Амжилттай нэвтэрлээ.");
        return;
      }

      const currentUrl = new URL(window.location.href);
      const authCode = currentUrl.searchParams.get("code");
      const hasImplicitTokens = currentUrl.hash.includes("access_token");
      const hasCallbackSignals =
        Boolean(authCode) ||
        hasImplicitTokens ||
        currentUrl.hash.includes("error") ||
        currentUrl.searchParams.has("error");

      if (!hasCallbackSignals) {
        finish("auth", GENERIC_CALLBACK_ERROR);
        return;
      }

      try {
        if (authCode) {
          setStatusMessage("Google login кодыг баталгаажуулж байна...");
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);

          if (error) {
            throw error;
          }
        } else if (hasImplicitTokens) {
          setStatusMessage("Google нэвтрэлтийн session-г бэлтгэж байна...");
        }

        const session = await waitForSession();

        if (session?.user) {
          finish("app", "Амжилттай нэвтэрлээ.");
          return;
        }

        finish("auth", GENERIC_CALLBACK_ERROR);
      } catch (error) {
        finish("auth", error instanceof Error ? error.message : GENERIC_CALLBACK_ERROR);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [authUnavailableMessage, navigate, user]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{statusMessage}</p>
    </div>
  );
};

export default AuthCallback;
