import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Book, Loan } from "@/types/library";
import { Calendar, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type LoanWithBook = Loan & { book: Book };

export const MyLoans = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanWithBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("loans")
      .select("*, book:books(*)")
      .eq("user_id", user.id)
      .order("loaned_at", { ascending: false });
    if (!error && data) setLoans(data as unknown as LoanWithBook[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const returnBook = async (loanId: string) => {
    setBusyId(loanId);
    const { error } = await supabase.rpc("return_book", { p_loan_id: loanId });
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Ном буцаалаа");
      load();
    }
  };

  if (!user) {
    return (
      <section className="rounded-2xl glass ring-hairline p-10 text-center">
        <h3 className="text-headline-md">Зээлээ үзэхийн тулд нэвтэрнэ үү</h3>
        <Link
          to="/auth"
          className="mt-6 inline-flex h-11 px-6 rounded-md bg-primary text-primary-foreground items-center font-semibold text-sm shadow-glow-primary"
        >
          Нэвтрэх
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-headline-md mb-6">Миний зээлүүд</h2>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground"><Loader2 className="size-5 animate-spin inline" /></div>
      ) : loans.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center">Одоогоор зээл алга. Каталогаас сонгоно уу.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {loans.map((l) => {
            const due = new Date(l.due_date);
            const overdue = l.status === "active" && due < new Date();
            return (
              <article key={l.id} className="flex gap-4 p-4 rounded-xl bg-surface-elevated/60 ring-hairline hover:ring-hairline-strong transition-all">
                <img
                  src={l.book.cover_url ?? "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=200"}
                  alt={l.book.title}
                  className="w-20 h-28 rounded-md object-cover ring-hairline"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold leading-tight line-clamp-2">{l.book.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{l.book.author}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span className={overdue ? "text-destructive" : "text-muted-foreground"}>
                      Хугацаа: {due.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`text-label px-2 py-1 rounded ${
                      l.status === "active" ? "bg-primary/15 text-primary" :
                      l.status === "returned" ? "bg-muted text-muted-foreground" :
                      "bg-secondary-deep/40 text-secondary"
                    }`}>
                      {l.status === "active" ? "Идэвхтэй" : l.status === "returned" ? "Буцаасан" : l.status}
                    </span>
                    {l.status === "active" && (
                      <button
                        onClick={() => returnBook(l.id)}
                        disabled={busyId === l.id}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
                      >
                        {busyId === l.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                        Буцаах
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
