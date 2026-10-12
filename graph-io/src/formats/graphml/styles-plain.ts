/**
 * GraphML styles: which program wrote the file, and its styles read the way that program draws them. yEd and
 * yFiles 3 keep their graphics in nested XML (styles-yed.ts, styles-yfiles3.ts); Gephi writes plain `r`, `g`, `b`
 * and `size` keys; Cytoscape's GraphML export writes no visual properties at all and is recognized by its `SUID`
 * and `shared name` keys. A GraphML file from any other writer has no styles: a key named like a style (`color`)
 * stays data, and no program's defaults are added.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { canonColor } from "../../styles/canon/color.js";
import { canonNumber } from "../../styles/canon/number.js";
import { canonText } from "../../styles/canon/text.js";
import { blockStyles, parseStyleBlock, STYLE_BLOCK_NAME } from "../../styles/io/block.js";
import { StyleNotes } from "../../styles/notes.js";
import { styleFingerprint } from "../../styles/plan/features.js";
import { plainCell, resolveStyles } from "../../styles/plan/resolve.js";
import type { ImporterStyles, StyleReadContext, StyleTarget } from "../../styles/types.js";
import { gephiRules } from "../gexf/styles.js";
import {
    exactFromBlock,
    readYedStyles,
    type ValueColumns,
    valueColumns,
    type YedRead,
    yfilesColumns,
} from "./styles-yed.js";
import { readYfiles3Styles } from "./styles-yfiles3.js";

/** Gephi's color and size keys. */
const GEPHI_COLUMNS: readonly string[] = ["r", "g", "b", "size"];

/**
 * Whether a table has Gephi's `r`, `g` and `b` columns.
 * @param table - the node or edge table
 * @returns true when all three are there
 */
function hasRgb(table: GraphSnapshot["nodes"]): boolean {
    return table.has("r") && table.has("g") && table.has("b");
}

/**
 * Gephi's styles: `r`, `g`, `b` as the fill of a node and the color of an edge, `size` as a node's width and
 * height, and `label` as the label.
 * @param snapshot - the graph
 * @param notes - where problems are noted
 * @param context - the work budget
 * @returns the values
 */
function readGephi(
    snapshot: GraphSnapshot,
    notes: StyleNotes,
    context: StyleReadContext,
): { node: ValueColumns; edge: ValueColumns } {
    const read = (target: StyleTarget): ValueColumns => {
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const out = valueColumns(n);
        const rgb = hasRgb(table);
        const size = target === "node" && table.has("size");
        const label = table.has("label");
        for (let i = 0; i < n; i++) {
            context.budget.spend(target, 1);
            const at = (property: string): Parameters<typeof canonNumber>[1] => ({
                notes,
                target,
                property,
                element: i,
                budget: context.budget,
            });
            if (rgb) {
                const [r, g, b] = ["r", "g", "b"].map((c) => plainCell(table.value(c, i)));
                if (r !== null && g !== null && b !== null) {
                    const property = target === "node" ? "fill" : "color";
                    out.put(i, property, canonColor({ r, g, b }, "gephi", at(property))?.color ?? null);
                }
            }
            if (size) {
                const v = canonNumber(plainCell(table.value("size", i)), at("width"));
                out.put(i, "width", v);
                out.put(i, "height", v);
            }
            if (label) {
                out.put(i, "label", canonText(plainCell(table.value("label", i)), at("label")));
            }
        }
        return out.values;
    };
    return { node: read("node"), edge: read("edge") };
}

/**
 * For a file graphty wrote: the yEd values that are only what the writer writes for the `graphty.styles` block's own
 * values read as the block's values (see exactFromBlock()). A block that does not parse or describes another graph
 * changes nothing; graph-io then ignores it with a note.
 * @param snapshot - the graph
 * @param yed - the values read from the yEd graphics, changed in place
 */
function exactFromGraphtyBlock(snapshot: GraphSnapshot, yed: YedRead): void {
    const text = snapshot.graph.has(STYLE_BLOCK_NAME) ? plainCell(snapshot.graph.value(STYLE_BLOCK_NAME, 0)) : null;
    if (typeof text !== "string") {
        return;
    }
    const parsed = parseStyleBlock(text, styleFingerprint(snapshot));
    const ex = parsed.ok ? blockStyles(parsed.block, snapshot, "graphml") : null;
    if (ex === null) {
        return;
    }
    exactFromBlock(
        yed,
        (target, property) => resolveStyles(ex, target, property as never, snapshot),
        { node: snapshot.nodeCount, edge: snapshot.edgeCount },
        new StyleNotes(),
    );
}

/**
 * The styles of a GraphML file, read the way the program that wrote it draws them, with that program's defaults
 * beneath: yEd's and yFiles 3's nested graphics, Gephi's `r`, `g`, `b` and `size` keys, or, for Cytoscape's export,
 * Cytoscape's default style with each node labeled by its `name`. A file from any other writer has none.
 * @param snapshot - the graph the import built
 * @param context - the work budget
 * @returns the styles, or null when no writer with styles is recognized
 */
export function graphmlStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles | null {
    const notes = new StyleNotes();
    const readFrom = { node: yfilesColumns(snapshot.nodes), edge: yfilesColumns(snapshot.edges) };
    const yfiles3 = readYfiles3Styles(snapshot, notes, context.budget);
    if (yfiles3 !== null) {
        return {
            canonical: true,
            dialect: "yfiles3",
            tool: "yfiles3",
            units: "px",
            node: { values: yfiles3.node },
            edge: { values: yfiles3.edge },
            notes: notes.list(),
            readFrom,
        };
    }
    const yed = readYedStyles(snapshot, notes, context.budget);
    if (yed !== null) {
        exactFromGraphtyBlock(snapshot, yed);
        return {
            canonical: true,
            dialect: "yed",
            tool: "yed",
            units: "px",
            node: { values: yed.node },
            edge: { values: yed.edge },
            notes: notes.list(),
            opacityInColor: true,
            readFrom,
        };
    }
    if (hasRgb(snapshot.nodes)) {
        const gephi = readGephi(snapshot, notes, context);
        const { rules, columns } = gephiRules(
            snapshot,
            gephi.node.fill,
            gephi.edge.color,
            context.budget,
            gephi.edge.width,
        );
        const used = (table: GraphSnapshot["nodes"]): string[] => GEPHI_COLUMNS.filter((c) => table.has(c));
        return {
            canonical: true,
            dialect: "gephi",
            tool: "gephi",
            units: "relative",
            node: { values: gephi.node },
            edge: { values: gephi.edge, rules, columns },
            notes: notes.list(),
            readFrom: { node: used(snapshot.nodes), edge: used(snapshot.edges) },
        };
    }
    if (snapshot.nodes.has("SUID") && snapshot.nodes.has("shared name")) {
        // Cytoscape writes no visual properties into GraphML; its default style labels each node with its name
        const label = valueColumns(snapshot.nodeCount);
        if (snapshot.nodes.has("name")) {
            for (let i = 0; i < snapshot.nodeCount; i++) {
                label.put(
                    i,
                    "label",
                    canonText(plainCell(snapshot.nodes.value("name", i)), {
                        notes,
                        target: "node",
                        property: "label",
                        element: i,
                        budget: context.budget,
                    }),
                );
            }
        }
        return {
            canonical: true,
            dialect: "cytoscape",
            tool: "cytoscape",
            units: "px",
            node: { values: label.values },
            edge: { values: {} },
            notes: notes.list(),
        };
    }
    return null;
}
