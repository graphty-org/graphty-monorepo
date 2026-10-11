/**
 * The Cytoscape.js stylesheet sets (`test/corpus/styles/cyjs/`), read by graph-io's Cytoscape.js style engine: the
 * graph through graph-io's JSON importer, the styles from the stylesheet the file carries.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { jsonImporter } from "../../../src/formats/json/index.js";
import { createRegistry } from "../../../src/registry.js";
import { cytoscapeJsStyles } from "../../../src/styles/index.js";
import type { GraphImporter } from "../../../src/types.js";
import { importForStyles, type LoadedGraph, registerStyleFormat } from "../harness.js";

/**
 * An importer's `styles()` that reads a Cytoscape.js document's stylesheet with graph-io's engine.
 * @param doc - the document
 * @param doc.elements - its elements
 * @param doc.style - its stylesheet
 * @param snapshot - the graph read from its elements
 * @returns the `styles()` member
 */
function cyjsReader(
    doc: { readonly elements: unknown; readonly style: unknown },
    snapshot: GraphSnapshot,
): NonNullable<GraphImporter["styles"]> {
    return (_s, context) =>
        cytoscapeJsStyles({ elements: doc.elements, style: doc.style, snapshot, budget: context.budget });
}

/**
 * Reads a Cytoscape.js document: its elements through the JSON importer, its stylesheet through the engine.
 * @param bytes - the document
 * @returns the graph as read
 */
export async function loadCyjs(bytes: Uint8Array): Promise<LoadedGraph> {
    const doc = JSON.parse(new TextDecoder().decode(bytes)) as { elements: unknown; style: unknown };
    const graph = new TextEncoder().encode(JSON.stringify({ elements: doc.elements }));
    const read = await importForStyles(createRegistry(), "json", graph);
    const importer: GraphImporter = Object.create(jsonImporter, {
        styles: { value: cyjsReader(doc, read.snapshot) },
    }) as GraphImporter;
    return { snapshot: read.snapshot, importer, report: read.report };
}

registerStyleFormat({
    name: "cyjs",
    accepts: (rel) => rel.endsWith(".cyjs"),
    load: (_name, bytes) => loadCyjs(bytes),
});
