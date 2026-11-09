// tools/nx-cache-proxy.mjs: a stalled cache request must end as what nx treats as harmless (a GET miss, a PUT
// refused), never hang the build (#4193); an answering cache passes through unchanged.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";

describe("nx-cache-proxy", () => {
    let upstream;
    const proxies = [];
    // Answering requests go through a proxy with its own limit: a short one raced them on a loaded machine and
    // answered a hit as a miss. Only a stall, which the upstream below never ends, meets the short limit.
    let url;
    let stallingUrl;
    const stalled = [];

    before(async () => {
        upstream = createServer((req, res) => {
            const hash = req.url.split("/").pop();
            if (hash === "stall-headers") return stalled.push(res);
            if (hash === "stall-body") {
                res.writeHead(200).write("part");
                return stalled.push(res);
            }
            if (req.method === "PUT") {
                if (req.headers.authorization !== "Bearer w") return res.writeHead(403).end();
                return req.resume().on("end", () => res.writeHead(200).end("stored"));
            }
            if (hash === "hit") return res.writeHead(200).end("tarball bytes");
            if (req.headers.authorization !== "Bearer r") return res.writeHead(401).end();
            res.writeHead(404).end();
        }).listen(0, "127.0.0.1");
        await once(upstream, "listening");
        const startProxy = async (env) => {
            const proxy = spawn(
                process.execPath,
                [
                    new URL("nx-cache-proxy.mjs", import.meta.url).pathname,
                    `http://127.0.0.1:${upstream.address().port}/`,
                ],
                { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "ignore"] },
            );
            proxies.push(proxy);
            const [line] = await once(proxy.stdout, "data");
            return line.toString().trim();
        };
        url = await startProxy({ NX_CACHE_PROXY_TIMEOUT_MS: undefined });
        stallingUrl = await startProxy({ NX_CACHE_PROXY_TIMEOUT_MS: "300" });
    });

    after(() => {
        for (const proxy of proxies) proxy.kill();
        for (const res of stalled) res.destroy();
        upstream.close();
    });

    const get = (hash, token = "r", via = url) =>
        fetch(`${via}/v1/cache/${hash}`, { headers: { authorization: `Bearer ${token}` } });

    it("passes a hit, a miss and a refused token through", async () => {
        const hit = await get("hit");
        assert.equal(hit.status, 200);
        assert.equal(await hit.text(), "tarball bytes");
        assert.equal((await get("missing")).status, 404);
        assert.equal((await get("missing", "nope")).status, 401);
    });

    it("answers a GET whose headers never come as a miss", async () => {
        assert.equal((await get("stall-headers", "r", stallingUrl)).status, 404);
    });

    it("answers a GET whose body stops as a miss, not a truncated hit", async () => {
        assert.equal((await get("stall-body", "r", stallingUrl)).status, 404);
    });

    it("stores a PUT, and answers a stalled one as refused so nx skips the store", async () => {
        const put = (hash, token, via = url) =>
            fetch(`${via}/v1/cache/${hash}`, {
                method: "PUT",
                body: "x",
                headers: { authorization: `Bearer ${token}` },
            });
        assert.equal((await put("new", "w")).status, 200);
        assert.equal((await put("new", "r")).status, 403);
        assert.equal((await put("stall-headers", "w", stallingUrl)).status, 403);
    });
});
