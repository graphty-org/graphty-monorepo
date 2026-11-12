/**
 * API Key Manager Module - Session and persistent storage for API keys.
 * Persisted keys are encrypted with the browser's Web Crypto API (AES-GCM under a PBKDF2 key).
 * @module ai/keys/ApiKeyManager
 */

import type { ProviderType } from "../providers";
import { deriveKeyFromPassphrase } from "./deriveKeyFromPassphrase";

type StorageType = "localStorage" | "sessionStorage";

/**
 * Configuration options for enabling persistence. Every field is optional.
 */
export interface PersistenceConfig {
    /**
     * Encryption key used to encrypt stored API keys (minimum 10 characters).
     *
     * Default: a built-in key. It is public in this package's source, so keys saved with it are
     * obscured, not encrypted: they are not in plain text at rest, but anyone with access to the
     * page or the browser profile can decrypt them. For real protection, call
     * `enablePersistenceWithPassphrase` with a passphrase the reader types instead.
     *
     * A custom key is remembered in clear text in `sessionStorage` for the rest of the tab's life,
     * so persistence survives a reload and ends when the tab closes. Anyone with access to the page
     * can read it there while the tab is open.
     */
    encryptionKey?: string;
    /** Storage type (default: the constructor's, which defaults to "localStorage") */
    storage?: StorageType;
    /** Prefix for storage keys (default: the constructor's, which defaults to "@graphty-ai-keys") */
    prefix?: string;
}

/**
 * Options for {@link ApiKeyManager.enablePersistenceWithPassphrase}. Every field is optional.
 */
export interface PassphrasePersistenceConfig {
    /**
     * A per-reader value mixed into the key, such as an account id or random bytes the host
     * keeps. It need not be secret, but one per reader means a guessed passphrase cannot be tried
     * against every reader at once. The same passphrase and salt always unlock the same keys.
     * Default: a fixed salt shared by every reader.
     */
    salt?: string;
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
const DEFAULT_PROVIDER_ITEM = "default-provider";
/** Other namespaces of the credential store (the network-source credentials), in the same store. */
const EXTRAS_ITEM = "extras";

/** Marks a stored value written by this scheme: `gk1:` + base64(salt | iv | AES-GCM ciphertext) */
const FORMAT_TAG = "gk1:";
const SALT_BYTES = 16;
const IV_BYTES = 12;
/** PBKDF2 rounds: OWASP's 2023 figure for PBKDF2-HMAC-SHA256. */
const PBKDF2_ITERATIONS = 600_000;

type Config = Required<PersistenceConfig>;

/**
 * Manages API keys for LLM providers.
 * Supports both session-only and persistent encrypted storage.
 *
 * Persisted keys are encrypted with Web Crypto: AES-GCM with a fresh IV per save, under a key
 * derived with PBKDF2-SHA-256 from the encryption key. Keys persisted without an `encryptionKey`
 * are obscured, not encrypted: the built-in key is public, so anyone with access to the page or the
 * browser profile can read them. To protect them, call `enablePersistenceWithPassphrase` with the
 * reader's passphrase.
 *
 * Reads and writes to storage are asynchronous, because Web Crypto is. Keys in memory change at
 * once and the encrypted copy follows; `ready()` resolves when every storage operation started so
 * far has finished: the restore on construction, `enablePersistence`'s load, and every save.
 *
 * Persistence restores itself: a manager constructed after a reload finds the keys an earlier
 * page persisted (with the built-in key, or with a custom key from the same tab) and turns
 * persistence back on once `ready()` resolves. A host calls `enablePersistence()`,
 * `disablePersistence()` and `setKey()` and nothing else.
 *
 * Keys saved by graphty-element before this format (encrypt-storage's) cannot be read with Web
 * Crypto. They are left untouched and treated as unreadable, so the reader enters them once more;
 * the first save replaces them.
 */
export class ApiKeyManager {
    private readonly keys = new Map<ProviderType, string>();
    private readonly extras = new Map<string, unknown>();
    private defaultProvider: ProviderType | null = null;
    private persistenceConfig: Config | null = null;
    private readonly storage: StorageType;
    private readonly prefix: string;
    /** Every storage operation runs after the one before it */
    private pending: Promise<void> = Promise.resolve();
    /** Set once the host enables or disables persistence; the restore then stands aside */
    private hostChosePersistence = false;
    /** Derived AES keys by encryption key and salt, so each is derived once */
    private readonly derivedKeys = new Map<string, Promise<CryptoKey>>();
    /** The salt each encryption key saves with */
    private readonly saveSalts = new Map<string, Uint8Array<ArrayBuffer>>();

