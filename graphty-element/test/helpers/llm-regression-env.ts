/**
 * LLM Regression Environment Utilities
 * @module test/helpers/llm-regression-env
 *
 * Which provider, key and model the LLM regression tests use:
 *
 * - `VITE_LLM_REGRESSION_PROVIDER`: openai, anthropic or google (default google, as the release job runs)
 * - the provider's key: `VITE_OPENAI_API_KEY`, `VITE_ANTHROPIC_API_KEY` or `VITE_GOOGLE_API_KEY`
 * - `VITE_LLM_REGRESSION_MODEL`: overrides the provider's default model
 */

import type { VercelProviderType } from "../../src/ai/providers/VercelAiProvider";

const PROVIDERS: readonly VercelProviderType[] = ["openai", "anthropic", "google"];

/** The model each provider runs when VITE_LLM_REGRESSION_MODEL is not set: its cheapest current tool caller. */
const DEFAULT_MODELS: Record<VercelProviderType, string> = {
    openai: "gpt-4o-mini",
    anthropic: "claude-haiku-4-5-20251001",
    google: "gemini-3.8-flash",
};

function readEnv(name: string): string | undefined {
    // Vite exposes VITE_-prefixed variables on import.meta.env; process.env covers plain Node.
    // import.meta.env is undefined outside Vite: vitest.config.ts reads this module too.
    const viteValue = (import.meta.env as Record<string, string | undefined> | undefined)?.[name];
    if (viteValue) {
        return viteValue;
    }

    if (typeof process !== "undefined" && process.env[name]) {
        return process.env[name];
    }

    return undefined;
}

/**
 * The provider the tests call.
 * @returns The provider named by VITE_LLM_REGRESSION_PROVIDER, or google when unset
 * @throws Error when the variable names a provider the element does not support
 */
export function getLlmRegressionProvider(): VercelProviderType {
    const name = readEnv("VITE_LLM_REGRESSION_PROVIDER") ?? "google";
    if (!PROVIDERS.includes(name as VercelProviderType)) {
        throw new Error(`VITE_LLM_REGRESSION_PROVIDER must be one of ${PROVIDERS.join(", ")}, not "${name}"`);
    }

    return name as VercelProviderType;
}

/**
 * The environment variable that holds the selected provider's key.
 * @returns For example VITE_GOOGLE_API_KEY
 */
export function getLlmRegressionKeyVariable(): string {
    return `VITE_${getLlmRegressionProvider().toUpperCase()}_API_KEY`;
}

/**
 * The selected provider's API key.
 * @returns The key, or undefined when its variable is unset or empty
 */
export function getLlmRegressionApiKey(): string | undefined {
    return readEnv(getLlmRegressionKeyVariable());
}

/**
 * Check if LLM regression tests should be enabled: the selected provider has a key.
 * @returns True if LLM regression tests should run
 */
export function isLlmRegressionEnabled(): boolean {
    const apiKey = getLlmRegressionApiKey();
    return apiKey !== undefined && apiKey.length > 0;
}

/**
 * Get the reason why LLM regression tests are disabled.
 * @returns A descriptive message for why tests are being skipped
 */
export function getSkipReason(): string {
    return `LLM regression tests require ${getLlmRegressionKeyVariable()} environment variable to be set`;
}

/**
 * Create a skip condition for LLM regression tests.
 * Use with vitest's skipIf: describe.skipIf(skipIfNoApiKey())("suite name", ...)
 * @returns True if tests should be skipped (no API key available)
 */
export function skipIfNoApiKey(): boolean {
    return !isLlmRegressionEnabled();
}

/**
 * How long one case may take, per provider, sized from measured call latency. One prompt asks the
 * model at most six times (five tool turns, then an answer-only ask; src/ai/AiController.ts).
 *
 * - google (gemini-3.8-flash), measured over 19 runs on 2026-10-07: 2-3 s per call at the median,
 *   7-24 s at the 99th percentile depending on the hour, 40.5 s for the slowest call that answered,
 *   and one call that had not answered after 57 s. A 503 the SDK retries adds a few seconds, not
 *   these. 120 s holds one such stall plus the prompt's other calls at the slow hours' p99.
 * - openai and anthropic keep the 60 s the suite used before it ran on Google.
 */
const CASE_TIMEOUT_MS: Record<VercelProviderType, number> = {
    openai: 60_000,
    anthropic: 60_000,
    google: 120_000,
};

/**
 * The per-case limit for the selected provider: vitest's testTimeout for the llm-regression project.
 * @returns Milliseconds
 */
export function getLlmRegressionCaseTimeoutMs(): number {
    return CASE_TIMEOUT_MS[getLlmRegressionProvider()];
}

/**
 * Get the model to use for LLM regression tests.
 * @returns VITE_LLM_REGRESSION_MODEL, or the selected provider's default model
 */
export function getLlmRegressionModel(): string {
    return readEnv("VITE_LLM_REGRESSION_MODEL") ?? DEFAULT_MODELS[getLlmRegressionProvider()];
}
