/**
 * API Key Manager Module - Session and persistent storage for API keys.
 * Uses encrypt-storage for AES encryption of persisted keys.
 * @module ai/keys/ApiKeyManager
 */

import { EncryptStorage } from "encrypt-storage";

import type { ProviderType } from "../providers";

type StorageType = "localStorage" | "sessionStorage";

/**
 * Configuration options for enabling persistence. Every field is optional.
 */
export interface PersistenceConfig {
    /**
     * Encryption key used to encrypt stored API keys (minimum 10 characters).
     * Default: a built-in key, which keeps keys out of plain text at rest but does not protect them
     * from anyone who can run script on the page. A custom key is remembered in `sessionStorage`
     * for the rest of the tab's life, so persistence survives a reload and ends when the tab closes.
     */
    encryptionKey?: string;
    /** Storage type (default: the constructor's, which defaults to "localStorage") */
    storage?: StorageType;
    /** Prefix for storage keys (default: the constructor's, which defaults to "@graphty-ai-keys") */
    prefix?: string;
}

/**
 * Options for constructing an {@link ApiKeyManager}.
 */
export interface ApiKeyManagerOptions {
    /** Where persisted keys live (default: "localStorage") */
    storage?: StorageType;
    /** Prefix for storage keys (default: "@graphty-ai-keys") */
    prefix?: string;
}

/** Default storage key prefix */
const DEFAULT_STORAGE_PREFIX = "@graphty-ai-keys";

/**
 * Built-in encryption key, used when the host does not pass one. It obscures keys at rest; it is
 * public in this source, so it is not a secret.
 */
const DEFAULT_ENCRYPTION_KEY = "graphty-default-key";

/** Minimum encryption key length required by encrypt-storage */
const MIN_ENCRYPTION_KEY_LENGTH = 10;

/** Item names inside the encrypted store */
const KEYS_ITEM = "keys";
const DEFAULT_PROVIDER_ITEM = "default-provider";

/**
 * Manages API keys for LLM providers.
 * Supports both session-only and persistent encrypted storage.
 * Uses encrypt-storage package for AES encryption when persistence is enabled.
 *
 * Persistence restores itself: a manager constructed after a reload finds the keys an earlier
 * page persisted (with the built-in key, or with a custom key from the same tab) and turns
 * persistence back on. A host calls `enablePersistence()`, `disablePersistence()` and `setKey()`
 * and nothing else.
 */
export class ApiKeyManager {
    private keys = new Map<ProviderType, string>();
    private defaultProvider: ProviderType | null = null;
    private persistenceConfig: Required<PersistenceConfig> | null = null;
    private encryptStorage: EncryptStorage | null = null;
    private readonly storage: StorageType;
    private readonly prefix: string;

    /**
     * Create a key manager and restore any keys a previous page persisted.
     * @param options - Where persisted keys live
     */
    constructor(options: ApiKeyManagerOptions = {}) {
        this.storage = options.storage ?? "localStorage";
        this.prefix = options.prefix ?? DEFAULT_STORAGE_PREFIX;
        try {
            this.restorePersistence();
        } catch {
            // Storage blocked (a sandboxed frame, privacy mode): start session-only
            this.persistenceConfig = null;
            this.encryptStorage = null;
        }
    }

    /**
     * Enable persistent storage for API keys with AES encryption. Keys already in memory are
     * saved, and keys already in storage under the same encryption key are loaded.
     * @param config - Persistence configuration (default: built-in encryption key)
     * @throws Error if encryption key is empty or too short (minimum 10 characters)
     */
    enablePersistence(config: PersistenceConfig = {}): void {
        const encryptionKey = config.encryptionKey ?? DEFAULT_ENCRYPTION_KEY;
        if (encryptionKey.trim().length === 0) {
            throw new Error("Encryption key cannot be empty");
        }

        if (encryptionKey.length < MIN_ENCRYPTION_KEY_LENGTH) {
            throw new Error(`Encryption key must be at least ${MIN_ENCRYPTION_KEY_LENGTH} characters`);
        }

        this.persistenceConfig = {
            encryptionKey,
            storage: config.storage ?? this.storage,
            prefix: config.prefix ?? this.prefix,
        };

        if (typeof window === "undefined") {
            return;
        }

        this.encryptStorage = this.openStorage(this.persistenceConfig);
        // A store this key cannot read is left alone rather than overwritten with nothing
        if (this.loadPersistedKeys() !== "unreadable") {
            this.persistKeys();
        }

        this.rememberSessionKey(encryptionKey === DEFAULT_ENCRYPTION_KEY ? null : encryptionKey);
    }

