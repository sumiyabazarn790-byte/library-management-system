import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreateRequestBody = {
  action: "create";
  bookId: string;
};

type CheckRequestBody = {
  action: "check";
  sessionId: string;
};

type StatusRequestBody = {
  action: "status";
};

type RequestBody = CreateRequestBody | CheckRequestBody | StatusRequestBody;

type QPaySettings = {
  baseUrl: string;
  username: string;
  password: string;
  invoiceCode: string;
  invoiceReceiverCode: string;
  branchCode?: string;
  terminalCode?: string;
  defaultNote?: string;
  callbackUrl: string;
};

type Deeplink = {
  name?: string | null;
  description?: string | null;
  link?: string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  book_id: string;
  invoice_id: string | null;
  sender_invoice_no: string;
  amount: number | string;
  currency: string;
  status: string;
  qr_text: string | null;
  qr_image: string | null;
  deeplinks: Deeplink[] | null;
  payment_id: string | null;
  paid_amount: number | string | null;
  paid_at: string | null;
  activated_loan_id: string | null;
  created_at: string;
  updated_at: string;
};

type BookRow = {
  id: string;
  title: string;
  author: string;
  available_copies: number;
  borrow_price: number | string | null;
  borrow_currency: string | null;
};

type LoanRow = {
  id: string;
  user_id: string;
  book_id: string;
  status: string;
  loaned_at: string;
  due_date: string;
  returned_at: string | null;
};

type QPayInvoiceResponse = {
  invoice_id?: string;
  qr_text?: string;
  qr_image?: string;
  urls?: Deeplink[];
};

type QPayPaymentCheckResponse = {
  count?: number;
  paid_amount?: number | string;
  rows?: Array<{
    payment_id?: string;
    payment_status?: string;
    payment_date?: string;
    payment_amount?: number | string;
    payment_currency?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

const getEnv = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  return value ? value : null;
};

const placeholderValueByEnvName: Partial<Record<
  "QPAY_BASE_URL" | "QPAY_USERNAME" | "QPAY_PASSWORD" | "QPAY_INVOICE_CODE" | "QPAY_INVOICE_RECEIVER_CODE",
  string[]
>> = {
  QPAY_BASE_URL: ["https://merchant-sandbox.qpay.mn/v2"],
  QPAY_USERNAME: ["your-qpay-client-id"],
  QPAY_PASSWORD: ["your-qpay-client-secret"],
  QPAY_INVOICE_CODE: ["your-qpay-invoice-code"],
  QPAY_INVOICE_RECEIVER_CODE: ["your-qpay-invoice-receiver-code"],
};

const looksLikePlaceholderQPayValue = (
  name: keyof typeof placeholderValueByEnvName,
  value: string | null,
) => {
  if (!value) {
    return false;
  }

  const knownPlaceholders = placeholderValueByEnvName[name] ?? [];
  return knownPlaceholders.includes(value);
};

const parseMoney = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDeeplinks = (value: unknown): Deeplink[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      return {
        name: typeof record.name === "string" ? record.name : null,
        description: typeof record.description === "string" ? record.description : null,
        link: typeof record.link === "string" ? record.link : null,
      };
    })
    .filter((entry): entry is Deeplink => Boolean(entry?.link));
};

const buildCallbackUrl = (supabaseUrl: string) => {
  const explicit = getEnv("QPAY_CALLBACK_URL");
  if (explicit) {
    return explicit;
  }

  return `${supabaseUrl}/functions/v1/qpay-borrow/callback`;
};

