/**
 * ApiKeyManager as a host uses it, in Node (no window: keys live in memory only) and with a page's
 * storage standing in (keys persisted, restored by the next manager, moved, forgotten and migrated
 * from the format graphty-element saved before Web Crypto).
 */

import { createCipheriv, createHash, randomBytes } from "node:crypto";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { ApiKeyManager, type ApiKeyManagerOptions } from "../../../src/ai/keys";

/** An in-memory Web Storage area. */
class MemoryStorage implements Storage {
    private readonly items = new Map<string, string>();

    get length(): number {
        return this.items.size;
    }

    clear(): void {
        this.items.clear();
    }

    getItem(key: string): string | null {
        return this.items.get(key) ?? null;
    }

    key(index: number): string | null {
        return [...this.items.keys()][index] ?? null;
    }

    removeItem(key: string): void {
        this.items.delete(key);
    }

    setItem(key: string, value: string): void {
        this.items.set(key, value);
    }
}

/** A storage area the browser blocks: every call throws, as in a sandboxed frame. */
class BlockedStorage extends MemoryStorage {
    override getItem(): string | null {
        throw new DOMException("blocked", "SecurityError");
    }

    override setItem(): void {
        throw new DOMException("blocked", "SecurityError");
    }

    override removeItem(): void {
        throw new DOMException("blocked", "SecurityError");
    }
}

/**
 * Encrypt text the way encrypt-storage (crypto-js AES) saved it: base64 of "Salted__" | salt |
 * AES-256-CBC ciphertext, key and IV from OpenSSL's EVP_BytesToKey with MD5.
 * @param text - The plain text
 * @param encryptionKey - The encryption key
 * @returns The stored value
 */
function legacySeal(text: string, encryptionKey: string): string {
    const salt = randomBytes(8);
    let derived = Buffer.alloc(0);
    let block = Buffer.alloc(0);
    while (derived.length < 48) {
        block = createHash("md5")
            .update(Buffer.concat([block, Buffer.from(encryptionKey), salt]))
            .digest();
        derived = Buffer.concat([derived, block]);
    }
    const cipher = createCipheriv("aes-256-cbc", derived.subarray(0, 32), derived.subarray(32, 48));
    const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return Buffer.concat([Buffer.from("Salted__"), salt, body]).toString("base64");
}

/**
 * A manager for the next page, once it has restored what storage holds.
 * @param options - Where persisted keys live
 * @returns The manager
 */
async function reload(options?: ApiKeyManagerOptions): Promise<ApiKeyManager> {
    const manager = new ApiKeyManager(options);
    await manager.ready();
    return manager;
}

