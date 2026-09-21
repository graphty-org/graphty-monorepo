/**
 * AI type definitions.
 *
 * The natural-language layer lives behind its own entry point,
 * `@graphty/graphty-element/ai`, so an application that only draws a graph never loads three
 * LLM SDKs and an encrypted key store. That entry point needs a DOM, which is why it is still
 * reached through a dynamic import rather than a top-level one.
 *
 * The class shapes declared below are the app's own duck types, kept for now; the real ones
 * are exported by that entry point.
 */

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

/** Supported AI provider types */
type VercelProviderType = "openai" | "anthropic" | "google";
export type ProviderType = VercelProviderType | "mock" | "webllm";

/** Configuration for key persistence */
interface PersistenceConfig {
    /** Encryption key for secure storage */
    encryptionKey: string;
    /** Storage backend */
    storage?: "localStorage" | "sessionStorage";
    /** Prefix for storage keys */
    prefix?: string;
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

/** Status change callback type */
type StatusChangeCallback = (status: AiStatus) => void;

/** Key persistence configuration for AiManager */
interface KeyPersistenceConfig {
    enabled: boolean;
    encryptionKey?: string;
    storage?: "localStorage" | "sessionStorage";
    prefix?: string;
}

/** AI Manager configuration */
interface AiManagerConfig {
    provider: ProviderType;
    apiKey?: string;
    keyPersistence?: KeyPersistenceConfig;
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
 * ApiKeyManager class interface - matches graphty-element's ApiKeyManager
 */
declare class ApiKeyManagerClass {
    /**
     *
     */
    enablePersistence(config: PersistenceConfig): void;
    /**
     *
     */
    disablePersistence(clearStorage?: boolean): void;
    /**
     *
     */
    isPersistenceEnabled(): boolean;
    /**
     *
     */
    setKey(provider: ProviderType, key: string): void;
    /**
     *
     */
    getKey(provider: ProviderType): string | undefined;
    /**
     *
     */
    hasKey(provider: ProviderType): boolean;
    /**
     *
     */
    removeKey(provider: ProviderType): void;
    /**
     *
     */
    getConfiguredProviders(): ProviderType[];
    /**
     *
     */
    clear(): void;
}

/**
 * AiManager class interface - matches graphty-element's AiManager
 */
declare class AiManagerClass {
    /**
     *
     */
    init(graph: unknown, config: AiManagerConfig): void;
    /**
     *
     */
    onStatusChange(callback: StatusChangeCallback): () => void;
    /**
     *
     */
    execute(input: string): Promise<ExecutionResult>;
    /**
     *
     */
    cancel(): void;
    /**
     *
     */
    dispose(): void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in typeof expression below
declare function createAiManagerFn(): AiManagerClass;

// Export types for the classes
export type { ApiKeyManagerClass as ApiKeyManagerType };
export type { AiManagerClass as AiManagerType };

/**
 * Get the graphty-element AI module lazily.
 * This delays loading until first access, avoiding module import issues on Safari.
 */
export { getGraphtyElement };

/**
 * Get the ApiKeyManager class lazily.
 * @returns The ApiKeyManager class
 */
export async function getApiKeyManager(): Promise<typeof ApiKeyManagerClass> {
    const mod = await getGraphtyElement();

    // The declaration above is the app's own, not the element's, so the shapes are asserted
    return (mod as unknown as { ApiKeyManager: typeof ApiKeyManagerClass }).ApiKeyManager;
}

/**
 * Get the createAiManager function lazily.
 * @returns The createAiManager function
 */
export async function getCreateAiManager(): Promise<typeof createAiManagerFn> {
    const mod = await getGraphtyElement();

    // The declaration above is the app's own, not the element's, so the shapes are asserted
    return (mod as unknown as { createAiManager: typeof createAiManagerFn }).createAiManager;
}

/**
 * Provider interface for validation.
 */
interface AiProvider {
    validateApiKey(): Promise<boolean>;
}

/**
 * Provider configuration for createProvider.
 */
interface ProviderConfig {
    provider: ProviderType;
    apiKey?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in typeof expression below
declare function createProviderFn(config: ProviderConfig): AiProvider;

/**
 * Get the createProvider function lazily.
 * @returns The createProvider function
 */
export async function getCreateProvider(): Promise<typeof createProviderFn> {
    const mod = await getGraphtyElement();

    // The declaration above is the app's own, not the element's, so the shapes are asserted
    return (mod as unknown as { createProvider: typeof createProviderFn }).createProvider;
}
