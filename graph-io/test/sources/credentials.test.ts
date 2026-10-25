/**
 * Credentials hold their secret where nothing can read it back, and apply it per kind.
 */

import { inspect } from "node:util";

import { describe, expect, it } from "vitest";

import { credentials } from "../../src/index.js";
import {
    applyCredential,
    credentialHeader,
    isCredential,
    isStorableCredential,
    unwrapCredential,
} from "../../src/sources/credentials.js";
import { rejection, SENTINEL } from "./helpers.js";

const request = (): Request => new Request("https://api.example.com/a?x=1");

describe("credentials", () => {
    it("never shows the secret in JSON, inspect, string conversion or its own keys", () => {
        for (const c of [
            credentials.bearer(SENTINEL),
            credentials.basic("ana", SENTINEL),
            credentials.apiKey({ query: "api_key" }, SENTINEL),
            credentials.custom((r) => r, "token"),
        ]) {
            expect(JSON.stringify(c)).not.toContain(SENTINEL);
            expect(inspect(c, { depth: 10, showHidden: true })).not.toContain(SENTINEL);
            expect((c as unknown as { toString(): string }).toString()).not.toContain(SENTINEL);
            expect(JSON.stringify(Object.entries(c))).not.toContain(SENTINEL);
            expect(isCredential(c)).toBe(true);
        }
        expect(JSON.parse(JSON.stringify(credentials.basic("ana", "x")))).toEqual({
            kind: "basic",
            origins: [],
            username: "ana",
        });
        expect(isCredential({ kind: "basic", origins: [] })).toBe(false);
    });

    it("applies bearer, basic, header and query keys", async () => {
        const bearer = await applyCredential(
            credentials.bearer(() => Promise.resolve("fresh")),
            request(),
        );
        expect(bearer.headers.get("authorization")).toBe("Bearer fresh");
        const basic = await applyCredential(credentials.basic("ana", "pa:ss"), request());
        expect(basic.headers.get("authorization")).toBe(`Basic ${btoa("ana:pa:ss")}`);
        const header = await applyCredential(credentials.apiKey({ header: "X-Key" }, "k"), request());
        expect(header.headers.get("x-key")).toBe("k");
        const query = await applyCredential(credentials.apiKey({ query: "api_key" }, "k"), request());
        expect(new URL(query.url).searchParams.get("api_key")).toBe("k");
        expect(new URL(query.url).searchParams.get("x")).toBe("1");
    });

    it("loads the SigV4 signer on first use and never puts the secret key in the request", async () => {
        const c = credentials.awsSigV4({
            region: "us-east-1",
            credentials: { accessKeyId: "a", secretAccessKey: SENTINEL },
        });
        const signed = await applyCredential(c, request());
        expect(signed.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=a\//);
        expect(JSON.stringify([...signed.headers])).not.toContain(SENTINEL);
    });

    it("refuses an origin that is not a URL", async () => {
        const err = await rejection(Promise.resolve().then(() => credentials.bearer("t", { origins: ["not a url"] })));
        expect(err.issue?.params).toEqual({ name: "origins", reason: "origin" });
    });

    it("knows which kinds can be stored, which header each sets, and unwraps for a driver", () => {
        expect(isStorableCredential(credentials.basic("a", "b"))).toBe(true);
        expect(isStorableCredential(credentials.bearer("t"))).toBe(true);
        expect(isStorableCredential(credentials.apiKey({ query: "k" }, "v"))).toBe(true);
        expect(isStorableCredential(credentials.bearer(() => Promise.resolve("t")))).toBe(false);
        expect(isStorableCredential(credentials.custom((r) => r, "x"))).toBe(false);
        expect(credentialHeader(credentials.apiKey({ header: "X-Key" }, "v"))).toBe("x-key");
        expect(credentialHeader(credentials.basic("a", "b"))).toBe("authorization");
        expect(credentialHeader(credentials.apiKey({ query: "k" }, "v"))).toBeNull();
        expect(unwrapCredential(credentials.basic("a", "b"))).toEqual({ kind: "basic", username: "a", password: "b" });
        expect(unwrapCredential({ kind: "basic", origins: [] })).toBeUndefined();
    });

    it("refuses an object the factories did not make", async () => {
        const err = await rejection(applyCredential({ kind: "bearer", origins: [] }, request()));
        expect(err.issue?.params).toEqual({ name: "credential", reason: "type" });
    });
});
