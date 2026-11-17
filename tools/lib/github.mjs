// The one GitHub REST and GraphQL client the tools/ scripts share: a request timeout, an empty answer (204) as null,
// a text answer (a job's log) as text, and a guard on the shared request budget.

// Under this many requests left this hour, a read (a GET or a GraphQL query) refuses to go on; a write that already
// happened still returns.
export const DEFAULT_MIN_RATE_LEFT = 50;
/** How long one request may take before it is abandoned. */
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * One request to GitHub's API.
 * @param method GET, POST, PATCH, PUT or DELETE
 * @param path the path under the API root, such as `/repos/o/r/issues` or `/graphql`
 * @param [body] an object (sent as JSON) or a string sent as it is
 * @param [opts] `token` (default GITHUB_TOKEN), `base` (default GITHUB_API_URL or https://api.github.com),
 * `minRateLeft` (default DEFAULT_MIN_RATE_LEFT), `timeoutMs` (default REQUEST_TIMEOUT_MS)
 * @returns the parsed JSON answer, the text of a non-JSON one, or null for 204
 */
export async function githubRequest(method, path, body, opts = {}) {
    const {
        token = process.env.GITHUB_TOKEN,
        base = process.env.GITHUB_API_URL ?? "https://api.github.com",
        minRateLeft = DEFAULT_MIN_RATE_LEFT,
        timeoutMs = REQUEST_TIMEOUT_MS,
    } = opts;
    const res = await fetch(`${base}${path}`, {
        method,
        headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "content-type": "application/json",
        },
        body: body == null || typeof body === "string" ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
    const left = Number(res.headers.get("x-ratelimit-remaining") ?? Infinity);
    const read = method === "GET" || path === "/graphql";
    if (read && left < minRateLeft) throw new Error(`only ${left} API requests left this hour`);
    if (res.status === 204) return null;
    return res.headers.get("content-type")?.includes("json") ? res.json() : res.text();
}

/**
 * A client for one repository's REST API: `(path, init?) => answer`, with `init` shaped like fetch's (`method`,
 * `body`), as the tools that call `gh("/issues?...")` expect.
 * @param [repo] owner/name (default GITHUB_REPOSITORY)
 * @param [opts] githubRequest's options
 * @returns the client
 */
export function repoApi(repo = process.env.GITHUB_REPOSITORY, opts = {}) {
    return (path, init = {}) => githubRequest(init.method ?? "GET", `/repos/${repo}${path}`, init.body, opts);
}
