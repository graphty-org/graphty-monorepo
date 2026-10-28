/**
 * What a browser is refused, with the runtime detection mocked at the module boundary: the
 * Neptune preset (no CORS headers, reason "cors") and long-term AWS keys, which every script on a
 * page could read (reason "long-term-key"). Temporary credentials still sign.
 */

import { describe, expect, it, vi } from "vitest";

import { loadFromSource, replayFetch } from "../../../src/index.js";
import { signRequest } from "../../../src/sources/sigv4.js";
import { rejection } from "../helpers.js";

vi.mock("../../../src/sources/context.js", async (importActual) => ({
    ...(await importActual<typeof import("../../../src/sources/context.js")>()),
    detectRuntime: () => "browser",
}));

describe("in a browser", () => {
    it("refuses the neptune preset before any request", async () => {
        const fetch = replayFetch([]);
        const err = await rejection(
            loadFromSource("neptune", { query: "RETURN 1" }, { endpoint: "https://db.example.com:8182", fetch }),
        );
        expect(err.issue?.params).toEqual({ runtime: "browser", reason: "cors" });
        expect(fetch.calls).toHaveLength(0);
    });

    it("refuses long-term AWS keys and signs with temporary ones", async () => {
        const request = new Request("https://example.amazonaws.com/");
        const keys = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "secret" };
        const err = await rejection(signRequest(request, { region: "us-east-1", credentials: keys }));
        expect(err.issue?.params).toEqual({ name: "credential", reason: "long-term-key" });
        const signed = await signRequest(request, { region: "us-east-1", credentials: { ...keys, sessionToken: "t" } });
        expect(signed.headers.get("x-amz-security-token")).toBe("t");
    });
});
