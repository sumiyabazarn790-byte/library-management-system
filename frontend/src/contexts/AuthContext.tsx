"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPersistedSupabaseSession,
  getSupabaseUnavailableReason,
  SUPABASE_AVAILABILITY_CHANGE_EVENT,
} from "@/integrations/supabase/availability";
import { buildAuthCallbackPath, buildAuthRedirectUrl } from "@/lib/auth";
import { mapAuthError, type AuthResult } from "@/lib/authResult";
import type { Profile } from "@/types/library";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  authUnavailableMessage: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signInWithGoogle: (nextPath?: string) => Promise<AuthResult>;
  resendConfirmationEmail: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Context = createContext<AuthCtx | undefined>(undefined);
const STALE_AUTH_SESSION_PATTERN =
  /user from sub claim in jwt does not exist|session from session_id claim in jwt does not exist|invalid refresh token|refresh token not found/i;

const postAuthAction = async (path: string, payload: Record<string, unknown>): Promise<AuthResult> => {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as AuthResult | null;

    if (data) {
      return data;
    }

    return {
      error: response.ok ? null : "Authentication request failed.",
      reason: response.ok ? null : "unknown",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Authentication request failed.",
      reason: "unknown",
    };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUnavailableMessage, setAuthUnavailableMessage] = useState<string | null>(() => getSupabaseUnavailableReason());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleAvailabilityChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason?: string | null }>;
      setAuthUnavailableMessage(customEvent.detail?.reason ?? getSupabaseUnavailableReason());
    };

    window.addEventListener(SUPABASE_AVAILABILITY_CHANGE_EVENT, handleAvailabilityChange);
    return () => {
      window.removeEventListener(SUPABASE_AVAILABILITY_CHANGE_EVENT, handleAvailabilityChange);
    };
  }, []);

  useEffect(() => {
    if (authUnavailableMessage) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    let active = true;

    const resetAuthState = () => {
      if (!active) return;

      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
    };

    const discardLocalSession = async (reason?: unknown) => {
      if (reason) {
        console.warn("discarding stale local auth session", reason);
      }

      clearPersistedSupabaseSession();
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error && !STALE_AUTH_SESSION_PATTERN.test(error.message)) {
        console.warn("local sign out cleanup skipped", error);
      }

      resetAuthState();
    };

    const syncAuthState = async (nextSession: Session | null) => {
      if (!active) return;

      if (!nextSession) {
        resetAuthState();
        return;
      }

      const {
        data: { user: verifiedUser },
        error: verifiedUserError,
      } = await supabase.auth.getUser(nextSession.access_token);

      if (!active) return;

      if (verifiedUserError || !verifiedUser) {
        await discardLocalSession(verifiedUserError ?? new Error("Verified auth user was not found"));
        return;
      }

      setSession(nextSession);
      setUser(verifiedUser);

      const { data, error } = await supabase.from("profiles").select("*").eq("id", verifiedUser.id).maybeSingle();

      if (!active) return;

      if (error) {
        console.error("profile load failed", error);
        setProfile(null);
      } else {
        setProfile((data ?? null) as Profile | null);
      }

      setLoading(false);
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        void syncAuthState(currentSession);
      })
      .catch((error) => {
        if (!active) return;
        console.warn("initial auth session lookup skipped", error);
        resetAuthState();
      });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [authUnavailableMessage]);

  const refreshProfile = async () => {
    if (authUnavailableMessage) {
      setProfile(null);
      return;
    }

    if (!user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

    if (error) {
      console.error("profile refresh failed", error);
      return;
    }

    setProfile((data ?? null) as Profile | null);
  };

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    if (authUnavailableMessage) {
      return { error: authUnavailableMessage, reason: "unknown" };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const authGateResult = await postAuthAction("/api/auth/password-signin", {
      email: normalizedEmail,
      password,
    });

    if (authGateResult.error) {
      return authGateResult;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    return mapAuthError(error?.message);
  };

  const signUp: AuthCtx["signUp"] = async (email, password, displayName) => {
    if (authUnavailableMessage) {
      return { error: authUnavailableMessage, reason: "unknown" };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const signupResult = await postAuthAction("/api/auth/signup", {
      email: normalizedEmail,
      password,
      displayName,
    });

    if (signupResult.error) {
      return signupResult;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    return {
      ...mapAuthError(error?.message),
      emailConfirmationRequired: false,
    };
  };

  const signInWithGoogle: AuthCtx["signInWithGoogle"] = async (nextPath) => {
    if (authUnavailableMessage) {
      return { error: authUnavailableMessage, reason: "unknown" };
    }

    const redirectUrl = buildAuthRedirectUrl(buildAuthCallbackPath(nextPath));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        scopes: "email profile",
      },
    });

    return mapAuthError(error?.message);
  };

  const resendConfirmationEmail: AuthCtx["resendConfirmationEmail"] = async (email) => {
    if (authUnavailableMessage) {
      return { error: authUnavailableMessage, reason: "unknown" };
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: buildAuthRedirectUrl("/"),
      },
    });

    return mapAuthError(error?.message);
  };

  const signOut = async () => {
    if (authUnavailableMessage) {
      clearPersistedSupabaseSession();
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }

    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error && !STALE_AUTH_SESSION_PATTERN.test(error.message)) {
      console.warn("sign out failed", error);
    }

    clearPersistedSupabaseSession();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <Context.Provider
      value={{
        user,
        session,
        profile,
        isAdmin: profile?.role === "admin",
        loading,
        authUnavailableMessage,
        signIn,
        signUp,
        signInWithGoogle,
        resendConfirmationEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(Context);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
