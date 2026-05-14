import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEPLOYED_LOOPBACK_SUPABASE_MESSAGE,
  LOCAL_SUPABASE_UNAVAILABLE_MESSAGE,
} from "@/integrations/supabase/availability";
import { resolvePostLoginPath } from "@/lib/auth";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 2.9 14.6 2 12 2 6.9 2 2.8 6.2 2.8 11.3S6.9 20.6 12 20.6c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.8-.1-1.1H12Z"
    />
    <path
      fill="#34A853"
      d="M2.8 7.1 6 9.4c.9-1.7 2.7-2.9 5-2.9 1.9 0 3.1.8 3.8 1.5l2.6-2.5C15.8 3.9 14 3.2 12 3.2c-3.7 0-6.9 2.1-8.5 5.1Z"
    />
    <path
      fill="#4A90E2"
      d="M12 20.6c2.5 0 4.6-.8 6.1-2.2l-2.8-2.3c-.8.6-1.9 1.1-3.3 1.1-4 0-5.2-2.6-5.5-3.9l-3.1 2.4c1.5 3.1 4.8 4.9 8.6 4.9Z"
    />
    <path
      fill="#FBBC05"
      d="M2.8 15.5 6 13.1c-.2-.5-.3-1.1-.3-1.8 0-.6.1-1.2.3-1.8L2.8 7.1C2.2 8.4 1.8 9.8 1.8 11.3c0 1.5.4 2.9 1 4.2Z"
    />
  </svg>
);

