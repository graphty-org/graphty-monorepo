/**
 * The credential store: network-source credentials keyed by source and origin, AI keys as its
 * `ai` namespace under their old storage keys, one persistence switch for both, and never a
 * secret in what it lists.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { ApiKeyManager, createCredentialStore, credentials, CredentialStore } from "../../../credentials";
import type { GraphtyError } from "../../../src/errors/GraphtyError";

const NEO4J = { source: "neo4j", endpoint: "https://db.example.com:7473/db/movies" };
const SECRET = "SENTINEL-credential-store-secret";

describe("CredentialStore", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it("finds a remembered credential by source and origin only", async () => {
        const store = createCredentialStore();
        await store.remember(NEO4J, credentials.basic("neo4j", SECRET));
        const found = await store.lookup("neo4j", "https://db.example.com:7473");
        assert.strictEqual(found?.kind, "basic");
        assert.deepEqual(found?.origins, ["https://db.example.com:7473"]);
        assert.isUndefined(await store.lookup("neo4j", "https://elsewhere.example.com"));
        assert.isUndefined(await store.lookup("ndex", "https://db.example.com:7473"));
    });

    it("lists what it holds without a secret, AI keys first", async () => {
        const store = createCredentialStore();
        store.ai?.setKey("openai", SECRET);
        await store.remember(NEO4J, credentials.basic("neo4j", SECRET));
        const listed = store.list();
        assert.deepEqual(listed, [
            { namespace: "ai", provider: "openai" },
            {
                namespace: "source",
                source: "neo4j",
                origin: "https://db.example.com:7473",
                kind: "basic",
                username: "neo4j",
            },
        ]);
        assert.notInclude(JSON.stringify(listed), SECRET);
    });

    it("refuses a credential that holds a function with E_CREDENTIAL_NOT_STORABLE", async () => {
        const store = createCredentialStore();
        const error = await store
            .remember(
                NEO4J,
                credentials.bearer(() => Promise.resolve(SECRET)),
            )
            .then(
                () => null,
                (e: unknown) => e as GraphtyError,
            );
        assert.strictEqual(error?.code, "E_CREDENTIAL_NOT_STORABLE");
        assert.deepEqual(error?.details, { kind: "bearer" });
    });

    it("persists source credentials with the AI keys, and a new store restores both", async () => {
        const first = createCredentialStore();
        first.ai?.setKey("anthropic", "ai-key-123");
        first.ai?.enablePersistence();
        await first.remember(NEO4J, credentials.basic("neo4j", SECRET));

        const second = createCredentialStore();
        assert.strictEqual(second.ai?.getKey("anthropic"), "ai-key-123");
        const found = await second.lookup("neo4j", NEO4J.endpoint);
        assert.strictEqual(found?.kind, "basic");
        assert.strictEqual(found?.username, "neo4j");
        for (let i = 0; i < localStorage.length; i++) {
            const name = localStorage.key(i) ?? "";
            assert.notInclude(localStorage.getItem(name) ?? "", SECRET, `${name} holds the secret in plain text`);
        }
    });

    it("keeps remembered AI keys readable under the old storage key", () => {
        const before = new ApiKeyManager();
        before.setKey("google", "old-key-456");
        before.enablePersistence();
        assert.isNotNull(localStorage.getItem("@graphty-ai-keys:keys"));

        const store = new CredentialStore(new ApiKeyManager());
        assert.strictEqual(store.ai?.getKey("google"), "old-key-456");
    });

    it("a second key manager on the same storage never erases the source credentials", async () => {
        const store = createCredentialStore();
        store.ai?.enablePersistence();
        await store.remember(NEO4J, credentials.basic("neo4j", SECRET));
        // The AI manager's own key manager writes its keys too.
        const other = new ApiKeyManager();
        other.setKey("openai", "k-1234567");
        const reopened = createCredentialStore();
        assert.strictEqual((await reopened.lookup("neo4j", NEO4J.endpoint))?.kind, "basic");
    });

    it("forgets one origin, and forgetAll forgets everything", async () => {
        const store = createCredentialStore();
        store.ai?.setKey("openai", "k-1234567");
        await store.remember(NEO4J, credentials.basic("neo4j", SECRET));
        await store.remember({ source: "ndex", endpoint: "https://www.ndexbio.org/" }, credentials.bearer("t"));
        await store.forget(NEO4J);
        assert.isUndefined(await store.lookup("neo4j", NEO4J.endpoint));
        assert.strictEqual((await store.lookup("ndex", "https://www.ndexbio.org"))?.kind, "bearer");
        await store.forgetAll();
        assert.deepEqual(store.list(), []);
    });

    it("works in memory when its key manager cannot load", async () => {
        const store = new CredentialStore(Promise.reject(new Error("no encrypt-storage")));
        await store.remember(NEO4J, credentials.apiKey({ header: "X-Key" }, SECRET));
        assert.isNull(store.ai);
        assert.strictEqual((await store.lookup("neo4j", NEO4J.endpoint))?.kind, "api-key");
    });
});
