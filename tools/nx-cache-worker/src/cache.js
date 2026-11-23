// nx's self-hosted remote cache over R2 (design/ci/channels-pipeline/merging.md, section 5.2). nx sends
// GET and PUT /v1/cache/{hash} with `Authorization: Bearer <NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN>`:
// - a token whose SHA-256 is in READ_TOKEN_HASHES or WRITE_TOKEN_HASHES may read;
// - only one in WRITE_TOKEN_HASHES may write (a read token gets 403), and an entry is never replaced (409).
// GET /v1/health answers anyone, for the deploy job's check (CI's probe reads an entry with its token). Objects expire after 14 days (an R2 lifecycle rule).
// Every request counts against hard daily caps (src/cap.js, the CAP_* vars in wrangler.toml): requests, R2 Class A
// operations (a PUT) and R2 Class B operations (a GET, or the HEAD before a PUT). Past one the answer is 429 and R2
// is not touched; tools/nx-cache-proxy.mjs turns that 429 into a miss, so the build goes on without the cache.

import { dailyCap } from "./cap.js";

const HASH = /^[A-Za-z0-9_-]{1,128}$/;

const sha256 = async (text) =>
    [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
const listed = (value, hash) =>
    (value ?? "")
        .split(",")
        .map((s) => s.trim())
        .includes(hash);
const text = (status, body) => new Response(body, { status, headers: { "content-type": "text/plain" } });

/**
 * What the request's bearer token may do.
 * @param request the request
 * @param env the bindings
 * @returns "write", "read" or undefined for no or an unknown token
 */
async function access(request, env) {
    const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
    if (!token) return undefined;
    const hash = await sha256(token);
    if (listed(env.WRITE_TOKEN_HASHES, hash)) return "write";
    return listed(env.READ_TOKEN_HASHES, hash) ? "read" : undefined;
}

const isolateCap = dailyCap();

/**
 * The counts one request charges against the daily caps: every request is one; a GET it may make costs a Class B
 * operation, a PUT it may make a HEAD (Class B) and a PUT (Class A).
 * @param request the request
 * @param may what its token may do
 * @returns the counts, by cap name
 */
function costOf(request, may) {
    if (request.method === "GET" && may) return { REQUESTS: 1, R2_CLASS_B: 1 };
    if (request.method === "PUT" && may === "write") return { REQUESTS: 1, R2_CLASS_A: 1, R2_CLASS_B: 1 };
    return { REQUESTS: 1 };
}

/**
 * Handles one request.
 * @param request the request
 * @param env the bindings: CACHE (the R2 bucket), DAILY_COUNT (the cap counter), READ_TOKEN_HASHES,
 *     WRITE_TOKEN_HASHES and the CAP_* caps
 * @param [cap] the daily cap counter (tests pass their own)
 * @returns the response
 */
export async function handle(request, env, cap = isolateCap) {
    const { pathname } = new URL(request.url);
    const hash = /^\/v1\/cache\/([^/]+)$/.exec(pathname)?.[1];
    const may = hash && HASH.test(hash) ? await access(request, env) : undefined;
    const over = await cap.charge(env, costOf(request, may));
    if (over) return text(429, `daily ${over} cap reached; the cache is off until 00:00 UTC`);
    if (pathname === "/v1/health" && request.method === "GET") return Response.json({ ok: true });
    if (!hash || !HASH.test(hash)) return text(404, "not found");
    if (!may) return text(401, "missing or unknown token");
    if (request.method === "GET") {
        const object = await env.CACHE.get(hash);
        if (!object) return text(404, "no such entry");
        return new Response(object.body, { headers: { "content-type": "application/octet-stream" } });
    }
    if (request.method !== "PUT") return text(405, "GET or PUT");
    if (may !== "write") return text(403, "this token may only read");
    if (await env.CACHE.head(hash)) return text(409, "entry exists");
    await env.CACHE.put(hash, request.body);
    return text(200, "stored");
}
