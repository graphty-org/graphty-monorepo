/**
 * A format made for the harness's round trip: node-link JSON whose exporter writes each node's fill into a `fill`
 * attribute (its own style slot), the `graphty.styles` block as a graph attribute and the tagged values as element
 * attributes (`block: "attributes"`), and whose importer reads the `fill` attribute back through the simple path.
 * It exercises the whole exporter contract before any built-in format writes styles.
 */

import { jsonExporter, jsonImporter } from "../../../src/formats/json/index.js";
import { createRegistry, type FormatRegistry } from "../../../src/registry.js";
import { type ExporterStyleOptions, STYLE_BLOCK_NAME } from "../../../src/styles/index.js";
import type { GraphExporter, GraphImporter } from "../../../src/types.js";
import { registerStyleFormat, type StyleInput } from "../harness.js";
import { rolesInputs } from "./roles.js";

const FORMAT = "styled-json";

/**
 * The snapshot an export writes: each node's fill, as graphty draws it, in the `fill` attribute.
 * @param snapshot - the graph with the block and tagged values added
 * @param options - the export options
 * @returns the graph to write
 */
function withFill(
    snapshot: Parameters<GraphExporter["export"]>[0],
    options: unknown,
): Parameters<GraphExporter["export"]>[0] {
    const styles = (options as ExporterStyleOptions | undefined)?.styles;
    if (styles === undefined) {
        return snapshot;
    }
    const out = snapshot.withColumns();
    out.nodes.set(
        "fill",
        styles.picture("node", "fill").map((v) => (v === null ? null : String(v))),
        { dtype: "string" },
    );
    return out;
}

/**
 * The options without `styles`, as the JSON exporter takes them.
 * @param options - the options
 * @returns the rest
 */
function plain(options: unknown): Record<string, unknown> {
    const { styles: _styles, ...rest } = (options ?? {}) as Record<string, unknown>;
    return rest;
}

const exporter: GraphExporter = {
    format: FORMAT,
    capabilities: jsonExporter.capabilities,
    styles: { capabilities: { node: ["fill"], edge: [], block: "attributes" } },
    check: (s, o) => jsonExporter.check(s, plain(o)),
    export: (s, o) => jsonExporter.export(withFill(s, o), plain(o)),
    exportToString: (s, o) => jsonExporter.exportToString(withFill(s, o), plain(o)),
};

const importer: GraphImporter = Object.create(jsonImporter, {
    format: { value: FORMAT },
    styles: { value: () => ({ dialect: "css", node: { fill: { data: "fill" } } }) },
}) as GraphImporter;

/**
 * A registry holding the format's importer and exporter beside the built-in ones.
 * @returns the registry
 */
function registry(): FormatRegistry {
    return createRegistry().registerImporter(importer).registerExporter(exporter);
}

/** A written file as JSON. */
interface NodeLink {
    graph: Record<string, unknown>;
    nodes: Record<string, unknown>[];
}

const decode = (bytes: Uint8Array): NodeLink => JSON.parse(new TextDecoder().decode(bytes)) as NodeLink;
const encode = (doc: NodeLink): Uint8Array => new TextEncoder().encode(JSON.stringify(doc));

registerStyleFormat({
    name: FORMAT,
    corpus: false,
    inputs: (): StyleInput[] =>
        rolesInputs()
            .filter((input) => !input.name.endsWith("-0"))
            .map((input) => ({ ...input, name: input.name.replace("roles/", `${FORMAT}/`) })),
    writer: {
        format: FORMAT,
        registry,
        editNative: (written) => {
            const doc = decode(written);
            const node = doc.nodes.find((x) => typeof x.fill === "string");
            if (node === undefined) {
                return null;
            }
            node.fill = node.fill === "#123456" ? "#654321" : "#123456";
            return encode(doc);
        },
        replaceBlock: (written, change) => {
            const doc = decode(written);
            doc.graph[STYLE_BLOCK_NAME] = change(String(doc.graph[STYLE_BLOCK_NAME]));
            return encode(doc);
        },
    },
});
