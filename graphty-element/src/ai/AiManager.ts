/**
 * AI Manager Module - Graph integration manager for AI functionality.
 * Follows a similar pattern to the Manager interface used throughout the codebase.
 * @module ai/AiManager
 */

import debounce from "lodash/debounce.js";

import {
    AI_PROVIDER_IDS,
    type AiCapabilities,
    type AiProviderId,
    type AiResultCode,
    type AiResultParams,
    type AiVoiceDestination,
    type AiVoiceReadiness,
    type AiVoiceRoute,
} from "../catalog/ai";
import type { AiApprovalRequest, AiQuestionRequest } from "../events";
import type { Graph } from "../Graph";
import type { AiAgentsSetting, AiToolOptions } from "./agents";
import {
    type AiApprovalAnswer,
    type AiApprovalsSetting,
    type AiCommandOptions,
    AiController,
    type AiControllerOptions,
    type AiHistoryOptions,
    type ExecutionResult,
} from "./AiController";
import { type AiStatus, AiStatusManager, type StatusChangeCallback } from "./AiStatus";
import { CommandRegistry } from "./commands";
import { offeredName } from "./commands/CommandRegistry";
import { defaultConversationKey } from "./conversation/scope";
import type { AiConversationSnapshot, AiConversationSummary } from "./conversation/snapshot";
import { ApiKeyManager } from "./keys";
import { createProvider, type ProviderType } from "./providers";
import type { LlmProvider } from "./providers/types";
import { checkAgents } from "./roles";
import { SchemaManager } from "./schema";
import { installAssistantTools } from "./tools/install";
import type { AssistantGateLimits } from "./tools/types";

/** Default debounce delay for schema updates in milliseconds */
const SCHEMA_UPDATE_DEBOUNCE_MS = 300;

/**
 * Configuration for enabling encrypted key persistence.
 */
export interface KeyPersistenceConfig {
    /** Enable encrypted key persistence */
    enabled: boolean;
    /** Encryption key for AES encryption (min 10 characters) */
    encryptionKey: string;
    /** Storage backend (default: "localStorage") */
    storage?: "localStorage" | "sessionStorage";
    /** Storage key prefix (default: "@graphty-ai-keys") */
    prefix?: string;
}

/**
 * How one direction of speech is carried: `"auto"` (the element chooses; see
 * `AiVoiceOptions.input` and `.output`), `"browser"` (the browser's own recognition or speech),
 * `"provider"` (the AI provider transcribes or speaks), `"off"`.
 */
export type AiVoiceMode = "auto" | "browser" | "provider" | "off";

/**
 * Speaking to the assistant and hearing it answer (`AiManagerConfig.voice`), driven by
 * `aiTalk(true)` and `aiTalk(false)`. Voice is never the only way to a command: every utterance
 * becomes the same `aiCommand` a typed message sends.
 */
export interface AiVoiceOptions {
    /**
     * Speech to text. `"auto"` (the default): the browser's recognition where it works, else the
     * provider's transcription, else `AI_VOICE_UNAVAILABLE`.
     */
    input?: AiVoiceMode;
    /** Text to speech. `"auto"` (the default): off on a flat page, on in an immersive session. */
    output?: AiVoiceMode;
    /** The language spoken and heard, a BCP 47 tag (`"fr-FR"`). Default: the page's language. */
    language?: string;
    /** The voice the provider speaks with, by the provider's own name for it. */
    voiceName?: string;
    /** `"hold"` (the default): talk while `aiTalk(true)` holds. `"toggle"`: each `aiTalk(true)` starts or ends. */
    push?: "hold" | "toggle";
    /**
     * Transcribe through another provider than the chat's, with its key from `apiKeys`: an
     * Anthropic reader's speech through OpenAI.
     */
    transcription?: { provider: AiProviderId; model?: string };
    /**
     * Utterances that answer a pending approval instead of sending a message, compared with case
     * and punctuation ignored. Default `{ approve: ["yes"], deny: ["no"] }`.
     */
    replies?: { approve?: readonly string[]; deny?: readonly string[] };
    /**
     * The words to speak for an outcome the model wrote no text for (an error, a held approval).
     * Return undefined to say nothing. Absent, such an outcome is not spoken: the element speaks
     * only text the model wrote, never words of its own.
     */
    say?: (fact: { code: AiResultCode; params: AiResultParams }) => string | undefined;
}

