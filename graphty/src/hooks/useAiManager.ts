import {useCallback, useEffect, useRef, useState} from "react";

import {type AiManagerType, type AiStatus, type ExecutionResult, getCreateAiManager, type ProviderType} from "../types/ai";

// Re-export ExecutionResult from types
export type {ExecutionResult};

export interface UseAiManagerOptions {
    /** Graph instance to use for AI operations (undefined when graph not yet available) */
    graph?: unknown;
    /** Default AI provider to use */
    defaultProvider?: ProviderType;
    /** API key getter function */
    getKey?: (provider: ProviderType) => string | undefined;
}

export interface UseAiManagerResult {
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
 * React hook for managing AI operations.
 * Wraps the AiManager from graphty-element with React state management.
 */
export function useAiManager(options: UseAiManagerOptions): UseAiManagerResult {
    const {graph, defaultProvider, getKey} = options;

    const managerRef = useRef<AiManagerType | null>(null);
    const [isReady, setIsReady] = useState(false);
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

    // Initialize manager when graph becomes available
    useEffect(() => {
        if (!graph) {
            setIsReady(false);

            return undefined;
        }

        let cancelled = false;
        let unsubscribe: (() => void) | undefined;

        async function initManager(): Promise<void> {
            try {
                const createAiManager = await getCreateAiManager();

                if (cancelled) {
                    return;
                }

                const manager = createAiManager();
                managerRef.current = manager;

                // Subscribe to status changes
                unsubscribe = manager.onStatusChange((newStatus) => {
                    setStatus(newStatus);
                    setIsProcessing(
                        newStatus.stage === "processing" ||
                        newStatus.stage === "executingTool" ||
                        newStatus.stage === "streaming",
                    );

                    if (newStatus.stage === "error" && newStatus.error) {
                        setError(newStatus.error);
                    }
                });

                // Initialize with current provider
                if (currentProvider) {
                    const apiKey = getKey?.(currentProvider);
                    manager.init(graph, {
                        provider: currentProvider,
                        apiKey,
                    });
                    setIsReady(true);
                }
            } catch (err) {
                console.error("[useAiManager] Failed to load createAiManager:", err);
            }
        }

        void initManager();

        return () => {
            cancelled = true;
            unsubscribe?.();
            managerRef.current?.dispose();
            managerRef.current = null;
        };
    }, [graph, currentProvider, getKey]);

    const setProvider = useCallback((provider: ProviderType) => {
        // Just update state - useEffect will handle re-initialization
        setCurrentProvider(provider);
    }, []);

    const execute = useCallback(async(input: string): Promise<ExecutionResult> => {
        if (!managerRef.current) {
            return {
                success: false,
                error: new Error("AI Manager not initialized"),
            };
        }

        setError(null);

        try {
            const result = await managerRef.current.execute(input);

            return result;
        } catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err : new Error(String(err)),
            };
        }
    }, []);

    const cancel = useCallback(() => {
        managerRef.current?.cancel();
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isReady,
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