describe("ApiKeyManager without a window (Node)", () => {
    it("keeps keys, the default provider and stored items in memory", async () => {
        const manager = await reload();
        assert.strictEqual(manager.isPersistenceEnabled(), false);
        assert.strictEqual(manager.toString(), "ApiKeyManager(configured: none, persistence: disabled)");

        manager.setKey("openai", "  sk-one  ");
        manager.setKey("anthropic", "sk-two");
        assert.strictEqual(manager.getKey("openai"), "sk-one", "the key is trimmed");
        assert.isTrue(manager.hasKey("anthropic"));
        assert.deepStrictEqual(manager.getConfiguredProviders(), ["openai", "anthropic"]);
        assert.notInclude(manager.toString(), "sk-", "toString never shows a key");

        manager.removeKey("openai");
        assert.isFalse(manager.hasKey("openai"));

        manager.setDefaultProvider("anthropic");
        assert.strictEqual(manager.getDefaultProvider(), "anthropic");
        manager.setStoredItem("sources", [{ host: "db.example" }]);
        assert.deepStrictEqual(manager.getStoredItem("sources"), [{ host: "db.example" }]);
        manager.setStoredItem("sources", undefined);
        assert.isUndefined(manager.getStoredItem("sources"));

        manager.clear();
        assert.deepStrictEqual(manager.getConfiguredProviders(), []);
    });

    it("refuses an empty key, an empty or short encryption key and an empty passphrase", async () => {
        const manager = new ApiKeyManager();
        assert.throws(() => manager.setKey("openai", "   "), "API key cannot be empty");
        assert.throws(() => {
            void manager.enablePersistence({ encryptionKey: "   " });
        }, "Encryption key cannot be empty");
        assert.throws(() => {
            void manager.enablePersistence({ encryptionKey: "short" });
        }, "at least 10 characters");
        let refused: unknown;
        await manager.enablePersistenceWithPassphrase("").catch((error: unknown) => {
            refused = error;
        });
        assert.instanceOf(refused, Error);
        assert.strictEqual(refused.message, "Passphrase cannot be empty");
        assert.isFalse(manager.isPersistenceEnabled());
    });

    it("turns persistence on and off with nothing to store into", async () => {
        const manager = new ApiKeyManager();
        await manager.enablePersistence();
        assert.isTrue(manager.isPersistenceEnabled());
        assert.include(manager.toString(), "persistence: enabled");

        manager.setKey("google", "g-key");
        manager.setStoredItem("sources", []);
        await manager.retireOtherStorage();
        await manager.forgetKey("google");
        assert.isFalse(manager.hasKey("google"));
        manager.setKey("google", "g-key");
        await manager.forgetKeys();
        assert.deepStrictEqual(manager.getConfiguredProviders(), []);

        manager.disablePersistence();
        assert.isFalse(manager.isPersistenceEnabled());
        await manager.retireOtherStorage();

        await manager.enablePersistenceWithPassphrase("correct horse battery");
        assert.isTrue(manager.isPersistenceEnabled());
    });
});

