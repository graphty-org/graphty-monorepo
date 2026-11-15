// Tests of tools/check-site.mjs against a local HTTP server standing in for a site (the real site URL is
// an argument). Run: node tools/check-site.test.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import { checkSite, stampCommit } from "./check-site.mjs";

const script = fileURLToPath(new URL("check-site.mjs", import.meta.url));
const fixtures = fileURLToPath(new URL("fixtures/dataset-overlay/", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "check-site-"));
const COMMIT = "a".repeat(40);
const page = (sha) =>
    `<html><head><meta name="graphty-build" content="commit=${sha} release=graphty@1.0.0" /></head></html>`;

// the build: a page, its stamp, a site.json and the promoted datasets
const build = join(dir, "build");
mkdirSync(join(build, "docs"), { recursive: true });
writeFileSync(join(build, "index.html"), page(COMMIT));
writeFileSync(join(build, "docs/index.html"), "<p>docs</p>");
writeFileSync(join(build, "site.json"), '{"site":"canary"}');
cpSync(join(fixtures, "promoted"), join(build, "data/graph-samples/v1"), { recursive: true });

// what the server serves: path -> bytes; each test edits a copy
let served;
function serveBuild() {
    served = new Map();
    for (const f of [
        "index.html",
        "docs/index.html",
        ...readdirSync(join(build, "data/graph-samples/v1")).map((f) => `data/graph-samples/v1/${f}`),
    ]) {
        served.set(f, readFileSync(join(build, f)));
    }
    served.set("site.json", Buffer.from('{"site":"production"}'));
}
const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname.slice(1)) || "index.html";
    const body = served.get(path);
    res.writeHead(body ? 200 : 404).end(body ?? "not found");
});
let url;
before(async () => {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${server.address().port}/`;
});
after(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
});

const ok = (r) => assert.deepEqual(r.problems, []);

describe("check-site.mjs", () => {
    it("passes a site that serves the build, with its own site.json", async () => {
        serveBuild();
        const r = await checkSite(url, build);
        ok(r);
        assert.equal(r.checked, 11); // 10 files and the stamp
    });

    it("passes a re-gzipped dataset and an extra one only production's index lists", async () => {
        serveBuild();
        const k = "data/graph-samples/v1/karate.gsnp.gz";
        served.set(k, gzipSync(gunzipSync(served.get(k)), { level: 9 }));
        const indexPath = "data/graph-samples/v1/index.json";
        const idx = JSON.parse(served.get(indexPath));
        idx.push({ name: "old", url: "https://graphty.app/data/graph-samples/v1/old.gsnp.gz", thumbnail: "old.webp" });
        served.set(indexPath, Buffer.from(JSON.stringify(idx)));
        served.set("data/graph-samples/v1/old.gsnp.gz", gzipSync("x"));
        served.set("data/graph-samples/v1/old.webp", Buffer.from("w"));
        const r = await checkSite(url, build);
        ok(r);
        assert.equal(r.checked, 13);
    });

    it("names a missing page, a changed file, a missing dataset, a dropped index entry and a wrong stamp", async () => {
        serveBuild();
        served.delete("docs/index.html");
        served.set("data/graph-samples/v1/karate.webp", Buffer.from("other picture"));
        served.delete("data/graph-samples/v1/dolphins.gsnp.gz");
        const indexPath = "data/graph-samples/v1/index.json";
        served.set(
            indexPath,
            Buffer.from(JSON.stringify(JSON.parse(served.get(indexPath)).filter((e) => e.name !== "dolphins"))),
        );
        served.set("index.html", Buffer.from(page("b".repeat(40))));
        const { problems } = await checkSite(url, build);
        assert.deepEqual(problems, [
            `build stamp of ${url} names ${"b".repeat(40)}, expected ${COMMIT}`,
            "data/graph-samples/v1/dolphins.gsnp.gz: 404",
            "data/graph-samples/v1/index.json: does not list dataset dolphins",
            "data/graph-samples/v1/karate.webp: sha256 differs from the build's",
            "docs/index.html: 404",
            "index.html: sha256 differs from the build's",
        ]);
    });

    it("takes the expected commit from --commit and exits 1 on a mismatch", async () => {
        serveBuild();
        const run = (args) =>
            new Promise((resolve) => {
                const p = spawn(process.execPath, [script, url, build, ...args]);
                let err = "";
                p.stderr.on("data", (d) => (err += d));
                p.on("close", (status) => resolve({ status, err }));
            });
        assert.equal((await run([])).status, 0);
        const r = await run(["--commit", "c".repeat(40)]);
        assert.equal(r.status, 1);
        assert.match(r.err, /expected c{40}/);
    });

    it("refuses plain http for a site that is not on this machine", async () => {
        const { problems } = await checkSite("http://graphty.app", build);
        assert.deepEqual(problems, ["http://graphty.app is not https"]);
    });

    it("reads the commit from a stamp", () => {
        assert.equal(stampCommit(page(COMMIT)), COMMIT);
        assert.equal(stampCommit("<html></html>"), null);
    });
});
