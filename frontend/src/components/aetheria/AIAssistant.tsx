import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseUnavailableReason, primeSupabaseAvailability } from "@/integrations/supabase/availability";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/config";
import {
  buildAssistantAgentSnapshot,
  resolveLocalAssistantReply,
  type AssistantAgentState,
  type LocalAssistantReply,
} from "@/lib/assistant";
import { AI_ASSISTANT_OPEN_EVENT } from "@/lib/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import assistantProfileImage from "@/assets/3e32cbf8-5e34-4415-aaff-8d860d9f4bb6.png";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = SUPABASE_URL ? new URL("/functions/v1/chat", SUPABASE_URL).toString() : "";

const STARTER_PROMPTS = [
  "find books about ai ethics",
  "sanal bolgo science fiction",
  "show books I can read now",
  "minii loans",
];

const createInitialAgentState = (): AssistantAgentState => ({
  mode: "local",
  intent: "startup",
  stage: "ready",
  suggestions: STARTER_PROMPTS,
});

const AssistantAvatar = ({ className = "" }: { className?: string }) => (
  <Avatar className={`border border-primary/30 bg-black shadow-[0_0_30px_hsl(var(--primary)/0.35)] ${className}`}>
    <AvatarImage
      src={assistantProfileImage.src}
      alt="Aetheria AI profile"
      className="object-contain bg-black p-1"
    />
    <AvatarFallback className="bg-gradient-accent text-primary-foreground">
      <Sparkles className="size-4" />
    </AvatarFallback>
  </Avatar>
);

const readAssistantError = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string; message?: string };
      return payload.error ?? payload.message ?? `assistant unavailable: ${response.status}`;
    }

    const text = (await response.text()).trim();
    return text || `assistant unavailable: ${response.status}`;
  } catch {
    return `assistant unavailable: ${response.status}`;
  }
};

const agentModeLabel: Record<AssistantAgentState["mode"], string> = {
  local: "Local tools",
  remote: "Cloud model",
  offline: "Offline fallback",
};

const agentStageLabel: Record<AssistantAgentState["stage"], string> = {
  ready: "Ready",
  working: "Working",
  needs_input: "Need detail",
  blocked: "Blocked",
};

const agentIntentLabel: Record<AssistantAgentState["intent"], string> = {
  startup: "Agent mode",
  greeting: "Greeting",
  capabilities: "Capabilities",
  loans: "Loans",
  readable: "Reader titles",
  recommend: "Recommendations",
  borrow: "Borrow flow",
  request: "Request flow",
  return: "Return flow",
  search: "Catalog search",
  unknown: "General help",
};

const buildAgentBadgeClass = (mode: AssistantAgentState["mode"]) => {
  if (mode === "offline") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  if (mode === "remote") {
    return "border-primary/25 bg-primary/10 text-primary";
  }

  return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
};

const buildStageBadgeClass = (stage: AssistantAgentState["stage"]) => {
  if (stage === "blocked") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  if (stage === "working") {
    return "border-primary/25 bg-primary/10 text-primary";
  }

  if (stage === "needs_input") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-200";
  }

  return "border-white/10 bg-white/5 text-foreground";
};

const buildInputPlaceholder = (agentState: AssistantAgentState, signedIn: boolean) => {
  if (agentState.stage === "needs_input") {
    return "Name a title or pick one of the suggestions...";
  }

  if (!signedIn) {
    return "Ask for books, reading picks, or public reader titles...";
  }

  return "Ask the agent to search, recommend, borrow, or return...";
};

