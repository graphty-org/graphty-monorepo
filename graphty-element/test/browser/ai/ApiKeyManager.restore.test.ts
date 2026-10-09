/**
 * ApiKeyManager restores its own persistence after a reload. A new manager stands in for the
 * reloaded page: it shares the browser's storage and nothing else.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { ApiKeyManager } from "../../../src/ai/keys/ApiKeyManager";

/**
 * Construct a manager, as a reloaded page would, and wait for its restore.
 * @param options - Constructor options
 * @returns The restored manager
 */
async function reload(options?: ConstructorParameters<typeof ApiKeyManager>[0]): Promise<ApiKeyManager> {
    const manager = new ApiKeyManager(options);
    await manager.ready();
    return manager;
}

describe("ApiKeyManager restore after reload", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it("starts session-only when nothing was persisted", async () => {
        const manager = await reload();
        assert.strictEqual(manager.isPersistenceEnabled(), false);
        assert.deepStrictEqual(manager.getConfiguredProviders(), []);
    });

    it("restores keys persisted with the built-in encryption key", async () => {
        const before = new ApiKeyManager();
        await before.enablePersistence();
        before.setKey("openai", "sk-default-password");
        await before.ready();

        const after = await reload();
        assert.strictEqual(after.isPersistenceEnabled(), true);
        assert.strictEqual(after.getKey("openai"), "sk-default-password");
    });

    it("restores enabled persistence even before any key was set", async () => {
        await new ApiKeyManager().enablePersistence();

        const after = await reload();
        assert.strictEqual(after.isPersistenceEnabled(), true);
        after.setKey("anthropic", "sk-later");
        await after.ready();
        assert.strictEqual((await reload()).getKey("anthropic"), "sk-later");
    });

    it("restores keys persisted with a custom encryption key in the same tab", async () => {
        const before = new ApiKeyManager();
        await before.enablePersistence({ encryptionKey: "my-own-secret-key" });
        before.setKey("google", "g-custom");
        await before.ready();

        const after = await reload();
        assert.strictEqual(after.isPersistenceEnabled(), true);
        assert.strictEqual(after.getKey("google"), "g-custom");
    });

    it("does not restore custom-key persistence once the tab's session is gone", async () => {
        const before = new ApiKeyManager();
        await before.enablePersistence({ encryptionKey: "my-own-secret-key" });
        before.setKey("google", "g-custom");
        await before.ready();

        sessionStorage.clear();

        const after = await reload();
        assert.strictEqual(after.isPersistenceEnabled(), false);
        assert.strictEqual(after.getKey("google"), undefined);
        // and the reader's encrypted keys are still there for the right key
        await after.enablePersistence({ encryptionKey: "my-own-secret-key" });
        assert.strictEqual(after.getKey("google"), "g-custom");
    });

    it("does not overwrite a store it cannot decrypt", async () => {
        const before = new ApiKeyManager();
        await before.enablePersistence({ encryptionKey: "my-own-secret-key" });
        before.setKey("google", "g-custom");
        await before.ready();

        await new ApiKeyManager().enablePersistence({ encryptionKey: "the-wrong-secret" });

        const after = new ApiKeyManager();
        await after.enablePersistence({ encryptionKey: "my-own-secret-key" });
        assert.strictEqual(after.getKey("google"), "g-custom");
    });

    it("keeps a key set while the restore is still running, over the stored one", async () => {
        const before = new ApiKeyManager();
        await before.enablePersistence();
        before.setKey("openai", "sk-stored");
        before.setKey("anthropic", "sk-stored-anthropic");
        await before.ready();

        const after = new ApiKeyManager();
        after.setKey("openai", "sk-typed-during-restore");
        await after.ready();
        assert.strictEqual(after.getKey("openai"), "sk-typed-during-restore");
        assert.strictEqual(after.getKey("anthropic"), "sk-stored-anthropic");
        assert.strictEqual((await reload()).getKey("openai"), "sk-typed-during-restore");
    });

    it("gives way to a host that turns persistence off before the restore finishes", async () => {
        const before = new ApiKeyManager();
        await before.enablePersistence();
        before.setKey("openai", "sk-stored");
        await before.ready();

        const after = new ApiKeyManager();
        after.disablePersistence(false);
        await after.ready();
        assert.strictEqual(after.isPersistenceEnabled(), false);
    });

    it("saves keys that were in memory before persistence was enabled", async () => {
        const before = new ApiKeyManager();
        before.setKey("openai", "sk-typed-first");
        await before.enablePersistence();

        assert.strictEqual((await reload()).getKey("openai"), "sk-typed-first");
    });

    it("stays on after clear(): clearing the keys is not turning remembering off", async () => {
        const before = new ApiKeyManager();
        await before.enablePersistence();
        before.setKey("openai", "sk-cleared");
        before.setDefaultProvider("openai");
        before.clear();
        await before.ready();

        const after = await reload();
        assert.strictEqual(after.isPersistenceEnabled(), true);
        assert.strictEqual(after.getKey("openai"), undefined);
    });

    it("stays off after disablePersistence clears storage", async () => {
        const before = new ApiKeyManager();
        await before.enablePersistence({ encryptionKey: "my-own-secret-key" });
        before.setKey("openai", "sk-gone");
        before.disablePersistence();
        await before.ready();

        const after = await reload();
        assert.strictEqual(after.isPersistenceEnabled(), false);
        assert.strictEqual(after.getKey("openai"), undefined);
    });

    it("restores from a custom prefix and storage given to the constructor", async () => {
        const options = { prefix: "@host-app-keys", storage: "sessionStorage" as const };
        const before = new ApiKeyManager(options);
        await before.enablePersistence();
        before.setKey("openai", "sk-host");
        await before.ready();

        assert.strictEqual((await reload()).isPersistenceEnabled(), false);
        assert.strictEqual((await reload(options)).getKey("openai"), "sk-host");
    });

    describe("default provider", () => {
        it("is null until chosen and kept in memory without persistence", async () => {
            const manager = new ApiKeyManager();
            assert.strictEqual(manager.getDefaultProvider(), null);
            manager.setDefaultProvider("anthropic");
            assert.strictEqual(manager.getDefaultProvider(), "anthropic");
            assert.strictEqual((await reload()).getDefaultProvider(), null);
        });

        it("is restored with persisted keys", async () => {
            const before = new ApiKeyManager();
            await before.enablePersistence();
            before.setDefaultProvider("google");
            await before.ready();

            assert.strictEqual((await reload()).getDefaultProvider(), "google");
        });

        it("clearing the choice is persisted", async () => {
            const before = new ApiKeyManager();
            await before.enablePersistence();
            before.setDefaultProvider("google");
            before.setDefaultProvider(null);
            await before.ready();

            assert.strictEqual((await reload()).getDefaultProvider(), null);
        });
    });

    it("never prints a key", async () => {
        const manager = new ApiKeyManager();
        await manager.enablePersistence();
        manager.setKey("openai", "sk-secret-value");
        assert.notInclude(String(manager), "sk-secret-value");
    });
});
