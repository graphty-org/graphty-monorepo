import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { AiStatus } from "@graphty/graphty-element/ai";
import { useCallback, useEffect, useState } from "react";

import type { ExecutionResult, ProviderType } from "../types/ai";

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
    execute: (input: string) => Promise<ExecutionResult>;
    /** Cancel the current execution */
    cancel: () => void;
    /** Last error if any */
    error: Error | null;
    /** Clear the error */
    clearError: () => void;
}

/**
 * React hook for the element's AI assistant. The element builds, owns and disposes the assistant
 * (`enableAiControl`, `disableAiControl`); this hook switches it on for the chosen provider and
 * mirrors its status into React state.
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

            return undefined;
        }

        let cancelled = false;
        let unsubscribe: (() => void) | undefined;

        async function enable(target: GraphtyElement, provider: ProviderType): Promise<void> {
            try {
                await target.enableAiControl({ provider, apiKey: getKey?.(provider) });
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
            setEnabled(target);
        }

        void enable(element, currentProvider);

        return () => {
            cancelled = true;
            unsubscribe?.();
            element.disableAiControl();
            setEnabled(null);
        };
    }, [element, currentProvider, getKey]);

    const setProvider = useCallback((provider: ProviderType) => {
        // Just update state - useEffect will handle re-initialization
        setCurrentProvider(provider);
    }, []);

    const execute = useCallback(
        async (input: string): Promise<ExecutionResult> => {
            if (!enabled) {
                return {
                    success: false,
                    error: new Error("AI Manager not initialized"),
                };
            }

            setError(null);

            try {
                const { success, message, llmText } = await enabled.aiCommand(input);
                return { success, message, llmText };
            } catch (err) {
                return {
                    success: false,
                    error: err instanceof Error ? err : new Error(String(err)),
                };
            }
        },
        [enabled],
    );

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
    };
}
