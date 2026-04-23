import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

const Auth = () => {
  const { signIn, signUp, user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    nav("/", { replace: true });
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, displayName);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (mode === "signup") {
      toast.success("Бүртгэл амжилттай. Та одоо нэвтэрсэн байна.");
    } else {
      toast.success("Тавтай морил.");
    }
    nav("/", { replace: true });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6">
      <div className="absolute -top-32 -left-32 size-[28rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-32 size-[32rem] rounded-full bg-secondary-deep/30 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md glass-strong rounded-2xl ring-hairline-strong p-8 shadow-cinematic">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-md bg-gradient-accent flex items-center justify-center shadow-glow-primary">
            <BookOpen className="size-5 text-primary-foreground" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-gradient-accent leading-none">AETHERIA</h1>
            <p className="text-xs text-muted-foreground mt-1">Архивт нэвтрэх</p>
          </div>
        </div>

        <div className="grid grid-cols-2 p-1 rounded-md bg-surface-elevated mb-7 ring-hairline">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-label py-2.5 rounded transition-all ${
                mode === m ? "bg-primary text-primary-foreground shadow-glow-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "signin" ? "Нэвтрэх" : "Бүртгүүлэх"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-label text-muted-foreground block mb-2">Нэр</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-11 px-4 rounded-md bg-surface-elevated border border-border focus:border-primary focus:outline-none text-sm transition-colors"
                placeholder="Таны нэр"
              />
            </div>
          )}
          <div>
            <label className="text-label text-muted-foreground block mb-2">И-мэйл</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 rounded-md bg-surface-elevated border border-border focus:border-primary focus:outline-none text-sm transition-colors"
              placeholder="you@archive.com"
            />
          </div>
          <div>
            <label className="text-label text-muted-foreground block mb-2">Нууц үг</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 rounded-md bg-surface-elevated border border-border focus:border-primary focus:outline-none text-sm transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 mt-2 rounded-md bg-primary text-primary-foreground font-semibold text-sm shadow-glow-primary hover:shadow-[0_0_60px_hsl(var(--primary)/0.55)] transition-all disabled:opacity-60"
          >
            {busy ? "Хүлээнэ үү..." : mode === "signin" ? "Нэвтрэх" : "Бүртгэл үүсгэх"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
