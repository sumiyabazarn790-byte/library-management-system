import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseUnavailableReason, primeSupabaseAvailability } from "@/integrations/supabase/availability";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/config";
import { resolveLocalAssistantReply } from "@/lib/assistant";
import { AI_ASSISTANT_OPEN_EVENT } from "@/lib/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import assistantProfileImage from "@/assets/3e32cbf8-5e34-4415-aaff-8d860d9f4bb6.png";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = SUPABASE_URL ? new URL("/functions/v1/chat", SUPABASE_URL).toString() : "";

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

export const AIAssistant = () => {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
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

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setInput("");
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const localReply = await resolveLocalAssistantReply({
        text,
        userId: user?.id,
        profile,
        history: nextMessages,
      });

      if (localReply.handled) {
        if (localReply.shouldSignOut) {
          await signOut();
        }

        upsertAssistantMessage(localReply.reply ?? "");
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
      upsertAssistantMessage(
        /too many requests|credit is currently unavailable/i.test(errorMessage)
          ? errorMessage
          : fallbackReply.reply ?? errorMessage,
      );
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-2.5 right-2.5 z-50 flex h-10 items-center gap-1 rounded-full bg-gradient-accent px-3 text-[0px] font-semibold text-primary-foreground shadow-glow-primary transition-all hover:scale-105 sm:bottom-6 sm:right-6 sm:h-14 sm:gap-2 sm:px-5 sm:text-sm ${open ? "hidden" : ""}`}
      >
        <Sparkles className="size-4 sm:size-5" />
        AI Туслах
      </button>

      {open && (
        <div className="fixed bottom-0.5 right-0.5 z-50 flex h-[min(420px,calc(100vh-0.25rem))] w-[min(300px,calc(100vw-0.25rem))] flex-col overflow-hidden rounded-[18px] glass-strong ring-hairline-strong shadow-cinematic animate-fade-up sm:bottom-6 sm:right-6 sm:h-[min(680px,calc(100vh-3rem))] sm:w-[min(440px,calc(100vw-2rem))] sm:rounded-2xl">
          <header className="flex h-10 items-center justify-between border-b border-border/40 px-2.5 sm:h-14 sm:px-5">
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <AssistantAvatar className="size-6 sm:size-9" />
              <div>
                <p className="font-display text-[11px] font-semibold leading-none sm:text-sm">Aetheria AI</p>
                <p className="mt-1 hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:block">Multilingual Librarian</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-0.5 text-muted-foreground hover:bg-surface-high hover:text-foreground sm:p-2">
              <X className="size-3 sm:size-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-2.5 py-2 sm:space-y-4 sm:px-5 sm:py-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-end gap-1 sm:gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  {message.role === "assistant" ? <AssistantAvatar className="hidden size-8 shrink-0 sm:flex sm:size-9" /> : null}
                  <div
                    className={`max-w-[96%] whitespace-pre-wrap rounded-2xl px-2 py-1.5 text-[11px] leading-[1.35rem] sm:max-w-[88%] sm:px-4 sm:py-3 sm:text-sm sm:leading-relaxed ${
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

          <div className="flex gap-1 border-t border-border/40 p-1.5 sm:gap-2 sm:p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void send();
                }
              }}
              placeholder="Асуултаа бичнэ үү..."
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
