/**
 * Tests for ApiKeyManager Persistence (Phase 7)
 * These tests run in a real browser environment via Playwright.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { ApiKeyManager } from "../../../ai";
import { deriveKeyFromPassphrase } from "../../../src/ai/keys/deriveKeyFromPassphrase";

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

    describe("forgetKey", () => {
        it("removes one provider's key from both storages and leaves the others", async () => {
            const inTab = new ApiKeyManager({ prefix: testPrefix });
            await inTab.enablePersistence({ storage: "sessionStorage", prefix: testPrefix });
            inTab.setKey("google", "tab-key-long-enough");
            await inTab.ready();
            const onDevice = new ApiKeyManager({ prefix: testPrefix });
            await onDevice.enablePersistence({ storage: "localStorage", prefix: testPrefix });
            onDevice.setKey("google", "device-key-long-enough");
            onDevice.setKey("openai", "sk-other-key-long-enough");
            await onDevice.ready();

            await onDevice.forgetKey("google");

            assert.isFalse(onDevice.hasKey("google"));
            for (const storage of ["localStorage", "sessionStorage"] as const) {
                const fresh = new ApiKeyManager({ prefix: testPrefix });
                await fresh.enablePersistence({ storage, prefix: testPrefix });
                assert.isFalse(fresh.hasKey("google"), storage);
            }
            const restored = new ApiKeyManager({ prefix: testPrefix });
            await restored.ready();
            assert.isTrue(restored.hasKey("openai"));
        });
    });

    describe("forgetKeys", () => {
        it("removes every provider's key from both storages", async () => {
            const inTab = new ApiKeyManager({ prefix: testPrefix });
            await inTab.enablePersistence({ storage: "sessionStorage", prefix: testPrefix });
            inTab.setKey("google", "tab-key-long-enough");
            await inTab.ready();
            const onDevice = new ApiKeyManager({ prefix: testPrefix });
            await onDevice.enablePersistence({ storage: "localStorage", prefix: testPrefix });
            onDevice.setKey("openai", "sk-other-key-long-enough");
            await onDevice.ready();

            await onDevice.forgetKeys();

            for (const storage of ["localStorage", "sessionStorage"] as const) {
                const fresh = new ApiKeyManager({ prefix: testPrefix });
                await fresh.enablePersistence({ storage, prefix: testPrefix });
                assert.deepEqual(fresh.getConfiguredProviders(), [], storage);
            }
        });
    });

    describe("retireOtherStorage", () => {
        it("moves a key out of the storage the host moved away from, either way", async () => {
            for (const [from, to] of [
                ["localStorage", "sessionStorage"],
                ["sessionStorage", "localStorage"],
            ] as const) {
                const before = new ApiKeyManager({ prefix: testPrefix });
                await before.enablePersistence({ storage: from, prefix: testPrefix });
                before.setKey("google", "moved-key-long-enough");
                await before.ready();

                const after = new ApiKeyManager({ prefix: testPrefix });
                await after.enablePersistence({ storage: to, prefix: testPrefix });
                await after.retireOtherStorage();

                assert.strictEqual(after.getKey("google"), "moved-key-long-enough");
                const area = from === "localStorage" ? localStorage : sessionStorage;
                assert.isNull(area.getItem(`${testPrefix}:keys`));
                localStorage.clear();
                sessionStorage.clear();
            }
        });
    });

    describe("enablePersistence", () => {
        it("enables persistence with encryption key", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence({
                encryptionKey: "test-encryption-key-long-enough",
                storage: "localStorage",
                prefix: testPrefix,
            });

            // Should not throw
            assert.ok(true);
        });

        it("enables persistence with sessionStorage", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence({
                encryptionKey: "test-session-key-long",
                storage: "sessionStorage",
                prefix: testPrefix,
            });

            assert.ok(true);
        });

        it("throws error without encryption key", () => {
            const manager = new ApiKeyManager();

            assert.throws(() => {
                void manager.enablePersistence({
                    encryptionKey: "",
                    storage: "localStorage",
                    prefix: testPrefix,
                });
            }, /encryption key/i);
        });

        it("throws error with encryption key shorter than 10 characters", () => {
            const manager = new ApiKeyManager();

            assert.throws(() => {
                void manager.enablePersistence({
                    encryptionKey: "short",
                    storage: "localStorage",
                    prefix: testPrefix,
                });
            }, /at least 10 characters/i);
        });
    });

    describe("key persistence across instances", () => {
        it("persists and retrieves key with encryption", async () => {
            // First manager - set a key
            const manager1 = new ApiKeyManager();
            await manager1.enablePersistence({
                encryptionKey: "test-secret-key-long",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager1.setKey("openai", "sk-test-key-12345");
            await manager1.ready();

            // Second manager - should retrieve the key
            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence({
                encryptionKey: "test-secret-key-long",
                storage: "localStorage",
                prefix: testPrefix,
            });

            const retrievedKey = manager2.getKey("openai");
            assert.strictEqual(retrievedKey, "sk-test-key-12345");
        });

        it("fails to retrieve with wrong encryption key", async () => {
            // First manager - set a key
            const manager1 = new ApiKeyManager();
            await manager1.enablePersistence({
                encryptionKey: "correct-key-long-enough",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager1.setKey("openai", "sk-secret-key");
            await manager1.ready();

            // Second manager with wrong key - should not retrieve
            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence({
                encryptionKey: "wrong-key-long-enough",
                storage: "localStorage",
                prefix: testPrefix,
            });

            const retrievedKey = manager2.getKey("openai");
            // With wrong encryption key, should return undefined or throw
            // The exact behavior depends on implementation
            assert.ok(retrievedKey === undefined || retrievedKey !== "sk-secret-key");
        });

        it("persists multiple provider keys", async () => {
            const manager1 = new ApiKeyManager();
            await manager1.enablePersistence({
                encryptionKey: "multi-key-test-long",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager1.setKey("openai", "sk-openai-key");
            manager1.setKey("anthropic", "sk-anthropic-key");
            manager1.setKey("google", "google-api-key");
            await manager1.ready();

            // New instance should have all keys
            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence({
                encryptionKey: "multi-key-test-long",
                storage: "localStorage",
                prefix: testPrefix,
            });

            assert.strictEqual(manager2.getKey("openai"), "sk-openai-key");
            assert.strictEqual(manager2.getKey("anthropic"), "sk-anthropic-key");
            assert.strictEqual(manager2.getKey("google"), "google-api-key");
        });

        it("removes persisted key", async () => {
            const manager1 = new ApiKeyManager();
            await manager1.enablePersistence({
                encryptionKey: "remove-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager1.setKey("openai", "sk-to-remove");
            await manager1.ready();

            // Verify it was set
            assert.strictEqual(manager1.getKey("openai"), "sk-to-remove");

            // Remove the key
            manager1.removeKey("openai");
            await manager1.ready();

            // New instance should not have the key
            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence({
                encryptionKey: "remove-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });

            assert.strictEqual(manager2.getKey("openai"), undefined);
        });
    });

    describe("keys set before persistence was enabled", () => {
        it("saves a key that was in memory when persistence was turned on", async () => {
            const config = {
                encryptionKey: "before-enable-long-key",
                storage: "localStorage" as const,
                prefix: testPrefix,
            };
            const manager1 = new ApiKeyManager();
            manager1.setKey("openai", "sk-typed-first");
            await manager1.ready();
            await manager1.enablePersistence(config);

            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence(config);

            assert.strictEqual(manager2.getKey("openai"), "sk-typed-first");
        });

        it("merges stored keys under the ones in memory, memory winning", async () => {
            const config = {
                encryptionKey: "merge-test-long-key",
                storage: "localStorage" as const,
                prefix: testPrefix,
            };
            const earlier = new ApiKeyManager();
            await earlier.enablePersistence(config);
            earlier.setKey("openai", "sk-stored-openai");
            earlier.setKey("anthropic", "sk-stored-anthropic");
            await earlier.ready();

            const manager = new ApiKeyManager();
            manager.setKey("openai", "sk-memory-openai");
            await manager.ready();
            await manager.enablePersistence(config);

            assert.strictEqual(manager.getKey("openai"), "sk-memory-openai");
            assert.strictEqual(manager.getKey("anthropic"), "sk-stored-anthropic");

            const reloaded = new ApiKeyManager();
            await reloaded.enablePersistence(config);
            assert.strictEqual(reloaded.getKey("openai"), "sk-memory-openai");
            assert.strictEqual(reloaded.getKey("anthropic"), "sk-stored-anthropic");
        });

        it("keeps the in-memory key, and leaves a blob it cannot read untouched", async () => {
            const owner = {
                encryptionKey: "owners-own-long-key",
                storage: "localStorage" as const,
                prefix: testPrefix,
            };
            const saved = new ApiKeyManager();
            await saved.enablePersistence(owner);
            saved.setKey("anthropic", "sk-saved-under-owner-key");
            await saved.ready();

            const manager = new ApiKeyManager();
            manager.setKey("openai", "sk-in-memory-only");
            await manager.ready();
            await manager.enablePersistence({ ...owner, encryptionKey: "a-different-long-key" });

            assert.strictEqual(manager.getKey("openai"), "sk-in-memory-only");

            const reader = new ApiKeyManager();
            await reader.enablePersistence(owner);
            assert.strictEqual(reader.getKey("anthropic"), "sk-saved-under-owner-key");
        });

        it("keeps the in-memory key when the stored blob is corrupt, and does not overwrite it", async () => {
            localStorage.setItem(`${testPrefix}:keys`, "not an encrypted value");

            const manager = new ApiKeyManager();
            manager.setKey("openai", "sk-in-memory-only");
            await manager.ready();
            await manager.enablePersistence({
                encryptionKey: "corrupt-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });

            assert.strictEqual(manager.getKey("openai"), "sk-in-memory-only");
            assert.strictEqual(localStorage.getItem(`${testPrefix}:keys`), "not an encrypted value");
        });

        it("with nothing to save, writes only an encrypted empty store, so remembering survives a reload", async () => {
            const config = { encryptionKey: "empty-test-long-key", prefix: testPrefix };
            const manager = new ApiKeyManager();
            await manager.enablePersistence(config);

            const stored = localStorage.getItem(`${testPrefix}:keys`);
            assert.isNotNull(stored);
            assert.notInclude(stored ?? "", "{");

            const reloaded = new ApiKeyManager({ prefix: testPrefix });
            await reloaded.enablePersistence(config);
            assert.deepStrictEqual(reloaded.getConfiguredProviders(), []);
        });
    });

    describe("disablePersistence", () => {
        it("disables persistence and clears stored keys", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence({
                encryptionKey: "disable-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager.setKey("openai", "sk-test");
            await manager.ready();

            // Disable persistence
            manager.disablePersistence();

            // New instance with persistence should not find the key
            const manager2 = new ApiKeyManager();
            await manager2.enablePersistence({
                encryptionKey: "disable-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });

            assert.strictEqual(manager2.getKey("openai"), undefined);
        });

        it("keeps in-memory keys after disabling persistence", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence({
                encryptionKey: "memory-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager.setKey("openai", "sk-in-memory");
            await manager.ready();

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

        it("returns true after enabling persistence", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence({
                encryptionKey: "enabled-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            assert.strictEqual(manager.isPersistenceEnabled(), true);
        });

        it("returns false after disabling persistence", async () => {
            const manager = new ApiKeyManager();
            await manager.enablePersistence({
                encryptionKey: "toggle-test-long-key",
                storage: "localStorage",
                prefix: testPrefix,
            });
            manager.disablePersistence();
            assert.strictEqual(manager.isPersistenceEnabled(), false);
        });
    });

    describe("storage key prefix", () => {
        it("uses custom storage key prefix", async () => {
            const customPrefix = "@custom-app-prefix-test";
            const manager = new ApiKeyManager();
            await manager.enablePersistence({
                encryptionKey: "prefix-test-long-key",
                storage: "localStorage",
                prefix: customPrefix,
            });
            manager.setKey("openai", "sk-prefixed");
            await manager.ready();

            // Check that localStorage has a key with the custom prefix
            // Stored as prefix:keyName
            const storedValue = localStorage.getItem(`${customPrefix}:keys`);
            assert.ok(storedValue !== null);
        });
    });

    describe("enablePersistenceWithPassphrase", () => {
        const passphrase = "correct horse battery staple";

        it("saves under a passphrase that a later page unlocks and a wrong one does not", async () => {
            const saver = new ApiKeyManager({ prefix: testPrefix });
            await saver.enablePersistenceWithPassphrase(passphrase, { salt: "reader-1" });
            saver.setKey("openai", "sk-secret");
            await saver.ready();
            assert.isTrue(saver.isPersistenceEnabled());

            const reloaded = new ApiKeyManager({ prefix: testPrefix });
            await reloaded.ready();
            assert.isFalse(reloaded.isPersistenceEnabled(), "nothing restores without the passphrase");
            assert.isUndefined(reloaded.getKey("openai"));

            const wrong = new ApiKeyManager({ prefix: testPrefix });
            await wrong.enablePersistenceWithPassphrase("wrong guess", { salt: "reader-1" });
            assert.isUndefined(wrong.getKey("openai"), "a wrong passphrase decrypts nothing");

            const otherSalt = new ApiKeyManager({ prefix: testPrefix });
            await otherSalt.enablePersistenceWithPassphrase(passphrase, { salt: "reader-2" });
            assert.isUndefined(otherSalt.getKey("openai"), "another reader's salt decrypts nothing");

            const later = new ApiKeyManager({ prefix: testPrefix });
            await later.enablePersistenceWithPassphrase(passphrase, { salt: "reader-1" });
            assert.strictEqual(later.getKey("openai"), "sk-secret", "the stored keys survived the wrong tries");
        });

        it("stores neither the passphrase, the derived key nor the API key in clear text", async () => {
            const derived = await deriveKeyFromPassphrase(passphrase, "reader-1");
            const manager = new ApiKeyManager({ prefix: testPrefix });
            await manager.enablePersistenceWithPassphrase(passphrase, { salt: "reader-1" });
            manager.setKey("openai", "sk-secret");
            await manager.ready();

            const stored: string[] = [];
            for (const area of [localStorage, sessionStorage]) {
                for (let index = 0; index < area.length; index++) {
                    const name = area.key(index) ?? "";
                    stored.push(name, area.getItem(name) ?? "");
                }
            }

            assert.isNotEmpty(stored, "the keys were saved");
            for (const secret of [passphrase, derived, "sk-secret"]) {
                assert.isFalse(
                    stored.some((text) => text.includes(secret)),
                    `${secret.slice(0, 6)}... is not in storage`,
                );
            }
        });

        it("forgets a custom key an earlier enablePersistence remembered for the tab", async () => {
            const manager = new ApiKeyManager({ prefix: testPrefix });
            await manager.enablePersistence({ encryptionKey: "my-own-secret-key" });
            await manager.enablePersistenceWithPassphrase(passphrase);
            assert.isNull(sessionStorage.getItem(`${testPrefix}:session-encryption-key`));
        });

        it("refuses an empty passphrase", async () => {
            let refused: unknown;
            await new ApiKeyManager({ prefix: testPrefix })
                .enablePersistenceWithPassphrase("")
                .catch((error: unknown) => {
                    refused = error;
                });
            assert.instanceOf(refused, Error);
        });
    });
});
