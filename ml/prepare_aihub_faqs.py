from __future__ import annotations

import csv
import json
import re
import zipfile
from pathlib import Path


DATA_ROOT = (
    Path.home()
    / "Desktop"
    / "23.민간 민원 상담 LLM 사전학습 및 Instruction Tuning 데이터"
)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_CSV = PROJECT_ROOT / "data" / "faqs.csv"

TRANSCRIPT_SPECIFIC_TERMS = (
    "고객",
    "손님",
    "상담사",
    "상담원",
    "문의자",
    "대화",
    "녹취",
    "통화",
    "명의자",
    "누가",
    "언제",
    "어디",
    "무엇을 요구",
    "무엇을 원",
    "어떤 날짜",
    "몇 명",
    "몇 번",
    "어떻게 답변",
)


def normalize_text(value: object) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def is_excluded_question(question: str) -> bool:
    if "했어?" in question:
        return True
    return any(term in question for term in TRANSCRIPT_SPECIFIC_TERMS)


def load_json_from_zip(zip_file: zipfile.ZipFile, name: str) -> list[dict]:
    data = json.loads(zip_file.read(name).decode("utf-8-sig"))
    if isinstance(data, dict):
        return [data]
    return data


def build_rows() -> tuple[list[dict[str, str]], dict[str, int]]:
    rows: list[dict[str, str]] = []
    stats = {
        "zip_files": 0,
        "raw_qa": 0,
        "kept": 0,
        "excluded": 0,
        "duplicate": 0,
    }
    seen: set[tuple[str, str, str]] = set()

    for zip_path in sorted(DATA_ROOT.rglob("*질의응답.zip")):
        stats["zip_files"] += 1
        with zipfile.ZipFile(zip_path) as zf:
            for member in zf.namelist():
                for item in load_json_from_zip(zf, member):
                    category = normalize_text(item.get("consulting_category"))
                    source = normalize_text(item.get("source"))
                    source_id = normalize_text(item.get("source_id"))
                    if not category:
                        continue

                    for block in item.get("instructions", []):
                        for qa in block.get("data", []):
                            question = normalize_text(qa.get("instruction"))
                            answer = normalize_text(qa.get("output"))
                            if not question or not answer:
                                continue

                            stats["raw_qa"] += 1
                            if is_excluded_question(question):
                                stats["excluded"] += 1
                                continue

                            key = (category, question, answer)
                            if key in seen:
                                stats["duplicate"] += 1
                                continue
                            seen.add(key)

                            rows.append(
                                {
                                    "category": category,
                                    "question": question,
                                    "answer": answer,
                                    "source": f"{source}:{source_id}",
                                }
                            )
                            stats["kept"] += 1

    return rows, stats


def main() -> None:
    if not DATA_ROOT.exists():
        raise FileNotFoundError(f"AI Hub data folder not found: {DATA_ROOT}")

    rows, stats = build_rows()
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f, fieldnames=["category", "question", "answer", "source"]
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"saved={OUTPUT_CSV}")
    print(
        "zip_files={zip_files}, raw_qa={raw_qa}, kept={kept}, "
        "excluded={excluded}, duplicate={duplicate}".format(**stats)
    )


if __name__ == "__main__":
    main()
