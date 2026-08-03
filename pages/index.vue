<template>
  <main class="mx-auto flex min-h-screen max-w-[430px] flex-col bg-white shadow-[0_14px_36px_rgba(23,32,51,0.12)]">
    <header class="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div class="flex h-14 items-center gap-3 px-4">
        <button class="grid h-9 w-9 place-items-center rounded-full text-slate-700 hover:bg-slate-100" aria-label="뒤로가기">
          <ChevronLeft class="h-5 w-5" />
        </button>
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-[17px] font-extrabold tracking-normal">삼성생명 민원 지식봇</h1>
          <p class="text-xs font-medium text-slate-500">공개 FAQ 기반 참고용</p>
        </div>
        <button class="grid h-9 w-9 place-items-center rounded-full text-slate-700 hover:bg-slate-100" aria-label="초기화" @click="resetChat">
          <RotateCw class="h-4 w-4" />
        </button>
      </div>
    </header>

    <section ref="chatLogRef" class="flex-1 space-y-5 overflow-y-auto px-4 pb-32 pt-5">
      <div class="text-center text-xs font-semibold text-slate-400">2026-08-03</div>

      <div class="flex gap-2">
        <BotAvatar />
        <div class="max-w-[82%]">
          <p class="mb-1 text-xs font-bold text-slate-600">삼성생명 민원 지식봇</p>
          <div class="rounded-2xl rounded-tl-md bg-[#f4f7fb] px-4 py-3 text-[14px] leading-6 text-slate-800">
            안녕하세요. 민원 FAQ를 근거로 참고용 답변을 도와드릴게요.
          </div>
        </div>
      </div>

      <div class="flex gap-2">
        <div class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
          <Volume2 class="h-4 w-4" />
        </div>
        <div class="max-w-[82%] rounded-2xl rounded-tl-md bg-[#f7f8fb] px-4 py-3 text-[13px] leading-6 text-slate-600">
          금액, 환급금, 한도, 확정 판단은 담당자 확인이 필요합니다.
        </div>
      </div>

      <template v-for="message in messages" :key="message.id">
        <div v-if="message.role === 'user'" class="flex justify-end">
          <div class="max-w-[82%] rounded-2xl rounded-tr-md bg-[#0d63c9] px-4 py-3 text-[14px] leading-6 text-white">
            {{ message.text }}
          </div>
        </div>

        <div v-else class="flex gap-2">
          <BotAvatar />
          <div class="max-w-[84%]">
            <p class="mb-1 text-xs font-bold text-slate-600">삼성생명 민원 지식봇</p>

            <div v-if="message.loading" class="rounded-2xl rounded-tl-md bg-[#f4f7fb] px-4 py-3 text-[14px] leading-6 text-slate-700">
              관련 FAQ를 찾고 있어요<span class="inline-flex w-6 animate-pulse justify-end">...</span>
            </div>

            <div v-else-if="message.error" class="rounded-2xl rounded-tl-md bg-red-50 px-4 py-3 text-[14px] font-semibold leading-6 text-red-500 ring-1 ring-red-200">
              {{ message.error }}
            </div>

            <div v-else class="space-y-3 rounded-2xl rounded-tl-md bg-[#f4f7fb] px-4 py-4">
              <div class="flex flex-wrap items-center gap-2">
                <span :class="message.ambiguous ? 'bg-red-50 text-red-500 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'" class="rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1">
                  카테고리: {{ message.category?.category || "예측 어려움" }}
                </span>
                <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                  신뢰도 {{ formatScore(message.category?.score) }}
                </span>
                <span :class="message.escalated ? 'bg-red-500' : 'bg-[#0d63c9]'" class="rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white">
                  {{ message.escalated ? "담당자 확인 필요" : "참고용 답변" }}
                </span>
              </div>

              <div class="whitespace-pre-line rounded-2xl bg-white px-4 py-3 text-[14px] leading-6 text-slate-800 ring-1 ring-slate-200">
                {{ message.answer }}
              </div>

              <div class="flex items-center justify-between gap-2">
                <h2 class="text-[13px] font-extrabold text-slate-800">참고한 FAQ</h2>
                <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                  {{ message.expandedSearch ? "전체 FAQ 재검색 포함" : "예측 카테고리 우선" }}
                </span>
              </div>

              <div class="space-y-2">
                <article v-for="(faq, index) in message.faqs" :key="faq.id || index" class="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <span class="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-extrabold text-[#0d63c9]">
                      FAQ #{{ faq.id || index + 1 }}
                    </span>
                    <span class="truncate text-[11px] font-bold text-slate-500">{{ faq.category }}</span>
                  </div>
                  <p class="text-[13px] font-extrabold leading-5 text-slate-900">{{ faq.question }}</p>
                  <p class="mt-2 text-[13px] leading-5 text-slate-600">{{ faq.answer }}</p>
                </article>
                <div v-if="message.faqs.length === 0" class="rounded-2xl bg-white px-4 py-4 text-center text-[14px] font-extrabold text-slate-600 ring-1 ring-slate-200">
                  관련 FAQ 없음
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </section>

    <form class="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 border-t border-slate-100 bg-white/95 px-3 pb-4 pt-3 backdrop-blur" @submit.prevent="submitQuestion">
      <div v-if="inlineNotice" class="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500">
        {{ inlineNotice }}
      </div>
      <div class="flex items-end gap-2 rounded-full bg-[#f4f5f7] p-2 ring-1 ring-slate-200">
        <input
          v-model="questionInput"
          class="min-h-10 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-slate-400"
          type="text"
          autocomplete="off"
          placeholder="민원 내용을 입력하세요."
          aria-label="민원 질문 입력"
          @input="validateInline"
        />
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0d63c9] text-white transition hover:bg-blue-700 disabled:bg-slate-300" type="submit" aria-label="질문하기" :disabled="isAsking">
          <Send class="h-4 w-4" />
        </button>
      </div>
    </form>
  </main>
