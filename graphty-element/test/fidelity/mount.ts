/**
 * Mounting a style fidelity sample in a real `<graphty-element>` and reading back what it drew,
 * shared by the browser tests that score drawings (`fidelity.test.ts`, which records every
 * sample, and `test/browser/fidelity-scorecard.test.ts`, which holds a small set to floors in CI).
 */
import { commands, page } from "vitest/browser";

import type { FidelitySample } from "../../../graph-io/test/fidelity/samples";
import type { Scene } from "../../../graph-io/test/fidelity/scene";
import type { Graphty } from "../../index.js";
import { createSampleElement, importSample, PRE_STEPS, sampleData, SEED } from "./load-sample";

export { drawnScene, nodeKeys } from "./load-sample";

export const WIDTH = 800;
export const HEIGHT = 600;
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
 * Reads a sample file as stored, its sha256, and its bytes as the element should see them.
 * @param file - the sample's path under graph-io/test/
 * @returns the stored file's hash and the bytes to load
 */
async function readSample(file: string): Promise<{ sha256: string; data: Blob }> {
    const base64 = await commands.readFile(`../graph-io/test/${file}`, { encoding: "base64" });
    return sampleData(
        Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
        file.endsWith(".gz"),
    );
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
    const element = createSampleElement(WIDTH, HEIGHT);
    document.body.style.margin = "0";
    document.body.appendChild(element);
    mounted = element;
    const loaded = await importSample(element, sample.format, blobUrl);
    const command = `${loaded}, url = ${sample.file}${sample.file.endsWith(".gz") ? " gunzipped" : ""}; 2D, ${String(WIDTH)}x${String(HEIGHT)}, layoutConfig.seed ${String(SEED)}, layout preSteps ${String(PRE_STEPS)}, GRAPHTY_BROWSER_GPU=${GPU}`;
    return { element, sha256, command };
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
