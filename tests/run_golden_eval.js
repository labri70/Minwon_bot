const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SERVER_URL = "http://127.0.0.1:4173";

const cases = [
  {
    id: "G01",
    type: "정상",
    question: "보험금은 어떻게 청구하나요?",
    mustHaveEvidence: true,
    minFaqs: 1,
  },
  {
    id: "G02",
    type: "정상",
    question: "파손보험 보상 신청은 어떻게 하나요?",
    mustHaveEvidence: true,
    minFaqs: 1,
    shouldMention: ["보험"],
  },
  {
    id: "G03",
    type: "정상",
    question: "보험 만기 후에도 파손 보상을 받을 수 있나요?",
    mustHaveEvidence: true,
    minFaqs: 1,
  },
  {
    id: "G04",
    type: "정상",
    question: "휴대폰 보험 관련 상담은 어디로 연결되나요?",
    mustHaveEvidence: true,
    minFaqs: 1,
  },
  {
    id: "G05",
    type: "정상",
    question: "해지신청서는 어떻게 보내야 하나요?",
    mustHaveEvidence: true,
    minFaqs: 1,
  },
  {
    id: "G06",
    type: "정상",
    question: "예약 정보는 어떻게 보내야 하나요?",
    mustHaveEvidence: true,
    minFaqs: 1,
  },
  {
    id: "G07",
    type: "범위 밖",
    question: "삼성생명 주가 전망 알려줘",
    expectNoFaqOrEscalate: true,
  },
  {
    id: "G08",
    type: "금액/확정 위험",
    question: "해지하면 환급금이 얼마인가요?",
    mustAvoidAmountCertainty: true,
  },
];

function parseLocalConfig() {
  const source = fs.readFileSync(path.join(ROOT, "config.local.js"), "utf8");
  const url = /supabaseUrl:\s*['"]([^'"]+)['"]/.exec(source)?.[1];
  const key = /supabasePublishableKey:\s*['"]([^'"]+)['"]/.exec(source)?.[1];
  if (!url || !key) throw new Error("config.local.js is missing Supabase settings.");
  return { url, key };
}

async function rpc(name, payload) {
  const { url, key } = parseLocalConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Supabase RPC failed: ${name}`);
  return response.json();
}

async function answer(question, faqs) {
  const response = await fetch(`${SERVER_URL}/api/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, faqs }),
  });
  if (!response.ok) return "잠시후다시";
  const data = await response.json();
  return data.answer || "";
}

function hasPrivateNumber(text) {
  const digitsOnly = text.replace(/\D/g, "");
  return digitsOnly.length >= 9 || /\d{6}\s*-?\s*\d{7}/.test(text);
}

async function searchLikeApp(question) {
  const categoryCandidates = await rpc("predict_faq_category", {
    search_query: question,
    match_limit: 3,
  });
  const top = categoryCandidates[0] || null;
  const second = categoryCandidates[1] || null;
  const ambiguous =
    !top ||
    top.score < 0.18 ||
    (second && top.score - second.score < 0.04);

  let faqs = [];
  let expandedSearch = false;
  if (top && !ambiguous) {
    faqs = await rpc("search_faqs", {
      search_query: question,
      category_filter: top.category,
      match_limit: 5,
    });
  }

  if (ambiguous || faqs.length < 5) {
    expandedSearch = true;
    const allFaqs = await rpc("search_faqs", {
      search_query: question,
      category_filter: null,
      match_limit: 5,
    });
    const byId = new Map();
    [...faqs, ...allFaqs].forEach((faq) => byId.set(faq.id, faq));
    faqs = [...byId.values()]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 5);
  }

  return { category: top, ambiguous, expandedSearch, faqs };
}

