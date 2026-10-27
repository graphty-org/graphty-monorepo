/**
 * The plain-JavaScript SHA-256 a page without Web Crypto uses (a browser page that is not a secure
 * context), against Node's own, and the content hash and the signer on such a page.
 */

import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { sha256Bytes } from "../../src/sources/sha256.js";
import { sha256Hex, signRequest } from "../../src/sources/sigv4.js";

/**
 * Lowercase hex of bytes.
 * @param bytes - the bytes
 * @returns hex
 */
function hex(bytes: ArrayBuffer): string {
    return Buffer.from(bytes).toString("hex");
}

/** A browser page served over plain http: no `crypto.subtle`, no Node. */
function insecurePage(): void {
    vi.stubGlobal("crypto", {});
    vi.stubGlobal("process", undefined);
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {});
}

describe("sha256Bytes", () => {
    it("matches Node's digest at every padding boundary", () => {
        for (const length of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 1000]) {
            const data = Uint8Array.from({ length }, (_, i) => (i * 31 + 7) & 255);
            expect(hex(sha256Bytes(data)), `length ${String(length)}`).toBe(
                createHash("sha256").update(data).digest("hex"),
            );
        }
    });
});

describe("a page that is not a secure context", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("still hashes content, with the same digest", async () => {
        const text = "MATCH (n) RETURN n\nnode 1";
        const expected = createHash("sha256").update(text).digest("hex");
        insecurePage();
        await expect(sha256Hex(text)).resolves.toBe(expected);
    });

    it("hashes bytes exactly as given, with the same digest as Node's", async () => {
        const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62, 0x0a, 0x00, 0xff]);
        const expected = createHash("sha256").update(bytes).digest("hex");
        insecurePage();
        await expect(sha256Hex(bytes)).resolves.toBe(expected);
    });

    it("refuses to sign with a coded runtime error", async () => {
        insecurePage();
        const request = new Request("https://db.example.com:8182/openCypher", { method: "GET" });
        await expect(
            signRequest(request, {
                region: "us-east-1",
                credentials: { accessKeyId: "AKID", secretAccessKey: "secret", sessionToken: "token" },
            }),
        ).rejects.toMatchObject({ report: { issues: [{ code: "E_SOURCE_RUNTIME" }] } });
    });
});
