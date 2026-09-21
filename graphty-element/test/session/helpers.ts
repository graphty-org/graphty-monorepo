import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { EdgeId } from "../../src/catalog/types";
import { DataConfig } from "../../src/config/DataConfig";
import { GEXFDataSource } from "../../src/data/GEXFDataSource";
import { GraphStore } from "../../src/data/GraphStore";
import { ingestDeclaredDirection, ingestEdge, ingestNode } from "../../src/data/ingest";
import {
    createGraphSession,
    type GraphSession,
    type SessionAttributes,
    type SessionDataConfig,
    type SessionRunsOptions,
} from "../../src/session";
import { edgeSpaceOf } from "../../src/session/scope/ScopeApi";

/** One node record as a test writes it: an id plus whatever else it wants to say. */
export interface NodeRow {
    /** The node id. */
    id: string | number;
    /** Any other keys the record carries. */
    [attribute: string]: unknown;
}

/**
 * One edge record as a test writes it, or as an importer hands one over.
 *
 * Both endpoint spellings are accepted for the same reason the element accepts both: the importers
 * write `source`/`target`, and the hand-written fixtures in these files were all written as
 * `src`/`dst`. `source`/`target` wins where a record carries both, which is the element's own
 * probe order.
 */
export interface EdgeRow {
    /** The source node id, as the importers and the ecosystem spell it. */
    source?: string | number;
    /** The target node id. */
    target?: string | number;
    /** The source node id, as the hand-written fixtures here spell it. */
    src?: string | number;
    /** The target node id. */
    dst?: string | number;
    /** The edge weight; 1 when absent. */
    weight?: number;
    /** Any other keys the record carries. */
    [attribute: string]: unknown;
}

/**
 * The element-assigned id of the edge running from one node to another.
 *
 * Tests name an edge the way a reader thinks of one -- "the edge from a to b" -- while the element
 * identifies it by its own counter, which is what lets two edges run between the same pair. This
 * resolves the one to the other THROUGH the session's own edge identity space, so a test that used
 * to hard-code `"a:b"` still reads as a sentence and now also proves the counter is reachable from
 * the endpoints.
 * @param harness - the session under test
 * @param source - the node the edge leaves
 * @param target - the node the edge enters
 * @returns the edge id
 * @throws An Error when no edge runs between those two nodes, because a test that names an edge
 *     the graph does not hold is a broken test rather than an empty selection.
 */
export function edgeBetween(harness: Harness, source: string | number, target: string | number): EdgeId {
    const snapshot = harness.session.data.snapshot();
    const space = edgeSpaceOf(snapshot);
    for (let edge = 0; edge < snapshot.edgeCount; edge++) {
        if (snapshot.ids.idOf(snapshot.edgeSource(edge)) === source && snapshot.ids.idOf(snapshot.edgeTarget(edge)) === target) {
            return space.idOf(edge);
        }
    }

    throw new Error(`No edge runs from ${String(source)} to ${String(target)} in this graph.`);
}

/** A session, the store behind it, and the record bags the session reads attributes from. */
export interface Harness {
    /** The session under test. */
    session: GraphSession;
    /** The store the session was handed, so a test can add more data after the fact. */
    store: GraphStore;
    /** Attribute bags by dense node index, which is what the record source reads. */
    nodeAttributes: Map<number, SessionAttributes>;
    /** Attribute bags by dense edge index. */
    edgeAttributes: Map<number, SessionAttributes>;
    /**
     * Push more records in, exactly the way the data manager does.
     * @param nodes - node records
     * @param edges - edge records
     */
    add(nodes: readonly NodeRow[], edges?: readonly EdgeRow[]): void;
}

/**
 * Build a session over a store a test can feed.
 *
 * A session with no store of its own builds one, but nothing can put records into that store
 * yet -- `data.import` does not exist -- so a test that wants data hands the store in, and
 * ingests through the same two functions the data manager uses.
 * @param options - the direction policy, the data configuration and how runs are executed
 * @returns the harness
 */
export function makeSession(
    options: { directed?: boolean | "auto"; config?: SessionDataConfig; runs?: SessionRunsOptions } = {},
): Harness {
    // ONE configuration for both halves. A store told one thing and a session told another is the
    // bug this exists to make impossible: the session would report a graph as undirected while the
    // snapshot behind it was frozen directed, and nothing would say so.
    const config: SessionDataConfig = options.config ?? DataConfig.parse({ directed: options.directed ?? "auto" });
    const store = new GraphStore({
        directed: config.directed,
        positionScale: () => config.knownFields.positionScale,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });

    const nodeAttributes = new Map<number, SessionAttributes>();
    const edgeAttributes = new Map<number, SessionAttributes>();

    const session = createGraphSession({
        store,
        records: {
            nodeAttributes: (index) => nodeAttributes.get(index),
            edgeAttributes: (index) => edgeAttributes.get(index),
        },
        config: { data: config },
        ...(options.runs === undefined ? {} : { runs: options.runs }),
    });

    return {
        session,
        store,
        nodeAttributes,
        edgeAttributes,
        add(nodes: readonly NodeRow[], edges: readonly EdgeRow[] = []): void {
            for (const row of nodes) {
                const { index } = ingestNode(store, row.id, row);
                const { id: _id, ...rest } = row;
                nodeAttributes.set(index, rest);
            }

            for (const row of edges) {
                const { index } = ingestEdge(store, row.source ?? row.src, row.target ?? row.dst, row.weight ?? 1);
                const { src: _src, dst: _dst, source: _source, target: _target, ...rest } = row;
                edgeAttributes.set(index, rest);
            }
        },
    };
}

/**
 * Load one of the GEXF corpus files into a harness, through the data source the element itself
 * parses that format with.
 *
 * A real dataset rather than a hand-built fixture, because the questions these sessions answer --
 * how many components, is it weighted, what would a metric cost -- are questions about a graph's
 * shape, and a four-node fixture has no shape to be wrong about.
 * @param harness - The harness to load into.
 * @param file - The file name inside `test/helpers/corpus/gexf`.
 * @returns Nothing; the harness holds the graph when it resolves.
 */
export async function loadGexfCorpus(harness: Harness, file: string): Promise<void> {
    const path = join(__dirname, "..", "helpers", "corpus", "gexf", file);
    const source = new GEXFDataSource({ data: readFileSync(path, "utf-8") });

    for await (const chunk of source.getData()) {
        // What the data manager does with every import, in the same place it does it: the file's
        // own declared direction reaches the builder before that chunk's edges do. Without this the
        // harness would read a file that says it is undirected as a digraph, and every count,
        // density and metric availability measured here would be measured on the wrong graph.
        if (source.declaredDirection !== null) {
            ingestDeclaredDirection(harness.store, source.declaredDirection.directed, source.declaredDirection.statedBy);
        }

        harness.add(
            chunk.nodes.map((node) => node as unknown as NodeRow),
            chunk.edges.map((edge) => edge as unknown as EdgeRow),
        );
    }
}
