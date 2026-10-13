import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type {
    AiApprovalRequest,
    AiConversationSnapshot,
    AiQuestionRequest,
    AiStatus,
    AiToolOptions,
    AiVoiceConversationMode,
    AiVoiceOptions,
    AiVoiceStartEvent,
    AiVoiceSupport,
    ExecutionResult,
} from "@graphty/graphty-element/ai";
import {
    type AiCapabilities,
    type AiHostedToolId,
    type AiProviderId,
    type AiResultCode,
    type AiResultParams,
    aiVoiceStatus,
} from "@graphty/graphty-element/catalog";
import { useCallback, useEffect, useRef, useState } from "react";

import { aiSay, XR_AI_LABELS } from "../components/ai/aiResultText";
import type { ProviderType } from "../types/ai";
import {
    AI_IN_PAGE_CODE,
    AI_SPEAK_ANSWERS,
    AI_TRANSCRIPTION,
    AI_VOICE_MODE,
    AI_WEB_FETCH,
    AI_WEB_SEARCH,
    type AiModelChoice,
    type AiModelChoices,
    readAiModelChoices,
    readPreference,
    writeAiModelChoices,
    writePreference,
} from "../workspace/settings/preferences";

/** The assistant's optional tools the reader switches on in Settings, by their `tools` option name. */
export type AiToolSwitch = "webSearch" | "webFetch" | "inPageCode";

/** Which of the optional tools the reader switched on. */
export type AiToolSwitches = Readonly<Record<AiToolSwitch, boolean>>;

/** Each switch: where the reader's choice is kept, and the element's id for the tool. */
export const AI_TOOL_SWITCHES: readonly {
    readonly name: AiToolSwitch;
    readonly tool: AiHostedToolId;
    readonly preference: typeof AI_WEB_SEARCH | typeof AI_WEB_FETCH | typeof AI_IN_PAGE_CODE;
}[] = [
    { name: "webSearch", tool: "web-search", preference: AI_WEB_SEARCH },
    { name: "webFetch", tool: "web-fetch", preference: AI_WEB_FETCH },
    { name: "inPageCode", tool: "in-page-code", preference: AI_IN_PAGE_CODE },
];

/**
 * The reader's saved choices.
 * @returns Each switch, off unless the reader turned it on.
 */
function readToolSwitches(): AiToolSwitches {
    return Object.fromEntries(
        AI_TOOL_SWITCHES.map((entry) => [entry.name, readPreference(entry.preference) === "on"]),
    ) as AiToolSwitches;
}

/**
 * The `tools` option: the switches that are on, and a change the model makes after reading the web
 * waits for the reader's approval (also in a conversation that read it before a switch went off).
 * @param switches - The reader's choices.
 * @returns The option.
 */
function toolOptions(switches: AiToolSwitches): AiToolOptions {
    const on = AI_TOOL_SWITCHES.filter((entry) => switches[entry.name]);
    return { ...Object.fromEntries(on.map((entry) => [entry.name, true])), webContentWrites: "ask" };
}

/**
 * The reader's voice settings: when answers are spoken, who transcribes for a provider that cannot,
 * and whether a press talks turn by turn or live.
 */
export interface AiVoiceSettings {
    readonly speakAnswers: (typeof AI_SPEAK_ANSWERS.values)[number];
    readonly transcription: (typeof AI_TRANSCRIPTION.values)[number];
    readonly mode: (typeof AI_VOICE_MODE.values)[number];
}

/** Where each voice setting is saved. */
const VOICE_PREFERENCES = {
    speakAnswers: AI_SPEAK_ANSWERS,
    transcription: AI_TRANSCRIPTION,
    mode: AI_VOICE_MODE,
} as const;

/** The element's `output` for each speak-answers choice. */
const SPEAK_OUTPUT: Readonly<Record<AiVoiceSettings["speakAnswers"], AiVoiceOptions["output"]>> = {
    off: "off",
    // The element's "auto": off on a flat page, on in an immersive session.
    vr: "auto",
    // The browser's voice, else the provider's, on every page.
    always: "on",
};

/**
 * Whether a chat provider has no transcription of its own, so the reader may name another (the
 * catalog's fact, as graphty-element reports it).
 * @param provider - The chat provider.
 * @returns True when it cannot transcribe.
 */