/** How one direction of speech would be carried now (`getAiVoiceSupport()`). */
export interface AiVoicePath {
    /** How it is carried, or `"none"`. */
    path: AiVoiceRoute;
    /** Whether it can be used now. */
    status: AiVoiceReadiness;
    /** Why not, when it cannot: `AI_VOICE_UNAVAILABLE`, or `AI_NOT_ENABLED` without `voice`. */
    code?: AiResultCode;
    /** The facts behind `code` (`{ path, reason }` for `AI_VOICE_UNAVAILABLE`). */
    params?: AiResultParams;
    /** Where the audio or the text goes. */
    destination: AiVoiceDestination;
}

/** Each direction of speech, as `getAiVoiceSupport()` finds it. */
export interface AiVoiceSupport {
    /** Speech to text. */
    input: AiVoicePath;
    /** Text to speech. */
    output: AiVoicePath;
}

/** Speech that cannot be used because the assistant has no `voice`. */
const NO_VOICE_PATH: AiVoicePath = Object.freeze({
    path: "none",
    status: "unavailable",
    code: "AI_NOT_ENABLED",
    params: {},
    destination: "none",
});

/** Both directions, unavailable: the assistant has no `voice`, or is not enabled. */
export const NO_VOICE_SUPPORT: AiVoiceSupport = Object.freeze({ input: NO_VOICE_PATH, output: NO_VOICE_PATH });

/**
 * Configuration options for initializing the AiManager.
 */
export interface AiManagerConfig {
    /**
     * The LLM provider to use (e.g., "openai", "anthropic", "google", "mock", "webllm").
     * `"webllm"` is built by `enableAiControl`; `AiManager.init` itself needs it as
     * `providerInstance`.
     */
    provider: ProviderType;
    /** Optional API key for the provider */
    apiKey?: string;
    /** Optional model name override */
    model?: string;
    /**
     * Whether to register the assistant's own tools (default: true). They are generated from the
     * element's catalog, so an algorithm, layout, format, palette or camera a plugin registers
     * reaches the model with no further code.
     */
    registerBuiltinCommands?: boolean;
    /**
     * Which tools a model is offered: `"standard"` (eleven core tools plus those a catalog search
     * loads), `"small"` (four tools, for a model that breaks past a handful), or `"auto"` (the
     * default: `"small"` for WebLLM, `"standard"` otherwise).
     */
    toolProfile?: "standard" | "small" | "auto";
    /**
     * The limits past which the assistant's changes are held for the reader's approval (the
     * `ai-approval-requested` event, answered with `resolveAiApproval`), or `false` to run every
     * change without asking. A host that handles no approval events never runs a held change.
     * Default `DEFAULT_ASSISTANT_GATE_LIMITS`.
     */
    gate?: Partial<AssistantGateLimits> | false;
    /**
     * Admits a URL the reader did not type for an import (an admitted URL is still held for
     * approval). Absent, the assistant imports only URLs that appear in the reader's own message.
     */
    allowImportUrl?: (url: URL) => boolean;
    /** Optional custom provider instance (e.g., pre-initialized WebLlmProvider) */
    providerInstance?: LlmProvider;
    /** Key persistence configuration for encrypted storage */
    keyPersistence?: KeyPersistenceConfig;
    /**
     * Whether the assistant remembers: `"none"` (the default: every message starts a new
     * conversation), `"memory"` (one conversation across messages, while the page lives),
     * `"browser"` (kept in IndexedDB, reopened after a reload), or `AiHistoryOptions`. Saved
     * conversations stay on the reader's device, unencrypted; no API key is saved.
     */
    history?: "none" | "memory" | "browser" | AiHistoryOptions;
    /**
     * Which of the assistant's calls the reader is asked about before they run: `"none"` (the
     * default), `"writes"` (every call that changes the project), `{ ask: ["style"] }` (calls to
     * these tools) or `{ policy(call) { return "allow" | "ask" | "deny"; } }`, decided per call
     * from its tool, action, arguments and effect. An ask holds the batch (`ai-approval-requested`
     * with gate `"policy"`); a deny refuses it (`AI_TOOL_DENIED_BY_POLICY`). The `gate` limits
     * still apply.
     */
    approvals?: AiApprovalsSetting;
    /**
     * Whether the model may ask the reader a question with a few choices when a request is
     * ambiguous: `ai-question-asked`, answered with `answerAiQuestion`. Default false, for a host
     * that draws no question: the model is offered no such tool.
     */
    questions?: boolean;
    /**
     * Helpers the main model may hand parts of a message to: `[{ name, purpose, commands }]`, or
     * `{ roles }`. The model is offered a `delegate` tool naming them; each helper runs with only
     * its own commands (the assistant's tool names), on the assistant's provider or on its own
     * `provider` and `model`. Helpers that run at once may only read. `ai-agent-start` and
     * `ai-agent-end` report each. Default none: no `delegate` tool. `enableAiControl` rejects a
     * configuration that cannot run with an `AiConfigError` naming the helper and field.
     */
    agents?: AiAgentsSetting;
    /**
     * API keys for the providers helpers run on, beside `apiKey` (`{ anthropic: key }`); a provider
     * without one here uses the key manager's.
     */
    apiKeys?: Partial<Record<AiProviderId, string>>;
    /**
     * Tools beyond the assistant's own commands, each off by default: `{ webSearch: true }` lets
     * the main model hand a search to a built-in read-only `research` helper, which alone runs it
     * at the provider (and the reader's key pays). A tool the provider and model cannot use is left
     * out and reported once on `ai-capability-unavailable`, or with `required: true` every command
     * resolves `AI_HOSTED_TOOL_UNSUPPORTED`; `getCapabilities()` says which can be used.
     */
    tools?: AiToolOptions;
    /**
     * Speech in and out, pressed with `aiTalk`. Default absent: no voice, and `aiTalk(true)` ends
     * at once with `ai-voice-end` `{ code: "AI_NOT_ENABLED" }`.
     */
    voice?: AiVoiceOptions;
}

