/**
 * API Key Manager Module - Session and persistent storage for API keys.
 * Persisted keys are encrypted with the browser's Web Crypto API (AES-GCM, PBKDF2).
 * @module ai/keys/ApiKeyManager
 */

import type { ProviderType } from "../providers";

type StorageType = "localStorage" | "sessionStorage";

/**
 * Configuration options for enabling persistence. Every field is optional.
 */
export interface PersistenceConfig {
    /**
     * A passphrase the user supplies (minimum 10 characters). The stored keys are encrypted with
     * AES-GCM under a key derived from it with PBKDF2, so a host that passes the user's own
     * passphrase gets real encryption without writing any crypto code. It is remembered in
     * `sessionStorage` for the rest of the tab's life, so persistence survives a reload and ends
     * when the tab closes.
     *
     * Default: a built-in key. KEYS SAVED WITHOUT A USER-SUPPLIED PASSPHRASE ARE ONLY OBSCURED, NOT
     * ENCRYPTED: the built-in key is public in this package's source, so any script on the page,
     * or anyone with access to the browser profile, can read them. They are just not stored as
     * plain text.
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

/** Minimum encryption key length */
const MIN_ENCRYPTION_KEY_LENGTH = 10;

/** Item names inside the store */
const KEYS_ITEM = "keys";
/** Written only by versions before 4.0 (encrypt-storage); removed when the store is next saved */
const LEGACY_DEFAULT_PROVIDER_ITEM = "default-provider";

/** Marks a stored value written by this scheme: `gk1:` + base64(salt | iv | AES-GCM ciphertext) */
const FORMAT_TAG = "gk1:";
const SALT_BYTES = 16;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 600_000;

/** What a store holds once decrypted */
interface StoredKeys {
    keys: Record<string, string>;
    defaultProvider: ProviderType | null;
}

/** An AES key derived from a passphrase and the salt it was derived with */
interface DerivedKey {
    passphrase: string;
    salt: Uint8Array<ArrayBuffer>;
    key: CryptoKey;
}

/**
 * Manages API keys for LLM providers.
 * Supports both session-only and persistent encrypted storage.
 *
 * Reads and writes to storage are asynchronous (Web Crypto is). Keys in memory change at once;
 * the encrypted copy follows. `ready()` resolves when every storage operation started so far has
 * finished -- the restore on construction, `enablePersistence`'s load, and every save.
 *
 * Persistence restores itself: a manager constructed after a reload finds the keys an earlier
 * page persisted (with the built-in key, or with a custom key from the same tab) and turns
 * persistence back on once `ready()` resolves. A host calls `enablePersistence()`,
 * `disablePersistence()` and `setKey()` and nothing else.
 *
 * Keys saved by graphty-element before 4.0 (encrypt-storage's format) cannot be read with Web
 * Crypto. They are left untouched and treated as no stored keys, so the reader enters them once
 * more; the first save replaces them.
 */
export class ApiKeyManager {
    private keys = new Map<ProviderType, string>();
    private defaultProvider: ProviderType | null = null;
    private persistenceConfig: Required<PersistenceConfig> | null = null;
    private readonly storage: StorageType;
    private readonly prefix: string;
    /** Every storage operation runs after the one before it */
    private pending: Promise<void> = Promise.resolve();
    /** Set once the host enables or disables persistence; the restore then stands aside */
    private hostChosePersistence = false;
    private derived: DerivedKey | null = null;

    /**
     * Create a key manager and start restoring any keys a previous page persisted. Await
     * `ready()` to see them.
     * @param options - Where persisted keys live
     */
    constructor(options: ApiKeyManagerOptions = {}) {
        this.storage = options.storage ?? "localStorage";
        this.prefix = options.prefix ?? DEFAULT_STORAGE_PREFIX;
        void this.enqueue(() => this.restorePersistence());
    }

    /**
     * Resolve when every storage operation started so far has finished.
     * @returns A promise that resolves (never rejects) once storage has caught up
     */
    ready(): Promise<void> {
        return this.pending;
    }

