import { ExternalLink, Loader2, QrCode } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  LOCAL_SUPABASE_UNAVAILABLE_MESSAGE,
  isLoopbackSupabaseUrl,
} from "@/integrations/supabase/availability";
import { supabase } from "@/integrations/supabase/client";
import { resolveBookId, toFriendlyLibraryError } from "@/lib/library";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Deeplink = {
  description?: string | null;
  link?: string | null;
  name?: string | null;
};

type QPaySession = {
  activatedLoanId?: string | null;
  amount: number;
  createdAt: string;
  currency: string;
  deeplinks: Deeplink[];
  invoiceId?: string | null;
  paidAmount?: number | null;
  paidAt?: string | null;
  paymentId?: string | null;
  qrImage?: string | null;
  qrText?: string | null;
  sessionId: string;
  status: "pending" | "paid" | "completed" | "failed" | "cancelled" | "expired";
  updatedAt: string;
};

type QPayBorrowDialogProps = {
  accessMode?: "borrow" | "download";
  amount: number;
  bookAuthor: string;
  bookIdCandidate: string;
  bookTitle: string;
  currency: string;
  disabled?: boolean;
  formattedAmount: string;
  onBorrowed?: () => void;
  triggerLabel?: string;
};

type QPayCreateResponse = {
  ok: boolean;
  reused?: boolean;
  session: QPaySession;
  status?: QPaySession["status"];
};

type QPayCheckResponse = {
  loan?: { id: string } | null;
  ok: boolean;
  paidAmount?: number | null;
  payment?: { payment_id?: string | null } | null;
  session: QPaySession;
  status: QPaySession["status"];
};

type QPayStatusResponse = {
  available: boolean;
  message?: string | null;
  missingVariables?: string[];
  ok: boolean;
};

const qpayMerchantName = process.env.NEXT_PUBLIC_QPAY_MERCHANT_NAME?.trim() || "Aetheria Library";
const qpayStaticQrPath = process.env.NEXT_PUBLIC_QPAY_STATIC_QR_PATH?.trim() || "";
const qpayStaticModeEnabled = Boolean(qpayStaticQrPath);
const staleBorrowSessionPattern =
  /loans_user_id_fkey|violates foreign key constraint ["']loans_user_id_fkey["']|session from session_id claim in jwt does not exist|invalid refresh token|refresh token not found/i;
const LOCAL_QPAY_FUNCTION_MISSING_MESSAGE =
  "Local Supabase backend is running, but `qpay-borrow` edge function is missing. Run `npm run db:restart` (or stop/start Supabase with `--workdir backend`) so QPay is re-registered from `backend/supabase/functions`.";

const getFunctionError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "QPay service unavailable";
};

const readFunctionErrorPayload = async (response?: Response) => {
  if (!response) {
    return null;
  }

  const nextResponse = typeof response.clone === "function" ? response.clone() : response;
  const contentType = nextResponse.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return await nextResponse.json().catch(() => null);
  }

  const text = await nextResponse.text().catch(() => "");
  return text.trim() || null;
};

const resolveFunctionErrorMessage = async (error: unknown, response?: Response) => {
  if (error instanceof FunctionsHttpError) {
    const nextResponse = (error.context as Response | undefined) ?? response;
    const status = nextResponse?.status ?? 0;
    const payload = await readFunctionErrorPayload(nextResponse);

    if (status === 404 && isLoopbackSupabaseUrl) {
      return LOCAL_QPAY_FUNCTION_MISSING_MESSAGE;
    }

    if (payload && typeof payload === "object") {
      if ("error" in payload && typeof payload.error === "string" && payload.error.trim()) {
        return payload.error;
      }

      if ("message" in payload && typeof payload.message === "string" && payload.message.trim()) {
        return payload.message;
      }
    }

    if (typeof payload === "string" && payload) {
      return payload;
    }

    return status ? `QPay service returned ${status}.` : error.message;
  }

  if (error instanceof FunctionsFetchError && isLoopbackSupabaseUrl) {
    return LOCAL_SUPABASE_UNAVAILABLE_MESSAGE;
  }

  return getFunctionError(error);
};

