import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type {
    AiApprovalRequest,
    AiConversationSnapshot,
    AiQuestionRequest,
    AiStatus,
    ExecutionResult,
} from "@graphty/graphty-element/ai";
import type { AiResultCode, AiResultParams } from "@graphty/graphty-element/catalog";
import { useCallback, useEffect, useState } from "react";

import type { ProviderType } from "../types/ai";

/** What the element answered, or why the hook could not ask it. */
export type AiCommandOutcome = ExecutionResult & { readonly error?: Error };

/** A store failure the element reported with `ai-conversation-changed`. */
export interface AiHistoryNotice {
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

        async function enable(target: GraphtyElement, provider: ProviderType): Promise<void> {
            try {
                await target.enableAiControl({
                    provider,
                    apiKey: getKey?.(provider),
                    history: "browser",
                    questions: true,
                });
            } catch (err) {
                console.error("[useAiManager] Failed to enable the assistant:", err);
                return;
            }

            if (cancelled) {
                target.disableAiControl();
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
            read();
            setEnabled(target);
        }

        void enable(element, currentProvider);

        return () => {
            cancelled = true;
            unsubscribe?.();
            element.removeEventListener("ai-conversation-changed", onConversationChanged);
            element.removeEventListener("ai-approval-requested", read);
            element.removeEventListener("ai-question-asked", read);
            element.removeEventListener("ai-pending-resolved", read);
            element.disableAiControl();
            setEnabled(null);
        };
    }, [element, currentProvider, getKey]);

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
