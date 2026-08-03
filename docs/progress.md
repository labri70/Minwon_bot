# progress.md — 진행 기록

> 각 STEP 끝에 한 줄씩. "배포됨 ≠ 동작됨"을 구분해 적는다.

- [x] STEP1 폴더 세팅 — 2026-08-03 docs/data/tests/skills/ml 생성 확인
- [x] STEP2 기획 문서 첨부·맥락 — 2026-08-03 docs/*.md 읽고 목표·흐름·완료정의·안전규칙 확인
- [x] STEP3 .env·.gitignore — 2026-08-03 Supabase/OpenAI 빈 키 템플릿 생성, .env git 제외 처리, Supabase 프로젝트 생성 및 publishable key 반영
- [x] STEP4 Supabase 표·검색 — 2026-08-03 public.faqs 생성, data/faqs.csv 5,565건 적재, search_faqs() 검색 검증
- [x] STEP5 화면 — 2026-08-03 docs/screen_spec.md 기준 Tailwind index.html 화면 뼈대 생성
- [x] STEP6 디자인(design.md 확정) — 2026-08-03 모바일 상담 앱 콘셉트로 design.md 확정
- [x] STEP7 검색(RAG) — 2026-08-03 predict_faq_category() + search_faqs() 연결, 카테고리 우선/전체 재검색/관련 FAQ 없음 검증
- [x] STEP8 AI Hub·분류기 — 2026-08-03 AI Hub 질의응답 5,565건 정리(data/faqs.csv), TF-IDF+LinearSVC 분류기 생성(정확도 0.468)
- [x] STEP9 답변(LLM) — 2026-08-03 서버 /api/answer 추가, OpenAI가 Supabase 검색 FAQ 근거로 자연어 답변 생성
- [x] STEP10 테스트(test_cases.md) — 2026-08-03 golden_set 8문항 멀티에이전트 기준 평가, 8/8 통과, 개선 1순위 기록
- [ ] STEP11 배포 — 2026-08-03 Nuxt 전환 및 GitHub 저장 완료, Netlify 배포는 아직 진행 전
- [ ] STEP12 발표