const Auth = () => {
  const { signIn, signUp, signInWithGoogle, resendConfirmationEmail, user, loading, authUnavailableMessage } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const showLocalSignupHint =
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID === "local" &&
    (typeof window !== "undefined" ? LOOPBACK_HOSTS.has(window.location.hostname) : false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const authDisabled = Boolean(authUnavailableMessage);
  const showLocalDevHint = authUnavailableMessage === LOCAL_SUPABASE_UNAVAILABLE_MESSAGE;
  const showDeployHint = authUnavailableMessage === DEPLOYED_LOOPBACK_SUPABASE_MESSAGE;
  const shouldRedirectAuthenticatedUser = !loading && Boolean(user);
  const postLoginRedirectPath = resolvePostLoginPath(new URLSearchParams(location.search).get("next"));

  useEffect(() => {
    if (!shouldRedirectAuthenticatedUser) {
      return;
    }

    navigate(postLoginRedirectPath, { replace: true });
  }, [navigate, postLoginRedirectPath, shouldRedirectAuthenticatedUser]);

  if (loading || shouldRedirectAuthenticatedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      const message = "Email bolon nuuts ugee oruulna uu.";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFormError(null);
    setBusy(true);

    const result =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, displayName);

    setBusy(false);

    if (result.error) {
      if (mode === "signup" && result.reason === "user_already_registered") {
        const message =
          "Ene email burtgeltei baina. Nevtreh tab ruu shiljuullee. Huuchin nuuts ugee oruulj nevterne uu.";
        setMode("signin");
        setConfirmationEmail("");
        setFormError(message);
        toast.error(message);
        return;
      }

      setFormError(result.error);
      toast.error(result.error);

      if (result.reason === "email_not_confirmed") {
        setConfirmationEmail(email.trim().toLowerCase());
      }

      return;
    }

    if (mode === "signup" && result.emailConfirmationRequired) {
      const normalizedEmail = email.trim().toLowerCase();
      setConfirmationEmail(normalizedEmail);
      setMode("signin");
      setFormError(null);
      toast.success("Burtgel uuslee. Email-ee batalgaajuulaad daraa ni nevterne uu.");
      return;
    }

    if (mode === "signup" && result.manualSignInRequired) {
      setConfirmationEmail("");
      setMode("signin");
      setFormError(null);
      toast.success("Burtgel uuslee. Odoo email, nuuts ugeeree nevterne uu.");
      return;
    }

    setConfirmationEmail("");
    setFormError(null);
    toast.success(mode === "signin" ? "Tavtai moril." : "Burtgel amjilttai.");
    navigate(postLoginRedirectPath, { replace: true });
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setGoogleBusy(true);
    const result = await signInWithGoogle(postLoginRedirectPath);
    setGoogleBusy(false);

    if (result.error) {
      setFormError(result.error);
      toast.error(result.error);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = confirmationEmail || email.trim().toLowerCase();
    if (!targetEmail) {
      const message = "Dahin ilgeehin tuld ehleed email haygaa oruulna uu.";
      setFormError(message);
      toast.error(message);
      return;
    }

    setResendBusy(true);
    const result = await resendConfirmationEmail(targetEmail);
    setResendBusy(false);

    if (result.error) {
      setFormError(result.error);
      toast.error(result.error);
      return;
    }

    setFormError(null);
    toast.success(`Batalgaajuulah email ${targetEmail} ruu dahin ilgeegdlee.`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6">
      <div className="absolute -top-32 -left-32 size-[28rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-32 size-[32rem] rounded-full bg-secondary-deep/30 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md glass-strong rounded-2xl ring-hairline-strong p-8 shadow-cinematic">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-gradient-accent shadow-glow-primary">
            <BookOpen className="size-5 text-primary-foreground" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-none text-gradient-accent">AETHERIA</h1>
            <p className="mt-1 text-xs text-muted-foreground">Archive ruu nevtreh</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={authDisabled || googleBusy || busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-elevated text-sm font-semibold text-foreground transition-colors hover:bg-surface-high disabled:opacity-60"
        >
          {googleBusy ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>

        <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
          Shine account-uud email verification shaardahgui. Login esvel signup aldaa garval tailbar ni doorh form deer
          shuud haragdana.
        </p>

        {showLocalSignupHint && !authDisabled && (
          <div className="mt-4 rounded-xl border border-secondary/30 bg-secondary-deep/10 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Email batalgaajuulalt shaardahgui</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              <span className="text-foreground">Burtguuleh</span> tab-aar shine account uusgeed shuud nevterch bolno.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setConfirmationEmail("");
                setFormError(null);
              }}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-secondary/40 px-4 text-xs font-semibold text-secondary transition-colors hover:bg-secondary-deep/20"
            >
              Burtguuleh ruu shiljih
            </button>
          </div>
        )}

        {authUnavailableMessage && (
          <div className="mt-4 rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground">
            <p>{authUnavailableMessage}</p>
            {showLocalDevHint ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Local dev ashiglah bol Docker Desktop aa asaagaad <code>supabase start --workdir backend</code>{" "}
                ajilluulna uu.
              </p>
            ) : null}
            {showDeployHint ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Deploy environment deer <code>NEXT_PUBLIC_SUPABASE_URL</code> utgaa <code>https://&lt;project-ref&gt;.supabase.co</code>,{" "}
                <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> utgaa public key-r ni solij redeploy hiine uu.
              </p>
            ) : null}
          </div>
        )}

        {confirmationEmail && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
            <p className="text-sm font-medium text-foreground">Email-ee ehleed batalgaajuulna uu</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              <span className="text-foreground">{confirmationEmail}</span> hayg ruu verification email ochson baih
              yostoi. Email-ee batalgaajuulsnii daraa login hiine uu.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Ene ued Supabase-iin <code>/auth/v1/token?grant_type=password</code> huselt <code>400</code> butsaah ni
              heviin.
            </p>
            <button
              type="button"
              onClick={() => void handleResendConfirmation()}
              disabled={resendBusy}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-primary/40 px-4 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
            >
              {resendBusy ? "Ilgeej baina..." : "Batalgaajuulah email dahin ilgeeh"}
            </button>
          </div>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-3 text-muted-foreground">esvel</span>
          </div>
        </div>

        <div className="mb-7 grid grid-cols-2 rounded-md bg-surface-elevated p-1 ring-hairline">
          {(["signin", "signup"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setFormError(null);
              }}
              disabled={authDisabled}
              className={`rounded py-2.5 text-label transition-all ${
                mode === value ? "bg-primary text-primary-foreground shadow-glow-primary" : "text-muted-foreground hover:text-foreground"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {value === "signin" ? "Nevtreh" : "Burtguuleh"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="grid gap-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="displayName" className="block text-xs font-medium text-muted-foreground">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={authDisabled || busy}
                className="mt-1 block w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:ring-primary focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={authDisabled || busy}
              className="mt-1 block w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:ring-primary focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-muted-foreground">
              Nuuts ug
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={authDisabled || busy}
              className="mt-1 block w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:ring-primary focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <button
            type="submit"
            disabled={authDisabled || busy}
            className="w-full rounded-md border border-border bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : mode === "signin" ? "Nevtreh" : "Burtguuleh"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
