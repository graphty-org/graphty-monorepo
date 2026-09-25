/**
 * Tests for ApiKeyManager Persistence (Phase 7)
 * These tests run in a real browser environment via Playwright.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { ApiKeyManager } from "../../../src/ai/keys/ApiKeyManager";

describe("ApiKeyManager Persistence", () => {
    // Use unique prefixes for each test to avoid interference
    let testPrefix: string;

    beforeEach(() => {
        // Generate unique prefix for each test
        testPrefix = `@graphty-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        // Clear any existing test data
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        // Clean up storage after each test
        localStorage.clear();
        sessionStorage.clear();
    });

    describe("enablePersistence", () => {
        it("enables persistence with encryption key", () => {
            const manager = new ApiKeyManager();
            manager.enablePersistence({
                encryptionKey: "test-encryption-key-long-enough",
                storage: "localStorage",
                prefix: testPrefix,
            });

            // Should not throw
            assert.ok(true);
        });

        it("enables persistence with sessionStorage", () => {
            const manager = new ApiKeyManager();
            manager.enablePersistence({
                encryptionKey: "test-session-key-long",
                storage: "sessionStorage",
                prefix: testPrefix,
            });

            assert.ok(true);
        });

        it("throws error without encryption key", () => {
            const manager = new ApiKeyManager();

            assert.throws(() => {
                manager.enablePersistence({
                    encryptionKey: "",
                    storage: "localStorage",
                    prefix: testPrefix,
                });
            }, /encryption key/i);
        });

        it("throws error with encryption key shorter than 10 characters", () => {
            const manager = new ApiKeyManager();

            assert.throws(() => {
                manager.enablePersistence({
                    encryptionKey: "short",
                    storage: "localStorage",
                    prefix: testPrefix,
                });
            }, /at least 10 characters/i);
        });
    });

    describe("key persistence across instances", () => {
        it("persists and retrieves key with encryption", () => {
            // First manager - set a key
            const manager1 = new ApiKeyManager();
            manager1.enablePersistence({
                encryptionKey: "test-secret-key-long",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager1.setKey("openai", "sk-test-key-12345");

            // Second manager - should retrieve the key
            const manager2 = new ApiKeyManager();
            manager2.enablePersistence({
                encryptionKey: "test-secret-key-long",
                storage: "localStorage",
                prefix: testPrefix,
            });

            const retrievedKey = manager2.getKey("openai");
            assert.strictEqual(retrievedKey, "sk-test-key-12345");
        });

        it("fails to retrieve with wrong encryption key", () => {
            // First manager - set a key
            const manager1 = new ApiKeyManager();
            manager1.enablePersistence({
                encryptionKey: "correct-key-long-enough",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager1.setKey("openai", "sk-secret-key");

            // Second manager with wrong key - should not retrieve
            const manager2 = new ApiKeyManager();
            manager2.enablePersistence({
                encryptionKey: "wrong-key-long-enough",
                storage: "localStorage",
                prefix: testPrefix,
            });

            const retrievedKey = manager2.getKey("openai");
            // With wrong encryption key, should return undefined or throw
            // The exact behavior depends on implementation
            assert.ok(retrievedKey === undefined || retrievedKey !== "sk-secret-key");
        });

        it("persists multiple provider keys", () => {
            const manager1 = new ApiKeyManager();
            manager1.enablePersistence({
                encryptionKey: "multi-key-test-long",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager1.setKey("openai", "sk-openai-key");
            manager1.setKey("anthropic", "sk-anthropic-key");
            manager1.setKey("google", "google-api-key");

            // New instance should have all keys
            const manager2 = new ApiKeyManager();
            manager2.enablePersistence({
                encryptionKey: "multi-key-test-long",
                storage: "localStorage",
                prefix: testPrefix,
            });

            assert.strictEqual(manager2.getKey("openai"), "sk-openai-key");
            assert.strictEqual(manager2.getKey("anthropic"), "sk-anthropic-key");
            assert.strictEqual(manager2.getKey("google"), "google-api-key");
        });

        it("removes persisted key", () => {
            const manager1 = new ApiKeyManager();
            manager1.enablePersistence({
                encryptionKey: "remove-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager1.setKey("openai", "sk-to-remove");

            // Verify it was set
            assert.strictEqual(manager1.getKey("openai"), "sk-to-remove");

            // Remove the key
            manager1.removeKey("openai");

            // New instance should not have the key
            const manager2 = new ApiKeyManager();
            manager2.enablePersistence({
                encryptionKey: "remove-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });

            assert.strictEqual(manager2.getKey("openai"), undefined);
        });
    });

    describe("keys set before persistence was enabled", () => {
        it("saves a key that was in memory when persistence was turned on", () => {
            const config = {
                encryptionKey: "before-enable-long-key",
                storage: "localStorage" as const,
                prefix: testPrefix,
            };
            const manager1 = new ApiKeyManager();
            manager1.setKey("openai", "sk-typed-first");
            manager1.enablePersistence(config);

            const manager2 = new ApiKeyManager();
            manager2.enablePersistence(config);

            assert.strictEqual(manager2.getKey("openai"), "sk-typed-first");
        });

        it("merges stored keys under the ones in memory, memory winning", () => {
            const config = {
                encryptionKey: "merge-test-long-key",
                storage: "localStorage" as const,
                prefix: testPrefix,
            };
            const earlier = new ApiKeyManager();
            earlier.enablePersistence(config);
            earlier.setKey("openai", "sk-stored-openai");
            earlier.setKey("anthropic", "sk-stored-anthropic");

            const manager = new ApiKeyManager();
            manager.setKey("openai", "sk-memory-openai");
            manager.enablePersistence(config);

            assert.strictEqual(manager.getKey("openai"), "sk-memory-openai");
            assert.strictEqual(manager.getKey("anthropic"), "sk-stored-anthropic");

            const reloaded = new ApiKeyManager();
            reloaded.enablePersistence(config);
            assert.strictEqual(reloaded.getKey("openai"), "sk-memory-openai");
            assert.strictEqual(reloaded.getKey("anthropic"), "sk-stored-anthropic");
        });

        it("keeps the in-memory key, and leaves a blob it cannot read untouched", () => {
            const owner = {
                encryptionKey: "owners-own-long-key",
                storage: "localStorage" as const,
                prefix: testPrefix,
            };
            const saved = new ApiKeyManager();
            saved.enablePersistence(owner);
            saved.setKey("anthropic", "sk-saved-under-owner-key");

            const manager = new ApiKeyManager();
            manager.setKey("openai", "sk-in-memory-only");
            manager.enablePersistence({ ...owner, encryptionKey: "a-different-long-key" });

            assert.strictEqual(manager.getKey("openai"), "sk-in-memory-only");

            const reader = new ApiKeyManager();
            reader.enablePersistence(owner);
            assert.strictEqual(reader.getKey("anthropic"), "sk-saved-under-owner-key");
        });

        it("keeps the in-memory key when the stored blob is corrupt, and does not overwrite it", () => {
            localStorage.setItem(`${testPrefix}:keys`, "not an encrypted value");

            const manager = new ApiKeyManager();
            manager.setKey("openai", "sk-in-memory-only");
            manager.enablePersistence({
                encryptionKey: "corrupt-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });

            assert.strictEqual(manager.getKey("openai"), "sk-in-memory-only");
            assert.strictEqual(localStorage.getItem(`${testPrefix}:keys`), "not an encrypted value");
        });

        it("writes nothing when there is nothing to save", () => {
            const manager = new ApiKeyManager();
            manager.enablePersistence({
                encryptionKey: "empty-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });

            assert.strictEqual(localStorage.getItem(`${testPrefix}:keys`), null);
        });
    });

    describe("disablePersistence", () => {
        it("disables persistence and clears stored keys", () => {
            const manager = new ApiKeyManager();
            manager.enablePersistence({
                encryptionKey: "disable-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager.setKey("openai", "sk-test");

            // Disable persistence
            manager.disablePersistence();

            // New instance with persistence should not find the key
            const manager2 = new ApiKeyManager();
            manager2.enablePersistence({
                encryptionKey: "disable-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });

            assert.strictEqual(manager2.getKey("openai"), undefined);
        });

        it("keeps in-memory keys after disabling persistence", () => {
            const manager = new ApiKeyManager();
            manager.enablePersistence({
                encryptionKey: "memory-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager.setKey("openai", "sk-in-memory");

            // Disable persistence but keep in-memory
            manager.disablePersistence(false); // false = don't clear memory

            // Current instance should still have the key
            assert.strictEqual(manager.getKey("openai"), "sk-in-memory");
        });
    });

    describe("isPersistenceEnabled", () => {
        it("returns false by default", () => {
            const manager = new ApiKeyManager();
            assert.strictEqual(manager.isPersistenceEnabled(), false);
        });

        it("returns true after enabling persistence", () => {
            const manager = new ApiKeyManager();
            manager.enablePersistence({
                encryptionKey: "enabled-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            assert.strictEqual(manager.isPersistenceEnabled(), true);
        });

        it("returns false after disabling persistence", () => {
            const manager = new ApiKeyManager();
            manager.enablePersistence({
                encryptionKey: "toggle-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager.disablePersistence();
            assert.strictEqual(manager.isPersistenceEnabled(), false);
        });
    });

    describe("storage key prefix", () => {
        it("uses custom storage key prefix", () => {
            const customPrefix = "@custom-app-prefix-test";
            const manager = new ApiKeyManager();
            manager.enablePersistence({
                encryptionKey: "prefix-test-long-key",
                storage: "localStorage",
                prefix: customPrefix,
            });
            manager.setKey("openai", "sk-prefixed");

            // Check that localStorage has a key with the custom prefix
            // encrypt-storage stores with format: prefix:keyName
            const storedValue = localStorage.getItem(`${customPrefix}:keys`);
            assert.ok(storedValue !== null);
        });
    });
});
