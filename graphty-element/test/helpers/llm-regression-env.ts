/**
 * LLM Regression Environment Utilities
 * @module test/helpers/llm-regression-env
 *
 * Which provider, key and model the LLM regression tests use:
 *
 * - `VITE_LLM_REGRESSION_PROVIDER`: openai, anthropic or google (default anthropic)
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
    const viteValue = (import.meta.env as Record<string, string | undefined>)[name];
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
 * @returns The provider named by VITE_LLM_REGRESSION_PROVIDER, or anthropic when unset
 * @throws Error when the variable names a provider the element does not support
 */
export function getLlmRegressionProvider(): VercelProviderType {
    const name = readEnv("VITE_LLM_REGRESSION_PROVIDER") ?? "anthropic";
    if (!PROVIDERS.includes(name as VercelProviderType)) {
        throw new Error(`VITE_LLM_REGRESSION_PROVIDER must be one of ${PROVIDERS.join(", ")}, not "${name}"`);
    }

    return name as VercelProviderType;
}

/**
 * The environment variable that holds the selected provider's key.
 * @returns For example VITE_ANTHROPIC_API_KEY
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
 * Get the model to use for LLM regression tests.
 * @returns VITE_LLM_REGRESSION_MODEL, or the selected provider's default model
 */
export function getLlmRegressionModel(): string {
    return readEnv("VITE_LLM_REGRESSION_MODEL") ?? DEFAULT_MODELS[getLlmRegressionProvider()];
}
