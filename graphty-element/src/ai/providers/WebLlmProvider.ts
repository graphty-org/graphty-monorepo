/**
 * WebLLM Provider - In-browser LLM using WebGPU.
 * Lazy-loads the @mlc-ai/web-llm package on demand.
 * @module ai/providers/WebLlmProvider
 */

// Types only: erased at runtime, so the optional peer is never loaded by this import.
import type {
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionMessageParam,
    ChatCompletionRequestBase,
    ChatCompletionTool,
    MLCEngineInterface,
} from "@mlc-ai/web-llm";

import { aiProviderDescriptor } from "../../catalog/ai";
import { GraphtyError } from "../../errors/GraphtyError";
import { toolJsonSchema } from "../engine/jsonSchema";
import { missingPackage } from "../missingPackage";
import type {
    LlmProvider,
    LlmResponse,
    Message,
    ProviderOptions,
    StreamCallbacks,
    ToolCall,
    ToolDefinition,
} from "./types";

/**
 * What the provider is doing while it loads: `"module"` loads `@mlc-ai/web-llm`, `"engine"`
 * downloads and compiles the model, `"ready"` is the model loaded.
 */
export type WebLlmProgressStage = "module" | "engine" | "ready";

/**
 * Progress while the provider loads.
 * @param progress - From 0 to 1.
 * @param stage - What it is doing.
 * @param detail - During `"engine"`, WebLLM's own report text, untranslated; absent otherwise.
 */
export type ProgressCallback = (progress: number, stage: WebLlmProgressStage, detail?: string) => void;

/** Model information */
export interface WebLlmModelInfo {
    /** Model identifier for WebLLM */
    id: string;
    /** Human-readable model name */
    name: string;
    /** Approximate model size (e.g., "500MB", "1.5GB") */
    size: string;
    /** Optional description */
    description?: string;
    /**
     * Whether the model can call the assistant's tools. WebLLM accepts tools only for the
     * models in its `functionCallingModelIds`; any other model answers in text only, and the
     * provider then sends it no tools. Always set on the entries `getAvailableModels()` returns.
     */
    supportsTools?: boolean;
    /** Approximate download size in megabytes. Always set on the entries `getAvailableModels()` returns. */
    downloadMB?: number;
}

/** Options for a new `WebLlmProvider` (from `getWebLlmProviderClass()`). */
export interface WebLlmProviderOptions {
    /**
     * Load the model on the first request instead of failing until `initialize()` has been
     * called. Default false.
     */
    initializeOnFirstUse?: boolean;
}

/** The optional peer package the provider runs on. */
const WEBLLM_PACKAGE = "@mlc-ai/web-llm";

/**
 * Load `@mlc-ai/web-llm`, so a page that picks the in-browser provider learns at once whether
 * it can run.
 * @throws A `GraphtyError` with `E_MISSING_PACKAGE` when the package is not installed.
 */
export async function requireWebLlmPackage(): Promise<void> {
    try {
        await import("@mlc-ai/web-llm");
    } catch (error_) {
        throw missingPackage(WEBLLM_PACKAGE, "webllm", error_);
    }
}

const WEBLLM = aiProviderDescriptor("webllm");

/** The model the provider loads when none is configured. */
const DEFAULT_MODEL_ID = WEBLLM.defaultModel;

/** The description `getAvailableModels()` gives each model, by id. */
const MODEL_DESCRIPTIONS: Readonly<Record<string, string>> = {
    "Llama-3.2-1B-Instruct-q4f32_1-MLC": "Fast, lightweight model suitable for quick responses",
    "Llama-3.2-3B-Instruct-q4f32_1-MLC": "Better quality responses with reasonable performance",
    "Phi-3.5-mini-instruct-q4f16_1-MLC": "Good balance of quality and performance",
    "Qwen2.5-1.5B-Instruct-q4f16_1-MLC": "Efficient model with good multilingual support",
    "SmolLM2-360M-Instruct-q4f16_1-MLC": "Very small and fast, basic capabilities",
    "Hermes-3-Llama-3.1-8B-q4f16_1-MLC": "Can call the assistant's tools; large download",
    "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC": "Can call the assistant's tools; large download",
};

/**
 * Available models with their metadata: the WebLLM models of the AI catalogue
 * (`AI_PROVIDER_DESCRIPTORS` in `./catalog`).
 *
 * `supportsTools` mirrors WebLLM's exported `functionCallingModelIds`, which cannot be read
 * here without loading the whole optional package; test/ai/providers/WebLlmProvider.test.ts
 * checks every entry against that export, and once the package is loaded the provider reads
 * the export itself (see `modelSupportsTools`).
 */
