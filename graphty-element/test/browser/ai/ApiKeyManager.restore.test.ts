/**
 * ApiKeyManager restores its own persistence after a reload. A new manager stands in for the
 * reloaded page: it shares the browser's storage and nothing else.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { ApiKeyManager } from "../../../src/ai/keys/ApiKeyManager";

describe("ApiKeyManager restore after reload", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it("starts session-only when nothing was persisted", () => {
        const manager = new ApiKeyManager();
        assert.strictEqual(manager.isPersistenceEnabled(), false);
        assert.deepStrictEqual(manager.getConfiguredProviders(), []);
    });

    it("restores keys persisted with the built-in encryption key", () => {
        const before = new ApiKeyManager();
        before.enablePersistence();
        before.setKey("openai", "sk-default-password");

        const after = new ApiKeyManager();
        assert.strictEqual(after.isPersistenceEnabled(), true);
        assert.strictEqual(after.getKey("openai"), "sk-default-password");
    });

    it("restores enabled persistence even before any key was set", () => {
        new ApiKeyManager().enablePersistence();

        const after = new ApiKeyManager();
        assert.strictEqual(after.isPersistenceEnabled(), true);
        after.setKey("anthropic", "sk-later");
        assert.strictEqual(new ApiKeyManager().getKey("anthropic"), "sk-later");
    });

    it("restores keys persisted with a custom encryption key in the same tab", () => {
        const before = new ApiKeyManager();
        before.enablePersistence({ encryptionKey: "my-own-secret-key" });
        before.setKey("google", "g-custom");

        const after = new ApiKeyManager();
        assert.strictEqual(after.isPersistenceEnabled(), true);
        assert.strictEqual(after.getKey("google"), "g-custom");
    });

    it("does not restore custom-key persistence once the tab's session is gone", () => {
        const before = new ApiKeyManager();
        before.enablePersistence({ encryptionKey: "my-own-secret-key" });
        before.setKey("google", "g-custom");

        sessionStorage.clear();

        const after = new ApiKeyManager();
        assert.strictEqual(after.isPersistenceEnabled(), false);
        assert.strictEqual(after.getKey("google"), undefined);
        // and the reader's encrypted keys are still there for the right key
        after.enablePersistence({ encryptionKey: "my-own-secret-key" });
        assert.strictEqual(after.getKey("google"), "g-custom");
    });

    it("does not overwrite a store it cannot decrypt", () => {
        const before = new ApiKeyManager();
        before.enablePersistence({ encryptionKey: "my-own-secret-key" });
        before.setKey("google", "g-custom");

        new ApiKeyManager().enablePersistence({ encryptionKey: "the-wrong-secret" });

        const after = new ApiKeyManager();
        after.enablePersistence({ encryptionKey: "my-own-secret-key" });
        assert.strictEqual(after.getKey("google"), "g-custom");
    });

    it("saves keys that were in memory before persistence was enabled", () => {
        const before = new ApiKeyManager();
        before.setKey("openai", "sk-typed-first");
        before.enablePersistence();

        assert.strictEqual(new ApiKeyManager().getKey("openai"), "sk-typed-first");
    });

    it("stays off after disablePersistence clears storage", () => {
        const before = new ApiKeyManager();
        before.enablePersistence({ encryptionKey: "my-own-secret-key" });
        before.setKey("openai", "sk-gone");
        before.disablePersistence();

        const after = new ApiKeyManager();
        assert.strictEqual(after.isPersistenceEnabled(), false);
        assert.strictEqual(after.getKey("openai"), undefined);
    });

    it("restores from a custom prefix and storage given to the constructor", () => {
        const options = { prefix: "@host-app-keys", storage: "sessionStorage" as const };
        const before = new ApiKeyManager(options);
        before.enablePersistence();
        before.setKey("openai", "sk-host");

        assert.strictEqual(new ApiKeyManager().isPersistenceEnabled(), false);
        assert.strictEqual(new ApiKeyManager(options).getKey("openai"), "sk-host");
    });

    describe("default provider", () => {
        it("is null until chosen and kept in memory without persistence", () => {
            const manager = new ApiKeyManager();
            assert.strictEqual(manager.getDefaultProvider(), null);
            manager.setDefaultProvider("anthropic");
            assert.strictEqual(manager.getDefaultProvider(), "anthropic");
            assert.strictEqual(new ApiKeyManager().getDefaultProvider(), null);
        });

        it("is restored with persisted keys", () => {
            const before = new ApiKeyManager();
            before.enablePersistence();
            before.setDefaultProvider("google");

            assert.strictEqual(new ApiKeyManager().getDefaultProvider(), "google");
        });

        it("clearing the choice is persisted", () => {
            const before = new ApiKeyManager();
            before.enablePersistence();
            before.setDefaultProvider("google");
            before.setDefaultProvider(null);

            assert.strictEqual(new ApiKeyManager().getDefaultProvider(), null);
        });
    });

    it("never prints a key", () => {
        const manager = new ApiKeyManager();
        manager.enablePersistence();
        manager.setKey("openai", "sk-secret-value");
        assert.notInclude(String(manager), "sk-secret-value");
    });
});
