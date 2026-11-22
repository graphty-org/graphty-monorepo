/**
 * @file What an algorithm reads its graph through: a session's data surface.
 *
 * An algorithm needs four things from the graph it runs on -- the store's snapshot and its
 * undirected view, a node's record, the weight the graph was loaded with, and the acceleration
 * controller -- plus the session its option columns are read from. {@link AlgorithmHost} names
 * exactly those. The element's `Graph` is one; `algorithmHostOf` makes one from a session
 * with no element behind it, so an algorithm runs on a headless session too.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: every import is a type or a session module.
 */

import type { DerivedGraph, GraphSnapshot } from "@graphty/graph-format";

import { AccelerationController } from "../acceleration/AccelerationController";
import type { NodeId } from "../catalog/types";
import { GraphtyError } from "../errors";
import { accelerationOfSession, storeOfSession } from "../session/dispatchers";
import type { GraphSession } from "../session/types";
import type { WeightReads } from "./input/weight";

/** The data members an algorithm reads: the store, and the record of one node. */
export interface AlgorithmData {
    /**
     * The current snapshot, the store's own.
     * @returns The snapshot.
     */
    getSnapshot(): GraphSnapshot;
    /**
     * The undirected view of a snapshot the store produced.
     * @param snapshot - The snapshot.
     * @returns The derived graph.
     */
    undirected(snapshot: GraphSnapshot): DerivedGraph;
    /**
     * One node's record, under `data`.
     * @param id - The node id.
     * @returns The node, or undefined.
     */
    getNode(id: NodeId): { readonly data: Readonly<Record<string, unknown>> } | undefined;
    /** What the last load read, of which an algorithm reads only the weight column. */
    readonly lastImport: { readonly weights: { readonly attribute: string | null } } | null;
}

/** The known fields an algorithm reads from the data configuration. */
interface AlgorithmKnownFields {
    readonly nodeLabelPath: string | null;
    readonly edgeWeightMeaning: WeightReads | null;
}

/**
 * What an algorithm runs on: the element's `Graph`, or a headless session through
 * `algorithmHostOf`.
 */
export interface AlgorithmHost {
    /**
     * The data the run reads.
     * @returns The data members.
     */
    getDataManager(): AlgorithmData;
    /** Where accelerable work is placed. */
    readonly acceleration: Pick<AccelerationController, "run" | "policy" | "accelerator">;
    /**
     * The session the run's option columns and loaded weight are read from.
     * @returns The session.
     */
    getSession(): GraphSession;
    /** The data configuration's known fields, when the host carries a configuration. */
    readonly styles?: { readonly config: { readonly data: { readonly knownFields: AlgorithmKnownFields } } };
}

const hosts = new WeakMap<GraphSession, AlgorithmHost>();

/**
 * The host an algorithm runs on over a session: its store, its records, its configuration and
 * its acceleration controller. One per session, so a run's derived inputs are cached once.
 * @param session - A session built by `createGraphSession`.
 * @returns The host.
 * @throws A `GraphtyError` with `E_UNSUPPORTED`, on reading `acceleration`, when the session's
 *   controller was handed in and is not the element's own, which an algorithm cannot place work
 *   through.
 */
export function algorithmHostOf(session: GraphSession): AlgorithmHost {
    const known = hosts.get(session);
    if (known !== undefined) {
        return known;
    }

    // Built on first use, so constructing an algorithm over a session reads nothing yet.
    let data: AlgorithmData | undefined;
    const dataOf = (): AlgorithmData => (data ??= storeWithRecords(storeOfSession(session), session));

    const host: AlgorithmHost = {
        getDataManager: dataOf,
        get acceleration() {
            const controller = accelerationOfSession(session);
            if (!(controller instanceof AccelerationController)) {
                throw new GraphtyError({
                    code: "E_UNSUPPORTED",
                    message: "An algorithm places its work through the element's own acceleration controller.",
                    source: "run",
                });
            }
            return controller;
        },
        getSession: () => session,
        styles: {
            get config() {
                return session.config;
            },
        },
    };
    hosts.set(session, host);
    return host;
}

/**
 * The session's store, as an algorithm reads it: every member the store's own (its snapshot, its
 * undirected view, its lane, its load report), and a node's record read from the session's data.
 * @param store - The session's store.
 * @param session - The session, whose records `getNode` reads.
 * @returns The data members.
 */
function storeWithRecords(store: object, session: GraphSession): AlgorithmData {
    const getNode: AlgorithmData["getNode"] = (id) => {
        const record = session.data.node(id);
        return record === undefined ? undefined : { data: record };
    };

    return new Proxy(store, {
        get(target, key) {
            if (key === "getNode") {
                return getNode;
            }
            const value: unknown = Reflect.get(target, key, target);
            // Bound to the store, whose private fields a method reads.
            return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
        },
    }) as AlgorithmData;
}

/**
 * Whatever an algorithm was handed, as a host.
 * @param graph - A host, or a session.
 * @returns The host.
 */
export function asAlgorithmHost(graph: AlgorithmHost | GraphSession): AlgorithmHost {
    return "getDataManager" in graph ? graph : algorithmHostOf(graph);
}