const AVAILABLE_MODELS: WebLlmModelInfo[] = WEBLLM.models.map((model) => {
    const downloadMB = model.downloadMB ?? 0;
    return {
        id: model.id,
        name: model.plainName,
        size: downloadMB >= 1000 ? `~${downloadMB / 1000}GB` : `~${downloadMB}MB`,
        description: MODEL_DESCRIPTIONS[model.id],
        supportsTools: model.supportsTools,
        downloadMB,
    };
});

/** A tool call as WebLLM returns it, whole or streamed. */
interface WebLlmToolCall {
    id?: string;
    function?: { name?: string; arguments?: string };
}

/**
 * Parse a tool call's arguments. WebLLM declares them JSON text; an object is taken as it is.
 * Text that is not a JSON object (malformed, or a string, number, array or null) gives no
 * arguments and the invalid flag, so the call is refused rather than run.
 * @param args - The arguments.
 * @returns The parsed arguments, or none and the invalid flag.
 */
function parseArguments(
    args: string | Record<string, unknown> | undefined,
): Pick<ToolCall, "arguments" | "invalidArguments"> {
    if (typeof args !== "string") {
        return { arguments: args ?? {} };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(args);
    } catch {
        return { arguments: {}, invalidArguments: true };
    }

    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? { arguments: parsed as Record<string, unknown> }
        : { arguments: {}, invalidArguments: true };
}

/**
 * Report each named tool call of one streamed delta: collect it and hand it to the callbacks.
 * @param toolCallsArray - The delta's tool calls, if any.
 * @param toolCalls - The calls collected so far.
 * @param callbacks - Streaming callbacks for text and tool calls.
 */
function emitToolCalls(
    toolCallsArray: WebLlmToolCall[] | undefined,
    toolCalls: ToolCall[],
    callbacks: StreamCallbacks,
): void {
    if (!toolCallsArray) {
        return;
    }

    for (const tc of toolCallsArray) {
        if (tc.function?.name) {
            const toolCall: ToolCall = {
                id: tc.id ?? `call_${Date.now()}`,
                name: tc.function.name,
                ...parseArguments(tc.function.arguments),
            };
            toolCalls.push(toolCall);
            if (!toolCall.invalidArguments) {
                callbacks.onToolCall(toolCall.name, toolCall.arguments);
            }
        }
    }
}

/**
 * The error a cancelled request rejects with.
 * @returns A new one.
 */
const ABORTED = (): Error => new Error("Request was aborted");

/**
 * Throw the cancelled error once the signal has fired.
 * @param signal - The request's signal.
 */
function throwIfAborted(signal: AbortSignal | undefined): void {
    if (signal?.aborted) {
        throw ABORTED();
    }
}

/**
 * Stop the engine's generation when the signal fires, so a cancelled turn frees the GPU at once.
 * @param engine - The engine generating.
 * @param signal - The request's signal.
 * @returns Stops listening.
 */
function interruptOnAbort(engine: MLCEngineInterface, signal: AbortSignal | undefined): () => void {
    const interrupt = (): void => {
        engine.interruptGenerate();
    };
    signal?.addEventListener("abort", interrupt, { once: true });
    return () => {
        signal?.removeEventListener("abort", interrupt);
    };
}

/**
 * LLM provider using WebLLM for in-browser inference via WebGPU.
 * No API key required - runs entirely in the browser.
 */
export class WebLlmProvider implements LlmProvider {
    readonly name = "webllm";
    readonly supportsStreaming = true;
    readonly supportsTools = true;
    readonly supportsSystemPromptWithTools = false; // Hermes models don't support custom system prompts with tools

    private model?: string;
    private maxTokens?: number;
    private temperature?: number;

    private readonly progressCallbacks = new Set<ProgressCallback>();
    private initialized = false;
    private ready = false;

    // WebLLM engine instance (dynamically imported)
    private engine: MLCEngineInterface | null = null;

    // WebLLM's own list of models it accepts tools for, read once the package has loaded
    private toolCapableModelIds?: readonly string[];

    private readonly initializeOnFirstUse: boolean;
    private initializing?: Promise<void>;

