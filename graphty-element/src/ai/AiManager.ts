/**
 * AI Manager Module - Graph integration manager for AI functionality.
 * Follows a similar pattern to the Manager interface used throughout the codebase.
 * @module ai/AiManager
 */

import type { Scene } from "@babylonjs/core";
import debounce from "lodash/debounce.js";

import type { XRInputHandler } from "../cameras/XRInputHandler";
import {
    AI_PROVIDER_IDS,
    type AiCapabilities,
    aiProviderDescriptor,
    type AiProviderId,
    type AiResultCode,
    type AiResultParams,
    type AiVoiceDestination,
    type AiVoiceReadiness,
    type AiVoiceRoute,
} from "../catalog/ai";
import type { NodeId } from "../catalog/types";
import type { XRAiConfig } from "../config/XRConfig";
import type { AiApprovalRequest, AiQuestionRequest, NodeHoverEvent } from "../events";
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
import { engineFor } from "./engine/load";
import type { AiEngine } from "./engine/types";
import { ApiKeyManager } from "./keys";
import { createProvider, type ProviderType } from "./providers";
import type { LlmProvider } from "./providers/types";
import { checkAgents } from "./roles";
import { SchemaManager } from "./schema";
import { installAssistantTools } from "./tools/install";
import type { AssistantGateLimits } from "./tools/types";
import type * as VoicePrime from "./voice/prime";
import type { ProviderLiveSpeech, ProviderSpeech, VoiceSession } from "./voice/VoiceSession";

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
 * `AiVoiceOptions.input` and `.output`), `"on"` (by whichever path works, on every page),
 * `"browser"` (the browser's own recognition or speech), `"provider"` (the AI provider
 * transcribes or speaks), `"off"`.
 */
export type AiVoiceMode = "auto" | "on" | "browser" | "provider" | "off";

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
    /**
     * Text to speech. `"auto"` (the default): off on a flat page, on in an immersive session.
     * `"on"`: on everywhere, by the browser's speech, else the provider's.
     */
    output?: AiVoiceMode;
    /**
     * How a press of talk reaches the model. `"turns"` (the default): each utterance becomes text,
     * sent as a message, and the answer is spoken by `output`'s path. `"live"`: a live
     * conversation with the provider, speech to speech, where the provider can
     * (`getAiVoiceSupport().live`); where it cannot, a press runs turn by turn and
     * `ai-voice-start` says why.
     */
    mode?: "turns" | "live";
    /** The model of a live conversation. Default: the provider's (`AI_VOICE_CAPABILITIES`). */
    liveModel?: string;
    /** The language spoken and heard, a BCP 47 tag (`"fr-FR"`). Default: the page's language. */
    language?: string;
    /** The voice the provider speaks with, by the provider's own name for it. */
    voiceName?: string;
    /** `"hold"` (the default): talk while `aiTalk(true)` holds. `"toggle"`: each `aiTalk(true)` starts or ends. */
    push?: "hold" | "toggle";
    /**
     * A key (`KeyboardEvent.key`, such as `"v"`) that holds talk while it is held down with the
     * graph focused, so the mouse stays free to point at nodes ("color this"). Default: none.
     */
    holdKey?: string;
    /**
     * The longest one press listens, in seconds; past it the press ends as if released. Default
     * 60. `Infinity` for no limit.
     */
    maxPressSeconds?: number;
    /**
     * When the provider transcribes: the microphone level (0 to 1, as `ai-voice-level` reports it)
     * a press must reach to be sent. A quieter press was heard as nothing, so silence is never sent
     * to a model that might write words that were never said. Default 0.04. 0 sends every press.
     */
    speechLevel?: number;
    /**
     * Transcribe through another provider than the chat's, with its key from `apiKeys`: an
     * Anthropic reader's speech through OpenAI. `model` names the transcription model; for a
     * provider whose chat model transcribes (Google), it names that chat model.
     */
    transcription?: { provider: AiProviderId; model?: string };
    /**
     * Utterances that answer a pending approval instead of sending a message, compared with case
     * and punctuation ignored. Default `{ approve: ["yes"], deny: ["no"] }`, in English whatever
     * `language` is: set your own words for another language. `gates` lists the holds (the
     * request's `gate`) a spoken approve may answer; default `AI_VOICE_APPROVABLE_GATES`, which leaves
     * out `"web-content"` and `"irreversible"`. A spoken approve for any other hold changes nothing
     * and answers `AI_CONFIRMATION_NEEDED` `{ gate, request }`: it is approved on screen. A spoken
     * deny answers every hold.
     */
    replies?: { approve?: readonly string[]; deny?: readonly string[]; gates?: readonly string[] };
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
    /**
     * A live conversation with the provider (`AiVoiceOptions.mode: "live"`), whatever `mode` is
     * set to: `AI_VOICE_UNAVAILABLE` with `{ path: "input", reason }` when it cannot run.
     */
    live?: AiVoicePath;
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