export function needsTranscriptionProvider(provider: ProviderType): boolean {
    return aiVoiceStatus(provider, "input") !== "available";
}

/**
 * Whether the reader can choose a live conversation: graphty-element reports one it can run, or
 * one held back only because answers are not spoken (the Speak answers choice just above).
 * @param support - Where speech goes now, as graphty-element reports it.
 * @returns True to offer the choice.
 */
export function offersLiveChoice(support: AiVoiceSupport | null | undefined): boolean {
    const live = support?.live;
    return live !== undefined && (live.status !== "unavailable" || live.params?.reason === "output-off");
}

/**
 * The reader's saved voice settings.
 * @returns Each, at its default unless the reader chose another.
 */
function readVoiceSettings(): AiVoiceSettings {
    return {
        speakAnswers: readPreference(AI_SPEAK_ANSWERS),
        transcription: readPreference(AI_TRANSCRIPTION),
        mode: readPreference(AI_VOICE_MODE),
    };
}

/**
 * The `voice` option and the keys it needs, from the reader's settings.
 * @param settings - The reader's choices.
 * @param provider - The chat provider.
 * @param getKey - The key store.
 * @returns The option, and `apiKeys` for a transcription provider when one is used.
 */
function voiceOptions(
    settings: AiVoiceSettings,
    provider: ProviderType,
    getKey: ((provider: ProviderType) => string | undefined) | undefined,
): { voice: AiVoiceOptions; apiKeys?: Partial<Record<AiProviderId, string>> } {
    const voice: AiVoiceOptions = { output: SPEAK_OUTPUT[settings.speakAnswers], mode: settings.mode, say: aiSay };
    const other = settings.transcription;
    if (other === "none" || other === provider || !needsTranscriptionProvider(provider)) {
        return { voice };
    }

    return { voice: { ...voice, transcription: { provider: other } }, apiKeys: { [other]: getKey?.(other) } };
}

/** What the element answered, or why the hook could not ask it. */
type AiCommandOutcome = ExecutionResult & { readonly error?: Error };

/** A store failure the element reported with `ai-conversation-changed`, or a tool it left out. */
interface AiHistoryNotice {
    readonly code: AiResultCode;
    readonly params: AiResultParams;
}

interface UseAiManagerOptions {
    /** The element whose assistant this drives; undefined until it has mounted. */
    element?: GraphtyElement | null;
    /** Default AI provider to use */
    defaultProvider?: ProviderType;
    /** API key getter function */
    getKey?: (provider: ProviderType) => string | undefined;
}

interface UseAiManagerResult {
    /** Whether the AI manager is ready */
    isReady: boolean;
    /** Whether AI is currently processing */
    isProcessing: boolean;
    /** Current AI status */
    status: AiStatus | null;
    /** Current provider type */
    currentProvider: ProviderType | null;
    /** Set the current provider */
    setProvider: (provider: ProviderType) => void;
    /** Execute a natural language command */
    execute: (input: string) => Promise<AiCommandOutcome>;
    /** Cancel the current execution */
    cancel: () => void;
    /** Last error if any */
    error: Error | null;
    /** Clear the error */
    clearError: () => void;
    /** The open conversation, as the element reports it; null until the assistant is on. */
    conversation: AiConversationSnapshot | null;
    /** The changes waiting on the reader's approval, oldest first. */
    approvals: readonly AiApprovalRequest[];
    /** The questions the model asked the reader and still waits on, oldest first. */
    questions: readonly AiQuestionRequest[];
    /** The last store failure the element reported, if any. */
    historyNotice: AiHistoryNotice | null;
    /** Approve or deny a held change; resolves with the message's final result. */
    resolveApproval: (id: string, approve: boolean) => Promise<AiCommandOutcome>;
    /** Answer a question by one of its choices; resolves with the message's final result. */
    answerQuestion: (id: string, answer: string) => Promise<AiCommandOutcome>;
    /** Start a new conversation; the old one stays saved. */
    newConversation: () => Promise<void>;
    /** Delete every saved conversation of this assistant. */
    clearHistory: () => Promise<void>;
    /** Which optional tools the reader switched on; saved in this browser. */
    toolSwitches: AiToolSwitches;
    /** Switch an optional tool on or off; the assistant is switched on again with it. */
    setToolSwitch: (name: AiToolSwitch, on: boolean) => void;
    /** What the provider and model can use, as the element reports it; null until the assistant is on. */
    capabilities: AiCapabilities | null;
    /** The tools the element left out because the provider cannot use them; each once. */
    capabilityNotices: readonly AiHistoryNotice[];
    /** The reader's voice settings; saved in this browser. */
    voiceSettings: AiVoiceSettings;
    /** Change one voice setting; the assistant is switched on again with it. */
    setVoiceSetting: <K extends keyof AiVoiceSettings>(name: K, value: AiVoiceSettings[K]) => void;
    /** How speech would be carried, as the element reports it (and reports again when it changes); null until the assistant is on. */
    voiceSupport: AiVoiceSupport | null;
    /** The model and its options the reader chose for each provider; saved in this browser. */
    modelChoices: AiModelChoices;
    /** Change one provider's model choice; the assistant is switched on again with it. */
    setModelChoice: (provider: ProviderType, choice: AiModelChoice) => void;
    /** Whether the element is listening to the reader. */
    listening: boolean;
    /** Hold talk (true) or let go (false): the element's `aiTalk`. */
    talk: (down: boolean) => void;
    /** Why the last utterance could not be heard, or why a press asked to be live ran turn by turn. */
    voiceNotice: AiHistoryNotice | null;
    /** How the last press reached the model, as the element reported it on `ai-voice-start`. */
    voiceMode: AiVoiceConversationMode | null;
}

