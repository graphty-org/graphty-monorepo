/**
 * Tests for ApiKeyManager Persistence.
 * These tests run in a real browser environment via Playwright.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { ApiKeyManager } from "../../../src/ai/keys/ApiKeyManager";

/**
 * A store written by graphty-element before 4.0 (encrypt-storage, crypto-js AES with the built-in
 * key): `{ openai: "sk-legacy-fixture" }`.
 */
const LEGACY_KEYS_BLOB = "U2FsdGVkX19VhdtpvMTmEepfDmYk36T/bxHEPJ6OD0kYQ3GUpUNqF7KvVmwOReRY";
const LEGACY_DEFAULT_PROVIDER_BLOB = "U2FsdGVkX19o/EwuXTValWZcZzubW/1gXvS8R4k6wdw=";

describe("ApiKeyManager Persistence", () => {
    let testPrefix: string;

    /**
     * A persistence config under this test's prefix.
     * @param encryptionKey - The passphrase, or undefined for the built-in key
     * @returns The config
     */
    const config = (encryptionKey?: string): { encryptionKey?: string; prefix: string } => ({
        encryptionKey,
        prefix: testPrefix,
    });

    beforeEach(() => {
        testPrefix = `@graphty-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    describe("enablePersistence", () => {
        it("enables persistence with sessionStorage", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence({ ...config("test-session-key-long"), storage: "sessionStorage" });

            assert.isNotNull(sessionStorage.getItem(`${testPrefix}:keys`));
            assert.isNull(localStorage.getItem(`${testPrefix}:keys`));
        });

        it("throws error without encryption key", () => {
            const manager = new ApiKeyManager();
            assert.throws(() => void manager.enablePersistence(config("")), /encryption key/i);
        });

        it("throws error with encryption key shorter than 10 characters", () => {
            const manager = new ApiKeyManager();
            assert.throws(() => void manager.enablePersistence(config("short")), /at least 10 characters/i);
        });
    });

    describe("encryption", () => {
        it("round-trips keys under a user passphrase", async () => {
            const writer = new ApiKeyManager();
            await writer.enablePersistence(config("test-secret-key-long"));
            writer.setKey("openai", "sk-test-key-12345");
            await writer.ready();

            const reader = new ApiKeyManager();
            await reader.enablePersistence(config("test-secret-key-long"));
            assert.strictEqual(reader.getKey("openai"), "sk-test-key-12345");
        });

        it("round-trips keys under the built-in key", async () => {
            const writer = new ApiKeyManager();
            await writer.enablePersistence(config());
            writer.setKey("anthropic", "sk-built-in-key");
            await writer.ready();

            const reader = new ApiKeyManager();
            await reader.enablePersistence(config());
            assert.strictEqual(reader.getKey("anthropic"), "sk-built-in-key");
        });

        it("never stores a key in plain text", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence(config());
            manager.setKey("openai", "sk-plain-text-probe");
            await manager.ready();

            const stored = localStorage.getItem(`${testPrefix}:keys`) ?? "";
            assert.match(stored, /^gk1:/);
            assert.notInclude(stored, "sk-plain-text-probe");
            assert.notInclude(atob(stored.slice(4)), "sk-plain-text-probe");
        });

        it("uses a fresh IV for every write", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence(config("iv-test-long-key"));
            const ivs = new Set<string>();
            for (const value of ["sk-same", "sk-same", "sk-same"]) {
                manager.setKey("openai", value);
                await manager.ready();
                const bytes = atob((localStorage.getItem(`${testPrefix}:keys`) ?? "").slice(4));
                ivs.add(bytes.slice(16, 28));
            }

            assert.strictEqual(ivs.size, 3);
        });

        it("a wrong passphrase reads nothing and leaves the store alone", async () => {
            const writer = new ApiKeyManager();
            await writer.enablePersistence(config("correct-key-long-enough"));
            writer.setKey("openai", "sk-secret-key");
            await writer.ready();
            const before = localStorage.getItem(`${testPrefix}:keys`);

            const wrong = new ApiKeyManager();
            await wrong.enablePersistence(config("wrong-key-long-enough"));
            assert.strictEqual(wrong.getKey("openai"), undefined);
            assert.strictEqual(localStorage.getItem(`${testPrefix}:keys`), before);

            const right = new ApiKeyManager();
            await right.enablePersistence(config("correct-key-long-enough"));
            assert.strictEqual(right.getKey("openai"), "sk-secret-key");
        });
    });

    describe("a store written before 4.0", () => {
        it("is treated as no stored keys and left untouched", async () => {
            localStorage.setItem(`${testPrefix}:keys`, LEGACY_KEYS_BLOB);
            localStorage.setItem(`${testPrefix}:default-provider`, LEGACY_DEFAULT_PROVIDER_BLOB);

            const restored = new ApiKeyManager({ prefix: testPrefix });
            await restored.ready();
            assert.strictEqual(restored.isPersistenceEnabled(), false);
            assert.deepStrictEqual(restored.getConfiguredProviders(), []);

            await restored.enablePersistence();
            assert.deepStrictEqual(restored.getConfiguredProviders(), []);
            assert.strictEqual(localStorage.getItem(`${testPrefix}:keys`), LEGACY_KEYS_BLOB);
            assert.strictEqual(localStorage.getItem(`${testPrefix}:default-provider`), LEGACY_DEFAULT_PROVIDER_BLOB);
        });

        it("is replaced when the reader enters a key again", async () => {
            localStorage.setItem(`${testPrefix}:keys`, LEGACY_KEYS_BLOB);
            localStorage.setItem(`${testPrefix}:default-provider`, LEGACY_DEFAULT_PROVIDER_BLOB);

            const manager = new ApiKeyManager({ prefix: testPrefix });
            await manager.enablePersistence();
            manager.setKey("openai", "sk-re-entered");
            await manager.ready();

            assert.match(localStorage.getItem(`${testPrefix}:keys`) ?? "", /^gk1:/);
            assert.isNull(localStorage.getItem(`${testPrefix}:default-provider`));
            const reloaded = new ApiKeyManager({ prefix: testPrefix });
            await reloaded.ready();
            assert.strictEqual(reloaded.getKey("openai"), "sk-re-entered");
        });
    });

    describe("key persistence across instances", () => {
        it("persists multiple provider keys", async () => {
            const manager1 = new ApiKeyManager();
            await manager1.enablePersistence(config("multi-key-test-long"));
            manager1.setKey("openai", "sk-openai-key");
            manager1.setKey("anthropic", "sk-anthropic-key");
            manager1.setKey("google", "google-api-key");
            await manager1.ready();

            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence(config("multi-key-test-long"));
            assert.strictEqual(manager2.getKey("openai"), "sk-openai-key");
            assert.strictEqual(manager2.getKey("anthropic"), "sk-anthropic-key");
            assert.strictEqual(manager2.getKey("google"), "google-api-key");
        });

        it("removes persisted key", async () => {
            const manager1 = new ApiKeyManager();
            await manager1.enablePersistence(config("remove-test-long-key"));
            manager1.setKey("openai", "sk-to-remove");
            manager1.removeKey("openai");
            await manager1.ready();

            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence(config("remove-test-long-key"));
            assert.strictEqual(manager2.getKey("openai"), undefined);
        });
    });

    describe("keys set before persistence was enabled", () => {
        it("saves a key that was in memory when persistence was turned on", async () => {
            const manager1 = new ApiKeyManager();
            manager1.setKey("openai", "sk-typed-first");
            await manager1.enablePersistence(config("before-enable-long-key"));

            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence(config("before-enable-long-key"));
            assert.strictEqual(manager2.getKey("openai"), "sk-typed-first");
        });

        it("merges stored keys under the ones in memory, memory winning", async () => {
            const earlier = new ApiKeyManager();
            await earlier.enablePersistence(config("merge-test-long-key"));
            earlier.setKey("openai", "sk-stored-openai");
            earlier.setKey("anthropic", "sk-stored-anthropic");
            await earlier.ready();

            const manager = new ApiKeyManager();
            manager.setKey("openai", "sk-memory-openai");
            await manager.enablePersistence(config("merge-test-long-key"));
            assert.strictEqual(manager.getKey("openai"), "sk-memory-openai");
            assert.strictEqual(manager.getKey("anthropic"), "sk-stored-anthropic");

            const reloaded = new ApiKeyManager();
            await reloaded.enablePersistence(config("merge-test-long-key"));
            assert.strictEqual(reloaded.getKey("openai"), "sk-memory-openai");
            assert.strictEqual(reloaded.getKey("anthropic"), "sk-stored-anthropic");
        });

        it("keeps the in-memory key when the stored blob is corrupt, and does not overwrite it", async () => {
            localStorage.setItem(`${testPrefix}:keys`, "not an encrypted value");

            const manager = new ApiKeyManager();
            manager.setKey("openai", "sk-in-memory-only");
            await manager.enablePersistence(config("corrupt-test-long-key"));

            assert.strictEqual(manager.getKey("openai"), "sk-in-memory-only");
            assert.strictEqual(localStorage.getItem(`${testPrefix}:keys`), "not an encrypted value");
        });

        it("with nothing to save, writes only an encrypted empty store, so remembering survives a reload", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence(config("empty-test-long-key"));

            const stored = localStorage.getItem(`${testPrefix}:keys`);
            assert.isNotNull(stored);
            assert.notInclude(stored ?? "", "{");

            const reloaded = new ApiKeyManager({ prefix: testPrefix });
            await reloaded.enablePersistence(config("empty-test-long-key"));
            assert.deepStrictEqual(reloaded.getConfiguredProviders(), []);
        });
    });

    describe("disablePersistence", () => {
        it("disables persistence and clears stored keys", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence(config("disable-test-long-key"));
            manager.setKey("openai", "sk-test");
            manager.disablePersistence();
            await manager.ready();

            assert.isNull(localStorage.getItem(`${testPrefix}:keys`));
            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence(config("disable-test-long-key"));
            assert.strictEqual(manager2.getKey("openai"), undefined);
        });

        it("keeps in-memory keys after disabling persistence", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence(config("memory-test-long-key"));
            manager.setKey("openai", "sk-in-memory");
            manager.disablePersistence(false);

            assert.strictEqual(manager.getKey("openai"), "sk-in-memory");
        });
    });

    describe("isPersistenceEnabled", () => {
        it("returns false by default", () => {
            assert.strictEqual(new ApiKeyManager().isPersistenceEnabled(), false);
        });

        it("returns true as soon as persistence is enabled, and false after disabling", () => {
            const manager = new ApiKeyManager();
            void manager.enablePersistence(config("toggle-test-long-key"));
            assert.strictEqual(manager.isPersistenceEnabled(), true);
            manager.disablePersistence();
            assert.strictEqual(manager.isPersistenceEnabled(), false);
        });
    });
});