    /**
     * Creates a provider. Nothing is loaded until `initialize()` or, with
     * `initializeOnFirstUse`, the first request.
     * @param options - How the provider starts
     */
    constructor(options: WebLlmProviderOptions = {}) {
        this.initializeOnFirstUse = options.initializeOnFirstUse ?? false;
    }

    /**
     * Check if WebGPU is available in the current browser.
     * @returns Promise resolving to true if WebGPU is available
     */
    static async isWebGPUAvailable(): Promise<boolean> {
        if (typeof navigator === "undefined") {
            return false;
        }

        try {
            // Check for WebGPU support
            if (!("gpu" in navigator)) {
                return false;
            }

            const { gpu } = navigator;
            if (!gpu) {
                return false;
            }

            const adapter = await gpu.requestAdapter();
            return Boolean(adapter);
        } catch {
            return false;
        }
    }

    /**
     * Get list of available models for WebLLM.
     * @returns Array of available model information
     */
    static getAvailableModels(): WebLlmModelInfo[] {
        return Array.from(AVAILABLE_MODELS);
    }

    /**
     * Whether the configured model can call tools. A model that cannot answers in text only:
     * the provider sends it no tools. Before `initialize()` this comes from the model's entry in
     * `getAvailableModels()` (false for a model not listed there); after it, from WebLLM's own
     * `functionCallingModelIds`.
     * @returns True if the configured model is sent the assistant's tools
     */
    get modelSupportsTools(): boolean {
        const id = this.model ?? DEFAULT_MODEL_ID;
        if (this.toolCapableModelIds) {
            return this.toolCapableModelIds.includes(id);
        }

        return AVAILABLE_MODELS.find((m) => m.id === id)?.supportsTools ?? false;
    }

    /**
     * Configure the provider with options.
     * @param options - Provider configuration options
     */
    configure(options: ProviderOptions): void {
        if (options.model) {
            this.model = options.model;
        }

        if (options.maxTokens !== undefined) {
            this.maxTokens = options.maxTokens;
        }

        if (options.temperature !== undefined) {
            this.temperature = options.temperature;
        }
    }

    /**
     * Check if the provider is initialized.
     * @returns True if initialized
     */
    get isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Check if the provider is ready to generate responses.
     * @returns True if ready
     */
    get isReady(): boolean {
        return this.ready;
    }

    /**
     * Register a progress callback for initialization.
     * @param callback - Function to call with progress updates
     */
    onProgress(callback: ProgressCallback): void {
        this.progressCallbacks.add(callback);
    }

    /**
     * Remove a progress callback.
     * @param callback - Callback function to remove
     */
    offProgress(callback: ProgressCallback): void {
        this.progressCallbacks.delete(callback);
    }

    /**
     * Emit progress to all registered callbacks (used for testing).
     * @param progress - Progress value (0-1)
     * @param stage - What the provider is doing
     * @param detail - WebLLM's own report text
     */
    simulateProgress(progress: number, stage: WebLlmProgressStage, detail?: string): void {
        this.emitProgress(progress, stage, detail);
    }

    /**
     * Emit progress to all registered callbacks.
     * @param progress - Progress value (0-1)
     * @param stage - What the provider is doing
     * @param detail - WebLLM's own report text
     */
    private emitProgress(progress: number, stage: WebLlmProgressStage, detail?: string): void {
        for (const callback of this.progressCallbacks) {
            callback(progress, stage, detail);
        }
    }

    /**
     * Initialize the WebLLM engine.
     * This lazy-loads the @mlc-ai/web-llm package and downloads the model.
     * @throws A `GraphtyError` with `E_NO_WEBGPU` when the browser has no usable WebGPU, or
     *     `E_MISSING_PACKAGE` when `@mlc-ai/web-llm` is not installed.
     */
    async initialize(): Promise<void> {
        // Check WebGPU availability
        const webGpuAvailable = await WebLlmProvider.isWebGPUAvailable();
        if (!webGpuAvailable) {
            throw new GraphtyError({
                code: "E_NO_WEBGPU",
                message: "The in-browser AI provider needs WebGPU, which this browser does not offer.",
                source: "config",
                details: { feature: "webllm" },
            });
        }

        try {
            this.emitProgress(0, "module");

            // Dynamically import @mlc-ai/web-llm
            let webllm;
            try {
                webllm = await import("@mlc-ai/web-llm");
            } catch (error_) {
                throw missingPackage(WEBLLM_PACKAGE, "webllm", error_);
            }

            this.emitProgress(0.1, "engine");

            this.toolCapableModelIds = webllm.functionCallingModelIds;
            const modelId = this.model ?? DEFAULT_MODEL_ID;

            // Create engine with progress callback
            this.engine = await webllm.CreateMLCEngine(modelId, {
                initProgressCallback: (report) => {
                    // Map progress from 0.1 to 1.0 (reserve 0-0.1 for module loading)
                    const mappedProgress = 0.1 + report.progress * 0.9;
                    this.emitProgress(mappedProgress, "engine", report.text);
                },
            });

            this.initialized = true;
            this.ready = true;
            this.emitProgress(1, "ready");
        } catch (error) {
            this.initialized = false;
            this.ready = false;
            throw error;
        }
    }

