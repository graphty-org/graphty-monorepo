import {
    capabilities,
    checkCapabilities,
    checkExport,
    type CommonExportOptions,
    defineLineFormat,
    encodeChunks,
    type ExporterStyleOptions,
    exportGraphToString,
    type GraphExporter,
    type GraphSnapshot,
    importGraph,
    joinText,
    registry,
    resolveExportOptions,
} from "@graphty/graph-io";

// "colors": lines "node <id> <css color>" and "edge <source> <target>"
const reader = defineLineFormat({
    format: "colors",
    extensions: [".colors"],
    // the third argument is the whole line, for a value with spaces in it ("rgb(0 128 0)")
    parseLine([kind, a = "", b = ""], graph, line) {
        if (kind === "node") {
            const color = line.trim().split(/\s+/).slice(2).join(" ");
            graph.node(a, color === "" ? {} : { color });
        } else {
            graph.edge(a, b);
        }
    },
});
// a line format's importer takes a styles member like any other importer
registry.registerImporter({ ...reader, styles: () => ({ dialect: "css", node: { fill: { data: "color" } } }) });

// the exporter's options: graph-io's common ones plus the styles the caller passed
type Options = CommonExportOptions & ExporterStyleOptions;
const caps = capabilities({ multiEdges: true, selfLoops: true, edgeIds: "none", idCharset: "any" });
function* lines(g: GraphSnapshot, options?: Options): Generator<string> {
    const fill = options?.styles?.picture("node", "fill"); // one value per node, null where it has none
    for (let i = 0; i < g.nodeCount; i++) {
        const color = fill?.[i]; // a node with no fill is written with no color, not a made-up one
        const written = color == null ? "" : " " + String(color);
        yield `node ${String(g.ids.idOf(i))}${written}\n`;
    }
    for (let e = 0; e < g.edgeCount; e++) {
        yield `edge ${String(g.ids.idOf(g.edgeSource(e)))} ${String(g.ids.idOf(g.edgeTarget(e)))}\n`;
    }
}
const writer: GraphExporter<Options> = {
    format: "colors",
    extensions: [".colors"],
    mimeTypes: [],
    capabilities: caps,
    check: (g, options) => checkCapabilities(g, caps, resolveExportOptions(options), { attributes: false }),
    export: (g, options) => encodeChunks(lines(g, options)),
    exportToString: (g, options) => joinText(lines(g, options)),
    // node fill goes into the format's own slot; there is nowhere to keep the rules for graphty
    styles: { capabilities: { node: ["fill"], edge: [], block: "none" } },
};
registry.registerExporter(writer);

const { snapshot, styles } = await importGraph("node a red\nnode b rgb(0 128 0)\nedge a b\n", {
    format: "colors",
    styles: true,
});
console.log(await exportGraphToString(snapshot, "colors", { styles }));
console.log(checkExport(snapshot, "colors", { styles }).map((n) => n.code));
