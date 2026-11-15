/**
 * The provider pages the Assistant links to, by provider id: where a reader makes a key, and where
 * they add credit. The app's choice, not catalog data. tools/check-provider-links.mjs reads this
 * table every week and fails when a page is gone or now lands somewhere else, so a link added here
 * needs its landing recorded there. No imports: Node reads this file directly.
 *
 * Sources: Google's from ai.google.dev/gemini-api/docs/api-key and aistudio.google.com/docs/billing,
 * OpenAI's from developers.openai.com/api/docs/quickstart and its error-codes guide ("add credits in
 * your billing settings"), Anthropic's from platform.claude.com/docs/en/api/overview and rate-limits.
 */
export const PROVIDER_PAGES: Readonly<Partial<Record<string, { readonly key: string; readonly billing: string }>>> = {
    google: {
        key: "https://aistudio.google.com/apikey",
        billing: "https://aistudio.google.com/billing",
    },
    openai: {
        key: "https://platform.openai.com/api-keys",
        billing: "https://platform.openai.com/settings/organization/billing",
    },
    anthropic: {
        key: "https://platform.claude.com/settings/keys",
        billing: "https://platform.claude.com/settings/billing",
    },
};
