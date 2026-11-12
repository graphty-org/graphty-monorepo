/**
 * AWS Signature Version 4 over Web Crypto (design sections 6.3 and 12.4), loaded by
 * `credentials.awsSigV4` on first use. No AWS SDK: it signs the request `ctx.fetch` is about to
 * send, every header that request carries plus `host`, and is checked against AWS's published
 * signature test suite. graph-io never reads `~/.aws` or the environment.
 */

import { detectRuntime } from "./context.js";
import { type AwsSigV4Options } from "./credentials.js";
import { failAlone } from "./fail.js";
import { sha256Bytes } from "./sha256.js";

/** Headers never signed: proxies and clients may change them in flight. */
const UNSIGNED = new Set(["user-agent", "expect", "x-amzn-trace-id", "authorization", "content-length"]);

/**
 * The UTF-8 bytes of a string.
 * @param text - the text
 * @returns the bytes
 */
function utf8(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

/**
 * Code-unit order of two strings.
 * @param a - one string
 * @param b - another
 * @returns negative, zero or positive
 */
function compareText(a: string, b: string): number {
    if (a === b) {
        return 0;
    }
    return a < b ? -1 : 1;
}

/**
 * Web Crypto: the global one, or Node 18's, which is not global without a flag. A browser page that
 * is not a secure context (plain http on a host other than localhost) has none.
 * @returns the subtle crypto, or null where there is none
 */
async function subtle(): Promise<SubtleCrypto | null> {
    const global = (globalThis as { crypto?: Crypto }).crypto;
    if (global?.subtle !== undefined) {
        return global.subtle;
    }
    if (detectRuntime() !== "node") {
        return null;
    }
    // Built at run time so no bundler sees a literal: a consumer's browser build has no
    // `node:crypto`, and esbuild failed on the literal the build had folded the name into.
    const name = ["node", "crypto"].join(":");
    return ((await import(/* @vite-ignore */ /* webpackIgnore: true */ name)) as { webcrypto: Crypto }).webcrypto
        .subtle;
}

/**
 * Lowercase hex of bytes.
 * @param bytes - the bytes
 * @returns hex
 */
function hex(bytes: ArrayBuffer): string {
    return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * SHA-256 of bytes, as hex.
 * @param data - the bytes
 * @returns the digest
 */
async function sha256(data: Uint8Array | ArrayBuffer): Promise<string> {
    const s = await subtle();
    if (s === null) {
        return hex(sha256Bytes(data instanceof Uint8Array ? data : new Uint8Array(data)));
    }
    return hex(await s.digest("SHA-256", data as BufferSource));
}

/**
 * SHA-256 as 64 lowercase hexadecimal digits: of bytes exactly as given, or of a text's UTF-8 bytes
 * (the Cypher source's content hash, a project file's record of a file it loaded). Web Crypto where
 * there is one, else plain JavaScript (a page that is not a secure context). Experimental.
 * @param data - the bytes or the text
 * @returns the digest
 */
export function sha256Hex(data: string | Uint8Array): Promise<string> {
    return sha256(typeof data === "string" ? utf8(data) : data);
}

/**
 * HMAC-SHA-256.
 * @param key - the key
 * @param data - the message
 * @returns the MAC
 */
async function hmac(key: Uint8Array | ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const s = await subtle();
    if (s === null) {
        failAlone("E_SOURCE_RUNTIME", "AWS signing needs Web Crypto, which a browser has only on a secure page", {
            runtime: detectRuntime(),
            reason: "needs-secure-context",
        });
    }
    const k = await s.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return s.sign("HMAC", k, utf8(data) as BufferSource);
}

/**
 * RFC 3986 encoding, as SigV4 asks: every byte but letters, digits and `-_.~`.
 * @param text - the text
 * @returns the encoded text
 */
function encode(text: string): string {
    return encodeURIComponent(text).replaceAll(
        /[!'()*]/g,
        (c) => `%${(c.codePointAt(0) ?? 0).toString(16).toUpperCase()}`,
    );
}

/**
 * The canonical query string: every pair encoded, sorted by key then value.
 * @param url - the request URL
 * @returns the canonical query
 */
function canonicalQuery(url: URL): string {
    return [...url.searchParams]
        .map(([k, v]) => [encode(k), encode(v)] as const)
        .sort(([ak, av], [bk, bv]) => compareText(ak, bk) || compareText(av, bv))
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
}

/**
 * The `YYYYMMDDTHHMMSSZ` form of a time.
 * @param date - the time
 * @returns the AWS timestamp
 */
function amzDate(date: Date): string {
    return date
        .toISOString()
        .replaceAll(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
}

/**
 * Sign a request with AWS SigV4 (`Authorization`, `X-Amz-Date` and, for temporary credentials,
 * `X-Amz-Security-Token`). In a browser, long-term keys (no session token) are refused, since every
 * script on the page could read them: use temporary credentials from an identity pool.
 * @param request - the request
 * @param options - region, service (default "neptune-db") and the credentials or a provider
 * @param now - the signing time; tests fix it. An `X-Amz-Date` already on the request wins.
 * @returns the signed request
 */
export async function signRequest(
    request: Request,
    options: AwsSigV4Options,
    now: Date = new Date(),
): Promise<Request> {
    const creds = typeof options.credentials === "function" ? await options.credentials() : options.credentials;
    const runtime = detectRuntime();
    if ((runtime === "browser" || runtime === "worker") && (creds.sessionToken ?? "") === "") {
        failAlone("E_SOURCE_PARAM", "long-term AWS keys are never used in a browser", {
            name: "credential",
            reason: "long-term-key",
        });
    }
    const service = options.service ?? "neptune-db";
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    const stamp = headers.get("x-amz-date") ?? amzDate(now);
    headers.set("x-amz-date", stamp);
    if (creds.sessionToken !== undefined && creds.sessionToken !== "") {
        headers.set("x-amz-security-token", creds.sessionToken);
    }
    const method = request.method.toUpperCase();
    const body = method === "GET" || method === "HEAD" ? new Uint8Array(0) : await request.clone().arrayBuffer();

    const signed = new Map<string, string>([["host", url.host]]);
    headers.forEach((value, name) => {
        if (!UNSIGNED.has(name)) {
            signed.set(name, value.trim().replaceAll(/\s+/g, " "));
        }
    });
    // SigV4 sorts header names by code unit, not by locale
    const names = [...signed.keys()].sort((a, b) => Number(a > b) - Number(a < b));
    const signedHeaders = names.join(";");
    const canonical = [
        method,
        // non-S3 services encode the already-encoded path once more
        url.pathname.split("/").map(encode).join("/"),
        canonicalQuery(url),
        ...names.map((n) => `${n}:${signed.get(n) ?? ""}`),
        "",
        signedHeaders,
        await sha256(body),
    ].join("\n");

    const day = stamp.slice(0, 8);
    const scope = `${day}/${options.region}/${service}/aws4_request`;
    const toSign = ["AWS4-HMAC-SHA256", stamp, scope, await sha256(utf8(canonical))].join("\n");
    let key: ArrayBuffer = await hmac(utf8(`AWS4${creds.secretAccessKey}`), day);
    for (const part of [options.region, service, "aws4_request"]) {
        key = await hmac(key, part);
    }
    const signature = hex(await hmac(key, toSign));
    headers.set(
        "Authorization",
        `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    );
    return new Request(request, { headers });
}
