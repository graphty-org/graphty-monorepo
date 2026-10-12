/**
 * JSON in the style harness: the committed corpus of every dialect read with its program's defaults, the
 * Cytoscape.js demos whose data and stylesheet are separate files read as one document, Cytoscape.js's adversarial
 * stylesheet sets read through the JSON importer, and the round trip through the JSON writer in the dialect each file
 * was read as. The `graphty.styles` block is a top-level key (Cytoscape.js, vis.js, d3) or a graph attribute
 * (node-link, JGF, graphology).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { STYLE_BLOCK_NAME } from "../../../src/styles/index.js";
import {
    corpusFiles,
    fileInput,
    readCorpusFile,
    registerStyleFormat,
    STYLE_CORPUS,
    type StyleInput,
} from "../harness.js";

type Doc = Record<string, unknown>;

const decode = (bytes: Uint8Array): Doc => JSON.parse(new TextDecoder().decode(bytes)) as Doc;
const encode = (doc: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(doc));
const isObject = (v: unknown): v is Doc => typeof v === "object" && v !== null && !Array.isArray(v);

/** A file holding only a stylesheet, read together with its data file. */
const STYLE_ONLY = /(-cy-style\.json|\.cycss|cydesktop-.*-style\.json)$/;

/** The Cytoscape.js demos whose elements and stylesheet are separate files: the input name, data file, style file. */
const PAIRS: readonly (readonly [string, string, string])[] = [
    ["cyjs-colajs", "cyjs-colajs-data.json", "cyjs-colajs-cy-style.json"],
    ["cyjs-edge-arrows", "cyjs-edge-arrows-data.json", "cyjs-edge-arrows-cy-style.json"],
    ["cyjs-node-types", "cyjs-node-types-data.json", "cyjs-node-types-cy-style.json"],
    ["cyjs-tokyo-railways", "cyjs-tokyo-railways.json.gz", "cyjs-tokyo-railways.cycss"],
    ["cyjs-enrichment-map-desktop-style", "cyjs-enrichment-map.networks.json.gz", "cydesktop-em-style.json"],
];

/**
 * A Cytoscape.js document from a data file and a stylesheet file: the stylesheet as an array, a desktop export's
 * `style`, or CSS-like text.
 * @param data - the data file's bytes
 * @param style - the stylesheet file's bytes
 * @param css - whether the stylesheet is text
 * @returns the document
 */
function pairedDocument(data: Uint8Array, style: Uint8Array, css: boolean): Uint8Array {
    const parsed = JSON.parse(new TextDecoder().decode(data)) as unknown;
    const doc: Doc = isObject(parsed) ? { ...parsed } : { elements: parsed };
    if (css) {
        doc.style = new TextDecoder().decode(style);
    } else {
        const sheet = decode(style) as unknown;
        doc.style = isObject(sheet) ? sheet.style : sheet;
    }
    return encode(doc);
}

/**
 * The paired Cytoscape.js documents and the adversarial stylesheet sets, as inputs.
 * @returns the inputs
 */
function inputs(): StyleInput[] {
    const format = { name: "json" };
    const dir = join(STYLE_CORPUS, "json");
    const out: StyleInput[] = [];
    for (const [name, data, style] of PAIRS) {
        const bytes = pairedDocument(
            readCorpusFile(join(dir, data)).bytes,
            new Uint8Array(readFileSync(join(dir, style))),
            style.endsWith(".cycss"),
        );
        out.push(fileInput(format, `json/${name} (data and stylesheet)`, bytes, `${name}.json`));
    }
    const cyjs = join(STYLE_CORPUS, "cyjs");
    for (const rel of corpusFiles(cyjs).filter((r) => r.endsWith(".cyjs"))) {
        const bytes = new Uint8Array(readFileSync(join(cyjs, rel)));
        out.push(fileInput(format, `json/cyjs/${rel}`, bytes, "doc.json"));
    }
    return out;
}

/**
 * A written file with the first node's own fill changed in the dialect's native slot, as another program would
 * edit it: a Cytoscape.js bypass, graphology's `color`, vis.js's `color.background`. Node-link, d3 and JGF have no
 * native slot.
 * @param written - the file graphty wrote
 * @returns the edited file, or null when the dialect has no native slot
 */
export function editJsonNodeFill(written: Uint8Array): Uint8Array | null {
    const doc = decode(written);
    const next = (old: unknown): string => (old === "#123456" ? "#654321" : "#123456");
    const { elements } = doc;
    if (isObject(elements) && Array.isArray(elements.nodes) && isObject(elements.nodes[0])) {
        const node = elements.nodes[0];
        const style = isObject(node.style) ? node.style : {};
        node.style = { ...style, "background-color": next(style["background-color"]) };
        return encode(doc);
    }
    const { nodes } = doc;
    if (!Array.isArray(nodes) || !isObject(nodes[0])) {
        return null;
    }
    const node = nodes[0];
    if (isObject(doc.options) || isObject(doc.attributes)) {
        // graphology
        if (!isObject(node.attributes) || typeof node.attributes.color !== "string") {
            return null;
        }
        node.attributes.color = next(node.attributes.color);
        return encode(doc);
    }
    if (Array.isArray(doc.edges) && doc.edges.some((e) => isObject(e) && "from" in e) && isObject(node.color)) {
        // vis.js
        node.color = { ...node.color, background: next(node.color.background) };
        return encode(doc);
    }
    return null;
}

/**
 * A written file with its block replaced, wherever the dialect keeps it.
 * @param written - the file graphty wrote
 * @param change - the new block from the old one
 * @returns the changed file
 */
export function replaceJsonBlock(written: Uint8Array, change: (block: string) => string): Uint8Array {
    const doc = decode(written);
    const holders: unknown[] = [doc, doc.graph, doc.attributes, isObject(doc.graph) ? doc.graph.metadata : null];
    for (const holder of holders) {
        if (isObject(holder) && typeof holder[STYLE_BLOCK_NAME] === "string") {
            holder[STYLE_BLOCK_NAME] = change(holder[STYLE_BLOCK_NAME]);
        }
    }
    return encode(doc);
}

registerStyleFormat({
    name: "json",
    accepts: (rel) => !STYLE_ONLY.test(rel),
    inputs,
    writer: { format: "json", editNative: editJsonNodeFill, replaceBlock: replaceJsonBlock },
});
