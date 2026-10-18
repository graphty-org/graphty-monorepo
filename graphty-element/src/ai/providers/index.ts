/**
 * LLM Provider module - provides abstraction for different LLM providers.
 * @module ai/providers
 */

// Provider factory
import type { AiProviderId } from "../../catalog/ai";
import { MockLlmProvider } from "./MockLlmProvider";
import type { LlmProvider } from "./types";
import { VercelAiProvider } from "./VercelAiProvider";
// NOTE: WebLlmProvider is NOT imported here to avoid Safari compatibility issues.
// It references @mlc-ai/web-llm which is an optional dependency that may not be installed.
// Safari fails on dynamic imports of non-existent modules even before the import is called.
// Use getWebLlmProviderClass() to dynamically load WebLlmProvider when needed.

// Types
export type {
    LlmProvider,
    LlmResponse,
    Message,
    ProviderOptions,
    StreamCallbacks,
    ToolCall,
    ToolDefinition,
} from "./types";

// Providers
export { MockLlmProvider } from "./MockLlmProvider";
export type { VercelProviderType } from "./VercelAiProvider";
export { VercelAiProvider } from "./VercelAiProvider";
// Re-export types from WebLlmProvider (types are erased at runtime, safe to import)
export type { ProgressCallback, WebLlmModelInfo, WebLlmProviderOptions } from "./WebLlmProvider";
// NOTE: WebLlmProvider class is NOT exported directly. Use getWebLlmProviderClass() instead.

/** All supported provider types; their facts are `AI_PROVIDER_DESCRIPTORS` in `./catalog`. */
export type ProviderType = AiProviderId;

/**
 * Dynamically load the WebLlmProvider class.
 * This is the recommended way to access WebLlmProvider to avoid Safari compatibility issues.
 * The module is only loaded when this function is called, preventing issues on browsers
 * where @mlc-ai/web-llm is not installed.
 * @returns Promise resolving to the WebLlmProvider class
 * @example
 * const WebLlmProvider = await getWebLlmProviderClass();
 * const provider = new WebLlmProvider();
 */
export async function getWebLlmProviderClass(): Promise<typeof import("./WebLlmProvider").WebLlmProvider> {
    const module = await import("./WebLlmProvider");
    return module.WebLlmProvider;
}

/**
 * Create an LLM provider instance.
 * @param type - The type of provider to create
 * @returns An LLM provider instance
 * @throws Error if type is "webllm" - use createWebLlmProvider() instead
 */
export function createProvider(type: ProviderType): LlmProvider {
    if (type === "mock") {
        return new MockLlmProvider();
    }

    if (type === "webllm") {
        throw new Error(
            "WebLlmProvider cannot be created synchronously. " +
                "Use createWebLlmProvider() or getWebLlmProviderClass() instead.",
        );
    }

    return new VercelAiProvider(type);
}

/**
 * Create a WebLLM provider instance asynchronously.
 * This function dynamically loads the WebLlmProvider module to avoid
 * Safari compatibility issues with the @mlc-ai/web-llm optional dependency.
 * @returns Promise resolving to an LlmProvider instance configured for WebLLM
 */
export async function createWebLlmProvider(): Promise<LlmProvider> {
    const WebLlmProvider = await getWebLlmProviderClass();
    return new WebLlmProvider();
}

/**
 * Create the in-browser WebLLM provider the way `enableAiControl` does: check that
 * `@mlc-ai/web-llm` is installed, and load the model on the first request.
 * @param model - The WebLLM model id, or undefined for the provider's default
 * @returns The provider
 * @throws A `GraphtyError` with `E_MISSING_PACKAGE` when `@mlc-ai/web-llm` is not installed.
 */
export async function loadWebLlmProvider(model?: string): Promise<LlmProvider> {
    const { WebLlmProvider, requireWebLlmPackage } = await import("./WebLlmProvider");
    await requireWebLlmPackage();
    const provider = new WebLlmProvider({ initializeOnFirstUse: true });
    provider.configure({ model });
    return provider;
}
