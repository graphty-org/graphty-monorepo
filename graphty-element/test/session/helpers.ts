import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { EdgeId } from "../../src/catalog/types";
import { DataConfig } from "../../src/config/DataConfig";
import { GraphStore } from "../../src/data/GraphStore";
import {
    type GraphSession,
    type SessionAttributes,
    type SessionDataConfig,
    type SessionRunsOptions,
} from "../../src/session";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { edgeSpaceOf } from "../../src/session/scope/ScopeApi";
import { ingestEdge, ingestNode } from "../helpers/rawIngest";

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
        if (
            snapshot.ids.idOf(snapshot.edgeSource(edge)) === source &&
            snapshot.ids.idOf(snapshot.edgeTarget(edge)) === target
        ) {
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
     * Push more records in beneath the session, as a write its history does not record: straight
     * into the store and the record maps, then {@link Harness.touch}.
     * @param nodes - node records
     * @param edges - edge records
     */
    add(nodes: readonly NodeRow[], edges?: readonly EdgeRow[]): void;
    /**
     * Say that the rows or the records changed beneath the session: the store drops its snapshot
     * and the graph token moves, as it does for every write the element makes.
     */
    touch(): void;
}

/**
 * Build a session over a store a test can feed.
 *
 * The harness hands the session its store and record source, so a test can also write raw rows
 * straight into the store with `add`, outside history and the command path, as a fixture that
 * only needs a graph to exist. A test about loading uses `session.data.import` instead.
 * @param options - the direction policy, the data configuration and how runs are executed
 * @returns the harness
 */
export function makeSession(
    options: {
        directed?: boolean | "auto";
        config?: SessionDataConfig;
        runs?: SessionRunsOptions;
        /** The history clock and queue, for a test that drives them itself. */
        internals?: Parameters<typeof createElementSession>[1];
    } = {},
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

    const sessionOptions = {
        store,
        records: {
            nodeAttributes: (index: number) => nodeAttributes.get(index),
            edgeAttributes: (index: number) => edgeAttributes.get(index),
        },
        config: { data: config },
        ...(options.runs === undefined ? {} : { runs: options.runs }),
    };
    // The element's own form: a harness hands in its store and record source, which the published
    // options do not take.
    const session = createElementSession(sessionOptions, options.internals ?? {});

    const touch = (): void => {
        store.recordsChanged();
        dispatcherOf(session).graph.retoken();
    };

    return {
        session,
        store,
        nodeAttributes,
        edgeAttributes,
        touch,
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

            touch();
        },
    };
}

/**
 * Load one of the GEXF corpus files into a harness's session, through `session.data.import`, so
 * the file's declared direction is applied exactly as the element applies it.
 *
 * A real dataset rather than a hand-built fixture, because the questions these sessions answer --
 * how many components, is it weighted, what would a metric cost -- are questions about a graph's
 * shape, and a four-node fixture has no shape to be wrong about.
 * @param harness - The harness to load into.
 * @param file - The file name inside `test/helpers/corpus/gexf`.
 * @returns Nothing; the harness holds the graph when it resolves.
 */
export async function loadGexfCorpus(harness: Harness, file: string): Promise<void> {
    const data = readFileSync(join(__dirname, "..", "helpers", "corpus", "gexf", file), "utf-8");
    await harness.session.data.import({ type: "gexf", config: { data } });
}

/**
 * Run `work` with strict state off, as a consumer runs: the strict checks every other test runs
 * under (test/setup.ts) walk the store and history on every write by design, so a counted-work
 * test that left them on would count work no consumer does. Strict state is read when a store,
 * draft or manager is created, so wrap everything that creates one -- for a scaling test, the
 * whole measured run. The previous setting comes back when `work` returns, throws or settles.
 * @param work - The work; a promise it returns is awaited before strict state comes back.
 * @returns What `work` returns.
 */
export function withConsumerStrictState<T>(work: () => T): T {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    const strict = scope.__GRAPHTY_STRICT_STATE__;
    const restore = (): void => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    };
    scope.__GRAPHTY_STRICT_STATE__ = false;
    let result: T;
    try {
        result = work();
    } catch (error) {
        restore();
        throw error;
    }
    if (result instanceof Promise) {
        return result.finally(restore) as T;
    }
    restore();
    return result;
}
