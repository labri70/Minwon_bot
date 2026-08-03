from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FAQ_CSV = PROJECT_ROOT / "data" / "faqs.csv"
MODEL_PATH = PROJECT_ROOT / "ml" / "category_classifier.joblib"
REPORT_PATH = PROJECT_ROOT / "ml" / "classifier_report.txt"

EXAMPLE_QUESTIONS = [
    "보험금 청구 서류는 어디서 확인하나요?",
    "카드 분실 신고를 해제하고 싶어요.",
    "요금제 변경은 어떻게 하나요?",
]


def load_rows() -> list[dict[str, str]]:
    with FAQ_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def main() -> None:
    rows = load_rows()
    counts = Counter(row["category"] for row in rows)
    trainable = [row for row in rows if counts[row["category"]] >= 2]

    x = [row["question"] for row in trainable]
    y = [row["category"] for row in trainable]

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(2, 5),
                    min_df=2,
                    max_features=120_000,
                ),
            ),
            ("clf", LinearSVC(C=1.0)),
        ]
    )
    model.fit(x_train, y_train)

    pred = model.predict(x_test)
    accuracy = accuracy_score(y_test, pred)
    examples = list(zip(EXAMPLE_QUESTIONS, model.predict(EXAMPLE_QUESTIONS)))

    joblib.dump(model, MODEL_PATH)

    lines = [
        f"정확도: {accuracy:.3f} ({len(y_test)}개 테스트 샘플 기준)",
        f"학습 데이터: {len(y_train)}건, 테스트 데이터: {len(y_test)}건, 카테고리: {len(set(y))}개",
        "예측 예시 3개:",
    ]
    for question, category in examples:
        lines.append(f"- {question} -> {category}")

    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"model_saved={MODEL_PATH}")
    print(f"report_saved={REPORT_PATH}")


if __name__ == "__main__":
    main()
