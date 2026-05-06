from __future__ import annotations

import os
import sys
from pathlib import Path

from openai import OpenAI


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if not key or key in os.environ:
            continue

        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]

        os.environ[key] = value


def load_local_env() -> None:
    repo_root = Path(__file__).resolve().parents[2]

    for candidate in (repo_root / "backend" / ".env", repo_root / ".env"):
        load_env_file(candidate)


def main() -> None:
    load_local_env()
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()

    if not api_key:
        raise SystemExit("OPENAI_API_KEY environment variable is not set. Add it to backend/.env or your shell.")

    prompt = " ".join(sys.argv[1:]).strip() or "Hello"
    client = OpenAI(api_key=api_key)

    response = client.responses.create(
        model="gpt-4.1-mini",
        input=prompt,
    )

    print(response.output_text)


if __name__ == "__main__":
    main()
