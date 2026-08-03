const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY_BYTES = 128 * 1024;

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("request_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeText(value, maxLength = 1200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeFaqs(faqs) {
  if (!Array.isArray(faqs)) return [];
  return faqs.slice(0, 5).map((faq) => ({
    id: safeText(faq.id, 30),
    category: safeText(faq.category, 120),
    question: safeText(faq.question, 500),
    answer: safeText(faq.answer, 700),
  }));
}

function hasFinancialRisk(question) {
  return /금액|결제일|한도|환급금|환급|지급|얼마|확정/.test(question);
}

async function handleAnswer(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { answer: "잠시후다시" });
    return;
  }

  try {
    const body = JSON.parse(await readBody(req) || "{}");
    const question = safeText(body.question, 600);
    const faqs = normalizeFaqs(body.faqs);
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!question || faqs.length === 0) {
      sendJson(res, 200, { answer: "담당자연결(1588-0000)" });
      return;
    }

    if (!apiKey) {
      sendJson(res, 503, { answer: "잠시후다시" });
      return;
    }

    const faqContext = faqs
      .map(
        (faq) =>
          `FAQ #${faq.id}\n분류: ${faq.category}\n질문: ${faq.question}\n답변: ${faq.answer}`
      )
      .join("\n\n");

    const riskLine = hasFinancialRisk(question)
      ? "사용자 질문에 금액·결제일·한도·환급금 등 확정 위험 표현이 있으므로 반드시 '참고용 안내'라고 말하고 정확한 내용은 상담사/약관 확인이 필요하다고 안내하세요."
      : "질문에 확정 위험 표현이 없더라도 답변은 참고용 초안으로만 작성하세요.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "당신은 삼성생명 민원 지식봇의 서버 답변 생성기입니다. 제공된 FAQ 근거만 사용하세요. 추측하지 마세요. 쉬운 한국어 2~4문장으로 답하세요. 답변 끝에는 반드시 '근거: FAQ #번호' 형식을 포함하세요. 관련 FAQ가 없거나 근거가 부족하면 정확히 '담당자연결(1588-0000)'만 답하세요. 실제 고객 정보, 계약 정보, 주민번호, 실약관 판단은 다루지 않습니다.",
          },
          {
            role: "user",
            content: `사용자 질문: ${question}\n\n${riskLine}\n\n검색된 FAQ 근거:\n${faqContext}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 260,
      }),
    });

    if (!response.ok) {
      sendJson(res, 502, { answer: "잠시후다시" });
      return;
    }

    const data = await response.json();
    const answer = safeText(data?.choices?.[0]?.message?.content, 1200);
    sendJson(res, 200, { answer: answer || "잠시후다시" });
  } catch {
    sendJson(res, 500, { answer: "잠시후다시" });
  }
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(ROOT, requestPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

loadEnv();

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith("/api/answer")) {
    handleAnswer(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Minwon bot server running at http://127.0.0.1:${PORT}`);
});
