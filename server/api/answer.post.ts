type FaqInput = {
  id?: string | number;
  category?: string;
  question?: string;
  answer?: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function safeText(value: unknown, maxLength = 1200) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeFaqs(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 5).map((faq: FaqInput) => ({
    id: safeText(faq.id, 30),
    category: safeText(faq.category, 120),
    question: safeText(faq.question, 500),
    answer: safeText(faq.answer, 700),
  }));
}

function hasFinancialRisk(question: string) {
  return /금액|결제일|한도|환급금|환급|지급|얼마|확정/.test(question);
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as { question?: unknown; faqs?: unknown };
    const config = useRuntimeConfig(event);
    const question = safeText(body?.question, 600);
    const faqs = normalizeFaqs(body?.faqs);

    if (!question || faqs.length === 0) {
      return { answer: "담당자연결(1588-0000)" };
    }

    if (!config.openaiApiKey) {
      setResponseStatus(event, 503);
      return { answer: "잠시후다시" };
    }

    const faqContext = faqs
      .map(
        (faq) =>
          `FAQ #${faq.id}\n분류: ${faq.category}\n질문: ${faq.question}\n답변: ${faq.answer}`,
      )
      .join("\n\n");

    const riskLine = hasFinancialRisk(question)
      ? "사용자 질문에 금액·결제일·한도·환급금 등 확정 위험 표현이 있으므로 반드시 '참고용 안내'라고 말하고 정확한 내용은 상담사/약관 확인이 필요하다고 안내하세요."
      : "질문에 확정 위험 표현이 없더라도 답변은 참고용 초안으로만 작성하세요.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "당신은 삼성생명 민원 지식봇의 서버 답변 생성기입니다. 제공된 FAQ 근거만 사용하세요. 추측하지 마세요. 쉬운 한국어 2~4문장으로 답하세요. 검색된 FAQ 중 사용자 질문과 직접 관련된 항목이 하나라도 있으면 그 FAQ의 답변을 바탕으로 안내하고, 답변 끝에는 반드시 '근거: FAQ #번호' 형식을 포함하세요. 검색된 FAQ가 모두 질문과 무관하거나 근거가 부족하면 정확히 '담당자연결(1588-0000)'만 답하세요. 실제 고객 정보, 계약 정보, 주민번호, 실약관 판단은 다루지 않습니다.",
          },
          {
            role: "user",
            content: `사용자 질문: ${question}\n\n${riskLine}\n\n아래 FAQ는 검색 시스템이 관련 후보로 선택한 근거입니다. 질문과 직접 관련된 FAQ를 골라 답하고, 근거 번호를 붙이세요.\n\n검색된 FAQ 근거:\n${faqContext}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 260,
      }),
    });

    if (!response.ok) {
      setResponseStatus(event, 502);
      return { answer: "잠시후다시" };
    }

    const data = (await response.json()) as ChatCompletionResponse;
    return {
      answer: safeText(data.choices?.[0]?.message?.content, 1200) || "잠시후다시",
    };
  } catch {
    setResponseStatus(event, 500);
    return { answer: "잠시후다시" };
  }
});