/**
 * The id that scopes an element's conversations: the `<graphty-element>`'s own, when the graph
 * draws inside one, else the graph's container's.
 * @param element - The graph's container.
 * @returns The id.
 */
function scopeId(element: Element | undefined): string {
    const root = element?.getRootNode();
    const host = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root.host : element;
    return host?.id ?? "";
}

/**
 * The history options the controller gets: the setting, with the default key filled in.
 * @param history - The setting.
 * @param graph - The graph, for its element.
 * @returns The options, or undefined for none.
 */
function historyFor(history: AiManagerConfig["history"], graph: Graph): AiControllerOptions["history"] {
    if (history === undefined || history === "none") {
        return undefined;
    }

    const options: AiHistoryOptions = typeof history === "string" ? { store: history } : history;
    return {
        ...options,
        key:
            options.key ??
            defaultConversationKey(
                scopeId((graph as { element?: Element }).element),
                globalThis.location?.pathname ?? "",
            ),
    };
}

/**
 * The profile `"auto"` picks.
 * @param smallModel - Whether the provider runs a small in-browser model.
 * @returns The profile.
 */
function toolProfileFor(smallModel: boolean): "standard" | "small" {
    return smallModel ? "small" : "standard";
}

/**
 * AI Manager that integrates LLM-powered natural language control with the Graph.
 * Follows a similar pattern to the Manager interface with init() and dispose().
 *
 * Note: Does not implement the Manager interface directly because it requires
 * graph and config parameters during initialization.
 */
export class AiManager {
    private graph: Graph | null = null;
    private controller: AiController | null = null;
    private provider: LlmProvider | null = null;
    private commandRegistry: CommandRegistry;
    private apiKeyManager: ApiKeyManager;
    /** Every API key the page has given, kept out of saved and exported conversations. */
    private readonly keysSeen = new Set<string>();
    private statusManager: AiStatusManager;
    private schemaManager: SchemaManager | null = null;
    private dataAddedListenerId: symbol | null = null;
    private debouncedSchemaUpdate: ReturnType<typeof debounce> | null = null;
    private disposed = false;
    private initialized = false;

