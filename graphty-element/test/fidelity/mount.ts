/**
 * Mounting a style fidelity sample in a real `<graphty-element>` and reading back what it drew,
 * shared by the browser tests that score drawings (`fidelity.test.ts`, which records every
 * sample, and `test/browser/fidelity-scorecard.test.ts`, which holds a small set to floors in CI).
 */
import "../../src/graphty-element";

import { commands, page } from "vitest/browser";

import type { FidelitySample } from "../../../graph-io/test/fidelity/samples";
import type { Scene } from "../../../graph-io/test/fidelity/scene";
import type { Graphty } from "../../index.js";
import packageJson from "../../package.json";
import { readDrawn } from "./drawn-scene";
import { extractScene } from "./extract-scene";

export const WIDTH = 800;
export const HEIGHT = 600;
const SEED = 42;
const PRE_STEPS = 2000;
const GPU = (import.meta.env.GRAPHTY_BROWSER_GPU as string | undefined) || "none";

let mounted: Graphty | null = null;
let blobUrl: string | null = null;

/** Removes the mounted element and frees its file. Call after each test. */
export function unmount(): void {
    mounted?.remove();
    mounted = null;
    if (blobUrl !== null) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
    }
}

/**
 * Reads a JSON file relative to graphty-element, or null when it does not exist.
 * @param path - the path
 * @returns the parsed value
 */
export async function readJson<T>(path: string): Promise<T | null> {
    try {
        return JSON.parse(await commands.readFile(path)) as T;
    } catch {
        return null;
    }
}

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

/**
 * Mounts a fresh element, loads a sample into it with its file styles and waits for a stable frame.
 * @param sample - the sample
 * @returns the element, the sample's hash and how it was loaded
 */
export async function mountSample(
    sample: FidelitySample,
): Promise<{ element: Graphty; sha256: string; command: string }> {
    unmount();
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

    // session.data.import rather than loadFromUrl, for two reasons. loadFromUrl has no layout
    // option, so a file's own coordinates were thrown away for the seeded force layout and
    // every position scored 0 against references that keep them; `layout: "recommended"` is
    // the public way to keep them (graphty-element picks "fixed" when every node carries a
    // coordinate, else a computed layout). And loadFromUrl always passes the element's
    // nodeIdPath ("id" by default) to the JSON reader, which then skips its Cytoscape.js
    // dialect and loads nothing (E_EMPTY_LOAD): a graphty-element defect.
    const route = `session.data.import({ type: "${sample.format}", config: { url } }, { styles: "file", layout: "recommended" })`;
    await element.session.data.import(
        { type: sample.format, config: { url: blobUrl } },
        { styles: "file", layout: "recommended" },
    );
    await element.waitForSettled();
    await element.session.styles.settled();
    await element.waitForStableFrame();

    // Which layout drew it, and how many nodes the file placed: a position score is only
    // meaningful when the layout is "fixed" (every node carried a coordinate).
    const placement = `layout ${String(element.layout)}, ${String(element.session.seededNodeCount)} of ${String(element.session.status.counts.nodes)} nodes placed by the file`;
    const command = `${route}; ${placement}, url = ${sample.file}${sample.file.endsWith(".gz") ? " gunzipped" : ""}; 2D, ${String(WIDTH)}x${String(HEIGHT)}, layoutConfig.seed ${String(SEED)}, layout preSteps ${String(PRE_STEPS)}, GRAPHTY_BROWSER_GPU=${GPU}`;
    return { element, sha256, command };
}

/**
 * The scene a mounted element drew, read off its renderer.
 * @param element - the element
 * @param sha256 - the sample's hash
 * @param command - how it was loaded
 * @returns the scene
 */
export function drawnScene(element: Graphty, sha256: string, command: string): Scene {
    return extractScene(element, readDrawn(element.graph), {
        version: `${packageJson.version} (source)`,
        command,
        sourceSha256: sha256,
    });
}

/**
 * Each node's `name` and `label` columns, for routes that name nodes by them.
 * @param element - the mounted element
 * @returns graphty node id to each column's value
 */
export function nodeKeys(element: Graphty): { name: Map<string, string>; label: Map<string, string> } {
    const name = new Map<string, string>();
    const label = new Map<string, string>();
    for (const record of element.session.data.nodes()) {
        if (typeof record.name === "string" || typeof record.name === "number") {
            name.set(String(record.id), String(record.name));
        }
        if (typeof record.label === "string" || typeof record.label === "number") {
            label.set(String(record.id), String(record.label));
        }
    }
    return { name, label };
}

/**
 * The reference scenes of a sample, best route first.
 * @param sample - the sample
 * @returns the scenes
 */
export async function referenceScenes(sample: FidelitySample): Promise<Scene[]> {
    const refs: Scene[] = [];
    for (const route of sample.routes) {
        const ref = await readJson<Scene>(`../graph-io/test/fidelity/scenes/${sample.id}/${route}.ref.json`);
        if (ref === null) {
            throw new Error(`${sample.id}: no committed reference scene for ${route}`);
        }
        refs.push(ref);
    }
    return refs;
}