const getQPayConfigStatus = () => {
  const entries = [
    ["QPAY_BASE_URL", getEnv("QPAY_BASE_URL")],
    ["QPAY_USERNAME", getEnv("QPAY_USERNAME")],
    ["QPAY_PASSWORD", getEnv("QPAY_PASSWORD")],
    ["QPAY_INVOICE_CODE", getEnv("QPAY_INVOICE_CODE")],
    ["QPAY_INVOICE_RECEIVER_CODE", getEnv("QPAY_INVOICE_RECEIVER_CODE")],
  ] as const;

  const missingVariables = entries
    .filter(([, value]) => !value)
    .map(([name]) => name);

  const placeholderVariables = entries
    .filter(([name, value]) =>
      looksLikePlaceholderQPayValue(name, value),
    )
    .map(([name]) => name);

  return {
    available: missingVariables.length === 0 && placeholderVariables.length === 0,
    missingVariables,
    placeholderVariables,
  };
};

const getQPaySettings = (supabaseUrl: string): QPaySettings => {
  const baseUrl = getEnv("QPAY_BASE_URL");
  const username = getEnv("QPAY_USERNAME");
  const password = getEnv("QPAY_PASSWORD");
  const invoiceCode = getEnv("QPAY_INVOICE_CODE");
  const invoiceReceiverCode = getEnv("QPAY_INVOICE_RECEIVER_CODE");
  const { missingVariables, placeholderVariables } = getQPayConfigStatus();
  const invalidVariables = [...missingVariables, ...placeholderVariables];

  if (
    !baseUrl ||
    !username ||
    !password ||
    !invoiceCode ||
    !invoiceReceiverCode ||
    invalidVariables.length > 0
  ) {
    throw new Error(
      `Missing QPay configuration: ${invalidVariables.join(", ")}. Configure these as edge function secrets. For local development, add real merchant values to backend/.env and restart Supabase.`,
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    username,
    password,
    invoiceCode,
    invoiceReceiverCode,
    branchCode: getEnv("QPAY_BRANCH_CODE") ?? undefined,
    terminalCode: getEnv("QPAY_TERMINAL_CODE") ?? undefined,
    defaultNote: getEnv("QPAY_NOTE") ?? undefined,
    callbackUrl: buildCallbackUrl(supabaseUrl),
  };
};

const isHandledQPayError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return [
    /Missing QPay configuration/i,
    /QPay token request failed/i,
    /QPay request failed/i,
    /fetch failed/i,
    /network/i,
    /Not authenticated/i,
    /Book not found/i,
    /Payment is not required for this book/i,
    /No copies available/i,
    /already borrowed/i,
    /already requested/i,
    /QPay session not found/i,
  ].some((pattern) => pattern.test(message));
};

const getSupabaseClients = (req: Request) => {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SECRET_KEY") ?? getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be configured.");
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  return { supabaseUrl, userClient, serviceClient };
};

const getAuthenticatedUser = async (req: Request) => {
  const { supabaseUrl, userClient, serviceClient } = getSupabaseClients(req);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    return { supabaseUrl, userClient, serviceClient, user: null };
  }

  return { supabaseUrl, userClient, serviceClient, user };
};

const getQPayAccessToken = async (settings: QPaySettings) => {
  const response = await fetch(`${settings.baseUrl}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${settings.username}:${settings.password}`)}`,
      "Content-Type": "application/json",
    },
    body: "",
  });

  const payload = await response.json().catch(async () => ({ message: await response.text() }));
  const accessToken = typeof payload?.access_token === "string" ? payload.access_token : null;

  if (!response.ok || !accessToken) {
    const message = typeof payload?.message === "string"
      ? payload.message
      : "QPay token request failed.";
    throw new Error(`QPay token request failed: ${message}`);
  }

  return accessToken;
};

const qpayRequest = async <T>(
  settings: QPaySettings,
  path: string,
  init: RequestInit,
) => {
  const token = await getQPayAccessToken(settings);
  const response = await fetch(`${settings.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(async () => ({ message: await response.text() }));

  if (!response.ok) {
    const message = typeof payload?.message === "string"
      ? payload.message
      : typeof payload?.error === "string"
      ? payload.error
      : `QPay request failed with status ${response.status}`;
    throw new Error(`QPay request failed: ${message}`);
  }

  return payload as T;
};