    /**
     * Creates a new AiManager instance.
     */
    constructor() {
        this.commandRegistry = new CommandRegistry();
        this.apiKeyManager = new ApiKeyManager();
        this.statusManager = new AiStatusManager();
    }

    /**
     * Initialize the AI Manager with a graph and configuration.
     * @param graph - The graph instance to control
     * @param config - Configuration options
     */
    init(graph: Graph, config: AiManagerConfig): void {
        if (this.initialized) {
            return;
        }

        // Helpers that cannot run are rejected before anything is built.
        if (config.agents !== undefined) {
            checkAgents(config.agents, config.providerInstance?.name ?? config.provider);
        }

        this.graph = graph;
        this.disposed = false;

        // Configure key persistence if specified (before setting API key)
        if (config.keyPersistence?.enabled) {
            this.apiKeyManager.enablePersistence({
                encryptionKey: config.keyPersistence.encryptionKey,
                storage: config.keyPersistence.storage ?? "localStorage",
                prefix: config.keyPersistence.prefix,
            });
        }

        // Use custom provider instance if provided, otherwise create one
        if (config.providerInstance) {
            this.provider = config.providerInstance;
        } else {
            // Create the provider
            this.provider = createProvider(config.provider);

            // Configure the provider with API key if provided (will be persisted if persistence enabled)
            if (config.apiKey) {
                this.keysSeen.add(config.apiKey);
                this.apiKeyManager.setKey(config.provider, config.apiKey);
                this.provider.configure({
                    apiKey: config.apiKey,
                    model: config.model,
                });
            }
        }

        // Register built-in commands unless disabled
        if (config.registerBuiltinCommands !== false) {
            this.registerBuiltinCommands();
        }

        // Initialize schema manager and set up data change listeners
        this.initializeSchemaManager();

        // Create the controller. WebLLM's models break past a handful of tools.
        const profile = config.toolProfile ?? "auto";
        const smallModel = config.provider === "webllm";
        const history = historyFor(config.history, graph);
        this.controller = new AiController({
            provider: this.provider,
            commandRegistry: this.commandRegistry,
            graph: this.graph,
            schemaManager: this.schemaManager,
            toolProfile: profile === "auto" ? toolProfileFor(smallModel) : profile,
            ...(config.gate === undefined ? {} : { gate: config.gate }),
            ...(config.allowImportUrl === undefined ? {} : { allowImportUrl: config.allowImportUrl }),
            ...(config.approvals === undefined ? {} : { approvals: config.approvals }),
            ...(config.questions === undefined ? {} : { questions: config.questions }),
            ...(config.agents === undefined ? {} : { agents: config.agents, apiKeys: this.helperKeys(config) }),
            ...(config.tools === undefined ? {} : { tools: config.tools }),
            ...(config.model === undefined ? {} : { model: config.model }),
            ...(history === undefined
                ? {}
                : {
                      history,
                      // Every key the page has given, rotated or removed ones included.
                      secrets: () => {
                          for (const provider of this.apiKeyManager.getConfiguredProviders()) {
                              this.keysSeen.add(this.apiKeyManager.getKey(provider) ?? "");
                          }

                          return [...this.keysSeen];
                      },
                  }),
            // Onto the graph's own event channel, so `addListener` and the element's DOM
            // forwarder both deliver every AI event.
            emitEvent: (event) => {
                graph.eventManager.emit(event.type, { ...event });
            },
        });

        this.initialized = true;
    }

    /**
     * The keys helpers' providers run with, read when a message runs: `apiKeys`, else the key
     * manager's (a key set later with `setApiKey` counts).
     * @param config - The configuration.
     * @returns The keys, by provider.
     */
    private helperKeys(config: AiManagerConfig): Partial<Record<AiProviderId, string>> {
        const keys: Partial<Record<AiProviderId, string>> = {};
        for (const id of AI_PROVIDER_IDS) {
            const given = config.apiKeys?.[id];
            if (given !== undefined) {
                this.keysSeen.add(given);
            }

            Object.defineProperty(keys, id, {
                enumerable: true,
                get: () => given ?? this.apiKeyManager.getKey(id),
            });
        }

        return keys;
    }

