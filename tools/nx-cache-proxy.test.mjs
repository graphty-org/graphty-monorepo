// tools/nx-cache-proxy.mjs: a stalled cache request must end as what nx treats as harmless (a GET miss, a PUT
// refused), never hang the build (#4193); an answering cache passes through unchanged.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";

describe("nx-cache-proxy", () => {
    let upstream;
    let proxy;
    let url;
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
        proxy = spawn(
            process.execPath,
            [new URL("nx-cache-proxy.mjs", import.meta.url).pathname, `http://127.0.0.1:${upstream.address().port}/`],
            { env: { ...process.env, NX_CACHE_PROXY_TIMEOUT_MS: "300" }, stdio: ["ignore", "pipe", "ignore"] },
        );
        const [line] = await once(proxy.stdout, "data");
        url = line.toString().trim();
    });

    after(() => {
        proxy.kill();
        for (const res of stalled) res.destroy();
        upstream.close();
    });

    const get = (hash, token = "r") =>
        fetch(`${url}/v1/cache/${hash}`, { headers: { authorization: `Bearer ${token}` } });

    it("passes a hit, a miss and a refused token through", async () => {
        const hit = await get("hit");
        assert.equal(hit.status, 200);
        assert.equal(await hit.text(), "tarball bytes");
        assert.equal((await get("missing")).status, 404);
        assert.equal((await get("missing", "nope")).status, 401);
    });

    it("answers a GET whose headers never come as a miss", async () => {
        assert.equal((await get("stall-headers")).status, 404);
    });

    it("answers a GET whose body stops as a miss, not a truncated hit", async () => {
        assert.equal((await get("stall-body")).status, 404);
    });

    it("stores a PUT, and answers a stalled one as refused so nx skips the store", async () => {
        const put = (hash, token) =>
            fetch(`${url}/v1/cache/${hash}`, {
                method: "PUT",
                body: "x",
                headers: { authorization: `Bearer ${token}` },
            });
        assert.equal((await put("new", "w")).status, 200);
        assert.equal((await put("new", "r")).status, 403);
        assert.equal((await put("stall-headers", "w")).status, 403);
    });
});
