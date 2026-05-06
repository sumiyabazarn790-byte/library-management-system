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
