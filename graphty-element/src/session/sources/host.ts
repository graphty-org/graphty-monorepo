/**
 * @file What the source load and expand code is handed by `session.data`: the ledger, the data
 * surface, and the session's dispatcher and events. Internal.
 */

import type { EdgeId, NodeId, SourceKey } from "../../catalog/types";
import type { SessionCommand } from "../planning";
import type { SessionEventMap } from "../types";
import type { SourceLedger } from "./ledger";
import type { SourceLoadRecord } from "./types";

/** One edge as the expand code reads it. */
export interface HostEdge {
    readonly id: EdgeId;
    readonly source: NodeId;
    readonly target: NodeId;
    readonly record: Readonly<Record<string, unknown>>;
}

/** Where a node is drawn, and whether a reader pinned it. */
export interface HostPlacement {
    /** Scene units; null while no layout has placed it. */
    readonly at: { readonly x: number; readonly y: number; readonly z: number } | null;
    readonly pinned: boolean;
}

/** The session pieces a source load or expansion works through. */
export interface SourceHost {
    /** The load records. */
    readonly ledger: SourceLedger;
    /** The keys of the records an opened project holds that have not run since it opened. */
    readonly pending: Set<string>;
    /** The data surface, which a credential store is attached to (see `credentialLookup`). */
    readonly owner: object;
    /** What expansions keep beside the graph: the ones running, and the rows each wrote. */
    readonly expansions: ExpansionState;
    /**
     * The load records the graph still holds rows of: `data.loads()`.
     * @returns the records, in load order
     */
    loads(): readonly SourceLoadRecord[];
    /**
     * The `data.sources()` entry that lists a load's rows.
     * @param load - the load's key
     * @returns the entry's key, or undefined when the graph lists none for it
     */
    sourceKeyOf(load: string): SourceKey | undefined;
    /**
     * The credential slot an opened project's load filled, as its file named it.
     * @param load - the load's key
     * @returns the slot, or undefined when the file named none
     */
    credentialSlotOf(load: string): string | undefined;
    /**
     * Dispatch a command through the session's dispatcher, as one undoable step.
     * @param command - the command
     * @returns what it settles with
     */
    dispatch(command: SessionCommand): Promise<unknown>;
    /**
     * Waits for every load asked for before this one to dispatch, for a load that holds a
     * place in line (`session.data.import`, `loadSample`); unset, or undefined, when none is ahead.
     * @returns the wait
     */
    waitTurn?(): Promise<void> | undefined;
    /**
     * Publish a session event.
     * @param event - its name
     * @param detail - what it carries
     */
    emit<K extends keyof SessionEventMap>(event: K, detail: SessionEventMap[K]): void;
    /**
     * A node's record, its id as the graph holds it.
     * @param id - the id, an integer id either way
     * @returns the record, or undefined
     */
    node(id: NodeId): (Readonly<Record<string, unknown>> & { readonly id: NodeId }) | undefined;
    /**
     * Every node id the graph holds.
     * @returns the ids
     */
    nodeIds(): readonly NodeId[];
    /**
     * Every edge the graph holds.
     * @returns the edges
     */
    edges(): readonly HostEdge[];
    /**
     * A node's neighbors, either direction.
     * @param id - the node
     * @returns their ids
     */
    neighborIds(id: NodeId): ReadonlySet<NodeId>;
    /**
     * Where a node is drawn.
     * @param id - the node
     * @returns its placement
     */
    placement(id: NodeId): HostPlacement;
    /**
     * Whether the graph's edges are directed.
     * @returns true when they are
     */
    directed(): boolean;
    /**
     * The attribute a node's name is read from: `data.knownFields.nodeLabelPath`.
     * @returns the path, or null for none
     */
    labelPath(): string | null;
    /**
     * Record units to scene units: `data.knownFields.positionScale`.
     * @returns the scale
     */
    positionScale(): number;
}

/** What one session's expansions keep beside the graph. */
export class ExpansionState {
    /** The expansion running for each seed, by `String(id)`, so a second click joins it. */
    readonly running = new Map<
        string,
        Promise<{ readonly nodes: number; readonly edges: number; readonly partial: boolean }>
    >();
    /** Each expansion's rows as it wrote them, by key then `String(node id)`: what tells an edit. */
    readonly written = new Map<string, Map<string, string>>();
}