export const QPayBorrowDialog = ({
  accessMode = "borrow",
  amount,
  bookAuthor,
  bookIdCandidate,
  bookTitle,
  currency,
  disabled = false,
  formattedAmount,
  onBorrowed,
  triggerLabel = "QPay-r toloh",
}: QPayBorrowDialogProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<QPaySession | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkInFlightRef = useRef(false);

  const routeToAuth = useCallback(async (message: string) => {
    if (staleBorrowSessionPattern.test(message) || /not authenticated/i.test(message)) {
      await signOut();
      toast.error("Your session expired. Please sign in again before paying.");
      navigate("/auth");
      return true;
    }

    return false;
  }, [navigate, signOut]);

  const invokeQPayFunction = async <T,>(body: Record<string, unknown>) => {
    const { data, error, response } = await supabase.functions.invoke("qpay-borrow", {
      body,
    });

    if (error) {
      throw new Error(await resolveFunctionErrorMessage(error, response));
    }

    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
      throw new Error(data.error);
    }

    return data as T;
  };

  const finalizeSuccess = useCallback((nextSession: QPaySession) => {
    setSession(nextSession);
    toast.success(
      accessMode === "download"
        ? `"${bookTitle}" paid successfully. Download is now available in My loans.`
        : `"${bookTitle}" borrowed for ${formattedAmount}.`,
    );
    onBorrowed?.();
    setOpen(false);
  }, [accessMode, bookTitle, formattedAmount, onBorrowed]);

  const checkPayment = useCallback(async (silent = false) => {
    if (!session || checkInFlightRef.current) {
      return false;
    }

    checkInFlightRef.current = true;
    setChecking(true);

    try {
      const response = await invokeQPayFunction<QPayCheckResponse>({
        action: "check",
        sessionId: session.sessionId,
      });

      setSession(response.session);
      setErrorMessage(null);

      if (response.status === "completed") {
        finalizeSuccess(response.session);
        return true;
      }

      if (!silent) {
        toast.message("QPay tulbur odoogoor batalgaajaagui baina. Dahiad shalgaad uzeerei.");
      }

      return false;
    } catch (error) {
      const message = getFunctionError(error);

      if (await routeToAuth(message)) {
        return false;
      }

      const friendlyMessage = toFriendlyLibraryError(message);
      setErrorMessage(friendlyMessage);

      if (!silent) {
        toast.error(friendlyMessage);
      }

      return false;
    } finally {
      checkInFlightRef.current = false;
      setChecking(false);
    }
  }, [finalizeSuccess, routeToAuth, session]);

  const initializeSession = useCallback(async () => {
    if (qpayStaticModeEnabled || !user || initializing) {
      return;
    }

    setInitializing(true);
    setErrorMessage(null);

    try {
      const status = await invokeQPayFunction<QPayStatusResponse>({
        action: "status",
      });

      if (!status.available) {
        throw new Error(status.message ?? "QPay service is not configured yet.");
      }

      const canonicalBookId = await resolveBookId({
        id: bookIdCandidate,
        title: bookTitle,
        author: bookAuthor,
      });

      const response = await invokeQPayFunction<QPayCreateResponse>({
        action: "create",
        bookId: canonicalBookId,
      });

      setSession(response.session);

      if ((response.status ?? response.session.status) === "completed") {
        finalizeSuccess(response.session);
      }
    } catch (error) {
      const message = getFunctionError(error);

      if (await routeToAuth(message)) {
        setOpen(false);
        return;
      }

      const friendlyMessage = toFriendlyLibraryError(message);
      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setInitializing(false);
    }
  }, [bookAuthor, bookIdCandidate, bookTitle, finalizeSuccess, initializing, routeToAuth, user]);

  useEffect(() => {
    if (qpayStaticModeEnabled || !open || session || initializing) {
      return;
    }

    void initializeSession();
  }, [bookAuthor, bookIdCandidate, bookTitle, initializeSession, initializing, open, session, user]);

  useEffect(() => {
    if (qpayStaticModeEnabled || !open || !session || session.status === "completed") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void checkPayment(true);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [checkPayment, open, session]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !user) {
      navigate("/auth");
      return;
    }

    setOpen(nextOpen);

    if (!nextOpen) {
      setErrorMessage(null);
    }
  };

  const statusLabel = session?.status === "completed"
    ? "Tulbur batalgaajsan"
    : session?.status === "pending"
      ? "Tulbur huleej baina"
      : session?.status
        ? `Tuluv: ${session.status}`
        : qpayStaticModeEnabled
          ? "Static QR belen"
          : "Tulbur uusgej baina";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-9 min-w-[180px] flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-glow-primary transition-all hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] disabled:opacity-50 disabled:shadow-none"
        >
          <QrCode className="size-3.5" />
          {triggerLabel}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-1.5rem)] max-w-md overflow-y-auto border-border/60 bg-surface-elevated p-0 text-foreground sm:max-h-[calc(100vh-3rem)]">
        <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          <DialogHeader className="space-y-3 pr-8 text-left">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <QrCode className="size-3.5" />
              QPay
            </div>
            <DialogTitle className="font-display text-2xl leading-tight">QPay-r toloh</DialogTitle>
            <DialogDescription className="leading-6 text-muted-foreground">
              {qpayStaticModeEnabled
                ? "Doorh static QR-iig QPay esvel banknii app-aar unshuulaad tulburuu tulnu. Ene gorimd tulbur site deer automataar shalgagdahgui."
                : accessMode === "download"
                  ? "QR unshuulaad esvel banknii app-aa neegeed tulburuu tulnu. Tulbur batalgaajmagts file My loans hesegt unlock bolj tatagdana."
                  : "QR unshuulaad esvel banknii app-aa neegeed tulburuu tulnu. Tulbur batalgaajmagts nom shuud zeelegdne."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-3xl border border-primary/20 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.2),_transparent_60%),linear-gradient(180deg,hsl(var(--surface-elevated)),hsl(var(--background)))] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tuluh dun</p>
              <p className="mt-2 font-display text-3xl font-semibold leading-none text-foreground">{formattedAmount}</p>
              <div className="mt-4 grid gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Book</span>
                  <span className="text-right font-medium text-foreground">{bookTitle}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Merchant</span>
                  <span className="text-right font-medium text-foreground">{qpayMerchantName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="text-right font-medium text-foreground">{currency}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-right font-medium text-foreground">{statusLabel}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              {qpayStaticModeEnabled ? (
                <div className="space-y-3">
                  <img
                    src={qpayStaticQrPath}
                    alt={`${bookTitle} static QPay QR`}
                    className="mx-auto w-full max-w-64 rounded-2xl border border-border/60 bg-white p-3"
                  />
                  <p className="text-center text-xs text-muted-foreground">
                    Static QR ashiglaj baina. Tulsnii daraa site deer automataar shalgahgui tul manual
                    batalgaajulalt esvel off-line shalgalt hiine.
                  </p>
                </div>
              ) : initializing ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p>QPay invoice uusgej baina...</p>
                </div>
              ) : session?.qrImage ? (
                <div className="space-y-3">
                  <img
                    src={session.qrImage}
                    alt={`${bookTitle} QPay QR`}
                    className="mx-auto w-full max-w-64 rounded-2xl border border-border/60 bg-white p-3"
                  />
                  <p className="text-center text-xs text-muted-foreground">
                    Desktop deer bol utasnaasaa QR unshuulna, mobile deer bol doorh deeplink-uudiig
                    ashiglaj banknii app ruu orno.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <QrCode className="size-8 text-primary" />
                  <p>QR belen bolohig huleej baina...</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-secondary/20 bg-secondary-deep/10 p-4">
              <p className="text-sm font-semibold text-foreground">QPay ashiglah zaavar</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <p>1. QR code-iig QPay esvel banknii app-aar unshuulna.</p>
                <p>2. {formattedAmount} dung utasnaasaa tulnu.</p>
                <p>
                  {qpayStaticModeEnabled
                    ? "3. Ene static QR gorimd site deer tulbur automataar shalgahgui. Tulsnii daraa manualaar batalgaajulna."
                    : accessMode === "download"
                      ? '3. Tulbur batalgaajmagts My loans hesegt download button unlock bolno. Shaardlagatai bol garaar "Tulbur shalgah" darna.'
                      : '3. Site deer tulbur automataar shalgagdah bolovch shaardlagatai bol garaar "Tulbur shalgah" darna.'}
                </p>
              </div>
            </div>

            {!qpayStaticModeEnabled && session?.deeplinks?.length ? (
              <div className="grid gap-2">
                {session.deeplinks.slice(0, 6).map((deeplink, index) => (
                  <a
                    key={`${deeplink.link ?? "deeplink"}-${index}`}
                    href={deeplink.link ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-between gap-3 rounded-md border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <span className="truncate text-left">
                      {deeplink.name?.trim() || deeplink.description?.trim() || "Banknii app neeh"}
                    </span>
                    <ExternalLink className="size-4 shrink-0" />
                  </a>
                ))}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border/40 bg-surface-elevated/95 pt-4 backdrop-blur sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={initializing || checking}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border/70 px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              {!qpayStaticModeEnabled ? (
                <button
                  type="button"
                  onClick={() => void checkPayment(false)}
                  disabled={initializing || checking || !session || amount <= 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {checking ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
                  {checking ? "Shalgaj baina..." : "Tulbur shalgah"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