    /**
     * Disable persistent storage. With `clearStorage` false the stored keys stay where they are,
     * so the next page load restores them and turns persistence back on.
     * @param clearStorage - Whether to clear stored keys from storage (default: true)
     */
    disablePersistence(clearStorage = true): void {
        if (clearStorage && this.encryptStorage) {
            this.encryptStorage.removeItem(KEYS_ITEM);
            this.encryptStorage.removeItem(DEFAULT_PROVIDER_ITEM);
        }

        this.rememberSessionKey(null);
        this.persistenceConfig = null;
        this.encryptStorage = null;
    }

    /**
     * Check if persistence is enabled.
     * @returns True if persistence is enabled
     */
    isPersistenceEnabled(): boolean {
        return this.persistenceConfig !== null;
    }

    /**
     * Set an API key for a provider.
     * @param provider - The provider type
     * @param key - The API key
     * @throws Error if key is empty or whitespace-only
     */
    setKey(provider: ProviderType, key: string): void {
        const trimmedKey = key.trim();
        if (trimmedKey.length === 0) {
            throw new Error("API key cannot be empty");
        }

        this.keys.set(provider, trimmedKey);

        // Persist if enabled
        if (this.encryptStorage) {
            this.persistKeys();
        }
    }

    /**
     * Get the API key for a provider.
     * @param provider - The provider type
     * @returns The API key or undefined if not set
     */
    getKey(provider: ProviderType): string | undefined {
        return this.keys.get(provider);
    }

    /**
     * Check if a key is set for a provider.
     * @param provider - The provider type
     * @returns True if a key is set
     */
    hasKey(provider: ProviderType): boolean {
        return this.keys.has(provider);
    }

    /**
     * Remove the API key for a provider.
     * @param provider - The provider type
     */
    removeKey(provider: ProviderType): void {
        this.keys.delete(provider);

        // Update persisted storage
        if (this.encryptStorage) {
            this.persistKeys();
        }
    }

    /**
     * Get the provider the reader chose as their default.
     * @returns The default provider, or null if none was chosen
     */
    getDefaultProvider(): ProviderType | null {
        return this.defaultProvider;
    }

    /**
     * Choose the reader's default provider. It is persisted with the keys when persistence is on.
     * @param provider - The provider, or null to clear the choice
     */
    setDefaultProvider(provider: ProviderType | null): void {
        this.defaultProvider = provider;

        if (this.encryptStorage) {
            this.persistKeys();
        }
    }

    /**
     * Get a list of providers that have keys configured.
     * @returns Array of provider types with keys
     */
    getConfiguredProviders(): ProviderType[] {
        return Array.from(this.keys.keys());
    }

    /**
     * Clear all stored keys.
     */
    clear(): void {
        this.keys.clear();

        // Clear from storage
        if (this.encryptStorage) {
            this.encryptStorage.removeItem(KEYS_ITEM);
        }
    }

    /**
     * Custom toString to avoid exposing keys.
     * @returns String representation without sensitive data
     */
    toString(): string {
        const providers = this.getConfiguredProviders();
        const persistenceStatus = this.isPersistenceEnabled() ? "enabled" : "disabled";
        return `ApiKeyManager(configured: ${providers.join(", ") || "none"}, persistence: ${persistenceStatus})`;
    }