    /**
     * Make the engine ready for a request: initialize it once when `initializeOnFirstUse` is set,
     * otherwise fail as before.
     * @returns The engine.
     */
    private async ensureInitialized(): Promise<MLCEngineInterface> {
        if (this.initialized && this.engine) {
            return this.engine;
        }

        if (!this.initializeOnFirstUse) {
            throw new Error("WebLLM not initialized. Call initialize() first.");
        }

        this.initializing ??= this.initialize().finally(() => {
            this.initializing = undefined;
        });
        await this.initializing;
        if (!this.engine) {
            throw new Error("WebLLM not initialized. Call initialize() first.");
        }

        return this.engine;
    }

    /**
     * Generate a response from the LLM.
     * @param messages - Conversation messages
     * @param tools - Available tools for the LLM
     * @param options - Generation options
     * @param options.signal - Optional abort signal
     * @param options.toolChoice - "none" sends no tools, so the model answers in text
     * @returns Promise resolving to LLM response
     */
    async generate(
        messages: Message[],
        tools: ToolDefinition[],
        options?: { signal?: AbortSignal; toolChoice?: "auto" | "none" },
    ): Promise<LlmResponse> {
        if (options?.signal?.aborted) {
            throw ABORTED();
        }

        const engine = await this.ensureInitialized();
        const signal = options?.signal;
        const stopEngine = interruptOnAbort(engine, signal);

        try {
            const sendTools = this.shouldSendTools(tools, options?.toolChoice);

            let response = await engine.chat.completions.create({
                ...this.buildRequest(messages, sendTools ? tools : []),
                stream: false,
            });

            // Sent tools, WebLLM constrains a Hermes model to a JSON list of calls, so it cannot
            // answer in words. An empty list means it has nothing to call: ask again without tools
            // for the text answer.
            if (sendTools && !response.choices[0]?.message.tool_calls?.length) {
                throwIfAborted(signal);
                response = await engine.chat.completions.create({
                    ...this.buildRequest(messages, []),
                    stream: false,
                });
            }

            throwIfAborted(signal);
            return this.convertResponse(response);
        } catch (error) {
            throwIfAborted(signal);
            throw error;
        } finally {
            stopEngine();
        }
    }

    /**
     * Generate a streaming response from the LLM.
     * @param messages - Conversation messages
     * @param tools - Available tools for the LLM
     * @param callbacks - Streaming callbacks for text and tool calls
     * @param signal - Optional abort signal
     */
    async generateStream(
        messages: Message[],
        tools: ToolDefinition[],
        callbacks: StreamCallbacks,
        signal?: AbortSignal,
    ): Promise<void> {
        if (signal?.aborted) {
            throw ABORTED();
        }

        const engine = await this.ensureInitialized();
        const stopEngine = interruptOnAbort(engine, signal);

        try {
            const sendTools = this.shouldSendTools(tools);

            const stream: AsyncIterable<ChatCompletionChunk> = await engine.chat.completions.create({
                ...this.buildRequest(messages, sendTools ? tools : []),
                stream: true,
            });

            let accumulatedText = "";
            const toolCalls: ToolCall[] = [];

            for await (const chunk of stream) {
                throwIfAborted(signal);

                const delta = chunk.choices[0]?.delta;
                if (!delta) {
                    continue;
                }

                // Handle text content
                if (delta.content) {
                    accumulatedText += delta.content;
                    callbacks.onChunk(delta.content);
                }

                // Handle tool calls (snake_case from OpenAI API)
                emitToolCalls(delta.tool_calls, toolCalls, callbacks);
            }

            callbacks.onComplete({
                text: accumulatedText,
                toolCalls,
            });
        } catch (error) {
            let err = error instanceof Error ? error : new Error(String(error));
            if (signal?.aborted) {
                err = ABORTED();
            }

            callbacks.onError(err);
            throw err;
        } finally {
            stopEngine();
        }
    }