/**
 * React hook for the element's AI assistant. The element builds, owns and disposes the assistant
 * (`enableAiControl`, `disableAiControl`) and keeps its conversations in the browser; this hook
 * switches it on for the chosen provider and mirrors its status, its open conversation and the
 * changes and questions waiting on the reader into React state. Questions are on (`questions: true`)
 * because the AI panel draws them.
 * @param options - Configuration options for the AI manager
 * @returns Methods and state for managing AI operations
 */
export function useAiManager(options: UseAiManagerOptions): UseAiManagerResult {
    const { element, defaultProvider, getKey } = options;

    const [enabled, setEnabled] = useState<GraphtyElement | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<AiStatus | null>(null);
    const [currentProvider, setCurrentProvider] = useState<ProviderType | null>(defaultProvider ?? null);
    const [error, setError] = useState<Error | null>(null);
    const [conversation, setConversation] = useState<AiConversationSnapshot | null>(null);
    const [approvals, setApprovals] = useState<readonly AiApprovalRequest[]>([]);
    const [questions, setQuestions] = useState<readonly AiQuestionRequest[]>([]);
    const [historyNotice, setHistoryNotice] = useState<AiHistoryNotice | null>(null);
    const [toolSwitches, setToolSwitches] = useState<AiToolSwitches>(readToolSwitches);
    const [capabilities, setCapabilities] = useState<AiCapabilities | null>(null);
    const [capabilityNotices, setCapabilityNotices] = useState<readonly AiHistoryNotice[]>([]);
    const [voiceSettings, setVoiceSettings] = useState<AiVoiceSettings>(readVoiceSettings);
    const [modelChoices, setModelChoices] = useState<AiModelChoices>(readAiModelChoices);
    // Only the current provider's choice switches the assistant on again.
    const modelChoice = currentProvider === null ? undefined : modelChoices[currentProvider];
    const [voiceSupport, setVoiceSupport] = useState<AiVoiceSupport | null>(null);
    const [listening, setListening] = useState(false);
    const [voiceNotice, setVoiceNotice] = useState<AiHistoryNotice | null>(null);
    const [voiceMode, setVoiceMode] = useState<AiVoiceConversationMode | null>(null);
    // The tools already noticed for this provider: the element reports a left-out tool again
    // after every enable, and a switch turned on enables it again.
    const noticed = useRef(new Set<string>());

    // Another provider lacks other tools: what was noticed about the last one no longer holds.
    useEffect(() => {
        noticed.current.clear();
        setCapabilityNotices([]);
    }, [currentProvider]);

    // Sync currentProvider with defaultProvider when it changes
    // This is needed because useState only uses defaultProvider as initial value
    useEffect(() => {
        if (defaultProvider && !currentProvider) {
            setCurrentProvider(defaultProvider);
        }
    }, [defaultProvider, currentProvider]);

    // Switch the element's assistant on for the current provider once the element is there.
    useEffect(() => {
        if (!element || !currentProvider) {
            setEnabled(null);
            setConversation(null);
            setApprovals([]);
            setQuestions([]);
            setCapabilities(null);
            setVoiceSupport(null);

            return undefined;
        }

        let cancelled = false;
        let unsubscribe: (() => void) | undefined;
        // The element's own state is the truth: every event only says when to read it again.
        const read = (): void => {
            if (!cancelled && element) {
                setConversation(element.getAiConversation());
                setApprovals(element.getPendingAiApprovals());
                setQuestions(element.getPendingAiQuestions());
            }
        };
        const onConversationChanged = (event: { detail: { code?: AiResultCode; params?: AiResultParams } }): void => {
            const { code, params } = event.detail;
            if (code !== undefined) {
                setHistoryNotice({ code, params: params ?? {} });
            }

            read();
        };
        const onCapabilityUnavailable = (event: {
            detail: { tool: AiHostedToolId; code: AiResultCode; params: AiResultParams };
        }): void => {
            const { tool, code, params } = event.detail;
            if (!cancelled && !noticed.current.has(tool)) {
                noticed.current.add(tool);
                setCapabilityNotices((current) => [...current, { code, params }]);
            }
        };

        const onVoiceStart = (event: { detail: Omit<AiVoiceStartEvent, "type"> }): void => {
            const { mode, code, params } = event.detail;
            // Live asked for but run turn by turn carries the code that says why.
            setVoiceNotice(code === undefined ? null : { code, params: params ?? {} });
            setVoiceMode(mode ?? null);
            setListening(true);
        };
        const onVoiceSupportChange = (event: { detail: { support: AiVoiceSupport } }): void => {
            if (!cancelled) {
                setVoiceSupport(event.detail.support);
            }
        };
        const onVoiceEnd = (event: { detail: { code?: AiResultCode; params?: AiResultParams } }): void => {
            setListening(false);
            const { code, params } = event.detail;
            if (code === "AI_VOICE_UNAVAILABLE") {
                setVoiceNotice({ code, params: params ?? {} });
            }
        };

        async function enable(target: GraphtyElement, provider: ProviderType): Promise<void> {
            // The app's words for the controls the element draws in VR and AR.
            target.xr = { ...target.xr, ai: { ...target.xr?.ai, labels: XR_AI_LABELS } };
            try {
                await target.enableAiControl({
                    provider,
                    apiKey: getKey?.(provider),
                    history: "browser",
                    questions: true,
                    tools,
                    ...voice,
                    ...modelChoice,
                });
            } catch (err) {
                console.error("[useAiManager] Failed to enable the assistant:", err);
                return;
            }

            // Switched off, or switched on again, while it settled: the element has already let a
            // later call decide, and nothing here is wired to this one.
            if (cancelled) {
                return;
            }

            unsubscribe = target.onAiStatusChange((newStatus) => {
                setStatus(newStatus);
                setIsProcessing(
                    newStatus.state === "submitted" ||
                        newStatus.state === "streaming" ||
                        newStatus.state === "executing",
                );

                if (newStatus.state === "error" && newStatus.error) {
                    setError(newStatus.error);
                }
            });
            target.addEventListener("ai-conversation-changed", onConversationChanged);
            target.addEventListener("ai-approval-requested", read);
            target.addEventListener("ai-question-asked", read);
            target.addEventListener("ai-pending-resolved", read);
            target.addEventListener("ai-capability-unavailable", onCapabilityUnavailable);
            target.addEventListener("ai-voice-start", onVoiceStart);
            target.addEventListener("ai-voice-end", onVoiceEnd);
            target.addEventListener("ai-voice-support-change", onVoiceSupportChange);
            read();
            setCapabilities(target.getAiCapabilities());
            setEnabled(target);
            const support = await target.getAiVoiceSupport();
            if (!cancelled) {
                setVoiceSupport(support);
            }
        }

        const tools = toolOptions(toolSwitches);
        const voice = voiceOptions(voiceSettings, currentProvider, getKey);
        void enable(element, currentProvider);

        return () => {
            cancelled = true;
            unsubscribe?.();
            element.removeEventListener("ai-conversation-changed", onConversationChanged);
            element.removeEventListener("ai-approval-requested", read);
            element.removeEventListener("ai-question-asked", read);
            element.removeEventListener("ai-pending-resolved", read);
            element.removeEventListener("ai-capability-unavailable", onCapabilityUnavailable);
            element.removeEventListener("ai-voice-start", onVoiceStart);
            element.removeEventListener("ai-voice-end", onVoiceEnd);
            element.removeEventListener("ai-voice-support-change", onVoiceSupportChange);
            element.disableAiControl();
            setEnabled(null);
            setVoiceSupport(null);
            setListening(false);
            setVoiceMode(null);
        };
    }, [element, currentProvider, getKey, toolSwitches, voiceSettings, modelChoice]);

    const setVoiceSetting = useCallback(<K extends keyof AiVoiceSettings>(name: K, value: AiVoiceSettings[K]): void => {
        writePreference<string>(VOICE_PREFERENCES[name], value);
        setVoiceSettings((current) => ({ ...current, [name]: value }));
    }, []);

    const setModelChoice = useCallback((provider: ProviderType, choice: AiModelChoice): void => {
        setModelChoices((current) => {
            const next = { ...current, [provider]: choice };
            writeAiModelChoices(next);
            return next;
        });
    }, []);

    const talk = useCallback(
        (down: boolean) => {
            enabled?.aiTalk(down);
        },
        [enabled],
    );

    const setToolSwitch = useCallback((name: AiToolSwitch, on: boolean) => {
        const entry = AI_TOOL_SWITCHES.find((candidate) => candidate.name === name);
        if (entry !== undefined) {
            writePreference(entry.preference, on ? "on" : "off");
        }

        setToolSwitches((current) => ({ ...current, [name]: on }));
    }, []);

    const setProvider = useCallback((provider: ProviderType) => {
        // Just update state - useEffect will handle re-initialization
        setCurrentProvider(provider);
    }, []);

    const execute = useCallback(
        async (input: string): Promise<AiCommandOutcome> => {
            if (!enabled) {
                const error = new Error("AI Manager not initialized");
                return { success: false, message: error.message, code: "AI_NOT_ENABLED", params: {}, error };
            }

            setError(null);
            // The element saves the reader's words as the message starts, and how it ended.
            return settle(() => enabled.aiCommand(input));
        },
        [enabled],
    );

    const resolveApproval = useCallback(
        async (id: string, approve: boolean): Promise<AiCommandOutcome> => {
            if (!enabled) {
                return { success: false, message: "", code: "AI_NOT_ENABLED", params: {} };
            }

            return settle(() => enabled.resolveAiApproval(id, { approve }));
        },
        [enabled],
    );

    const answerQuestion = useCallback(
        async (id: string, answer: string): Promise<AiCommandOutcome> => {
            if (!enabled) {
                return { success: false, message: "", code: "AI_NOT_ENABLED", params: {} };
            }

            return settle(() => enabled.answerAiQuestion(id, answer));
        },
        [enabled],
    );

    const newConversation = useCallback(async (): Promise<void> => {
        await enabled?.newAiConversation();
    }, [enabled]);

    const clearHistory = useCallback(async (): Promise<void> => {
        setHistoryNotice(null);
        await enabled?.clearAiHistory();
    }, [enabled]);

    const cancel = useCallback(() => {
        enabled?.cancelAiCommand();
    }, [enabled]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isReady: enabled !== null,
        isProcessing,
        status,
        currentProvider,
        setProvider,
        execute,
        cancel,
        error,
        clearError,
        conversation,
        approvals,
        questions,
        historyNotice,
        resolveApproval,
        answerQuestion,
        newConversation,
        clearHistory,
        toolSwitches,
        setToolSwitch,
        capabilities,
        capabilityNotices,
        voiceSettings,
        setVoiceSetting,
        voiceSupport,
        modelChoices,
        setModelChoice,
        listening,
        talk,
        voiceNotice,
        voiceMode,
    };
}

/**
 * What an assistant call answered, or why it threw.
 * @param call - The call.
 * @returns Its result, with only the fields the app reads.
 */
async function settle(call: () => Promise<ExecutionResult>): Promise<AiCommandOutcome> {
    try {
        const { success, message, llmText, code, params } = await call();
        return { success, message, llmText, code, params };
    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return { success: false, message: error.message, code: "AI_FAILED", params: {}, error };
    }
}
