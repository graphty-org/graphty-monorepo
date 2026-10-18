#!/usr/bin/env node
/**
 * Draw a small picture of each of graph-samples' small datasets with the real graphty-element, so a
 * sample library can show what a graph looks like before anyone opens it:
 *
 *     node tools/render-sample-thumbnails.mjs [name ...]
 *
 * Writes graph-samples/thumbnails/<name>.webp (committed). graph-samples' pack step copies each one
 * next to its dataset, dist/data/v1/<name>.webp, which graphty.app publishes at
 * https://graphty.app/data/graph-samples/v1/<name>.webp, and records it as the dataset's
 * `thumbnail` in the catalogue (`npm run datasets:pack` in graph-samples after a rerun here).
 *
 * The same picture every run: a seeded 2D force layout, a fixed size, the communities graphty-element's
 * Louvain finds, drawn headless by Chromium on SwiftShader. Needs a built graph-format, graph-samples
 * (with dist/data/v1/) and graphty-element (dist/graphty.bundle.js).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "graph-samples/dist/data/v1");
const outDir = path.join(root, "graph-samples/thumbnails");
const bundle = path.join(root, "graphty-element/dist/graphty.bundle.js");

/** The picture's size in pixels: twice a 240 x 150 tile, for sharp screens. */
const WIDTH = 480;
const HEIGHT = 300;
/** The layout seed, so every run draws the same picture. */
const SEED = 7;

const { fromBytes } = await import(pathToFileURL(path.join(root, "graph-format/dist/src/index.js")).href);
const { toElementData } = await import(pathToFileURL(path.join(root, "graph-samples/dist/src/index.js")).href);

const index = JSON.parse(readFileSync(path.join(dataDir, "index.json"), "utf8"));
const wanted = process.argv.slice(2);
const datasets = index.filter((meta) => wanted.length === 0 || wanted.includes(meta.name));

const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style>
<script type="module" src="/graphty.bundle.js"></script>
<graphty-element style="display:block;width:${WIDTH}px;height:${HEIGHT}px"></graphty-element>`;

const server = createServer((request, response) => {
    if (request.url === "/graphty.bundle.js") {
        response.setHeader("Content-Type", "text/javascript");
        response.end(readFileSync(bundle));
        return;
    }
    response.setHeader("Content-Type", "text/html");
    response.end(PAGE);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
    args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--disable-gpu-rasterization",
        "--force-color-profile=srgb",
    ],
    env: { ...process.env, FC_FONTATIONS: "1" },
});
mkdirSync(outDir, { recursive: true });
let failed = 0;
try {
    for (const meta of datasets) {
        const snapshot = fromBytes(
            new Uint8Array(gunzipSync(readFileSync(path.join(dataDir, `${meta.name}.gsnp.gz`)))),
        );
        const data = JSON.stringify({ directed: meta.directed, ...toElementData(snapshot) });
        const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
        const page = await context.newPage();
        page.on("pageerror", (error) => {
            console.error(`${meta.name}: ${error.message}`);
        });
        try {
            await page.goto(base);
            const picture = await page.evaluate(draw, {
                name: meta.name,
                data,
                seed: SEED,
                width: WIDTH,
                height: HEIGHT,
            });
            writeFileSync(path.join(outDir, `${meta.name}.webp`), Buffer.from(picture, "base64"));
            console.log(`${meta.name}.webp`);
        } catch (error) {
            failed += 1;
            console.error(`${meta.name}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            await context.close();
        }
    }
} finally {
    await browser.close();
    server.close();
}
process.exit(failed === 0 ? 0 : 1);

/**
 * Runs in the page: draws one dataset and returns its picture.
 * @param job - what to draw
 * @param job.name - the dataset's name
 * @param job.data - its records, as graphty-element's JSON
 * @param job.seed - the layout seed
 * @param job.width - the picture's width in pixels
 * @param job.height - the picture's height in pixels
 * @returns the WebP picture, base64
 */
async function draw({ name, data, seed, width, height }) {
    await globalThis.customElements.whenDefined("graphty-element");
    const element = globalThis.document.querySelector("graphty-element");
    const { session } = element;
    await session.styles.add({
        name: "Thin gray lines",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#8a90a0", "edge.opacity": 0.55, "edge.arrowHead": "none" },
    });
    await session.layout.setDimension("2d");
    await session.layout.set("force", { options: { seed } });
    await session.data.import({ type: "json", name, config: { data } });
    await session.runs.start("louvain");
    await element.waitForStableFrame({ timeoutMs: 120_000 });
    const shot = await element.captureScreenshot({
        format: "webp",
        quality: 0.85,
        width,
        height,
        transparentBackground: true,
        destination: { blob: true },
    });
    // A picture for a tile in either color scheme: fail loudly when the background was drawn.
    const corner = new globalThis.OffscreenCanvas(1, 1).getContext("2d");
    corner.drawImage(await globalThis.createImageBitmap(shot.blob), 0, 0);
    if (corner.getImageData(0, 0, 1, 1).data[3] !== 0) {
        throw new Error("graphty-element drew the background into a transparent screenshot; run it again");
    }
    const bytes = new Uint8Array(await shot.blob.arrayBuffer());
    let text = "";
    for (const byte of bytes) {
        text += String.fromCodePoint(byte);
    }
    return btoa(text);
}
