// nx's self-hosted remote cache over R2 (design/ci/channels-pipeline/merging.md, section 5.2). nx sends
// GET and PUT /v1/cache/{hash} with `Authorization: Bearer <NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN>`:
// - a token whose SHA-256 is in READ_TOKEN_HASHES or WRITE_TOKEN_HASHES may read;
// - only one in WRITE_TOKEN_HASHES may write (a read token gets 403), and an entry is never replaced (409).
// GET /v1/health answers anyone, for the deploy job's check (CI's probe reads an entry with its token). Objects expire after 14 days (an R2 lifecycle rule).

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

/**
 * Handles one request.
 * @param request the request
 * @param env the bindings: CACHE (the R2 bucket), READ_TOKEN_HASHES, WRITE_TOKEN_HASHES
 * @returns the response
 */
export async function handle(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/v1/health" && request.method === "GET") return Response.json({ ok: true });
    const hash = /^\/v1\/cache\/([^/]+)$/.exec(pathname)?.[1];
    if (!hash || !HASH.test(hash)) return text(404, "not found");
    const may = await access(request, env);
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