    /**
     * Initialize the schema manager and set up event listeners for data changes.
     */
    private initializeSchemaManager(): void {
        if (!this.graph) {
            return;
        }

        // Create schema manager
        this.schemaManager = new SchemaManager(this.graph);

        // Extract initial schema
        this.schemaManager.extract();

        // Set up debounced schema update
        this.debouncedSchemaUpdate = debounce(() => {
            if (this.schemaManager) {
                this.schemaManager.invalidateCache();
            }
        }, SCHEMA_UPDATE_DEBOUNCE_MS);

        // Listen for data-added events to update schema
        try {
            const { eventManager } = this.graph;
            this.dataAddedListenerId = eventManager.addListener("data-added", () => {
                this.debouncedSchemaUpdate?.();
            });
        } catch {
            // EventManager may not be available in all contexts (e.g., tests)
            // Schema will still work, just won't auto-update
        }
    }

    /**
     * Register built-in commands for graph control.
     */
    private registerBuiltinCommands(): void {
        if (this.graph) {
            installAssistantTools(this.commandRegistry, this.graph.getSession());
        }
    }

    /**
     * Register a custom command.
     *
     * Each assistant message is one undoable step. A command joins it by writing through
     * `ctx.tx` (`ctx.tx.styles.add`, `ctx.tx.layout.set`, `ctx.tx.run`): those changes are undone
     * with the rest of the message, and rolled back if a command throws. A change made through
     * `ctx.graph` is a step of its own and is not rolled back. A command stops when
     * `ctx.abortSignal` fires, which happens when the message is cancelled or undone while it is
     * still going.
     * @param command - The command to register
     */
    registerCommand(command: Parameters<CommandRegistry["register"]>[0]): void {
        // A name the assistant's own tools hold is offered to the model as app_<name>.
        if (!this.commandRegistry.has(offeredName(command.name))) {
            this.commandRegistry.register(command);
        }
    }

    /**
     * Answer a request the assistant made for the reader's approval (`ai-approval-requested`).
     * The message that made it continues: approve runs the held calls (with any `calls[].arguments`
     * the reader edited) as one more step of its message; deny drops them. The model hears the
     * decision and answers. A new message, a cancel or an undo of the message ends the request.
     * @param id - The request's id.
     * @param answer - The reader's answer.
     * @returns The message's final result (`ai-command-complete` fires again with it):
     *     `AI_COMPLETED`, `AI_APPROVAL_DENIED`, `AI_APPROVAL_STALE`, or `AI_CONFIRMATION_NEEDED`
     *     when another limit holds the calls again.
     */
    async resolveAiApproval(id: string, answer: AiApprovalAnswer): Promise<ExecutionResult> {
        if (!this.controller) {
            return { success: false, message: "", code: "AI_NOT_ENABLED", params: {} };
        }

        return this.controller.resolveAiApproval(id, answer);
    }

    /**
     * Answer a question the model asked the reader (`ai-question-asked`). The message that asked
     * continues with the answer as its question's result. A new message, a cancel or an undo of
     * the message ends the question instead.
     * @param id - The question's id.
     * @param answer - One of its choices, by value; or several, for a question that takes several.
     * @returns The message's final result (`ai-command-complete` fires again with it);
     *     `AI_ANSWER_INVALID` when the answer is not among the choices, and the question stays open;
     *     `AI_APPROVAL_STALE` when the question is no longer open.
     */
    async answerQuestion(id: string, answer: string | readonly string[]): Promise<ExecutionResult> {
        if (!this.controller) {
            return { success: false, message: "", code: "AI_NOT_ENABLED", params: {} };
        }

        return this.controller.answerQuestion(id, answer);
    }

    /**
     * The questions waiting on the reader: asked in this page, or reopened from the saved
     * conversation after a reload. Authoritative at any time, the replayed events or not.
     * @returns The questions, oldest first; none before the assistant is enabled.
     */
    getPendingQuestions(): readonly AiQuestionRequest[] {
        return this.controller?.getPendingQuestions() ?? [];
    }

