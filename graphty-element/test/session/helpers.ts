import { DataConfig } from "../../src/config/DataConfig";
import { GraphStore } from "../../src/data/GraphStore";
import { ingestEdge, ingestNode } from "../../src/data/ingest";
import {
    createGraphSession,
    type GraphSession,
    type SessionAttributes,
    type SessionDataConfig,
    type SessionRunsOptions,
} from "../../src/session";

/** One node record as a test writes it: an id plus whatever else it wants to say. */
export interface NodeRow {
    /** The node id. */
    id: string | number;
    /** Any other keys the record carries. */
    [attribute: string]: unknown;
}

/** One edge record as a test writes it. */
export interface EdgeRow {
    /** The source node id. */
    src: string | number;
    /** The target node id. */
    dst: string | number;
    /** The edge weight; 1 when absent. */
    weight?: number;
    /** Any other keys the record carries. */
    [attribute: string]: unknown;
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
                const index = ingestEdge(store, row.src, row.dst, row.weight ?? 1);
                const { src: _src, dst: _dst, ...rest } = row;
                edgeAttributes.set(index, rest);
            }
        },
    };
}
