/**
 * AI type definitions.
 *
 * The natural-language layer lives behind its own entry point,
 * `@graphty/graphty-element/ai`, so an application that only draws a graph never loads three
 * LLM SDKs and an encrypted key store. That entry point needs a DOM, which is why it is still
 * reached through a dynamic import rather than a top-level one.
 *
 * The class and provider types are the element's own, imported type-only so nothing loads.
 */

import type { ApiKeyManager, createProvider, ProviderType } from "@graphty/graphty-element/ai";

export type { ProviderType };

// Lazy-load the AI layer to avoid module loading issues in Safari
// The actual classes are loaded on first access
let graphtyElementModule: typeof import("@graphty/graphty-element/ai") | null = null;
let loadPromise: Promise<typeof import("@graphty/graphty-element/ai")> | null = null;
let loadError: Error | null = null;

/**
 * Lazily load the graphty-element AI module.
 * @returns The `@graphty/graphty-element/ai` module
 */
async function getGraphtyElement(): Promise<typeof import("@graphty/graphty-element/ai")> {
    // If we already had an error, throw it again
    if (loadError) {
        throw loadError;
    }

    if (graphtyElementModule) {
        return graphtyElementModule;
    }

    loadPromise ??= import("@graphty/graphty-element/ai")
        .then((mod) => {
            graphtyElementModule = mod;

            return mod;
        })
        .catch((err: unknown) => {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error("[AI] Failed to load @graphty/graphty-element/ai:", error);
            console.error("[AI] Error name:", error.name);
            console.error("[AI] Error message:", error.message);
            console.error("[AI] Error stack:", error.stack);
            loadError = error;
            throw error;
        });

    return loadPromise;
}

/** AI status stages */
export type AiStage = "idle" | "processing" | "executingTool" | "streaming" | "complete" | "error";

/** Tool call status types */
type ToolCallStatusType = "pending" | "executing" | "success" | "error";

/** Status of a tool call */
interface ToolCallStatus {
    name: string;
    status: ToolCallStatusType;
    args?: Record<string, unknown>;
    result?: unknown;
    error?: string;
}

/** AI execution status */
export interface AiStatus {
    stage: AiStage;
    message?: string;
    toolCalls?: ToolCallStatus[];
    streamedText?: string;
    error?: Error;
}

/** Execution result from AI command */
export interface ExecutionResult {
    success: boolean;
    /** Message from tool execution (e.g., "The graph has 20 nodes.") */
    message?: string;
    /** Text response from LLM (when no tool is called) */
    text?: string;
    /** Alias for text - LLM's direct text response */
    llmText?: string;
    toolCalls?: {
        name: string;
        args: Record<string, unknown>;
        result?: unknown;
    }[];
    error?: Error;
}

/**
 * Get the graphty-element AI module lazily.
 * This delays loading until first access, avoiding module import issues on Safari.
 */
export { getGraphtyElement };

/**
 * Get the ApiKeyManager class lazily.
 * @returns The ApiKeyManager class
 */
export async function getApiKeyManager(): Promise<typeof ApiKeyManager> {
    return (await getGraphtyElement()).ApiKeyManager;
}

/**
 * Get the createProvider function lazily.
 * @returns The createProvider function
 */
export async function getCreateProvider(): Promise<typeof createProvider> {
    return (await getGraphtyElement()).createProvider;
}
