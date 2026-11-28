/**
 * @file A staged source read as the graph adding it would make (design
 * design/data/multiple-data-sources-design.md, section 5.1), behind the `source-steps` experiment:
 * what a filter made for it lists and counts while it waits. Pure, and free of Babylon.js, Lit and
 * the DOM.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";

import type { AttributeDescriptor } from "../../../catalog/types";
import { describeRows } from "../../attributes";
import type { FilterValueSource } from "../../visibility/filter";
import { isStaged, tableRows } from "./build";
import { columnsOf, numberedKey } from "./profile";
import { buildOf, type Copies, copyMap, EMPTY_STEPS, type SourceSteps } from "./project";
import type { BuiltElement } from "./types";

/** A staged source as a graph of its own. */
export interface WaitingGraph {
    readonly graph: GraphSnapshot;
    /** Its elements' values, by the graph's rows. */
    readonly values: FilterValueSource;
}

const graphs = new WeakMap<SourceSteps, Map<string, WaitingGraph>>();

/**
 * A staged source as the graph adding it alone would make.
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @param id - The source.
 * @returns It, or undefined for a source that is not staged.
 */
export function waitingGraph(value: SourceSteps, copies: Copies, id: string): WaitingGraph | undefined {
    const src = value.sources[id] as SourceSteps["sources"][string] | undefined;
    if (src === undefined || !isStaged(value, id)) {
        return undefined;
    }
    const held = graphs.get(value) ?? new Map<string, WaitingGraph>();
    graphs.set(value, held);
    const made = held.get(id) ?? madeOf(src, copies);
    held.set(id, made);
    return made;
}

/**
 * A source's own graph.
 * @param src - The source.
 * @param copies - The rows as read.
 * @returns It.
 */
function madeOf(src: SourceSteps["sources"][string], copies: Copies): WaitingGraph {
    const alone: SourceSteps = {
        ...EMPTY_STEPS,
        sources: { [src.id]: src },
        steps: [{ op: "join.add", source: src.id }],
    };
    const result = buildOf(alone, copies);
    const nodes = [...result.nodes.values()];
    const edges = [...result.edges.values()];
    const builder = new GraphBuilder({ directed: true });
    nodes.forEach((n) => builder.addNode(n.id));
    edges.forEach((e) => builder.addEdge(e.from, e.to));
    const read = (el: BuiltElement | undefined, path: string): unknown =>
        path === "id" ? el?.key : el?.values[path.startsWith("data.") ? path.slice("data.".length) : path];
    return {
        graph: builder.freeze(),
        values: {
            nodeValue: (index, path) => read(nodes[index], path),
            edgeValue: (index, path) => (path === "id" ? undefined : read(edges[index], path)),
        },
    };
}

/**
 * The columns of a staged source's rows, described as they will be once it is added.
 * @param value - The sources and steps.
 * @param copies - The rows as read.
 * @param id - The source.
 * @returns The columns, none for a source that is not staged.
 */
export function waitingColumns(value: SourceSteps, copies: Copies, id: string): readonly AttributeDescriptor[] {
    const src = value.sources[id] as SourceSteps["sources"][string] | undefined;
    if (src === undefined || !isStaged(value, id)) {
        return [];
    }
    return (["nodes", "edges"] as const).flatMap((table) => {
        const rows = src.mapping[table] === undefined ? null : tableRows(src, copyMap(copies), table);
        if (rows === null) {
            return [];
        }
        const own = columnsOf(rows, numberedKey(src));
        const bare = rows.map((row) => Object.fromEntries(own.map((name) => [name, row[name] ?? undefined])));
        return [...describeRows(bare, table === "nodes" ? "node" : "edge", own)];
    });
}