</template>

<script setup lang="ts">
import { Bot, ChevronLeft, RotateCw, Send, Volume2 } from "lucide-vue-next";
import { defineComponent, h, nextTick, ref } from "vue";

type CategoryCandidate = {
  category: string;
  score: number;
  matched_count: number;
};

type Faq = {
  id: number;
  category: string;
  question: string;
  answer: string;
  source?: string;
  score?: number;
};

type ChatMessage = {
  id: number;
  role: "user" | "bot";
  text?: string;
  loading?: boolean;
  error?: string;
  answer?: string;
  category?: CategoryCandidate | null;
  ambiguous?: boolean;
  expandedSearch?: boolean;
  escalated?: boolean;
  faqs?: Faq[];
};

const runtimeConfig = useRuntimeConfig();
const chatLogRef = ref<HTMLElement | null>(null);
const questionInput = ref("");
const inlineNotice = ref("");
const isAsking = ref(false);
const messages = ref<ChatMessage[]>([]);

const ambiguousScore = 0.18;
const minCategoryResults = 5;
const escalationTerms = ["금액", "환급", "환급금", "한도", "결제일", "지급", "확정", "얼마"];

const BotAvatar = defineComponent({
  setup() {
    return () =>
      h("div", { class: "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#6c63ff] text-white" }, [
        h(Bot, { class: "h-5 w-5" }),
      ]);
  },
});

function scrollToBottom() {
  nextTick(() => {
    if (chatLogRef.value) chatLogRef.value.scrollTop = chatLogRef.value.scrollHeight;
  });
}

function formatScore(score?: number) {
  return typeof score === "number" ? score.toFixed(3) : "-";
}

