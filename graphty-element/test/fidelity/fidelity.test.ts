/**
 * The style fidelity harness's graphty side: loads every fidelity sample into a real
 * `<graphty-element>` with the file's own styles, in 2D with a fixed layout seed, and writes what
 * it drew as a scene (`out/<sample>.graphty.json`) and a canvas PNG (`out/<sample>.graphty.png`)
 * for the comparer to score against the committed reference scenes in
 * `graph-io/test/fidelity/scenes/`.
 *
 * It records only; the scores and their no-regression floor come with the comparer.
 *
 *     GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_EGL_LIB_DIR=<libEGL dir> npm run test:fidelity
 *
 * in graphty-element (`-- -t <sample id>` for one sample). Without a GPU, Chromium renders with
 * SwiftShader and the larger samples take a minute each; the annotation session does not settle.
 * The flag set is recorded in each scene's provenance, since a GPU also changes which force layout
 * implementation runs.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { commands, page } from "vitest/browser";

import { SAMPLES } from "../../../graph-io/test/fidelity/samples";
import type { Graphty } from "../../index.js";
import packageJson from "../../package.json";
import { extractScene } from "./extract-scene";

const OUT = "test/fidelity/out";
const WIDTH = 800;
const HEIGHT = 600;
const SEED = 42;
const PRE_STEPS = 2000;
const GPU = (import.meta.env.GRAPHTY_BROWSER_GPU as string | undefined) || "none";

let mounted: Graphty | null = null;
let blobUrl: string | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
    if (blobUrl !== null) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
    }
});

/**
 * Hex of a byte array.
 * @param bytes - the bytes
 * @returns lowercase hex
 */
function hex(bytes: ArrayBuffer): string {
    return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Reads a sample file as stored, its sha256, and its bytes as the element should see them:
 * gunzipped when stored compressed, since nothing in graphty-element unzips a `.gz`.
 * @param file - the sample's path under graph-io/test/
 * @returns the stored file's hash and the bytes to load
 */
async function readSample(file: string): Promise<{ sha256: string; data: Blob }> {
    const base64 = await commands.readFile(`../graph-io/test/${file}`, { encoding: "base64" });
    const stored = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const sha256 = hex(await crypto.subtle.digest("SHA-256", stored));
    const blob = new Blob([stored]);
    const data = file.endsWith(".gz")
        ? await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).blob()
        : blob;
    return { sha256, data };
}

describe("style fidelity: graphty-element's drawing of each sample", () => {
    it.each(SAMPLES.map((s) => [s.id, s] as const))("%s", async (id, sample) => {
        const { sha256, data } = await readSample(sample.file);
        blobUrl = URL.createObjectURL(data);

        await page.viewport(WIDTH, HEIGHT);
        const element = document.createElement("graphty-element");
        document.body.style.margin = "0";
        element.style.cssText = `display:block;width:${String(WIDTH)}px;height:${String(HEIGHT)}px`;
        element.viewMode = "2d";
        element.layoutConfig = { seed: SEED };
        // Run the layout before the first frame, as the File Styles stories do: drawing every step
        // of a few hundred nodes in a software-rendered Chromium does not settle in
        // waitForStableFrame's 30 seconds.
        element.layoutBehavior = { layout: { preSteps: PRE_STEPS } };
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;

        // loadFromUrl always passes the element's nodeIdPath ("id" by default) to the JSON reader,
        // which then skips its Cytoscape.js dialect and loads nothing (E_EMPTY_LOAD): a
        // graphty-element defect. JSON goes through session.data.import, which passes no paths.
        const route =
            sample.format === "json"
                ? `session.data.import({ type: "json", config: { url } }, { styles: "file" })`
                : `loadFromUrl(url, { format: "${sample.format}", styles: "file" })`;
        await (sample.format === "json"
            ? element.session.data.import({ type: "json", config: { url: blobUrl } }, { styles: "file" })
            : element.loadFromUrl(blobUrl, { format: sample.format, styles: "file" }));
        await element.waitForSettled();
        await element.session.styles.settled();
        await element.waitForStableFrame();

        const scene = extractScene(element, {
            version: `${packageJson.version} (source)`,
            command: `${route}, url = ${sample.file}${sample.file.endsWith(".gz") ? " gunzipped" : ""}; 2D, ${String(WIDTH)}x${String(HEIGHT)}, layoutConfig.seed ${String(SEED)}, layout preSteps ${String(PRE_STEPS)}, GRAPHTY_BROWSER_GPU=${GPU}`,
            sourceSha256: sha256,
        });
        await commands.writeFile(`${OUT}/${id}.graphty.json`, `${JSON.stringify(scene, null, 1)}\n`);

        // The browser's own screenshot of the viewport, which the element fills: test/setup.ts
        // stubs the element's captureScreenshot, and an element screenshot waits for two equal
        // frames, which a few hundred nodes in a software-rendered Chromium do not give it in time.
        const png = await page.screenshot({ save: false });
        await commands.writeFile(`${OUT}/${id}.graphty.png`, png, { encoding: "base64" });

        const { counts } = element.session.status;
        assert.isAbove(scene.nodes.length, 0, `${id}: nothing was drawn`);
        assert.strictEqual(scene.nodes.length, counts.nodes);
        assert.strictEqual(scene.edges.length, counts.edges);
    });
});
