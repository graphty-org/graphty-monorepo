#!/usr/bin/env node
/**
 * diff-stories.mjs -- render the same stories from two built Storybooks and compare them.
 *
 * Serves each storybook-static directory on a free local port, renders every named story at one
 * viewport in headless Chromium (SwiftShader WebGL, as in CI), and saves
 * <out>/<story>.baseline.png (from the first build) and <out>/<story>.head.png (from the second).
 * For each story it prints JSON: whether the PNG bytes are identical, and, for graphty-element
 * stories, the camera and node positions from each side, so a pixel difference can be attributed
 * to a camera move or to nodes that moved. Feed the PNG pair to tools/pixel-diff.mjs for a
 * per-pixel reading.
 *
 * Usage:
 *   node tools/diff-stories.mjs <storybook-a> <storybook-b> <story-id> [story-id ...]
 *       [--viewport <W>x<H>] [--out <dir>] [--settle <ms>]
 *     <storybook-a/b>  built Storybooks (e.g. a storybook-static from master and from the branch)
 *     <story-id>       ids as in ?path=/story/<id>, e.g. styles-node--default
 *     --viewport       default 1000x800
 *     --out            default tmp/chromatic-diffs
 *     --settle         how long to let each story render before the screenshot (default 4500)
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";

/* global document -- read only inside page.evaluate, which runs in the browser */

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        viewport: { type: "string", default: "1000x800" },
        out: { type: "string", default: "tmp/chromatic-diffs" },
        settle: { type: "string", default: "4500" },
    },
});
const [dirA, dirB, ...ids] = positionals;
const [width, height] = values.viewport.split("x").map(Number);
const settle = Number(values.settle);
if (!dirA || !dirB || ids.length === 0 || !(width > 0 && height > 0) || !(settle >= 0)) {
    console.error(
        "usage: diff-stories.mjs <storybook-a> <storybook-b> <story-id> [...] [--viewport WxH] [--out dir] [--settle ms]",
    );
    process.exit(2);
}
const OUT = values.out;
await mkdir(OUT, { recursive: true });

const TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".map": "application/json",
    ".wasm": "application/wasm",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".ico": "image/x-icon",
};

/**
 * Serve a directory on 127.0.0.1 at a port the OS picks.
 * @param dir the directory to serve
 * @returns the server and the port it listens on
 */
function serve(dir) {
    const server = createServer(async (req, res) => {
        try {
            let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
            if (p === "/") {
                p = "/index.html";
            }
            const f = join(dir, p);
            if ((await stat(f)).isDirectory()) {
                throw new Error("directory");
            }
            res.writeHead(200, {
                "Content-Type": TYPES[extname(f)] ?? "application/octet-stream",
                "Access-Control-Allow-Origin": "*",
            });
            res.end(await readFile(f));
        } catch {
            res.writeHead(404);
            res.end("not found");
        }
    });
    return new Promise((r) => server.listen(0, "127.0.0.1", () => r([server, server.address().port])));
}

const [serverA, portA] = await serve(dirA);
const [serverB, portB] = await serve(dirB);
const browser = await chromium.launch({
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

async function render(port, id) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message.split("\n")[0]));
    await page
        .goto(`http://127.0.0.1:${port}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`, {
            waitUntil: "load",
            timeout: 30000,
        })
        .catch((e) => errs.push(`nav: ${e.message.split("\n")[0]}`));
    // A fixed settle, not a pass/fail timing: this is a local inspection tool, and stories differ
    // in what "rendered" means, so it waits the same for both sides.
    await page.waitForTimeout(settle);
    const png = await page.screenshot();
    // The scene graph, when the story holds a graphty-element.
    const scene = await page
        .evaluate(() => {
            const g = document.querySelector("graphty-element")?.graph;
            if (!g?.scene) {
                return null;
            }
            const cam = g.scene.activeCamera;
            const r = (v) => (v === undefined || v === null ? null : +v.toFixed(3));
            const nodes = [...(g.getNodes?.() ?? [])].slice(0, 60).map((n) => ({
                id: String(n.id),
                x: r(n.mesh?.position?.x),
                y: r(n.mesh?.position?.y),
                z: r(n.mesh?.position?.z),
            }));
            return {
                camera: cam
                    ? {
                          mode: cam.mode,
                          x: r(cam.position.x),
                          y: r(cam.position.y),
                          z: r(cam.position.z),
                          radius: r(cam.radius),
                      }
                    : null,
                nodeCount: nodes.length,
                nodes,
            };
        })
        .catch(() => null);
    await ctx.close();
    return { png, scene, errs };
}

for (const id of ids) {
    const a = await render(portA, id);
    const b = await render(portB, id);
    const safe = id.replace(/[^a-z0-9]+/gi, "-");
    await writeFile(join(OUT, `${safe}.baseline.png`), a.png);
    await writeFile(join(OUT, `${safe}.head.png`), b.png);
    const camA = a.scene?.camera;
    const camB = b.scene?.camera;
    const camDelta = camA && camB ? Math.hypot(camA.x - camB.x, camA.y - camB.y, camA.z - camB.z) : null;
    let maxNodeDelta = null;
    if (a.scene?.nodes && b.scene?.nodes && a.scene.nodes.length === b.scene.nodes.length) {
        const byId = new Map(b.scene.nodes.map((n) => [n.id, n]));
        maxNodeDelta = 0;
        for (const n of a.scene.nodes) {
            const m = byId.get(n.id);
            if (m) {
                maxNodeDelta = Math.max(maxNodeDelta, Math.hypot(n.x - m.x, n.y - m.y, n.z - m.z));
            }
        }
    }
    console.log(
        JSON.stringify(
            {
                id,
                baseline: join(OUT, `${safe}.baseline.png`),
                head: join(OUT, `${safe}.head.png`),
                identicalBytes: a.png.equals(b.png),
                cameraBaseline: camA,
                cameraHead: camB,
                cameraDelta: camDelta === null ? null : +camDelta.toFixed(4),
                cameraModeChanged: camA && camB ? camA.mode !== camB.mode : null,
                maxNodeDelta: maxNodeDelta === null ? null : +maxNodeDelta.toFixed(4),
                nodeCountBaseline: a.scene?.nodeCount,
                nodeCountHead: b.scene?.nodeCount,
                errorsBaseline: a.errs,
                errorsHead: b.errs,
            },
            null,
            2,
        ),
    );
}
await browser.close();
serverA.close();
serverB.close();
