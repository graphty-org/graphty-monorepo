import type { GraphSnapshot } from "@graphty/graph-format";

import type { WorkingView } from "../session/working/view.js";
import { GraphtyLogger } from "./GraphtyLogger.js";

/**
 * Diagnostic records for how a layout follows the working graph: what it was built over, which
 * engine and driver ran, and how many nodes it laid out. Off unless logging is configured with the
 * "diag" module (or "*") at debug level; nothing here changes what the layout does.
 */
export const layoutDiag = GraphtyLogger.getLogger(["graphty", "diag", "layout"]);

const ids = new WeakMap<object, number>();
let nextId = 1;

/**
 * A small stable number for a snapshot, so that two records can say whether they saw the same one.
 * @param snapshot - The snapshot, or null.
 * @returns Its number, or null.
 */
export function snapshotId(snapshot: GraphSnapshot | null | undefined): number | null {
    if (snapshot === null || snapshot === undefined) {
        return null;
    }

    let id = ids.get(snapshot);
    if (id === undefined) {
        id = nextId++;
        ids.set(snapshot, id);
    }

    return id;
}

/**
 * What a working view covers, in counts and snapshot numbers.
 * @param view - The view; null for the whole graph.
 * @returns A plain record for a log line.
 */
export function viewSummary(view: WorkingView | null | undefined): Record<string, unknown> | "whole" {
    if (view === null || view === undefined) {
        return "whole";
    }

    return {
        graph: snapshotId(view.graph),
        graphNodes: view.graph.nodeCount,
        graphEdges: view.graph.edgeCount,
        shownNodes: view.nodeCount,
        shownEdges: view.edgeCount,
        whole: view.whole,
    };
}