    /**
     * Turn persistence back on if an earlier page left keys this manager can read: first with the
     * custom key remembered for this tab, then with the built-in key.
     */
    private restorePersistence(): void {
        if (typeof window === "undefined") {
            return;
        }

        const sessionKey = this.readSessionKey();
        for (const encryptionKey of [sessionKey, DEFAULT_ENCRYPTION_KEY]) {
            if (encryptionKey === null) {
                continue;
            }

            const store = this.openStorage({ encryptionKey, storage: this.storage, prefix: this.prefix });
            if (readKeys(store) !== null) {
                this.enablePersistence({ encryptionKey });
                return;
            }
        }

        // A remembered key that opens nothing is stale
        if (sessionKey !== null) {
            this.rememberSessionKey(null);
        }
    }

    /**
     * Open the encrypted store for a configuration.
     * @param config - The persistence configuration
     * @returns The encrypted store
     */
    private openStorage(config: Required<PersistenceConfig>): EncryptStorage {
        return new EncryptStorage(config.encryptionKey, {
            prefix: config.prefix,
            storageType: config.storage,
        });
    }

    /**
     * The name under which a custom encryption key is remembered in `sessionStorage`.
     * @returns The sessionStorage item name
     */
    private sessionKeyName(): string {
        return `${this.prefix}:session-encryption-key`;
    }

    /**
     * Read the custom encryption key remembered for this tab.
     * @returns The key, or null
     */
    private readSessionKey(): string | null {
        try {
            return sessionStorage.getItem(this.sessionKeyName());
        } catch {
            return null;
        }
    }

    /**
     * Remember a custom encryption key for this tab, or forget it.
     * @param encryptionKey - The key, or null to forget it
     */
    private rememberSessionKey(encryptionKey: string | null): void {
        try {
            if (encryptionKey === null) {
                sessionStorage.removeItem(this.sessionKeyName());
            } else {
                sessionStorage.setItem(this.sessionKeyName(), encryptionKey);
            }
        } catch {
            // Storage blocked: persistence still works for this page, it just will not restore
        }
    }

    /**
     * Persist keys and the default provider to storage with AES encryption via encrypt-storage.
     */
    private persistKeys(): void {
        if (!this.encryptStorage) {
            return;
        }

        this.encryptStorage.setItem(KEYS_ITEM, Object.fromEntries(this.keys));
        if (this.defaultProvider === null) {
            this.encryptStorage.removeItem(DEFAULT_PROVIDER_ITEM);
        } else {
            this.encryptStorage.setItem(DEFAULT_PROVIDER_ITEM, this.defaultProvider);
        }
    }

    /**
     * Load persisted keys and the default provider into memory. Keys in memory win over stored ones.
     * @returns "absent" when nothing is stored, "unreadable" when the stored keys cannot be
     * decrypted with this encryption key, "loaded" otherwise
     */
    private loadPersistedKeys(): "absent" | "unreadable" | "loaded" {
        const config = this.persistenceConfig;
        if (!this.encryptStorage || !config) {
            return "absent";
        }

        const storageArea = config.storage === "sessionStorage" ? sessionStorage : localStorage;
        if (storageArea.getItem(`${config.prefix}:${KEYS_ITEM}`) === null) {
            return "absent";
        }

        const keysObject = readKeys(this.encryptStorage);
        if (keysObject === null) {
            return "unreadable";
        }

        for (const [provider, key] of Object.entries(keysObject)) {
            if (!this.keys.has(provider as ProviderType)) {
                this.keys.set(provider as ProviderType, key);
            }
        }

        this.defaultProvider ??= readDefaultProvider(this.encryptStorage);
        return "loaded";
    }
}

/**
 * Read and decrypt the stored keys.
 * @param store - The encrypted store
 * @returns The keys by provider, or null when absent or not decryptable with this store's key
 */
function readKeys(store: EncryptStorage): Record<string, string> | null {
    try {
        const value: unknown = store.getItem(KEYS_ITEM);
        return typeof value === "object" && value !== null ? (value as Record<string, string>) : null;
    } catch {
        return null;
    }
}

/**
 * Read and decrypt the stored default provider.
 * @param store - The encrypted store
 * @returns The provider, or null
 */
function readDefaultProvider(store: EncryptStorage): ProviderType | null {
    try {
        const value: unknown = store.getItem(DEFAULT_PROVIDER_ITEM);
        return typeof value === "string" ? (value as ProviderType) : null;
    } catch {
        return null;
    }
}
