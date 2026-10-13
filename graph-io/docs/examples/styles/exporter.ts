import { readFile } from "node:fs/promises";

import type { AttributeTable } from "@graphty/graph-format";
import {
    capabilities,
    checkExport,
    exportGraphToString,
    type GraphSnapshot,
    importGraph,
    registry,
} from "@graphty/graph-io";

// A writer of your own that writes every attribute: node-link JSON, with the graph's attributes under "graph"
const row = (t: AttributeTable, i: number): object => Object.fromEntries(t.names().map((n) => [n, t.value(n, i)]));
function write(g: GraphSnapshot): string {
    const id = (i: number): unknown => g.ids.idOf(i);
    const nodes = Array.from({ length: g.nodeCount }, (_, i) => ({ ...row(g.nodes, i), id: id(i) }));
    const links = Array.from({ length: g.edgeCount }, (_, e) => ({
        ...row(g.edges, e),
        source: id(g.edgeSource(e)),
        target: id(g.edgeTarget(e)),
    }));
    return JSON.stringify({ directed: g.directed, multigraph: true, graph: row(g.graph, 0), nodes, links });
}

registry.registerExporter({
    format: "links",
    extensions: [".links"],
    mimeTypes: [],
    capabilities: capabilities({ graphAttributes: true }), // it writes graph attributes
    check: () => [],
    async *export(g) {
        yield new TextEncoder().encode(write(g));
    },
    exportToString: async (g) => write(g),
    // the whole style support: graph-io adds the styles as attributes, which write() already writes
    styles: { capabilities: { node: [], edge: [], block: "attributes" } },
});

const { snapshot, styles } = await importGraph(await readFile("teams.gv"), { styles: true });
if (styles) {
    // other programs see no styles in this format; graphty gets the same rules back
    const codes = new Set(checkExport(snapshot, "links", { styles }).map((n) => n.code));
    console.log([...codes]);
    const text = await exportGraphToString(snapshot, "links", { styles });
    const back = await importGraph(text, { format: "json", styles: true });
    console.log(
        back.styles?.styles.rules.map((r) => r.id).join(" ") === styles.styles.rules.map((r) => r.id).join(" "),
    );
}
