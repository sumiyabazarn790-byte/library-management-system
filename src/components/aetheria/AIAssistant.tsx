import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Сайн байна уу 👋 Би Aetheria туслах. Ном санал болгох, хайх, эсвэл асуултанд хариулна. *Mongolian or English — both welcome.*" },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming(true);

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content !== messages[messages.length - 1]?.content || prev.length === next.length) {
          // append a new assistant msg after the user msg
          if (prev.length === next.length) return [...prev, { role: "assistant", content: acc }];
        }
        return prev.map((m, i) => (i === prev.length - 1 && m.role === "assistant" ? { ...m, content: acc } : m));
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });
      if (resp.status === 429) {
        setMessages((p) => [...p, { role: "assistant", content: "⏳ Хэт олон хүсэлт. Хэсэг хүлээгээд дахин оролдоно уу." }]);
        return;
      }
      if (resp.status === 402) {
        setMessages((p) => [...p, { role: "assistant", content: "💳 AI кредит дууссан. Workspace Settings → Usage руу нэмнэ үү." }]);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((p) => [...p, { role: "assistant", content: "Алдаа гарлаа. Дахин оролдоно уу." }]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-50 h-14 px-5 rounded-full bg-gradient-accent text-primary-foreground font-semibold text-sm shadow-glow-primary hover:scale-105 transition-all flex items-center gap-2 ${open ? "hidden" : ""}`}
      >
        <Sparkles className="size-5" />
        AI Туслах
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(620px,calc(100vh-3rem))] rounded-2xl glass-strong ring-hairline-strong shadow-cinematic flex flex-col overflow-hidden animate-fade-up">
          <header className="flex items-center justify-between px-5 h-14 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-md bg-gradient-accent flex items-center justify-center shadow-glow-soft">
                <Sparkles className="size-4 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm leading-none">Aetheria AI</p>
                <p className="text-[10px] text-muted-foreground mt-1 tracking-wider uppercase">Multilingual Librarian</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-surface-high">
              <X className="size-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-surface-high text-foreground rounded-bl-sm ring-hairline"
                  }`}
                >
                  {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="size-4 animate-spin" /> : "")}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-border/40 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Асуултаа бичнэ үү…"
              className="flex-1 h-11 px-4 rounded-md bg-surface-elevated border border-border focus:border-primary focus:outline-none text-sm transition-colors"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="h-11 w-11 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-glow-primary disabled:opacity-50 disabled:shadow-none hover:shadow-[0_0_50px_hsl(var(--primary)/0.55)] transition-all"
            >
              {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
