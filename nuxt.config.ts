export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
  experimental: {
    appManifest: false,
  },
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    public: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: "ko" },
      title: "삼성생명 민원 지식봇",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
});
