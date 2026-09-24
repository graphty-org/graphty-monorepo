/**
 * @file What the element has to say about a load, once the load is over.
 *
 * Three of the edge-model changes owe a consumer a number: which endpoint spelling was used, how
 * many repeated edges were seen and what the policy did with them, and how many edges the graph
 * actually holds. Before this there was nowhere to put any of them -- the load event's payload was
 * a chunk count and a format name -- and the one edge number the element did publish counted
 * records handed over rather than edges accepted, so it read 254 for a file that produced zero.
 */

import type { DuplicatePolicy } from "@graphty/graph-format";

import type { EndpointSpelling } from "./endpoints";

/** How many repeated edges a load saw, and what the policy did with them. */
export interface RepeatedEdgeCounts {
    /** Records that named an ordered pair the graph already held. */
    readonly seen: number;
    /** Repeats that became an edge of their own, which is every one of them under `keep`. */
    readonly kept: number;
    /** Repeats discarded without changing the edge already present. */
    readonly dropped: number;
    /** Repeats folded into the edge already present -- its weight, its attributes, or both. */
    readonly merged: number;
}

/** What the element did with one load, from the endpoint spelling to the final edge count. */
export interface ImportReport {
    /** The data source that read the file, or `"records"` for pushed data. */
    readonly format: string;
    /** Which record keys named the endpoints, and how that was decided. */
    readonly endpoints: {
        /** Which spelling answered, or `"declared"` when the caller named the columns. */
        readonly resolvedFrom: EndpointSpelling;
        /** The JMESPath expression the source endpoint was read with. */
        readonly source: string;
        /** The JMESPath expression the target endpoint was read with. */
        readonly target: string;
    };
    /** The numbers that used to be one, and disagreed. */
    readonly counts: {
        /** Nodes the graph holds after the load. */
        readonly nodes: number;
        /** Edges the graph holds after the load. */
        readonly edges: number;
        /**
         * Node records handed over, which is fewer than {@link nodes} when an edge named an
         * endpoint the file never declared as a node of its own.
         */
        readonly nodeRecords: number;
        /** Edge records handed over, however many of them became edges. */
        readonly edgeRecords: number;
        /** Records whose endpoint ids the store would not take, so they became no edge at all. */
        readonly rejected: number;
    };
    /** What happened to the records that named a pair the graph already held. */
    readonly repeated: RepeatedEdgeCounts;
    /** The repeat policy that was in force. */
    readonly policy: DuplicatePolicy;
    /** Where each edge's weight came from. */
    readonly weights: {
        /** `"path"` for the configured key, `"legacy"` for the `value` fallback, `"none"` for neither. */
        readonly resolvedFrom: "path" | "legacy" | "none";
        /** The record key weights were read from, or null when no record carried one. */
        readonly attribute: string | null;
    };
}

/**
 * The mutable tally a load keeps while it runs, before it is frozen into an {@link ImportReport}.
 *
 * Separate from the report itself because the report is what a consumer reads and must not be
 * writable, while the load needs somewhere to count.
 */
export interface ImportTally {
    /** Node records handed over. */
    nodeRecords: number;
    /** Edge records handed over. */
    edgeRecords: number;
    /** Records whose endpoint ids the store would not take. */
    rejected: number;
    /** Records naming a pair the graph already held. */
    repeatedSeen: number;
    /** Repeats that became an edge of their own. */
    repeatedKept: number;
    /** Repeats discarded. */
    repeatedDropped: number;
    /** Repeats folded into an existing edge. */
    repeatedMerged: number;
    /** How the last record that carried a weight was read. */
    weightsResolvedFrom: "path" | "legacy" | "none";
    /** The record key that weight came from. */
    weightsAttribute: string | null;
}

/**
 * A fresh, zeroed tally.
 * @returns the tally
 */
export function newImportTally(): ImportTally {
    return {
        nodeRecords: 0,
        edgeRecords: 0,
        rejected: 0,
        repeatedSeen: 0,
        repeatedKept: 0,
        repeatedDropped: 0,
        repeatedMerged: 0,
        weightsResolvedFrom: "none",
        weightsAttribute: null,
    };
}

/** Everything a tally cannot know about itself: who loaded what, and what the graph holds now. */
interface ImportReportContext {
    /** The data source that read the file, or `"records"` for pushed data. */
    readonly format: string;
    /** The endpoint expressions the load resolved. */
    readonly endpoints: ImportReport["endpoints"];
    /** The repeat policy in force. */
    readonly policy: DuplicatePolicy;
    /** Nodes the graph holds now. */
    readonly nodes: number;
    /** Edges the graph holds now. */
    readonly edges: number;
}

/**
 * Freeze one load's tally and its context into the report a consumer reads.
 * @param tally - what the load counted
 * @param context - who loaded what, and what the graph holds now
 * @returns the frozen report
 */
export function sealImportReport(tally: ImportTally, context: ImportReportContext): ImportReport {
    return Object.freeze({
        format: context.format,
        endpoints: Object.freeze({ ...context.endpoints }),
        counts: Object.freeze({
            nodes: context.nodes,
            edges: context.edges,
            nodeRecords: tally.nodeRecords,
            edgeRecords: tally.edgeRecords,
            rejected: tally.rejected,
        }),
        repeated: Object.freeze({
            seen: tally.repeatedSeen,
            kept: tally.repeatedKept,
            dropped: tally.repeatedDropped,
            merged: tally.repeatedMerged,
        }),
        policy: context.policy,
        weights: Object.freeze({
            resolvedFrom: tally.weightsResolvedFrom,
            attribute: tally.weightsAttribute,
        }),
    });
}