const serializeSession = (session: SessionRow) => ({
  sessionId: session.id,
  invoiceId: session.invoice_id,
  amount: parseMoney(session.amount),
  currency: session.currency,
  status: session.activated_loan_id ? "completed" : session.status,
  qrText: session.qr_text,
  qrImage: session.qr_image,
  deeplinks: normalizeDeeplinks(session.deeplinks),
  paymentId: session.payment_id,
  paidAmount: parseMoney(session.paid_amount),
  paidAt: session.paid_at,
  activatedLoanId: session.activated_loan_id,
  createdAt: session.created_at,
  updatedAt: session.updated_at,
});

const createSessionStub = async (
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  book: BookRow,
) => {
  const senderInvoiceNo = `LB-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const amount = parseMoney(book.borrow_price);
  const currency = (book.borrow_currency ?? "MNT").trim().toUpperCase() || "MNT";

  const { data, error } = await serviceClient
    .from("qpay_borrow_sessions")
    .insert({
      user_id: userId,
      book_id: book.id,
      sender_invoice_no: senderInvoiceNo,
      amount,
      currency,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create QPay session");
  }

  return data as SessionRow;
};

const ensureBookIsPayable = async (
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  bookId: string,
) => {
  const { data: book, error: bookError } = await serviceClient
    .from("books")
    .select("id, title, author, available_copies, borrow_price, borrow_currency")
    .eq("id", bookId)
    .maybeSingle();

  if (bookError) {
    throw new Error(bookError.message);
  }

  if (!book) {
    throw new Error("Book not found");
  }

  const borrowPrice = parseMoney(book.borrow_price);

  if (borrowPrice <= 0) {
    throw new Error("Payment is not required for this book");
  }

  if (book.available_copies <= 0) {
    throw new Error("No copies available");
  }

  const { data: loans, error: loanError } = await serviceClient
    .from("loans")
    .select("id, status")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .in("status", ["active", "requested"]);

  if (loanError) {
    throw new Error(loanError.message);
  }

  if ((loans ?? []).some((loan) => loan.status === "active")) {
    throw new Error("Book already borrowed by this user");
  }

  if ((loans ?? []).some((loan) => loan.status === "requested")) {
    throw new Error("Book already requested by this user");
  }

  return book as BookRow;
};

const findReusableSession = async (
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  bookId: string,
) => {
  const { data, error } = await serviceClient
    .from("qpay_borrow_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .is("activated_loan_id", null)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as SessionRow | null;
};

const finalizeBorrowSession = async (
  serviceClient: ReturnType<typeof createClient>,
  sessionId: string,
  paymentId: string | null,
  paidAmount: number | null,
  paymentPayload: Record<string, unknown>,
) => {
  const { data, error } = await serviceClient.rpc("finalize_qpay_borrow_session", {
    p_session_id: sessionId,
    p_payment_id: paymentId,
    p_paid_amount: paidAmount,
    p_payment_payload: paymentPayload,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Could not finalize paid borrow");
  }

  return data as LoanRow;
};

const performPaymentCheck = async (
  settings: QPaySettings,
  serviceClient: ReturnType<typeof createClient>,
  session: SessionRow,
) => {
  if (!session.invoice_id) {
    throw new Error("QPay invoice is missing from this session");
  }

  if (session.activated_loan_id) {
    const { data: loan, error } = await serviceClient
      .from("loans")
      .select("*")
      .eq("id", session.activated_loan_id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return {
      status: "completed" as const,
      loan: loan as LoanRow | null,
      session,
      payment: null,
      paidAmount: parseMoney(session.paid_amount),
    };
  }

  const paymentCheck = await qpayRequest<QPayPaymentCheckResponse>(settings, "/payment/check", {
    method: "POST",
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: session.invoice_id,
      offset: {
        page_number: 1,
        page_limit: 100,
      },
    }),
  });

  const paidPayment = (paymentCheck.rows ?? []).find((row) => row.payment_status === "PAID") ?? null;
  const paidAmount = parseMoney(paymentCheck.paid_amount ?? paidPayment?.payment_amount ?? session.paid_amount);

  if (!paidPayment) {
    const { data: pendingSession, error } = await serviceClient
      .from("qpay_borrow_sessions")
      .update({
        payment_payload: paymentCheck,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .select("*")
      .single();

    if (error || !pendingSession) {
      throw new Error(error?.message ?? "Could not update pending QPay session");
    }

    return {
      status: "pending" as const,
      loan: null,
      session: pendingSession as SessionRow,
      payment: null,
      paidAmount,
    };
  }

  const { data: paidSession, error: sessionError } = await serviceClient
    .from("qpay_borrow_sessions")
    .update({
      status: "paid",
      payment_id: paidPayment.payment_id ?? null,
      paid_amount: paidAmount,
      paid_at: paidPayment.payment_date ?? new Date().toISOString(),
      payment_payload: paymentCheck,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .select("*")
    .single();

  if (sessionError || !paidSession) {
    throw new Error(sessionError?.message ?? "Could not persist paid QPay session");
  }

  const loan = await finalizeBorrowSession(
    serviceClient,
    session.id,
    paidPayment.payment_id ?? null,
    paidAmount,
    paymentCheck,
  );

  const { data: finalizedSession, error: finalizedSessionError } = await serviceClient
    .from("qpay_borrow_sessions")
    .select("*")
    .eq("id", session.id)
    .single();

  if (finalizedSessionError || !finalizedSession) {
    throw new Error(finalizedSessionError?.message ?? "Could not reload paid QPay session");
  }

  return {
    status: "completed" as const,
    loan,
    session: finalizedSession as SessionRow,
    payment: paidPayment,
    paidAmount,
  };
};

const handleCreate = async (req: Request) => {
  const { supabaseUrl, serviceClient, user } = await getAuthenticatedUser(req);

  if (!user) {
    return jsonResponse({ error: "Not authenticated" }, { status: 401 });
  }

  const settings = getQPaySettings(supabaseUrl);
  const body = await req.json() as CreateRequestBody;
  const book = await ensureBookIsPayable(serviceClient, user.id, body.bookId);
  const reusableSession = await findReusableSession(serviceClient, user.id, body.bookId);

  if (reusableSession?.status === "pending" && reusableSession.invoice_id) {
    return jsonResponse({
      ok: true,
      reused: true,
      session: serializeSession(reusableSession),
    });
  }

  if (reusableSession?.status === "paid") {
    const paymentResult = await performPaymentCheck(settings, serviceClient, reusableSession);
    return jsonResponse({
      ok: true,
      reused: true,
      session: serializeSession(paymentResult.session),
      loan: paymentResult.loan,
      status: paymentResult.status,
    });
  }

  const stub = await createSessionStub(serviceClient, user.id, book);
  const callbackUrl = `${settings.callbackUrl}?session_id=${encodeURIComponent(stub.id)}`;

  try {
    const invoice = await qpayRequest<QPayInvoiceResponse>(settings, "/invoice", {
      method: "POST",
      body: JSON.stringify({
        invoice_code: settings.invoiceCode,
        sender_invoice_no: stub.sender_invoice_no,
        sender_branch_code: settings.branchCode,
        sender_terminal_code: settings.terminalCode,
        invoice_receiver_code: settings.invoiceReceiverCode,
        invoice_description: `${book.title} borrow access`,
        amount: parseMoney(book.borrow_price),
        callback_url: callbackUrl,
        note: settings.defaultNote ?? `${book.title} borrow payment`,
        allow_partial: false,
        allow_exceed: false,
        lines: [
          {
            line_description: `${book.title} borrow access`,
            line_quantity: "1.00",
            line_unit_price: parseMoney(book.borrow_price).toFixed(2),
            note: `${book.author}`,
          },
        ],
      }),
    });

    const { data, error } = await serviceClient
      .from("qpay_borrow_sessions")
      .update({
        invoice_id: invoice.invoice_id ?? null,
        qr_text: invoice.qr_text ?? null,
        qr_image: invoice.qr_image ?? null,
        deeplinks: normalizeDeeplinks(invoice.urls),
        invoice_payload: invoice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stub.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Could not save QPay invoice session");
    }

    return jsonResponse({
      ok: true,
      reused: false,
      session: serializeSession(data as SessionRow),
    });
  } catch (error) {
    await serviceClient
      .from("qpay_borrow_sessions")
      .update({
        status: "failed",
        invoice_payload: {
          error: error instanceof Error ? error.message : "Unknown QPay invoice error",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", stub.id);

    throw error;
  }
};

const handleCheck = async (req: Request) => {
  const { supabaseUrl, serviceClient, user } = await getAuthenticatedUser(req);

  if (!user) {
    return jsonResponse({ error: "Not authenticated" }, { status: 401 });
  }

  const settings = getQPaySettings(supabaseUrl);
  const body = await req.json() as CheckRequestBody;
  const { data: session, error } = await serviceClient
    .from("qpay_borrow_sessions")
    .select("*")
    .eq("id", body.sessionId)
    .eq("user_id", user.id)
    .single();

  if (error || !session) {
    return jsonResponse({ error: error?.message ?? "QPay session not found" }, { status: 404 });
  }

  const paymentResult = await performPaymentCheck(settings, serviceClient, session as SessionRow);

  return jsonResponse({
    ok: true,
    status: paymentResult.status,
    paidAmount: paymentResult.paidAmount,
    payment: paymentResult.payment,
    session: serializeSession(paymentResult.session),
    loan: paymentResult.loan,
  });
};

const readCallbackInput = async (req: Request) => {
  const url = new URL(req.url);
  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};

  if (req.method !== "GET") {
    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        body = Object.fromEntries(formData.entries());
      }
    }
  }

  return {
    sessionId: url.searchParams.get("session_id") ?? (typeof body.session_id === "string" ? body.session_id : null),
  };
};

const handleCallback = async (req: Request) => {
  const { sessionId } = await readCallbackInput(req);
  const { supabaseUrl, serviceClient } = getSupabaseClients(req);

  if (!sessionId) {
    return jsonResponse({ ok: true, ignored: true });
  }

  try {
    const settings = getQPaySettings(supabaseUrl);
    const { data: session, error } = await serviceClient
      .from("qpay_borrow_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      return jsonResponse({ ok: true, ignored: true });
    }

    const paymentResult = await performPaymentCheck(settings, serviceClient, session as SessionRow);

    return jsonResponse({
      ok: true,
      status: paymentResult.status,
      session: serializeSession(paymentResult.session),
    });
  } catch (error) {
    console.error("qpay callback error", error);
    return jsonResponse({ ok: false }, { status: 200 });
  }
};

const handleStatus = () => {
  const config = getQPayConfigStatus();
  const invalidVariables = [...config.missingVariables, ...config.placeholderVariables];

  if (config.available) {
    return jsonResponse({
      ok: true,
      available: true,
      missingVariables: [],
      placeholderVariables: [],
    });
  }

  return jsonResponse({
    ok: true,
    available: false,
    missingVariables: invalidVariables,
    placeholderVariables: config.placeholderVariables,
    message:
      `Missing QPay configuration: ${invalidVariables.join(", ")}. ` +
      "Configure these in backend/.env with real merchant values and run `npm run db:restart`.",
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (url.pathname.endsWith("/callback")) {
      return await handleCallback(req);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.clone().json().catch(() => null) as RequestBody | null;

    if (!body?.action) {
      return jsonResponse({ error: "Missing action" }, { status: 400 });
    }

    if (body.action === "status") {
      return handleStatus();
    }

    if (body.action === "create") {
      return await handleCreate(req);
    }

    if (body.action === "check") {
      return await handleCheck(req);
    }

    return jsonResponse({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("qpay-borrow error", error);

    if (isHandledQPayError(error)) {
      return jsonResponse({
        ok: false,
        error: error instanceof Error ? error.message : "QPay service unavailable",
      });
    }

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
