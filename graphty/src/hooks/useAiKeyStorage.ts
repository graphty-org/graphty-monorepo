import {useCallback, useEffect, useRef, useState} from "react";

import {type ApiKeyManagerType, getApiKeyManager, type ProviderType} from "../types/ai";

/** Storage key for the encryption secret in sessionStorage */
const ENCRYPTION_KEY_STORAGE = "@graphty-ai-encryption-key";

/** Default storage prefix for API keys */
const DEFAULT_KEY_PREFIX = "@graphty-ai-keys";

/** Default encryption password when user doesn't provide one */
const DEFAULT_ENCRYPTION_PASSWORD = "graphty-default-key";

export interface UseAiKeyStorageOptions {
    /** Whether to enable persistence (default: false, session-only) */
    persistenceEnabled?: boolean;
    /** Storage backend when persistence is enabled */
    storage?: "localStorage" | "sessionStorage";
    /** Custom prefix for storage keys */
    prefix?: string;
    /** Skip loading AI module entirely (for debugging) */
    disabled?: boolean;
}

export interface UseAiKeyStorageResult {
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
    /** Enable persistence with optional encryption (uses default password if not provided) */
    enablePersistence: (encryptionKey?: string) => void;
    /** Disable persistence */
    disablePersistence: (clearStorage?: boolean) => void;
    /** Whether persistence is currently enabled */
    isPersistenceEnabled: boolean;
    /** The underlying ApiKeyManager instance */
    keyManager: ApiKeyManagerType;
}

/**
 * React hook for managing AI provider API keys.
 * Wraps the ApiKeyManager from graphty-element with React state management.
 */
export function useAiKeyStorage(options: UseAiKeyStorageOptions = {}): UseAiKeyStorageResult {
    const {
        persistenceEnabled = false,
        storage = "localStorage",
        prefix = DEFAULT_KEY_PREFIX,
        disabled = false,
    } = options;

    // Key manager instance - initialized asynchronously
    const keyManagerRef = useRef<ApiKeyManagerType | null>(null);

    // Track configured providers for reactivity
    const [configuredProviders, setConfiguredProviders] = useState<ProviderType[]>([]);
    const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Initialize key manager asynchronously
    useEffect(() => {
        // Skip loading if disabled
        if (disabled) {
            return undefined;
        }

        let cancelled = false;

        async function initKeyManager(): Promise<void> {
            try {
                const ApiKeyManager = await getApiKeyManager();

                if (cancelled) {
                    return;
                }

                const manager = new ApiKeyManager();
                keyManagerRef.current = manager;

                // Try to restore persistence - first try default password, then stored password
                // This allows persistence to survive page reloads
                let persistenceRestored = false;

                // First, try the default password (for users who didn't set a custom password)
                try {
                    manager.enablePersistence({
                        encryptionKey: DEFAULT_ENCRYPTION_PASSWORD,
                        storage,
                        prefix,
                    });
                    // Check if we actually loaded any keys
                    if (manager.getConfiguredProviders().length > 0) {
                        persistenceRestored = true;
                        setIsPersistenceEnabled(true);
                    } else {
                        // No keys found with default password, disable and try stored password
                        manager.disablePersistence(false);
                    }
                } catch {
                    // Default password didn't work, will try stored password next
                }

                // If default password didn't work, try stored password from sessionStorage
                if (!persistenceRestored) {
                    const storedEncryptionKey = sessionStorage.getItem(ENCRYPTION_KEY_STORAGE);
                    if (storedEncryptionKey) {
                        try {
                            manager.enablePersistence({
                                encryptionKey: storedEncryptionKey,
                                storage,
                                prefix,
                            });
                            setIsPersistenceEnabled(true);
                        } catch {
                            // Invalid encryption key or decryption failed - clear stale key
                            sessionStorage.removeItem(ENCRYPTION_KEY_STORAGE);
                        }
                    }
                }

                // Update configured providers
                setConfiguredProviders(manager.getConfiguredProviders());
                setIsReady(true);
            } catch (err) {
                console.error("[useAiKeyStorage] Failed to load ApiKeyManager:", err);
                console.error("[useAiKeyStorage] Error details:", {
                    name: (err as Error).name,
                    message: (err as Error).message,
                    stack: (err as Error).stack,
                });
            }
        }

        void initKeyManager();

        return () => {
            cancelled = true;
        };
    }, [disabled, persistenceEnabled, storage, prefix]);

    // Refresh configured providers list
    const refreshProviders = useCallback(() => {
        if (keyManagerRef.current) {
            setConfiguredProviders(keyManagerRef.current.getConfiguredProviders());
        }
    }, []);

    const getKey = useCallback((provider: ProviderType) => {
        return keyManagerRef.current?.getKey(provider);
    }, []);

    const setKey = useCallback((provider: ProviderType, key: string) => {
        keyManagerRef.current?.setKey(provider, key);
        refreshProviders();
    }, [refreshProviders]);

    const removeKey = useCallback((provider: ProviderType) => {
        keyManagerRef.current?.removeKey(provider);
        refreshProviders();
    }, [refreshProviders]);

    const hasKey = useCallback((provider: ProviderType) => {
        return keyManagerRef.current?.hasKey(provider) ?? false;
    }, []);

    const clearAll = useCallback(() => {
        keyManagerRef.current?.clear();
        refreshProviders();
    }, [refreshProviders]);

    const enablePersistence = useCallback((encryptionKey?: string) => {
        // Use default password if none provided or empty
        const trimmedKey = encryptionKey?.trim();
        const effectiveKey = (trimmedKey && trimmedKey.length > 0) ? trimmedKey : DEFAULT_ENCRYPTION_PASSWORD;
        const isUsingDefaultPassword = effectiveKey === DEFAULT_ENCRYPTION_PASSWORD;

        keyManagerRef.current?.enablePersistence({
            encryptionKey: effectiveKey,
            storage,
            prefix,
        });

        // Only store custom password in session; default password doesn't need storage
        if (isUsingDefaultPassword) {
            sessionStorage.removeItem(ENCRYPTION_KEY_STORAGE);
        } else {
            sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, effectiveKey);
        }

        setIsPersistenceEnabled(true);
        refreshProviders();
    }, [storage, prefix, refreshProviders]);

    const disablePersistence = useCallback((clearStorage = false) => {
        keyManagerRef.current?.disablePersistence(clearStorage);
        sessionStorage.removeItem(ENCRYPTION_KEY_STORAGE);
        setIsPersistenceEnabled(false);
        refreshProviders();
    }, [refreshProviders]);

    return {
        isReady,
        configuredProviders,
        hasAnyProvider: configuredProviders.length > 0,
        getKey,
        setKey,
        removeKey,
        hasKey,
        clearAll,
        enablePersistence,
        disablePersistence,
        isPersistenceEnabled,
        // Return keyManager - consumers should check isReady before using
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Consumers must check isReady first
        keyManager: keyManagerRef.current!,
    };
}