    /**
     * What the assistant can use with its provider and model: each tool beyond its own commands
     * (`AiToolOptions`), and whether it can be used. Synchronous.
     * @returns The capabilities, or null before the assistant is enabled.
     */
    getCapabilities(): AiCapabilities | null {
        return this.controller?.getCapabilities() ?? null;
    }

    /**
     * Press or release talk. Without `voice` a press ends at once with `ai-voice-end`
     * `{ reason: "error", code: "AI_NOT_ENABLED" }`, and a release does nothing.
     * @param down - True to press, false to release.
     */
    talk(down: boolean): void {
        if (down) {
            this.graph?.eventManager.emit("ai-voice-end", { reason: "error", code: "AI_NOT_ENABLED", params: {} });
        }
    }

    /** Stop speaking an answer; nothing is spoken without `voice`. */
    stopSpeech(): void {
        // Nothing speaks without `voice`.
    }

    /**
     * How speech would be carried in each direction.
     * @returns Both directions; unavailable with `AI_NOT_ENABLED` without `voice`.
     */
    getVoiceSupport(): Promise<AiVoiceSupport> {
        return Promise.resolve(NO_VOICE_SUPPORT);
    }

    /**
     * Get names of all registered commands.
     * @returns Array of command names
     */
    getRegisteredCommands(): string[] {
        return this.commandRegistry.getNames();
    }

    /**
     * Execute a natural language command.
     * @param input - The user's natural language input
     * @param options - The saved conversation to send it into.
     * @returns Promise resolving to the execution result
     */
    async execute(input: string, options?: AiCommandOptions): Promise<ExecutionResult> {
        if (this.disposed) {
            return {
                success: false,
                message: "AI Manager has been disposed. Please re-initialize before using.",
                code: "AI_DISPOSED",
                params: {},
            };
        }

        if (!this.controller) {
            return {
                success: false,
                message: "AI Manager not initialized. Call init() first.",
                code: "AI_NOT_ENABLED",
                params: {},
            };
        }

        return this.controller.execute(input, options);
    }

    /**
     * Resolves once the saved conversation is open: at once without `history`.
     * @returns When ready.
     */
    async ready(): Promise<void> {
        await this.controller?.ready();
    }

    /**
     * The open conversation, as an application draws it: what the reader and the model said, and
     * the calls the model made with their outcomes as codes.
     * @returns Its snapshot, or null without `history`.
     */
    getConversation(): AiConversationSnapshot | null {
        return this.controller?.getConversation() ?? null;
    }

    /**
     * The approval requests waiting on the reader: held in this page, or reopened from the saved
     * conversation after a reload. Authoritative at any time, the replayed events or not.
     * @returns The requests, oldest first; none before the assistant is enabled.
     */
    getPendingAiApprovals(): readonly AiApprovalRequest[] {
        return this.controller?.getPendingApprovals() ?? [];
    }

    /**
     * The saved conversations of this element's scope, newest first.
     * @param options - Which.
     * @param options.allKeys - True for every scope's.
     * @returns Their summaries; none without `history`.
     */
    async listConversations(options?: { readonly allKeys?: boolean }): Promise<readonly AiConversationSummary[]> {
        return (await this.controller?.listConversations(options)) ?? [];
    }

    /**
     * Make a saved conversation the open one; the next message continues it.
     * @param id - Its id.
     * @returns Its snapshot, or null when there is none.
     */
    async openConversation(id: string): Promise<AiConversationSnapshot | null> {
        return (await this.controller?.openConversation(id)) ?? null;
    }

    /**
     * Start a new conversation; the open one stays saved.
     * @returns Its snapshot, or null without `history`.
     */
    async newConversation(): Promise<AiConversationSnapshot | null> {
        return (await this.controller?.newConversation()) ?? null;
    }

    /**
     * Delete a saved conversation.
     * @param id - Its id.
     */
    async deleteConversation(id: string): Promise<void> {
        await this.controller?.deleteConversation(id);
    }

