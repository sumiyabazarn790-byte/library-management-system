# Frontend

This is the active Next.js frontend.

Key details:

- App Router pages live under `app/` for `/`, `/auth`, `/auth/callback`, and `/reader/[bookId]`.
- The existing React SPA is mounted through `app/client-only-app.tsx`.
- Source UI/components remain under `src/`.
- Static QPay demo mode can be enabled with `NEXT_PUBLIC_QPAY_STATIC_QR_PATH`.