describe("ApiKeyManager with a page's storage", () => {
    let local: MemoryStorage;
    let session: MemoryStorage;

    beforeEach(() => {
        local = new MemoryStorage();
        session = new MemoryStorage();
        vi.stubGlobal("window", globalThis);
        vi.stubGlobal("localStorage", local);
        vi.stubGlobal("sessionStorage", session);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("persists keys, the default provider and items, and the next page restores them", async () => {
        const before = await reload();
        assert.isFalse(before.isPersistenceEnabled(), "nothing was persisted yet");
        before.setKey("openai", "sk-saved");
        before.setDefaultProvider("openai");
        before.setStoredItem("sources", [{ host: "db.example", token: "t" }]);
        await before.enablePersistence();
        assert.isTrue(local.getItem("@graphty-ai-keys:keys")?.startsWith("gk1:"), "saved encrypted");
        assert.notInclude(local.getItem("@graphty-ai-keys:keys") ?? "", "sk-saved");

        const after = await reload();
        assert.isTrue(after.isPersistenceEnabled(), "persistence restores itself");
        assert.strictEqual(after.getKey("openai"), "sk-saved");
        assert.strictEqual(after.getDefaultProvider(), "openai");
        assert.deepStrictEqual(after.getStoredItem("sources"), [{ host: "db.example", token: "t" }]);

        after.setDefaultProvider(null);
        await after.ready();
        assert.isNull(local.getItem("@graphty-ai-keys:default-provider"), "a cleared default is removed");
    });

    it("restores a custom key for the rest of the tab, and leaves a store it cannot read alone", async () => {
        const before = new ApiKeyManager({ storage: "sessionStorage", prefix: "@custom" });
        before.setKey("google", "g-custom");
        await before.enablePersistence({ encryptionKey: "my-own-secret-key" });
        assert.strictEqual(session.getItem("@custom:session-encryption-key"), "my-own-secret-key");

        const after = await reload({ storage: "sessionStorage", prefix: "@custom" });
        assert.strictEqual(after.getKey("google"), "g-custom");

        const stored = session.getItem("@custom:keys");
        const wrong = new ApiKeyManager({ storage: "sessionStorage", prefix: "@custom" });
        await wrong.enablePersistence({ encryptionKey: "another-secret-key" });
        assert.isUndefined(wrong.getKey("google"), "a wrong key loads nothing");
        assert.strictEqual(session.getItem("@custom:keys"), stored, "and overwrites nothing");
    });

    it("forgets a remembered custom key that opens nothing", async () => {
        session.setItem("@graphty-ai-keys:session-encryption-key", "stale-secret-key");
        const manager = await reload();
        assert.isFalse(manager.isPersistenceEnabled());
        assert.isNull(session.getItem("@graphty-ai-keys:session-encryption-key"));
    });

    it("skips stored entries that are not strings, and ignores values in an unknown format", async () => {
        const writer = new ApiKeyManager();
        await writer.enablePersistence();
        writer.setStoredItem("probe", 1);
        await writer.ready();
        local.setItem("@graphty-ai-keys:default-provider", "plain text");

        const reader = await reload();
        assert.isTrue(reader.isPersistenceEnabled());
        assert.isNull(reader.getDefaultProvider(), "an unreadable default provider is no choice");
        assert.strictEqual(reader.getStoredItem("probe"), 1);

        const holder = new ApiKeyManager();
        holder.setStoredItem("probe", 2);
        await holder.enablePersistence();
        assert.strictEqual(holder.getStoredItem("probe"), 2, "an item in memory wins over the stored one");
    });

    it("disables persistence, clearing storage or keeping it for the next page", async () => {
        const manager = new ApiKeyManager();
        manager.setKey("openai", "sk-kept");
        await manager.enablePersistence();

        manager.disablePersistence(false);
        assert.isFalse(manager.isPersistenceEnabled());
        assert.isNotNull(local.getItem("@graphty-ai-keys:keys"), "kept");
        const restored = await reload();
        assert.strictEqual(restored.getKey("openai"), "sk-kept");

        restored.disablePersistence();
        for (const item of ["keys", "default-provider", "extras"]) {
            assert.isNull(local.getItem(`@graphty-ai-keys:${item}`), `${item} cleared`);
        }
    });

    it("writes nothing for a save queued before persistence was turned off", async () => {
        const manager = new ApiKeyManager();
        await manager.enablePersistence();
        const stored = local.getItem("@graphty-ai-keys:keys");

        manager.setKey("openai", "sk-never-saved");
        manager.disablePersistence(false);
        await manager.ready();
        assert.strictEqual(local.getItem("@graphty-ai-keys:keys"), stored);
        assert.strictEqual(manager.getKey("openai"), "sk-never-saved", "the key stays in memory");
    });

    it("forgets one provider's key, or every key, in both storages", async () => {
        const inLocal = new ApiKeyManager();
        inLocal.setKey("openai", "sk-local");
        inLocal.setKey("google", "g-local");
        await inLocal.enablePersistence();
        const inSession = new ApiKeyManager({ storage: "sessionStorage" });
        inSession.setKey("openai", "sk-session");
        await inSession.enablePersistence();

        await inLocal.forgetKey("openai");
        assert.isFalse(inLocal.hasKey("openai"));
        const local2 = await reload();
        assert.isUndefined(local2.getKey("openai"));
        assert.strictEqual(local2.getKey("google"), "g-local", "the other provider stays");
        const session2 = await reload({ storage: "sessionStorage" });
        assert.isUndefined(session2.getKey("openai"), "gone from the other storage too");

        await local2.forgetKey("anthropic");
        assert.strictEqual(local2.getKey("google"), "g-local", "forgetting a key nobody stored changes nothing");

        await local2.forgetKeys();
        assert.isNull(local.getItem("@graphty-ai-keys:keys"));
        assert.isNull(session.getItem("@graphty-ai-keys:keys"));
    });

    it("moves keys another storage setting left into the storage in use", async () => {
        const old = new ApiKeyManager({ storage: "sessionStorage" });
        old.setKey("anthropic", "sk-ant-old");
        await old.enablePersistence();

        const moved = new ApiKeyManager();
        await moved.enablePersistence();
        await moved.retireOtherStorage();
        assert.strictEqual(moved.getKey("anthropic"), "sk-ant-old");
        assert.isNull(session.getItem("@graphty-ai-keys:keys"), "nothing left behind");
        assert.isNotNull(local.getItem("@graphty-ai-keys:keys"));

        await moved.retireOtherStorage();
        assert.strictEqual(moved.getKey("anthropic"), "sk-ant-old", "nothing more to move");

        const back = new ApiKeyManager({ storage: "sessionStorage" });
        await back.enablePersistence();
        await back.retireOtherStorage();
        assert.strictEqual(back.getKey("anthropic"), "sk-ant-old", "and back the other way");
        assert.isNull(local.getItem("@graphty-ai-keys:keys"));
    });

    it("stays session-only, without throwing, when the browser blocks storage", async () => {
        vi.stubGlobal("localStorage", new BlockedStorage());
        vi.stubGlobal("sessionStorage", new BlockedStorage());
        const manager = await reload();
        await manager.enablePersistence({ encryptionKey: "my-own-secret-key" });
        manager.setKey("openai", "sk-memory");
        await manager.ready();
        assert.strictEqual(manager.getKey("openai"), "sk-memory");
        manager.disablePersistence();
        assert.isFalse(manager.isPersistenceEnabled());
    });

    describe("keys saved before Web Crypto, by encrypt-storage", () => {
        // Real encrypt-storage 2.16.6 output, shared with test/browser/ai/ApiKeyManager.restore.test.ts.
        const legacy = {
            keys: "U2FsdGVkX1/sq9EA8z95LjKN1yArQEHeA5Lm9383/O7yb84JhdVeMTPnoTQPd8Fj0V/KfQAFiwUv7ZwiJj1iaRxROrGfa+vTECS25/pQxgA=",
            defaultProvider: "U2FsdGVkX1/QMQwi+8DRaiOSZPtC7O7HvWSI4SDskhM=",
            phraseLockedKeys: "U2FsdGVkX1+ZIqgE/PILhkyeScmz+UnWP1rydBWwJAgLKqV6mwHKvWYJbyvUXJbA",
        };

        it("restores them with the built-in key and saves them again in the new format", async () => {
            local.setItem("@graphty-ai-keys:keys", legacy.keys);
            local.setItem("@graphty-ai-keys:default-provider", legacy.defaultProvider);

            const migrated = await reload();
            assert.strictEqual(migrated.getKey("openai"), "sk-saved-by-3x");
            assert.strictEqual(migrated.getDefaultProvider(), "anthropic");
            assert.isTrue(local.getItem("@graphty-ai-keys:keys")?.startsWith("gk1:"));
        });

        it("reads a value saved as plain text rather than JSON", async () => {
            local.setItem(
                "@graphty-ai-keys:keys",
                legacySeal(JSON.stringify({ openai: "sk-x" }), "graphty-default-key"),
            );
            local.setItem("@graphty-ai-keys:default-provider", legacySeal("openai", "graphty-default-key"));

            const migrated = await reload();
            assert.strictEqual(migrated.getKey("openai"), "sk-x");
            assert.strictEqual(migrated.getDefaultProvider(), "openai");
        });

        it("unlocks them only with the passphrase they were saved under", async () => {
            local.setItem("@graphty-pass:keys", legacy.phraseLockedKeys);

            const wrong = new ApiKeyManager({ prefix: "@graphty-pass" });
            await wrong.enablePersistenceWithPassphrase("wrong guess");
            assert.isUndefined(wrong.getKey("google"));
            assert.strictEqual(local.getItem("@graphty-pass:keys"), legacy.phraseLockedKeys, "left untouched");

            const right = new ApiKeyManager({ prefix: "@graphty-pass" });
            await right.enablePersistenceWithPassphrase("correct horse battery");
            assert.strictEqual(right.getKey("google"), "g-passphrase-3x");
            assert.isNull(session.getItem("@graphty-pass:session-encryption-key"), "a passphrase key is never stored");
        });
    });
});
