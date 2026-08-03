from __future__ import annotations

import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env"
FAQ_CSV = PROJECT_ROOT / "data" / "faqs.csv"
BATCH_SIZE = 500


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def iter_batches() -> tuple[int, list[dict[str, str]]]:
    with FAQ_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        batch: list[dict[str, str]] = []
        total = 0
        for row in reader:
            batch.append(
                {
                    "category": row["category"],
                    "question": row["question"],
                    "answer": row["answer"],
                    "source": row["source"],
                }
            )
            total += 1
            if len(batch) >= BATCH_SIZE:
                yield total, batch
                batch = []
        if batch:
            yield total, batch


def post_batch(url: str, key: str, rows: list[dict[str, str]]) -> None:
    endpoint = f"{url.rstrip('/')}/rest/v1/faqs"
    body = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        if response.status not in (200, 201, 204):
            raise RuntimeError(f"Unexpected HTTP status: {response.status}")


def main() -> None:
    env = load_env()
    url = env.get("SUPABASE_URL")
    key = env.get("SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.")

    last_total = 0
    started = time.time()
    for last_total, batch in iter_batches():
        post_batch(url, key, batch)
        print(f"uploaded={last_total}")

    elapsed = time.time() - started
    print(f"done rows={last_total} elapsed_sec={elapsed:.1f}")


if __name__ == "__main__":
    try:
        main()
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        print(f"upload_failed={exc.__class__.__name__}: {exc}", file=sys.stderr)
        raise