    /**
     * Validate the API key.
     * For WebLLM, no API key is needed, so this always returns true.
     * @returns Promise resolving to true
     */
    validateApiKey(): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * Dispose of the engine and free resources.
     */
    async dispose(): Promise<void> {
        try {
            await this.engine?.unload();
        } catch {
            // Ignore disposal errors
        }

        this.engine = null;
        this.initialized = false;
        this.ready = false;
    }

    /**
     * Whether to send tools on this request: never to a model WebLLM refuses them for.
     * @param tools - The tools the caller offers
     * @param toolChoice - "none" asks for a text answer
     * @returns True if the request carries the tools
     */
    private shouldSendTools(tools: ToolDefinition[], toolChoice?: "auto" | "none"): boolean {
        return tools.length > 0 && toolChoice !== "none" && this.modelSupportsTools;
    }

    /**
     * Build a chat completion request in the OpenAI shape WebLLM takes.
     * @param messages - Conversation messages
     * @param tools - Tools to send; empty for none
     * @returns The request, without `stream`
     */
    private buildRequest(messages: Message[], tools: ToolDefinition[]): ChatCompletionRequestBase {
        // OpenAI API requires snake_case keys
        /* eslint-disable camelcase */
        const request: ChatCompletionRequestBase = {
            messages: this.convertMessages(messages),
            temperature: this.temperature ?? 0.7,
            max_tokens: this.maxTokens ?? 1024,
        };

        if (tools.length > 0) {
            request.tools = this.convertTools(tools);
            request.tool_choice = "auto";
        }
        /* eslint-enable camelcase */

        return request;
    }

    /**
     * Convert our Message format to OpenAI format.
     * @param messages - Messages to convert
     * @returns Array of OpenAI formatted messages
     */
    private convertMessages(messages: Message[]): ChatCompletionMessageParam[] {
        /* eslint-disable camelcase */
        return messages.map((msg) => {
            if (msg.role === "tool") {
                // OpenAI API uses snake_case
                return {
                    role: "tool",
                    tool_call_id: msg.toolCallId ?? "",
                    content: msg.content,
                };
            }

            if (msg.role === "assistant" && msg.toolCalls?.length) {
                // WebLLM requires string content and reads only the content of an assistant
                // turn, so the calls go in as the JSON list a Hermes model emits for them.
                // OpenAI API uses snake_case
                return {
                    role: "assistant",
                    content: JSON.stringify(msg.toolCalls.map((tc) => ({ name: tc.name, arguments: tc.arguments }))),
                    tool_calls: msg.toolCalls.map((tc) => ({
                        id: tc.id,
                        type: "function" as const,
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.arguments),
                        },
                    })),
                };
            }

            return {
                role: msg.role,
                content: msg.content,
            };
        });
        /* eslint-enable camelcase */
    }

    /**
     * Convert our ToolDefinition format to OpenAI function format.
     * @param tools - Tool definitions to convert
     * @returns Array of OpenAI formatted tool objects
     */
    private convertTools(tools: ToolDefinition[]): ChatCompletionTool[] {
        return tools.map((t) => ({
            type: "function" as const,
            function: {
                name: t.name,
                description: t.description,
                // WebLLM writes the tools into the model's prompt as JSON, so it needs JSON Schema, not Zod
                parameters: toolJsonSchema(t.parameters),
            },
        }));
    }

    /**
     * Convert OpenAI response format to our LlmResponse format.
     * @param response - OpenAI response to convert
     * @returns Converted LLM response
     */
    private convertResponse(response: ChatCompletion): LlmResponse {
        const message = response.choices[0]?.message;

        const toolCalls: ToolCall[] = [];
        // OpenAI API uses snake_case
        for (const tc of message?.tool_calls ?? []) {
            toolCalls.push({
                id: tc.id,
                name: tc.function.name,
                ...parseArguments(tc.function.arguments),
            });
        }

        // OpenAI API uses snake_case for usage fields
        const promptTokens = response.usage?.prompt_tokens;
        const completionTokens = response.usage?.completion_tokens;

        return {
            text: message?.content ?? "",
            toolCalls,
            usage: response.usage
                ? {
                      promptTokens: promptTokens ?? 0,
                      completionTokens: completionTokens ?? 0,
                  }
                : undefined,
        };
    }
}
