// A local proxy between nx and its self-hosted remote cache (tools/nx-cache-worker/) that gives every request
// a time limit. nx 22's cache client (packages/nx/src/native/cache/http_remote_cache.rs) builds its HTTP client
// with no timeout and fails the task on a request error, so one stalled GET or PUT hung a master Build job until
// its 12-minute limit (issue #4193). Here a stall becomes what nx already treats as harmless: a GET that stalls
// answers 404 (a miss: nx builds the task itself) and a PUT that stalls answers 403 (nx skips the store).
//
// Usage: node tools/nx-cache-proxy.mjs <upstream url>. Prints its own URL on one line on stdout, then serves
// until it is killed (in CI, at the end of the job). Log lines go to stderr.
// NX_CACHE_PROXY_TIMEOUT_MS (default 20000): the longest wait for the upstream's headers, for each chunk
// of a GET's body, and for a whole PUT.

import { createServer } from "node:http";

const upstream = process.argv[2]?.replace(/\/$/, "");
if (!upstream) {
    console.error("usage: node tools/nx-cache-proxy.mjs <upstream url>");
    process.exit(2);
}
const limit = Number(process.env.NX_CACHE_PROXY_TIMEOUT_MS) || 20000;
const log = (line) => console.error(`${new Date().toISOString()} ${line}`);

const readAll = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
};

/**
 * Reads a fetch response's body, aborting when no chunk arrives within the limit.
 * @param response the upstream response
 * @param controller the request's abort controller
 * @returns the body
 */
async function readBody(response, controller) {
    const chunks = [];
    const reader = response.body.getReader();
    for (;;) {
        const timer = setTimeout(() => controller.abort(), limit);
        const { done, value } = await reader.read().finally(() => clearTimeout(timer));
        if (done) return Buffer.concat(chunks);
        chunks.push(value);
    }
}

/**
 * Forwards one request upstream within the time limits.
 * @param req the request from nx
 * @returns the status and body to answer nx with
 */
async function forward(req) {
    const controller = new AbortController();
    const put = req.method === "PUT";
    const body = put ? await readAll(req) : undefined;
    // A PUT is limited as a whole; a GET until its headers, then per body chunk.
    const timer = setTimeout(() => controller.abort(), limit);
    try {
        const response = await fetch(upstream + req.url, {
            method: req.method,
            headers: { authorization: req.headers.authorization ?? "", "content-type": "application/octet-stream" },
            body,
            signal: controller.signal,
        });
        if (!put) clearTimeout(timer);
        return { status: response.status, body: await readBody(response, controller) };
    } catch (error) {
        const why = error.name === "AbortError" ? `no answer in ${limit} ms` : error.message;
        log(`${req.method} ${req.url}: ${why}`);
        return { status: put ? 403 : 404, body: Buffer.from("nx-cache-proxy: upstream stalled or failed") };
    } finally {
        clearTimeout(timer);
    }
}

const server = createServer(async (req, res) => {
    const { status, body } = await forward(req);
    if (status !== 200 && status !== 404) log(`${req.method} ${req.url}: ${status}`);
    res.writeHead(status, { "content-type": "application/octet-stream" }).end(body);
});
server.listen(0, "127.0.0.1", () => console.log(`http://127.0.0.1:${server.address().port}`));