    /**
     * Create a key manager and start restoring any keys a previous page persisted. Await
     * {@link ready} to see them.
     * @param options - Where persisted keys live
     */
    constructor(options: ApiKeyManagerOptions = {}) {
        this.storage = options.storage ?? "localStorage";
        this.prefix = options.prefix ?? DEFAULT_STORAGE_PREFIX;
        void this.enqueue(() => this.restorePersistence()); // NOSONAR(S7059): restoring on construction is the class's contract; ready() awaits it
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
     * Without `config.encryptionKey` the keys are only obscured; see {@link PersistenceConfig.encryptionKey}.
     * A key that cannot decrypt what is already stored loads nothing and leaves the stored keys as
     * they are.
     * @param config - Persistence configuration (default: built-in encryption key)
     * @returns A promise that resolves once stored keys are loaded and the store is saved
     * @throws Error if encryption key is empty or too short (minimum 10 characters)
     */
    enablePersistence(config: PersistenceConfig = {}): Promise<void> {
        const encryptionKey = config.encryptionKey ?? DEFAULT_ENCRYPTION_KEY;
        if (this.startPersistence(encryptionKey, config)) {
            this.rememberSessionKey(encryptionKey === DEFAULT_ENCRYPTION_KEY ? null : encryptionKey);
        }

        return this.pending;
    }

    /**
     * Enable persistent storage with a key derived from a passphrase the reader types, so the
     * saved keys are encrypted rather than obscured: only someone who knows the passphrase can
     * read them. Keys already in memory are saved, and keys already stored under the same
     * passphrase and salt are loaded; a wrong passphrase loads nothing and leaves the stored keys
     * as they are.
     *
     * The derived key is held in memory only, never in storage, so nothing restores itself after a
     * reload: call this again with the passphrase on the next page.
     *
     * The key is derived with WebCrypto PBKDF2-HMAC-SHA256 (600,000 iterations), which takes a
     * noticeable fraction of a second.
     * @example
     * ```typescript
     * const keys = new ApiKeyManager();
     * await keys.enablePersistenceWithPassphrase(passphrase, { salt: userId });
     * ```
     * @param passphrase - What the reader typed. Must not be empty.
     * @param config - Where to store the keys, and the salt (see {@link PassphrasePersistenceConfig.salt})
     * @throws Error if the passphrase is empty
     */
    async enablePersistenceWithPassphrase(passphrase: string, config: PassphrasePersistenceConfig = {}): Promise<void> {
        const encryptionKey = await deriveKeyFromPassphrase(passphrase, config.salt);
        if (this.startPersistence(encryptionKey, config)) {
            // A key remembered for this tab by an earlier enablePersistence no longer applies
            this.rememberSessionKey(null);
        }

        await this.pending;
    }

    /**
     * Point persistence at a store under this key and queue its load and save. It never writes the
     * key anywhere.
     * @param encryptionKey - The key to encrypt the stored keys with
     * @param config - Where the store lives
     * @returns Whether a store was opened (false without a window)
     */
    private startPersistence(encryptionKey: string, config: Omit<PersistenceConfig, "encryptionKey">): boolean {
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

        if (globalThis.window === undefined) {
            return false;
        }

        void this.enqueue(() => this.open(persistenceConfig));
        return true;
    }

    /**
     * Disable persistent storage. With `clearStorage` false the stored keys stay where they are:
     * the next page load restores them, and turns persistence back on, if they were saved with the
     * built-in encryption key. Keys saved with a custom key wait for `enablePersistence` with it.
     * @param clearStorage - Whether to clear stored keys from storage (default: true)
     */
    disablePersistence(clearStorage = true): void {
        const config = this.persistenceConfig;
        if (clearStorage && config && globalThis.window !== undefined) {
            try {
                for (const item of [KEYS_ITEM, DEFAULT_PROVIDER_ITEM, EXTRAS_ITEM]) {
                    storageArea(config.storage).removeItem(itemName(config, item));
                }
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
     * Remove a provider's key from memory and from both storages, wherever an earlier page or
     * another `storage` setting left it. {@link removeKey} reaches only the storage in use. The
     * other providers' keys stay where they are.
     * @experimental assistant
     * @param provider - The provider type
     * @returns A promise that resolves once both storages are rewritten
     */
    forgetKey(provider: ProviderType): Promise<void> {
        this.keys.delete(provider);
        return this.enqueue(async () => {
            for (const config of this.bothStores()) {
                const stored = parseKeys(await this.readItem(config, KEYS_ITEM));
                if (stored !== null && provider in stored) {
                    const { [provider]: _forgotten, ...kept } = stored;
                    const sealed = await this.seal(config.encryptionKey, kept);
                    storageArea(config.storage).setItem(itemName(config, KEYS_ITEM), sealed);
                }
            }
        });
    }

    /**
     * Remove every provider's key from memory and from both storages; see {@link forgetKey}.
     * @experimental assistant
     * @returns A promise that resolves once both storages are cleared
     */
    forgetKeys(): Promise<void> {
        this.keys.clear();
        // Queued, so a save already encrypting cannot write the keys back afterwards
        return this.enqueue(() => {
            for (const config of this.bothStores()) {
                storageArea(config.storage).removeItem(itemName(config, KEYS_ITEM));
            }
            return Promise.resolve();
        });
    }

    /**
     * Move the keys another `storage` setting left into the storage in use, so a key is never kept
     * in the one the host just moved away from. Nothing without persistence on.
     * @experimental assistant
     * @returns A promise that resolves once the keys are moved
     */
    retireOtherStorage(): Promise<void> {
        const config = this.persistenceConfig;
        if (config === null || globalThis.window === undefined) {
            return this.pending;
        }

        const other: Config = {
            ...config,
            storage: config.storage === "localStorage" ? "sessionStorage" : "localStorage",
        };
        return this.enqueue(async () => {
            const stored = parseKeys(await this.readItem(other, KEYS_ITEM));
            if (stored === null) {
                return;
            }

            this.mergeKeys(stored);
            await this.saveKeys(config);
            storageArea(other.storage).removeItem(itemName(other, KEYS_ITEM));
        });
    }

    /**
     * Read a named item another namespace of the credential store keeps beside the keys, under the
     * same persistence and encryption (`CredentialStore` keeps the network-source credentials
     * here). In memory when persistence is off.
     * @param name - The item's name
     * @returns The value, or undefined
     */
    getStoredItem(name: string): unknown {
        return this.extras.get(name);
    }

    /**
     * Write, or with undefined remove, a named item kept beside the keys; see {@link getStoredItem}.
     * It is persisted when persistence is on, and goes with the keys when it is turned off.
     * @param name - The item's name
     * @param value - Plain JSON data, or undefined to remove it
     */
    setStoredItem(name: string, value: unknown): void {
        if (value === undefined) {
            this.extras.delete(name);
        } else {
            this.extras.set(name, value);
        }

        const config = this.persistenceConfig;
        if (config && globalThis.window !== undefined) {
            void this.enqueue(() => this.saveExtras(config));
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
     * The store of both storages, under the key and prefix persistence uses.
     * @returns One configuration per storage; none without a window
     */
    private bothStores(): Config[] {
        if (globalThis.window === undefined) {
            return [];
        }

        const { encryptionKey, prefix } = this.persistenceConfig ?? {
            encryptionKey: DEFAULT_ENCRYPTION_KEY,
            prefix: this.prefix,
        };
        return (["localStorage", "sessionStorage"] as const).map((storage) => ({ encryptionKey, storage, prefix }));
    }

    /**
     * Turn persistence back on if an earlier page left keys this manager can read: first with the
     * custom key remembered for this tab, then with the built-in key.
     */
    private async restorePersistence(): Promise<void> {
        if (globalThis.window === undefined || this.hostChosePersistence) {
            return;
        }

        const sessionKey = this.readSessionKey();
        for (const encryptionKey of [sessionKey, DEFAULT_ENCRYPTION_KEY]) {
            if (encryptionKey === null) {
                continue;
            }

            const config = { encryptionKey, storage: this.storage, prefix: this.prefix };
            if (parseKeys(await this.readItem(config, KEYS_ITEM)) !== null && !this.hostChosePersistence) {
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
     * Load the stored keys under a configuration into memory, then save the merged set, unless the
     * store cannot be read with this key: then it is left alone rather than overwritten with
     * nothing. Keys in memory win over stored ones.
     * @param config - The persistence configuration that was just turned on
     */
    private async open(config: Config): Promise<void> {
        if (storageArea(config.storage).getItem(itemName(config, KEYS_ITEM)) !== null) {
            const stored = parseKeys(await this.readItem(config, KEYS_ITEM));
            // Another key, another passphrase, or a store saved by encrypt-storage
            if (stored === null || this.persistenceConfig !== config) {
                return;
            }

            this.mergeKeys(stored);
            const defaultProvider = await this.readItem(config, DEFAULT_PROVIDER_ITEM);
            this.defaultProvider ??= typeof defaultProvider === "string" ? (defaultProvider as ProviderType) : null;
            const extras = await this.readItem(config, EXTRAS_ITEM);
            for (const [name, value] of Object.entries(isRecord(extras) ? extras : {})) {
                if (!this.extras.has(name)) {
                    this.extras.set(name, value);
                }
            }
        }

        await this.saveKeys(config);
        if (this.extras.size > 0) {
            await this.saveExtras(config);
        }
    }

    /**
     * Take stored keys into memory. Keys in memory win over stored ones.
     * @param stored - The keys by provider
     */
    private mergeKeys(stored: Record<string, string>): void {
        for (const [provider, key] of Object.entries(stored)) {
            if (!this.keys.has(provider as ProviderType)) {
                this.keys.set(provider as ProviderType, key);
            }
        }
    }

    /** Queue a save of the keys and the default provider when persistence is on. */
    private persistKeys(): void {
        const config = this.persistenceConfig;
        if (config && globalThis.window !== undefined) {
            void this.enqueue(() => this.saveKeys(config));
        }
    }

    /**
     * Save the keys and the default provider as they are now, unless persistence has since moved.
     * @param config - The configuration the save was queued for
     */
    private async saveKeys(config: Config): Promise<void> {
        if (this.persistenceConfig !== config) {
            return;
        }

        const keys = await this.seal(config.encryptionKey, Object.fromEntries(this.keys));
        const defaultProvider =
            this.defaultProvider === null ? null : await this.seal(config.encryptionKey, this.defaultProvider);
        // Persistence was turned off, or moved to another key, while this was encrypting
        if (this.persistenceConfig !== config) {
            return;
        }

        const area = storageArea(config.storage);
        area.setItem(itemName(config, KEYS_ITEM), keys);
        if (defaultProvider === null) {
            area.removeItem(itemName(config, DEFAULT_PROVIDER_ITEM));
        } else {
            area.setItem(itemName(config, DEFAULT_PROVIDER_ITEM), defaultProvider);
        }
    }

    /**
     * Save the other namespaces' items. Written only by the manager that holds them, so a second
     * manager on the same storage, which holds none, never overwrites them with nothing.
     * @param config - The configuration the save was queued for
     */
    private async saveExtras(config: Config): Promise<void> {
        const extras = await this.seal(config.encryptionKey, Object.fromEntries(this.extras));
        if (this.persistenceConfig === config) {
            storageArea(config.storage).setItem(itemName(config, EXTRAS_ITEM), extras);
        }
    }

    /**
     * Encrypt a value as a store item holds it.
     * @param encryptionKey - The encryption key
     * @param value - Plain JSON data
     * @returns `gk1:` + base64(salt | iv | AES-GCM ciphertext)
     */
    private async seal(encryptionKey: string, value: unknown): Promise<string> {
        let salt = this.saveSalts.get(encryptionKey);
        if (salt === undefined) {
            salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
            this.saveSalts.set(encryptionKey, salt);
        }

        const key = await this.aesKey(encryptionKey, salt);
        const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
        const cipher = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            new TextEncoder().encode(JSON.stringify(value)),
        );
        return FORMAT_TAG + toBase64(salt, iv, new Uint8Array(cipher));
    }

    /**
     * Read and decrypt a store item.
     * @param config - The store
     * @param item - The item's name
     * @returns The value, or null when absent, in another format, or not decryptable with this key
     */
    private async readItem(config: Config, item: string): Promise<unknown> {
        try {
            const raw = storageArea(config.storage).getItem(itemName(config, item));
            if (!raw?.startsWith(FORMAT_TAG)) {
                return null;
            }

            const bytes = fromBase64(raw.slice(FORMAT_TAG.length));
            const salt = bytes.slice(0, SALT_BYTES);
            const key = await this.aesKey(config.encryptionKey, salt);
            const plain = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: bytes.slice(SALT_BYTES, SALT_BYTES + IV_BYTES) },
                key,
                bytes.slice(SALT_BYTES + IV_BYTES),
            );
            // Saves reuse the salt already derived, rather than deriving another key
            if (!this.saveSalts.has(config.encryptionKey)) {
                this.saveSalts.set(config.encryptionKey, salt);
            }

            return JSON.parse(new TextDecoder().decode(plain)) as unknown;
        } catch {
            return null;
        }
    }

    /**
     * The AES-GCM key for an encryption key and salt, derived with PBKDF2-SHA-256 once.
     * @param encryptionKey - The encryption key
     * @param salt - The salt
     * @returns The derived key
     */
    private aesKey(encryptionKey: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
        const id = `${toBase64(salt)}:${encryptionKey}`;
        let key = this.derivedKeys.get(id);
        if (key === undefined) {
            key = deriveAesKey(encryptionKey, salt);
            this.derivedKeys.set(id, key);
        }

        return key;
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
function itemName(config: Config, item: string): string {
    return `${config.prefix}:${item}`;
}

/**
 * Derive an AES-GCM key from an encryption key and salt with PBKDF2-SHA-256.
 * @param encryptionKey - The encryption key
 * @param salt - The salt
 * @returns The derived key
 */
async function deriveAesKey(encryptionKey: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(encryptionKey), "PBKDF2", false, [
        "deriveKey",
    ]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
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
            binary += String.fromCodePoint(byte);
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
    return Uint8Array.from(atob(text), (char) => char.codePointAt(0) ?? 0);
}

/**
 * Whether a value is a plain object.
 * @param value - The value
 * @returns True for a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * The stored keys, with any non-string entry (corrupt or tampered data) skipped, never handed out
 * as a key.
 * @param value - The decrypted keys item
 * @returns The keys by provider, or null when absent or unreadable
 */
function parseKeys(value: unknown): Record<string, string> | null {
    if (!isRecord(value)) {
        return null;
    }

    return Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
}