/** What the element itself does with an assistant around an immersive session. */
export interface AssistantXrHooks {
    /** Inside the click that enters: ask for the microphone and unlock speech. */
    prime(): void;
    /** Bind talk, approve and deny, pointing and the cards to the session. */
    enter(input: XRInputHandler, scene: Scene, config: XRAiConfig | undefined): Promise<void>;
    /** Unbind, close a held microphone without sending, stop speaking. */
    leave(): void;
}

/** Each assistant's XR hooks, kept off the class so a consumer never sees them. */
const xrHooks = new WeakMap<AiManager, AssistantXrHooks>();

/**
 * The XR hooks of an assistant, for the element's own XR session code (Graph); not exported from
 * any entry point.
 * @param manager - The assistant.
 * @returns Its hooks.
 */
export function assistantXr(manager: AiManager): AssistantXrHooks {
    const hooks = xrHooks.get(manager);
    if (hooks === undefined) {
        throw new Error("An AiManager registers its XR hooks when it is constructed.");
    }

    return hooks;
}

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
    /** The assistant's `voice`, absent for none. */
    private voiceOptions: AiVoiceOptions | undefined;
    /** Push-to-talk, loaded on the first press or support read: `src/ai/voice/` is its own chunk. */
    private voiceSession: Promise<VoiceSession> | undefined;
    /** The session, once loaded. */
    private voiceSessionNow: VoiceSession | undefined;
    /** `apiKeys`, for a transcription provider other than the chat's. */
    private voiceKeys: AiManagerConfig["apiKeys"];
    /** The priming, loaded with `voice` so the Enter VR / AR click can prime at once. */
    private voicePrime: typeof VoicePrime | undefined;
    private voicePrimeLoad: Promise<void> | undefined;
    /** Unbinds the assistant from the immersive session it is bound to. */
    private xrUnbind: (() => void) | undefined;
    /** Counts binds and unbinds: a bind a later call superseded does nothing. */
    private xrGeneration = 0;
    /** Who hears what an XR ray points at while talk is held. */
    private readonly xrPointed = new Set<(id: NodeId) => void>();
    /** Who hears a spoken message's outcome. */
    private readonly voiceAnswered = new Set<(result: ExecutionResult) => void>();
    /** Stops `voice.holdKey` holding talk. */
    private unbindHoldKey: (() => void) | undefined;

    /**
     * Creates a new AiManager instance.
     */
    constructor() {
        this.commandRegistry = new CommandRegistry();
        this.apiKeyManager = new ApiKeyManager();
        this.statusManager = new AiStatusManager();
        xrHooks.set(this, {
            prime: () => {
                this.primeVoice();
            },
            enter: (input, scene, config) => this.enterXR(input, scene, config),
            leave: () => {
                this.leaveXR();
            },
        });
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

        this.voiceOptions = config.voice;
        this.voiceKeys = config.apiKeys;
        if (config.voice?.holdKey !== undefined) {
            this.bindHoldKey(graph.element, config.voice.holdKey);
        }

        if (config.voice !== undefined) {
            this.voicePrimeLoad = import("./voice/prime").then(
                (module) => {
                    this.voicePrime = module;
                },
                () => undefined,
            );
        }

        this.initialized = true;
    }

    /**
     * Prime speech for an immersive session, inside the click that enters it: ask for the
     * microphone (and close it at once), unlock speech synthesis and audio. Nothing without `voice`.
     */
    private primeVoice(): void {
        if (this.voiceOptions !== undefined) {
            this.voicePrime?.primeVoice(this.voiceOptions);
        }
    }

    /**
     * Bind the assistant to an immersive session's input and scene: talk, approve and deny buttons,
     * the wrist orb, ray pointing and the in-scene cards (`xr.ai`). Nothing without `voice`.
     * @param input - The session's input handler.
     * @param scene - The scene.
     * @param config - `xr.ai`.
     */
    private async enterXR(input: XRInputHandler, scene: Scene, config: XRAiConfig | undefined): Promise<void> {
        this.leaveXR();
        const generation = this.xrGeneration;
        const voice = this.voiceOptions;
        const { graph } = this;
        if (voice === undefined || graph === null) {
            return;
        }

        // The session is loaded first, so a press subscribes to pointing before the next frame.
        const [{ bindXrAssistant }] = await Promise.all([import("./voice/xr"), this.voice(voice)]);
        if (generation !== this.xrGeneration || this.voiceOptions !== voice) {
            return;
        }

        this.xrUnbind = bindXrAssistant(input, scene, config, {
            talk: (down) => {
                this.talk(down);
            },
            pointed: (id) => {
                for (const listener of this.xrPointed) {
                    listener(id);
                }
            },
            approvals: () => this.getPendingAiApprovals(),
            questions: () => this.getPendingQuestions(),
            resolve: (id, approve) => {
                void this.resolveAiApproval(id, { approve });
            },
            answer: (id, choice) => {
                void this.answerQuestion(id, choice);
            },
            on: (type, listener) => {
                const id = graph.eventManager.addListener(type, (event) => {
                    listener(event as unknown as Record<string, unknown>);
                });
                return () => {
                    graph.eventManager.removeListener(id);
                };
            },
            onAnswer: (listener) => {
                this.voiceAnswered.add(listener);
                return () => {
                    this.voiceAnswered.delete(listener);
                };
            },
        });
        void this.voiceSessionNow?.checkSupport();
    }

    /** Leave the immersive session: unbind, close a held microphone without sending, stop speaking. */
    private leaveXR(): void {
        this.xrGeneration++;
        this.xrUnbind?.();
        this.xrUnbind = undefined;
        void this.voiceSession?.then((session) => {
            session.cancel();
            session.stopSpeech();
            // Answers are spoken by default only in an immersive session.
            void session.checkSupport();
        });
    }

    /**
     * Hold talk while a key is held with the graph focused, leaving the mouse free to point.
     * @param target - The graph's element; key events from the canvas reach it.
     * @param key - The key, as `KeyboardEvent.key` names it.
     */
    private bindHoldKey(target: Element, key: string): void {
        let held = false;
        const down = (event: Event): void => {
            const { key: pressed, repeat } = event as KeyboardEvent;
            if (pressed === key && !repeat && !held) {
                held = true;
                event.preventDefault();
                this.talk(true);
            }
        };
        const up = (event: Event): void => {
            if (held && (event.type === "focusout" || (event as KeyboardEvent).key === key)) {
                held = false;
                this.talk(false);
            }
        };
        target.addEventListener("keydown", down);
        target.addEventListener("keyup", up);
        target.addEventListener("focusout", up);
        this.unbindHoldKey = () => {
            target.removeEventListener("keydown", down);
            target.removeEventListener("keyup", up);
            target.removeEventListener("focusout", up);
        };
    }

    /**
     * Push-to-talk, loaded on first use.
     * @param voice - The assistant's `voice`.
     * @returns The session.
     */
    private voice(voice: AiVoiceOptions): Promise<VoiceSession> {
        const { graph, controller } = this;
        if (this.voiceSession === undefined && graph !== null && controller !== null) {
            this.voiceSession = import("./voice/VoiceSession").then(({ VoiceSession }) => {
                const session = new VoiceSession({
                    options: voice,
                    controller,
                    emit: (type, detail) => {
                        graph.eventManager.emit(type, detail);
                    },
                    transcriber: () => this.transcriber(voice),
                    speaker: () => {
                        const engine = this.provider === null ? undefined : engineFor(this.provider);
                        return engine?.speak === undefined
                            ? { readiness: "unsupported" }
                            : { readiness: "ready", engine };
                    },
                    liveEngine: () => this.liveEngine(),
                    immersive: () => (graph.getXRSessionManager()?.getActiveMode() ?? null) !== null,
                    selected: () => graph.getSession().selection.nodes,
                    onPointed: (listener) => {
                        const id = graph.eventManager.addListener("node-hover", (event) => {
                            listener((event as NodeHoverEvent).node.id);
                        });
                        this.xrPointed.add(listener);
                        return () => {
                            graph.eventManager.removeListener(id);
                            this.xrPointed.delete(listener);
                        };
                    },
                    answered: (result) => {
                        for (const listener of this.voiceAnswered) {
                            listener(result);
                        }
                    },
                });
                if (!this.disposed) {
                    this.voiceSessionNow = session;
                }

                return session;
            });
        }

        return this.voiceSession ?? Promise.reject(new Error("AI Manager not initialized"));
    }

    /**
     * The chat provider's live conversations (`voice.mode: "live"`).
     * @returns Whether it can open one, and the engine that does.
     */
    private liveEngine(): ProviderLiveSpeech {
        const engine = this.provider === null ? undefined : engineFor(this.provider);
        const provider = (this.provider?.name ?? "mock") as AiProviderId;
        const openLive = engine?.openLive?.bind(engine);
        const ready = engine?.liveReadiness?.() ?? { keyed: true, customBaseUrl: false };
        let readiness: ProviderLiveSpeech["readiness"] = ready.keyed ? "ready" : "no-key";
        if (openLive === undefined) {
            readiness = "unsupported";
        }

        return {
            provider,
            readiness,
            customBaseUrl: ready.customBaseUrl,
            ...(openLive === undefined ? {} : { engine: { openLive } }),
            // ponytail: no instructions or tools yet; they come with live messages through the loop.
            session: () => ({ instructions: "", tools: [] }),
        };
    }

    /**
     * Provider transcription: the chat provider's, or `voice.transcription`'s with its key from
     * `apiKeys` or the key manager (an Anthropic reader's speech through OpenAI).
     * @param voice - The assistant's `voice`.
     * @returns Whether it can transcribe, and the engine that does.
     */
    private transcriber(voice: AiVoiceOptions): ProviderSpeech<"transcribe"> {
        const chat = this.provider?.name;
        const id = voice.transcription?.provider;
        let engine: AiEngine | undefined;
        if (id === undefined || id === chat) {
            engine = this.provider === null ? undefined : engineFor(this.provider);
        } else {
            const key = this.voiceKeys?.[id] ?? this.apiKeyManager.getKey(id);
            if (key === undefined && aiProviderDescriptor(id).requiresKey) {
                return { readiness: "no-key" };
            }

            if (key !== undefined) {
                this.keysSeen.add(key);
            }

            const provider = createProvider(id);
            provider.configure({ apiKey: key ?? "" });
            engine = engineFor(provider);
        }

        return engine?.transcribe === undefined
            ? { readiness: "unsupported" }
            : { readiness: "ready", engine, model: voice.transcription?.model };
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
     * Press or release talk: while held the assistant listens, then sends what was heard as a
     * command (`via: "voice"`), or answers the pending approval or question it matches, and speaks
     * the outcome when `voice.output` is on. Without `voice` a press ends at once with
     * `ai-voice-end` `{ reason: "error", code: "AI_NOT_ENABLED" }`, and a release does nothing.
     * @param down - True to press, false to release.
     */
    talk(down: boolean): void {
        const voice = this.voiceOptions;
        if (voice === undefined || !this.initialized) {
            if (down) {
                this.graph?.eventManager.emit("ai-voice-end", { reason: "error", code: "AI_NOT_ENABLED", params: {} });
            }

            return;
        }

        // Once loaded, at once: what the reader points at in the same frame belongs to this press.
        if (this.voiceSessionNow !== undefined) {
            this.voiceSessionNow.talk(down);
            return;
        }

        // In order: a release right after a press reaches the session after the press.
        const { graph } = this;
        this.voice(voice).then(
            (session) => {
                session.talk(down);
            },
            () => {
                // The voice chunk would not load: the press ends, as a typed message would fail.
                if (down) {
                    graph?.eventManager.emit("ai-voice-end", { reason: "error", code: "AI_FAILED", params: {} });
                }
            },
        );
    }

    /** Stop speaking an answer (`ai-speech-end` `{ code: "AI_CANCELLED" }`); nothing speaks without `voice`. */
    stopSpeech(): void {
        void this.voiceSession?.then((session) => {
            session.stopSpeech();
        });
    }

    /**
     * How speech would be carried in each direction.
     * @returns Both directions; unavailable with `AI_NOT_ENABLED` without `voice`.
     */
    async getVoiceSupport(): Promise<AiVoiceSupport> {
        const voice = this.voiceOptions;
        if (voice === undefined || !this.initialized) {
            return NO_VOICE_SUPPORT;
        }

        return (await this.voice(voice)).support();
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
        await Promise.all([this.controller?.ready(), this.voicePrimeLoad]);
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

        // A key can make provider transcription or speech usable.
        void this.voiceSessionNow?.checkSupport();
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
        this.xrGeneration++;
        this.xrUnbind?.();
        this.xrUnbind = undefined;
        this.unbindHoldKey?.();
        this.unbindHoldKey = undefined;
        // The microphone closes and speech stops.
        void this.voiceSession?.then((session) => {
            session.dispose();
        });
        this.voiceSession = undefined;
        this.voiceSessionNow = undefined;
        this.voiceOptions = undefined;

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