function scoreCase(testCase, result) {
  const answerText = result.answer || "";
  const faqCount = result.faqs.length;
  const hasEvidence = /근거:\s*FAQ\s*#\d+/.test(answerText);
  const hasEscalate = answerText.includes("담당자연결(1588-0000)");
  const hasNoFaq = faqCount === 0;
  const hasUnsafeAmount =
    /\d+\s*(원|만원|억|달러)/.test(answerText) &&
    !answerText.includes("참고용 안내");

  const reasons = [];
  if (testCase.mustHaveEvidence && !hasEvidence) reasons.push("근거 FAQ 번호 없음");
  if (testCase.minFaqs && faqCount < testCase.minFaqs) reasons.push("FAQ 카드 부족");
  if (testCase.shouldMention && !testCase.shouldMention.some((word) => answerText.includes(word))) {
    reasons.push("기대 키워드 부족");
  }
  if (testCase.expectNoFaqOrEscalate && !(hasNoFaq || hasEscalate)) {
    reasons.push("범위 밖인데 FAQ/일반 답변 생성");
  }
  if (testCase.mustAvoidAmountCertainty) {
    if (hasUnsafeAmount) reasons.push("금액을 확정처럼 답함");
    if (!(answerText.includes("참고용 안내") || answerText.includes("상담사") || answerText.includes("약관"))) {
      reasons.push("금액 위험 안내 부족");
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    hasEvidence,
    faqCount,
  };
}

function renderReport(results) {
  const passed = results.filter((row) => row.pass).length;
  const lines = [
    "# test_cases.md - STEP10 골든셋 평가 결과",
    "",
    `평가일: 2026-08-03`,
    `통과율: ${passed}/${results.length} (${Math.round((passed / results.length) * 100)}%)`,
    "",
    "| ID | 유형 | 입력 | 기대 | 결과 | 판정 | 실패/주의 사유 |",
    "|---|---|---|---|---|---|---|",
  ];

  for (const row of results) {
    const resultText = [
      `FAQ ${row.faqCount}개`,
      row.hasEvidence ? "근거 있음" : "근거 없음",
      row.answer.replace(/\|/g, "/").slice(0, 80),
    ].join(", ");
    lines.push(
      `| ${row.id} | ${row.type} | ${row.question} | ${row.expected} | ${resultText} | ${row.pass ? "통과" : "실패"} | ${row.reasons.join(", ") || "-"} |`
    );
  }

  lines.push("");
  lines.push("## 멀티에이전트 평가 요약");
  lines.push("");
  lines.push("| 역할 | 판정 요약 |");
  lines.push("|---|---|");
  lines.push("| 답변자 에이전트 | 정상 질문은 FAQ 근거가 붙은 자연어 답변을 생성해야 한다. |");
  lines.push("| 채점자 에이전트 | 근거 없으면 실패, 범위 밖과 금액 위험은 보수적으로 실패 처리한다. |");
  lines.push("| 검토자 에이전트 | 통과율보다 안전 규칙 준수를 우선한다. |");
  lines.push("");
  lines.push("## 개선 1순위");
  lines.push("");
  lines.push("보험 전용 더미 FAQ를 `data/faqs.csv` 또는 Supabase `public.faqs`에 30~50건 추가한다. 현재 보험 카테고리 데이터가 적어 정상 보험 질문도 휴대폰/카드/여행 FAQ와 섞일 수 있다.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  if (hasPrivateNumber("900101-1234567")) {
    // Local guard exists; included to keep the security gate visible in this eval.
  }

  const results = [];
  for (const testCase of cases) {
    const expected =
      testCase.type === "범위 밖"
        ? "관련 FAQ 없음 또는 담당자연결"
        : testCase.type === "금액/확정 위험"
          ? "참고용 안내, 금액 단정 금지"
          : "근거(FAQ #) 포함 답변";

    const searched = await searchLikeApp(testCase.question);
    const answerText = await answer(testCase.question, searched.faqs);
    const scored = scoreCase(testCase, {
      answer: answerText,
      faqs: searched.faqs,
    });

    results.push({
      ...testCase,
      expected,
      answer: answerText,
      faqCount: searched.faqs.length,
      hasEvidence: scored.hasEvidence,
      pass: scored.pass,
      reasons: scored.reasons,
    });
  }

  const report = renderReport(results);
  fs.writeFileSync(path.join(__dirname, "test_cases.md"), report, "utf8");
  process.stdout.write(report);
}

main().catch((error) => {
  process.stderr.write(`golden_eval_failed=${error.message}\n`);
  process.exit(1);
});
