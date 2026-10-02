import type { ApiKeyManager } from "@graphty/graphty-element/ai";
import { useCallback, useEffect, useRef, useState } from "react";

import { getApiKeyManager, type ProviderType } from "../types/ai";

interface UseAiKeyStorageOptions {
    /** Skip loading AI module entirely (for debugging) */
    disabled?: boolean;
}

interface UseAiKeyStorageResult {
    /** Whether the key manager is ready */
    isReady: boolean;
    /** List of providers that have keys configured */
    configuredProviders: ProviderType[];
    /** Whether at least one provider is configured */
    hasAnyProvider: boolean;
    /** Get the API key for a provider */
    getKey: (provider: ProviderType) => string | undefined;
    /** Set the API key for a provider */
    setKey: (provider: ProviderType, key: string) => void;
    /** Remove the API key for a provider */
    removeKey: (provider: ProviderType) => void;
    /** Check if a provider has a key */
    hasKey: (provider: ProviderType) => boolean;
    /** Clear all stored keys */
    clearAll: () => void;
    /** The provider the reader chose as their default, or null */
    defaultProvider: ProviderType | null;
    /** Choose the reader's default provider */
    setDefaultProvider: (provider: ProviderType | null) => void;
    /** Enable persistence, with the element's built-in encryption key unless one is given */
    enablePersistence: (encryptionKey?: string) => void;
    /** Disable persistence */
    disablePersistence: (clearStorage?: boolean) => void;
    /** Whether persistence is currently enabled */
    isPersistenceEnabled: boolean;
}

/**
 * React hook for managing AI provider API keys.
 * Mirrors graphty-element's ApiKeyManager into React state. The manager owns its defaults, its
 * restore after a reload and the reader's default provider; this hook only re-renders.
 * @param options - Configuration options for key storage
 * @returns Methods and state for managing AI provider API keys
 */
export function useAiKeyStorage(options: UseAiKeyStorageOptions = {}): UseAiKeyStorageResult {
    const { disabled = false } = options;

    // Key manager instance - initialized asynchronously
    const keyManagerRef = useRef<ApiKeyManager | null>(null);

    const [configuredProviders, setConfiguredProviders] = useState<ProviderType[]>([]);
    const [defaultProvider, setDefaultProviderState] = useState<ProviderType | null>(null);
    const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Copy the manager's state into React state
    const refresh = useCallback(() => {
        const manager = keyManagerRef.current;
        if (manager) {
            setConfiguredProviders(manager.getConfiguredProviders());
            setDefaultProviderState(manager.getDefaultProvider());
            setIsPersistenceEnabled(manager.isPersistenceEnabled());
        }
    }, []);

    useEffect(() => {
        if (disabled) {
            return undefined;
        }

        let cancelled = false;

        void getApiKeyManager().then(
            (ApiKeyManagerClass) => {
                if (cancelled) {
                    return;
                }

                keyManagerRef.current = new ApiKeyManagerClass();
                refresh();
                setIsReady(true);
            },
            (err: unknown) => {
                console.error("[useAiKeyStorage] Failed to load ApiKeyManager:", err);
            },
        );

        return () => {
            cancelled = true;
        };
    }, [disabled, refresh]);

    const getKey = useCallback((provider: ProviderType) => keyManagerRef.current?.getKey(provider), []);

    const setKey = useCallback(
        (provider: ProviderType, key: string) => {
            keyManagerRef.current?.setKey(provider, key);
            refresh();
        },
        [refresh],
    );

    const removeKey = useCallback(
        (provider: ProviderType) => {
            keyManagerRef.current?.removeKey(provider);
            refresh();
        },
        [refresh],
    );

    const hasKey = useCallback((provider: ProviderType) => keyManagerRef.current?.hasKey(provider) ?? false, []);

    const clearAll = useCallback(() => {
        keyManagerRef.current?.clear();
        refresh();
    }, [refresh]);

    const setDefaultProvider = useCallback(
        (provider: ProviderType | null) => {
            keyManagerRef.current?.setDefaultProvider(provider);
            refresh();
        },
        [refresh],
    );

    const enablePersistence = useCallback(
        (encryptionKey?: string) => {
            const trimmed = encryptionKey?.trim();
            keyManagerRef.current?.enablePersistence({ encryptionKey: trimmed === "" ? undefined : trimmed });
            refresh();
        },
        [refresh],
    );

    const disablePersistence = useCallback(
        (clearStorage?: boolean) => {
            keyManagerRef.current?.disablePersistence(clearStorage);
            refresh();
        },
        [refresh],
    );

    return {
        isReady,
        configuredProviders,
        hasAnyProvider: configuredProviders.length > 0,
        getKey,
        setKey,
        removeKey,
        hasKey,
        clearAll,
        defaultProvider,
        setDefaultProvider,
        enablePersistence,
        disablePersistence,
        isPersistenceEnabled,
    };
}
