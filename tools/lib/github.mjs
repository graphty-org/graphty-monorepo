// The GitHub REST and GraphQL client the tools/ scripts share. Only node built-ins: the jobs that run these scripts
// install no dependencies. A request timeout and the rate-limit floor are opt-in, so each caller keeps its behavior.

/**
 * One request to GitHub's API.
 * @param method GET, POST, PATCH, PUT or DELETE
 * @param path the path under the API root, such as `/repos/o/r/issues` or `/graphql`
 * @param [body] an object (sent as JSON) or a string sent as it is
 * @param [opts] `token` (default GITHUB_TOKEN), `base` (default https://api.github.com), `timeoutMs` (default
 * none), `minRateLeft` (throw when fewer requests than this are left this hour; default no check). The floor reads
 * only the hourly core bucket: a response from another bucket (search's 30 a minute, #10481) never trips it
 * @returns the parsed JSON answer, the text of a non-JSON one (a job's log), or null for 204
 */
export async function githubRequest(method, path, body, opts = {}) {
    const { token = process.env.GITHUB_TOKEN, base = "https://api.github.com", timeoutMs, minRateLeft } = opts;
    const res = await fetch(`${base}${path}`, {
        method,
        headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "content-type": "application/json",
        },
        body: body == null || typeof body === "string" ? body : JSON.stringify(body),
        signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
    const left = Number(res.headers.get("x-ratelimit-remaining") ?? Infinity);
    const hourly = (res.headers.get("x-ratelimit-resource") ?? "core") === "core";
    if (minRateLeft && hourly && left < minRateLeft) throw new Error(`only ${left} API requests left this hour`);
    if (res.status === 204) return null;
    // fetch drops the authorization header on the redirect to a log's storage, and the log comes back as text
    return res.headers.get("content-type")?.includes("json") ? res.json() : res.text();
}
