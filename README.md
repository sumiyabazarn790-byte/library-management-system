# Lumina AI

Repo is now organized into two main folders:

- `frontend/`: Next.js App Router application that wraps the existing SPA UI.
- `backend/`: Supabase project files, migrations, and edge functions.

Useful commands from the repo root:

```bash
npm run install:frontend
npm run dev
npm run build
npm run db:start
npm run db:restart
npm run db:push      # Apply local backend migrations
npm run db:link
npm run db:push:linked
npm run seed:books    # Seed demo book data
```

## Demo Data

The repository includes comprehensive demo book data to help with testing and demonstration:

**Database Migration (Automatic)**
- Run `npm run db:push` to apply the demo data migration (`20260429_add_demo_book_data.sql`)
- This automatically seeds ~40 books across various genres and languages

**Programmatic Seeding (Manual)**
- Run `npm run seed:books` to programmatically insert demo books using the Node.js script
- Useful for resetting or refreshing demo data during development

The demo data includes:
- 20+ English books across Fiction, Science Fiction, Fantasy, Mystery, Thriller, Non-Fiction, Science, Nature, Poetry, and Graphic Novel genres
- 3+ Mongolian books for localization testing
- Mix of available and borrowed copies for realistic library states
- Some books marked as public-readable for the public catalog feature

Notes:

- Frontend env values live in `frontend/.env.local`.
- Frontend-only QPay branding can be added to `frontend/.env.local`:
  `NEXT_PUBLIC_QPAY_MERCHANT_NAME=Aetheria Library`
- For a static local QR image instead of real invoice generation, set
  `NEXT_PUBLIC_QPAY_STATIC_QR_PATH=/qpay-static-qr.svg`
  and replace that file in `frontend/public/` with your real QR image when ready.
- Real QPay checkout now runs through the Supabase edge function `qpay-borrow`.
- Required backend secrets for real QPay payments:
  `QPAY_BASE_URL`
  `QPAY_USERNAME`
  `QPAY_PASSWORD`
  `QPAY_INVOICE_CODE`
  `QPAY_INVOICE_RECEIVER_CODE`
- Optional backend QPay secrets:
  `QPAY_CALLBACK_URL`
  `QPAY_BRANCH_CODE`
  `QPAY_TERMINAL_CODE`
  `QPAY_NOTE`
- After setting backend secrets, apply the new migration and redeploy functions:
  `npm run db:push`
  `supabase functions deploy qpay-borrow --workdir backend`
- For local development, put the same `QPAY_*` values in `backend/.env`, then run
  `npm run db:restart` so the edge runtime reloads them.
- Backend Supabase commands are executed with `--workdir backend`.
- If `qpay-borrow` returns `404 Not Found` locally, restart the local stack with
  `npm run db:restart` so Edge Functions are re-registered from `backend/supabase/functions`.
- If you see a warning about the `saved_books` table missing, run `npm run db:push`
  to apply the latest local migrations.
- The old root-level Vite files remain as legacy references, but the active app is `frontend/`.