export const AIAssistant = () => {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [agentState, setAgentState] = useState<AssistantAgentState>(() => createInitialAgentState());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(AI_ASSISTANT_OPEN_EVENT, handler);

    return () => {
      window.removeEventListener(AI_ASSISTANT_OPEN_EVENT, handler);
    };
  }, []);

  const upsertAssistantMessage = (content: string) => {
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];

      if (last?.role === "assistant") {
        next[next.length - 1] = { ...last, content };
        return next;
      }

      next.push({ role: "assistant", content });
      return next;
    });
  };

  const syncAgentState = ({
    text,
    history,
    mode,
    stage,
    reply,
  }: {
    text: string;
    history: Message[];
    mode: AssistantAgentState["mode"];
    stage: AssistantAgentState["stage"];
    reply?: LocalAssistantReply;
  }) => {
    setAgentState(reply?.agent ?? buildAssistantAgentSnapshot({ text, history, mode, stage }));
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setInput("");
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setStreaming(true);
    syncAgentState({
      text,
      history: nextMessages,
      mode: "remote",
      stage: "working",
    });

    try {
      const localReply = await resolveLocalAssistantReply({
        text,
        userId: user?.id,
        profile,
        history: nextMessages,
        preferRemoteDiscovery: true,
      });

      if (localReply.handled) {
        if (localReply.shouldSignOut) {
          await signOut();
        }

        upsertAssistantMessage(localReply.reply ?? "");
        syncAgentState({
          text,
          history: nextMessages,
          mode: localReply.agent?.mode ?? "local",
          stage: localReply.agent?.stage ?? "ready",
          reply: localReply,
        });
        return;
      }

      const availability = await primeSupabaseAvailability();
      const knownUnavailableReason = availability.reason ?? getSupabaseUnavailableReason();

      if (!availability.available || knownUnavailableReason) {
        const offlineReply = await resolveLocalAssistantReply({
          text,
          userId: user?.id,
          profile,
          history: nextMessages,
          forceOfflineFallback: true,
        });
        upsertAssistantMessage(offlineReply.reply ?? "");
        syncAgentState({
          text,
          history: nextMessages,
          mode: offlineReply.agent?.mode ?? "offline",
          stage: offlineReply.agent?.stage ?? "blocked",
          reply: offlineReply,
        });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (response.status === 429 || response.status === 402) {
        throw new Error(await readAssistantError(response));
      }

      if (!response.ok) {
        throw new Error(await readAssistantError(response));
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as { reply?: string; error?: string; message?: string };
        const reply = payload.reply ?? payload.message ?? payload.error;

        if (!reply?.trim()) {
          throw new Error("assistant returned an empty reply");
        }

        upsertAssistantMessage(reply);
        syncAgentState({
          text,
          history: nextMessages,
          mode: "remote",
          stage: "ready",
        });
        return;
      }

      if (!response.body) {
        throw new Error("assistant stream unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let lineBreakIndex = buffer.indexOf("\n");

        while (lineBreakIndex !== -1) {
          let line = buffer.slice(0, lineBreakIndex);
          buffer = buffer.slice(lineBreakIndex + 1);

          if (line.endsWith("\r")) {
            line = line.slice(0, -1);
          }

          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();

            if (payload === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(payload);
              const chunk = parsed.choices?.[0]?.delta?.content;

              if (chunk) {
                assistantContent += chunk;
                upsertAssistantMessage(assistantContent);
              }
            } catch (error) {
              console.error("assistant stream parse failed", error);
            }
          }

          lineBreakIndex = buffer.indexOf("\n");
        }
      }

      if (!assistantContent.trim()) {
        throw new Error("empty stream");
      }

      syncAgentState({
        text,
        history: nextMessages,
        mode: "remote",
        stage: "ready",
      });
    } catch (error) {
      console.warn("assistant request failed", error);
      const fallbackReply = await resolveLocalAssistantReply({
        text,
        userId: user?.id,
        profile,
        history: nextMessages,
        forceOfflineFallback: true,
      });

      if (fallbackReply.shouldSignOut) {
        await signOut();
      }

      const errorMessage = error instanceof Error ? error.message.trim() : "";
      const isQuotaError = /too many requests|credit is currently unavailable/i.test(errorMessage);
      upsertAssistantMessage(isQuotaError ? errorMessage : fallbackReply.reply ?? errorMessage);
      syncAgentState({
        text,
        history: nextMessages,
        mode: isQuotaError ? "remote" : fallbackReply.agent?.mode ?? "offline",
        stage: isQuotaError ? "blocked" : fallbackReply.agent?.stage ?? "blocked",
        reply: isQuotaError ? undefined : fallbackReply,
      });
    } finally {
      setStreaming(false);
    }
  };

  const visibleSuggestions = agentState.suggestions.length ? agentState.suggestions : STARTER_PROMPTS;
  const inputPlaceholder = buildInputPlaceholder(agentState, Boolean(user));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-2.5 right-2.5 z-50 flex h-10 items-center gap-1 rounded-full bg-gradient-accent px-3 text-[0px] font-semibold text-primary-foreground shadow-glow-primary transition-all hover:scale-105 sm:bottom-6 sm:right-6 sm:h-14 sm:gap-2 sm:px-5 sm:text-sm ${open ? "hidden" : ""}`}
      >
        <Sparkles className="size-4 sm:size-5" />
        AI Agent
      </button>

      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[min(560px,100dvh)] w-full flex-col overflow-hidden rounded-t-[18px] glass-strong ring-hairline-strong shadow-cinematic animate-fade-up sm:bottom-6 sm:right-6 sm:h-[min(720px,calc(100dvh-3rem))] sm:w-[min(460px,calc(100vw-2rem))] sm:rounded-2xl">
          <header className="flex h-10 items-center justify-between border-b border-border/40 px-2.5 sm:h-14 sm:px-5">
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <AssistantAvatar className="size-6 sm:size-9" />
              <div>
                <p className="font-display text-[11px] font-semibold leading-none sm:text-sm">Aetheria AI Agent</p>
                <p className="mt-1 hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:block">
                  Search, recommend, borrow, follow through
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-0.5 text-muted-foreground hover:bg-surface-high hover:text-foreground sm:p-2">
              <X className="size-3 sm:size-4" />
            </button>
          </header>

          <div className="border-b border-border/30 bg-black/10 px-2.5 py-2 sm:px-5 sm:py-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-[11px] ${buildAgentBadgeClass(agentState.mode)}`}>
                {agentModeLabel[agentState.mode]}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-[11px] ${buildStageBadgeClass(agentState.stage)}`}>
                {agentStageLabel[agentState.stage]}
              </span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px]">
                {agentIntentLabel[agentState.intent]}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              {agentState.focus ? `Focus: ${agentState.focus}` : "Ask for a title, genre, or a library action and I will guide the next step."}
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-2.5 py-2 sm:space-y-4 sm:px-5 sm:py-4">
            {!messages.length ? (
              <div className="rounded-2xl border border-primary/15 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.16),transparent_55%),rgba(255,255,255,0.02)] p-4 sm:p-5">
                <p className="font-display text-base text-foreground sm:text-lg">Agent mode is ready.</p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground sm:text-sm">
                  I can search the catalog, shape recommendations, check your loans, and keep the conversation moving with follow-up actions.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void send(prompt)}
                      className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-left text-[11px] text-primary transition-colors hover:bg-primary/15 sm:text-xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-end gap-1 sm:gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  {message.role === "assistant" ? <AssistantAvatar className="hidden size-8 shrink-0 sm:flex sm:size-9" /> : null}
                  <div
                    className={`max-w-[96%] break-words whitespace-pre-wrap rounded-2xl px-2 py-1.5 text-[11px] leading-[1.35rem] sm:max-w-[88%] sm:px-4 sm:py-3 sm:text-sm sm:leading-relaxed ${
                      message.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-surface-high text-foreground ring-hairline"
                    }`}
                  >
                    {message.content || (streaming && index === messages.length - 1 ? <Loader2 className="size-4 animate-spin" /> : "")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/40 px-1.5 py-1.5 sm:px-3 sm:py-2">
            <div className="flex flex-wrap gap-1.5">
              {visibleSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void send(prompt)}
                  disabled={streaming}
                  className="rounded-full border border-border/60 bg-surface-high/70 px-2.5 py-1 text-[10px] text-foreground transition-colors hover:bg-surface-high disabled:opacity-50 sm:text-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 border-t border-border/40 p-1.5 sm:gap-2 sm:p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void send();
                }
              }}
              placeholder={inputPlaceholder}
              className="h-8 flex-1 rounded-md border border-border bg-surface-elevated px-2.5 text-[11px] transition-colors focus:border-primary focus:outline-none sm:h-11 sm:px-4 sm:text-sm"
            />
            <button
              onClick={() => void send()}
              disabled={streaming || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_50px_hsl(var(--primary)/0.55)] disabled:opacity-50 disabled:shadow-none sm:h-11 sm:w-11"
            >
              {streaming ? <Loader2 className="size-3 animate-spin sm:size-4" /> : <Send className="size-3 sm:size-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