    /** Delete every saved conversation, of every scope: for a shared device's "end session". */
    async clearHistory(): Promise<void> {
        await this.controller?.clearHistory();
    }

    /**
     * A saved conversation as JSON, in the published `graphty-ai-conversation` format.
     * @param id - Its id.
     * @returns The JSON text, or null when there is none.
     */
    async exportConversation(id: string): Promise<string | null> {
        return (await this.controller?.exportConversation(id)) ?? null;
    }

    /**
     * Set an API key for a provider.
     * @param provider - The provider type (e.g., "openai")
     * @param key - The API key
     */
    setApiKey(provider: ProviderType, key: string): void {
        this.keysSeen.add(key);
        this.apiKeyManager.setKey(provider, key);

        // If this is the current provider, update it
        if (this.provider?.name === provider) {
            this.provider.configure({ apiKey: key });
        }
    }

    /**
     * Get the current AI status.
     * @returns Current status snapshot
     */
    getStatus(): AiStatus {
        return this.controller?.getStatus() ?? this.statusManager.getSnapshot();
    }

    /**
     * Subscribe to status changes.
     * @param callback - Function to call on status change
     * @returns Unsubscribe function
     */
    onStatusChange(callback: StatusChangeCallback): () => void {
        if (this.controller) {
            return this.controller.onStatusChange(callback);
        }

        // Fallback to internal status manager if controller not ready
        return this.statusManager.subscribe(callback);
    }

    /**
     * Cancel any in-progress AI command.
     */
    cancel(): void {
        this.controller?.cancel();
    }

    /**
     * Retry the last AI command that was executed.
     * Useful for retrying after transient errors.
     * @returns Promise resolving to the execution result
     * @throws Error if no previous command exists or AI is not initialized
     */
    async retry(): Promise<ExecutionResult> {
        if (this.disposed) {
            throw new Error("AI Manager has been disposed.");
        }

        if (!this.controller) {
            throw new Error("AI not enabled. Call enableAiControl() first.");
        }

        const lastInput = this.controller.getLastInput();

        if (!lastInput) {
            throw new Error("No previous command to retry.");
        }

        return this.controller.execute(lastInput);
    }

    /**
     * Get the command registry for external command registration.
     * @returns The command registry
     */
    getCommandRegistry(): CommandRegistry {
        return this.commandRegistry;
    }

    /**
     * Get the underlying AI controller (for advanced use).
     * @returns The AI controller or null if not initialized
     */
    getController(): AiController | null {
        return this.controller;
    }

    /**
     * Get the underlying LLM provider (for advanced use).
     * @returns The LLM provider or null if not initialized
     */
    getProvider(): LlmProvider | null {
        return this.provider;
    }

    /**
     * Get the schema manager (for advanced use).
     * @returns The schema manager or null if not initialized
     */
    getSchemaManager(): SchemaManager | null {
        return this.schemaManager;
    }

    /**
     * Get the API key manager for external key operations.
     * Useful for managing keys before AI is fully initialized.
     * @returns The API key manager
     */
    getApiKeyManager(): ApiKeyManager {
        return this.apiKeyManager;
    }

    /**
     * Dispose of the manager and clean up resources.
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.initialized = false;

        // Cancel any pending debounced updates
        if (this.debouncedSchemaUpdate) {
            this.debouncedSchemaUpdate.cancel();
            this.debouncedSchemaUpdate = null;
        }

        // Remove event listener
        if (this.dataAddedListenerId && this.graph) {
            try {
                const { eventManager } = this.graph;
                eventManager.removeListener(this.dataAddedListenerId);
            } catch {
                // EventManager may not be available
            }
            this.dataAddedListenerId = null;
        }

        // Clean up schema manager
        this.schemaManager = null;

        if (this.controller) {
            this.controller.dispose();
            this.controller = null;
        }

        this.provider = null;
        this.graph = null;
        this.commandRegistry.clear();
        this.statusManager.reset();
    }
}

/**
 * Create a new AiManager instance.
 * @returns A new AiManager
 */
export function createAiManager(): AiManager {
    return new AiManager();
}
