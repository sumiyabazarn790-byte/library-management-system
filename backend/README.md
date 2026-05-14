# Backend

This folder contains the Supabase backend project.

Main paths:

- `backend/supabase/migrations`
- `backend/supabase/functions`
- `backend/supabase/config.toml`

Run CLI commands from the repo root with:

```bash
supabase <command> --workdir backend
```

For local QPay testing:

```powershell
Copy-Item backend/.env.example backend/.env
# backend/.env dotor QPAY_* utguudaa oruulna
npm run db:restart
```

If Windows Docker health checks keep failing for analytics/storage but you only need auth/database/API locally, run:

```powershell
npm run db:restart:minimal
```

Simple OpenAI Python test script:

```powershell
python -m pip install openai
Copy-Item backend/.env.example backend/.env
# backend/.env dotor OPENAI_API_KEY=sk-... gej bichne
python backend/scripts/openai_hello.py "Hello"
```

For the Aetheria chat/search edge functions, you can load the same secrets with:

```powershell
supabase secrets set --env-file backend/.env --workdir backend
```

Useful optional values in `backend/.env`:

```powershell
OPENAI_CHAT_MODEL=gpt-4.1-mini
OPENAI_QUERY_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=
```

For the fastest low-cost setup in this repo, Gemini API keys can be used through Google's OpenAI-compatible endpoint:

```powershell
OPENAI_API_KEY=<your-gemini-api-key>
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
OPENAI_CHAT_MODEL=gemini-2.5-flash-lite
OPENAI_QUERY_MODEL=gemini-2.5-flash-lite
OPENAI_READER_TRANSLATE_MODEL=gemini-2.5-flash-lite
```

Once `backend/.env` is updated, reload the edge function secrets:

```powershell
supabase secrets set --env-file backend/.env --workdir backend
```