    /**
     * Enable persistent storage for API keys with AES-GCM encryption. Keys already in memory are
     * saved, and keys already in storage under the same encryption key are loaded.
     *
     * Without `encryptionKey`, the keys are only obscured, not encrypted: anyone with access to
     * the page or the browser profile can read them. Pass a passphrase the user supplies for real
     * protection.
     * @param config - Persistence configuration (default: built-in encryption key)
     * @returns A promise that resolves when stored keys are loaded and the store is saved
     * @throws Error if encryption key is empty or too short (minimum 10 characters)
     */
    enablePersistence(config: PersistenceConfig = {}): Promise<void> {
        const encryptionKey = config.encryptionKey ?? DEFAULT_ENCRYPTION_KEY;
        if (encryptionKey.trim().length === 0) {
            throw new Error("Encryption key cannot be empty");
        }

        if (encryptionKey.length < MIN_ENCRYPTION_KEY_LENGTH) {
            throw new Error(`Encryption key must be at least ${MIN_ENCRYPTION_KEY_LENGTH} characters`);
        }

        this.hostChosePersistence = true;
        const persistenceConfig = {
            encryptionKey,
            storage: config.storage ?? this.storage,
            prefix: config.prefix ?? this.prefix,
        };
        this.persistenceConfig = persistenceConfig;

        if (typeof window === "undefined") {
            return this.pending;
        }

        this.rememberSessionKey(encryptionKey === DEFAULT_ENCRYPTION_KEY ? null : encryptionKey);
        return this.enqueue(() => this.open(persistenceConfig));
    }

    /**
     * Disable persistent storage. With `clearStorage` false the stored keys stay where they are:
     * the next page load restores them, and turns persistence back on, if they were saved with the
     * built-in encryption key. Keys saved with a custom key wait for `enablePersistence` with it.
     * @param clearStorage - Whether to clear stored keys from storage (default: true)
     */
    disablePersistence(clearStorage = true): void {
        const config = this.persistenceConfig;
        if (clearStorage && config && typeof window !== "undefined") {
            try {
                const area = storageArea(config.storage);
                area.removeItem(itemName(config, KEYS_ITEM));
                area.removeItem(itemName(config, LEGACY_DEFAULT_PROVIDER_ITEM));
            } catch {
                // Storage blocked: there is nothing stored to clear
            }
        }

        this.hostChosePersistence = true;
        this.rememberSessionKey(null);
        this.persistenceConfig = null;
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
        this.persistKeys();
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
        this.persistKeys();
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
        this.persistKeys();
    }

    /**
     * Get a list of providers that have keys configured.
     * @returns Array of provider types with keys
     */
    getConfiguredProviders(): ProviderType[] {
        return Array.from(this.keys.keys());
    }

