/**
 * A credential store saves a credential's plain parts and makes it again: basic, a bearer string
 * and an API key round-trip; a token function, AWS and custom credentials cannot be saved.
 */

import { describe, expect, it } from "vitest";

import { credentials, fromStorableCredential, storableCredential } from "../../src/index.js";
import { applyCredential } from "../../src/sources/credentials.js";
import { SENTINEL } from "./helpers.js";

/**
 * The request a credential sends.
 * @param credential - the credential
 * @returns the request after the credential is applied
 */
function applied(credential: Parameters<typeof applyCredential>[0]): Promise<Request> {
    return applyCredential(credential, new Request("https://db.example.com/q"));
}

describe("storableCredential", () => {
    it("round-trips basic, bearer and API keys to the same request", async () => {
        for (const original of [
            credentials.basic("neo4j", SENTINEL),
            credentials.bearer(SENTINEL),
            credentials.apiKey({ header: "X-Key" }, SENTINEL),
            credentials.apiKey({ query: "api_key" }, SENTINEL),
        ]) {
            const parts = storableCredential(original);
            expect(parts).not.toBeNull();
            const again = fromStorableCredential(parts!, { origins: ["https://db.example.com"] });
            expect(again.kind).toBe(original.kind);
            expect(again.origins).toEqual(["https://db.example.com"]);
            const [a, b] = await Promise.all([applied(original), applied(again)]);
            expect(b.url).toBe(a.url);
            expect([...b.headers]).toEqual([...a.headers]);
        }
    });

    it("refuses what holds a function", () => {
        expect(storableCredential(credentials.bearer(() => Promise.resolve(SENTINEL)))).toBeNull();
        expect(storableCredential(credentials.custom((r) => r, "custom"))).toBeNull();
        expect(
            storableCredential(
                credentials.awsSigV4({ region: "us-east-1", credentials: { accessKeyId: "a", secretAccessKey: "b" } }),
            ),
        ).toBeNull();
    });
});
