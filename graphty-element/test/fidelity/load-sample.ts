/**
 * Loading a style fidelity sample into a `<graphty-element>` and reading back what it drew, with
 * no test runner involved: the browser tests (`mount.ts`) and the side-by-side fidelity stories
 * (`graph-io/fidelity-stories/`) both load a sample this way, so a story shows exactly the
 * drawing the scored tests judge.
 */
import "../../src/graphty-element";

import type { Scene } from "../../../graph-io/test/fidelity/scene";
import type { Graphty } from "../../index.js";
import packageJson from "../../package.json";
import { readDrawn } from "./drawn-scene";
import { extractScene } from "./extract-scene";

/** The force layout's seed, for a sample whose file does not place every node. */
export const SEED = 42;
/** Layout steps run before the first frame. */
export const PRE_STEPS = 2000;

/**
 * Hex of a byte array.
 * @param bytes - the bytes
 * @returns lowercase hex
 */
function hex(bytes: ArrayBuffer): string {
    return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * A sample file's sha256 as stored, and its bytes as the element should see them: gunzipped when
 * stored compressed, since nothing in graphty-element unzips a `.gz`.
 * @param stored - the file's bytes as stored
 * @param gzipped - whether the file is stored compressed
 * @returns the stored file's hash and the bytes to load
 */
export async function sampleData(
    stored: Uint8Array<ArrayBuffer>,
    gzipped: boolean,
): Promise<{ sha256: string; data: Blob }> {
    const sha256 = hex(await crypto.subtle.digest("SHA-256", stored));
    const blob = new Blob([stored]);
    const data = gzipped ? await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).blob() : blob;
    return { sha256, data };
}

/**
 * A fresh element set up as every fidelity drawing is: 2D, a seeded layout run before the first
 * frame. Append it to the page, then call {@link importSample}.
 * @param width - CSS pixels
 * @param height - CSS pixels
 * @returns the element
 */
export function createSampleElement(width: number, height: number): Graphty {
    const element = document.createElement("graphty-element");
    element.style.cssText = `display:block;width:${String(width)}px;height:${String(height)}px`;
    element.viewMode = "2d";
    element.layoutConfig = { seed: SEED };
    // Run the layout before the first frame, as the File Styles stories do: drawing every step
    // of a few hundred nodes in a software-rendered Chromium does not settle in
    // waitForStableFrame's 30 seconds.
    element.layoutBehavior = { layout: { preSteps: PRE_STEPS } };
    return element;
}

/**
 * Imports a sample into an element with the file's styles and waits for a stable frame.
 * @param element - an element from {@link createSampleElement}, already on the page
 * @param format - graph-io's format name
 * @param url - where the (uncompressed) file is
 * @param graphName - which graph to read from a file that holds several (a session's network title),
 *     when not its first
 * @param formatOptions - the reader's own options the program drew the file with (Gephi's Preview
 *     settings), when there are any
 * @returns how it was loaded and placed, for the scene's provenance
 */
export async function importSample(
    element: Graphty,
    format: string,
    url: string,
    graphName?: string,
    formatOptions: Readonly<Record<string, unknown>> = {},
): Promise<string> {
    await element.updateComplete;
    // session.data.import rather than loadFromUrl, for two reasons. loadFromUrl has no layout
    // option, so a file's own coordinates were thrown away for the seeded force layout and
    // every position scored 0 against references that keep them; `layout: "recommended"` is
    // the public way to keep them (graphty-element picks "fixed" when every node carries a
    // coordinate, else a computed layout). And loadFromUrl always passes the element's
    // nodeIdPath ("id" by default) to the JSON reader, which then skips its Cytoscape.js
    // dialect and loads nothing (E_EMPTY_LOAD): a graphty-element defect.
    const config = { ...formatOptions, ...(graphName === undefined ? { url } : { url, graphName }) };
    const named =
        (graphName === undefined ? "" : `, graphName: ${JSON.stringify(graphName)}`) +
        Object.entries(formatOptions)
            .map(([k, v]) => `, ${k}: ${JSON.stringify(v)}`)
            .join("");
    const route = `session.data.import({ type: "${format}", config: { url${named} } }, { styles: "file", layout: "recommended" })`;
    await element.session.data.import({ type: format, config }, { styles: "file", layout: "recommended" });
    await element.waitForSettled();
    await element.session.styles.settled();
    await element.waitForStableFrame();

    // Which layout drew it, and how many nodes the file placed: a position score is only
    // meaningful when the layout is "fixed" (every node carried a coordinate).
    const placement = `layout ${String(element.layout)}, ${String(element.session.seededNodeCount)} of ${String(element.session.status.counts.nodes)} nodes placed by the file`;
    return `${route}; ${placement}`;
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