function hasPrivateNumber(text: string) {
  const digitsOnly = text.replace(/\D/g, "");
  const longNumber = /\d[\d\s-]{7,}\d/.test(text);
  const rrnLike = /\d{6}\s*-?\s*\d{7}/.test(text);
  const phoneLike = /01[016789]\s*-?\s*\d{3,4}\s*-?\s*\d{4}/.test(text);
  return digitsOnly.length >= 9 || longNumber || rrnLike || phoneLike;
}

function needsEscalation(text: string) {
  return escalationTerms.some((term) => text.includes(term));
}

function validateInline() {
  if (!questionInput.value.trim()) {
    inlineNotice.value = "";
    return;
  }
  inlineNotice.value = hasPrivateNumber(questionInput.value)
    ? "개인정보로 보이는 숫자는 입력할 수 없습니다."
    : "";
}

function resetChat() {
  messages.value = [];
  inlineNotice.value = "";
  questionInput.value = "";
}

async function supabaseRpc<T>(name: string, payload: Record<string, unknown>) {
  const url = runtimeConfig.public.supabaseUrl;
  const key = runtimeConfig.public.supabasePublishableKey;
  if (!url || !key) throw new Error("Supabase 설정이 없습니다.");

  return await $fetch<T>(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: payload,
  });
}

async function predictCategory(question: string) {
  return await supabaseRpc<CategoryCandidate[]>("predict_faq_category", {
    search_query: question,
    match_limit: 3,
  });
}

async function searchFaqs(question: string, category: string | null = null) {
  return await supabaseRpc<Faq[]>("search_faqs", {
    search_query: question,
    category_filter: category,
    match_limit: 5,
  });
}

async function createAnswer(question: string, faqs: Faq[]) {
  const data = await $fetch<{ answer: string }>("/api/answer", {
    method: "POST",
    body: { question, faqs },
  });
  return data.answer || "잠시후다시";
}

async function submitQuestion() {
  const question = questionInput.value.trim();
  inlineNotice.value = "";

  if (!question) {
    inlineNotice.value = "질문을 먼저 입력해주세요.";
    return;
  }

  if (hasPrivateNumber(question)) {
    inlineNotice.value = "개인정보로 보이는 숫자는 입력할 수 없습니다.";
    return;
  }

  messages.value.push({ id: Date.now(), role: "user", text: question });
  const loadingId = Date.now() + 1;
  messages.value.push({ id: loadingId, role: "bot", loading: true });
  questionInput.value = "";
  isAsking.value = true;
  scrollToBottom();

  try {
    const categoryCandidates = await predictCategory(question);
    const topCategory = categoryCandidates[0] || null;
    const secondCategory = categoryCandidates[1] || null;
    const ambiguous =
      !topCategory ||
      topCategory.score < ambiguousScore ||
      Boolean(secondCategory && topCategory.score - secondCategory.score < 0.04);

    let faqs: Faq[] = [];
    let expandedSearch = false;

    if (topCategory && !ambiguous) {
      faqs = await searchFaqs(question, topCategory.category);
    }

    if (ambiguous || faqs.length < minCategoryResults) {
      expandedSearch = true;
      const allFaqs = await searchFaqs(question, null);
      const byId = new Map<number, Faq>();
      [...faqs, ...allFaqs].forEach((faq) => byId.set(faq.id, faq));
      faqs = [...byId.values()]
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
        .slice(0, 5);
    }

    const answer = await createAnswer(question, faqs);
    const index = messages.value.findIndex((message) => message.id === loadingId);
    messages.value[index] = {
      id: loadingId,
      role: "bot",
      answer,
      category: topCategory,
      ambiguous,
      expandedSearch,
      escalated: needsEscalation(question),
      faqs,
    };
  } catch {
    const index = messages.value.findIndex((message) => message.id === loadingId);
    messages.value[index] = {
      id: loadingId,
      role: "bot",
      error: "검색 중 오류가 발생했습니다. 담당자 확인이 필요합니다.",
    };
  } finally {
    isAsking.value = false;
    scrollToBottom();
  }
}
</script>
