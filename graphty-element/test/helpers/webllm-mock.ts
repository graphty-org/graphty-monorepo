/**
 * Mock module for @mlc-ai/web-llm in test environment.
 * This stub prevents test failures from trying to load the CDN-only WebLLM package.
 * vitest.config.ts aliases the package to this file.
 */

export function CreateMLCEngine(): Promise<never> {
    return Promise.reject(
        new Error("WebLLM is not available in test environment. Use mock mode or a different provider."),
    );
}

export function hasModelInCache(): Promise<boolean> {
    return Promise.resolve(false);
}

export function deleteModelFromCache(): Promise<void> {
    // No-op in test environment
    return Promise.resolve();
}