    /**
     * Clear all keys, in memory and in storage. Persistence stays on, so it is still on after a reload.
     */
    clear(): void {
        this.keys.clear();
        this.persistKeys();
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
     * Run a storage operation after every earlier one. A failure (storage blocked) leaves the
     * manager session-only for that operation and never breaks the chain.
     * @param job - The operation
     * @returns A promise for this operation, which never rejects
     */
    private enqueue(job: () => Promise<void>): Promise<void> {
        this.pending = this.pending.then(job).catch(() => undefined);
        return this.pending;
    }

    /**
     * Turn persistence back on if an earlier page left keys this manager can read: first with the
     * custom key remembered for this tab, then with the built-in key.
     */
    private async restorePersistence(): Promise<void> {
        if (typeof window === "undefined" || this.hostChosePersistence) {
            return;
        }

        const sessionKey = this.readSessionKey();
        for (const encryptionKey of [sessionKey, DEFAULT_ENCRYPTION_KEY]) {
            if (encryptionKey === null) {
                continue;
            }

            const config = { encryptionKey, storage: this.storage, prefix: this.prefix };
            if ((await this.read(config)) !== null && !this.hostChosePersistence) {
                this.persistenceConfig = config;
                await this.open(config);
                return;
            }
        }

        // A remembered key that opens nothing is stale
        if (sessionKey !== null && !this.hostChosePersistence) {
            this.rememberSessionKey(null);
        }
    }

    /**
     * Load the stored keys under a configuration into memory, then save the merged set -- unless
     * the store cannot be read with this key, in which case it is left alone.
     * @param config - The persistence configuration that was just turned on
     */
    private async open(config: Required<PersistenceConfig>): Promise<void> {
        const raw = storageArea(config.storage).getItem(itemName(config, KEYS_ITEM));
        if (raw !== null) {
            const stored = await this.read(config);
            if (this.persistenceConfig !== config) {
                return;
            }

            // A store this key cannot read (another passphrase, a pre-4.0 store) is left alone
            if (stored === null) {
                return;
            }

            // Keys in memory win over stored ones
            for (const [provider, key] of Object.entries(stored.keys)) {
                if (!this.keys.has(provider as ProviderType)) {
                    this.keys.set(provider as ProviderType, key);
                }
            }

            this.defaultProvider ??= stored.defaultProvider;
        }

        await this.save(config);
    }

    /** Queue a save of the keys and default provider when persistence is on. */
    private persistKeys(): void {
        const config = this.persistenceConfig;
        if (config && typeof window !== "undefined") {
            void this.enqueue(() => this.save(config));
        }
    }

    /**
     * Encrypt the keys and default provider as they are now and write them.
     * @param config - The configuration the save was queued for; skipped if it is no longer current
     */
    private async save(config: Required<PersistenceConfig>): Promise<void> {
        if (this.persistenceConfig !== config) {
            return;
        }

        const plain: StoredKeys = { keys: Object.fromEntries(this.keys), defaultProvider: this.defaultProvider };
        const derived =
            this.derived?.passphrase === config.encryptionKey
                ? this.derived
                : await deriveKey(config.encryptionKey, crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
        this.derived = derived;
        const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
        const cipher = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            derived.key,
            new TextEncoder().encode(JSON.stringify(plain)),
        );

        // Persistence was turned off, or moved to another key, while this was encrypting
        if (this.persistenceConfig !== config) {
            return;
        }

        const area = storageArea(config.storage);
        area.setItem(itemName(config, KEYS_ITEM), FORMAT_TAG + toBase64(derived.salt, iv, new Uint8Array(cipher)));
        area.removeItem(itemName(config, LEGACY_DEFAULT_PROVIDER_ITEM));
    }

    /**
     * Read and decrypt the store under a configuration.
     * @param config - The persistence configuration
     * @returns The stored keys, or null when absent, in another format, or not decryptable with
     * this key
     */
    private async read(config: Required<PersistenceConfig>): Promise<StoredKeys | null> {
        try {
            const raw = storageArea(config.storage).getItem(itemName(config, KEYS_ITEM));
            if (!raw?.startsWith(FORMAT_TAG)) {
                return null;
            }

            const bytes = fromBase64(raw.slice(FORMAT_TAG.length));
            const salt = bytes.slice(0, SALT_BYTES);
            const iv = bytes.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
            const derived = await deriveKey(config.encryptionKey, salt, this.derived);
            const plain = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                derived.key,
                bytes.slice(SALT_BYTES + IV_BYTES),
            );
            this.derived = derived;
            return parseStored(JSON.parse(new TextDecoder().decode(plain)));
        } catch {
            return null;
        }
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
}

/**
 * The browser storage area for a storage type.
 * @param type - The storage type
 * @returns The storage area
 */
function storageArea(type: StorageType): Storage {
    return type === "sessionStorage" ? sessionStorage : localStorage;
}

/**
 * The storage item name for an item in a store.
 * @param config - The persistence configuration
 * @param item - The item inside the store
 * @returns The storage item name
 */
function itemName(config: Required<PersistenceConfig>, item: string): string {
    return `${config.prefix}:${item}`;
}

/**
 * Derive the AES-GCM key for a passphrase and salt with PBKDF2-SHA-256.
 * @param passphrase - The passphrase
 * @param salt - The salt
 * @param cached - A key already derived, reused when passphrase and salt match
 * @returns The derived key
 */
async function deriveKey(
    passphrase: string,
    salt: Uint8Array<ArrayBuffer>,
    cached: DerivedKey | null = null,
): Promise<DerivedKey> {
    if (cached?.passphrase === passphrase && sameBytes(cached.salt, salt)) {
        return cached;
    }

    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
        "deriveKey",
    ]);
    const key = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
    return { passphrase, salt, key };
}

/**
 * Check two byte arrays for equality.
 * @param a - First array
 * @param b - Second array
 * @returns True when they hold the same bytes
 */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

/**
 * Concatenate byte arrays and encode them as base64.
 * @param parts - The byte arrays
 * @returns The base64 text
 */
function toBase64(...parts: Uint8Array[]): string {
    let binary = "";
    for (const part of parts) {
        for (const byte of part) {
            binary += String.fromCharCode(byte);
        }
    }

    return btoa(binary);
}

/**
 * Decode base64 text.
 * @param text - The base64 text
 * @returns The bytes
 */
function fromBase64(text: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

/**
 * Validate decrypted store contents.
 * @param value - The parsed JSON
 * @returns The stored keys, with any non-string entry (corrupt or tampered data) skipped
 */
function parseStored(value: unknown): StoredKeys | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    const { keys, defaultProvider } = value as { keys?: unknown; defaultProvider?: unknown };
    if (typeof keys !== "object" || keys === null) {
        return null;
    }

    return {
        keys: Object.fromEntries(Object.entries(keys).filter(([, key]) => typeof key === "string")) as Record<
            string,
            string
        >,
        defaultProvider: typeof defaultProvider === "string" ? (defaultProvider as ProviderType) : null,
    };
}
