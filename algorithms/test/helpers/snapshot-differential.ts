/**
 * The checksummed fixture the port suites run on: a snapshot frozen with FNV-1a checksums over its
 * core arrays, so a test can assert with `snapshot.validate({ checksum: true })` that the port wrote
 * into no shared view.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { Graph } from "./legacy-graph.js";
import { toSnapshot } from "./to-snapshot.js";

/**
 * The same checksummed fixture a port test needs: freeze once, run the port, assert nothing moved.
 * @param graph - The fixture graph to freeze
 * @returns A checksummed snapshot
 */
export function checksummedSnapshot(graph: Graph): GraphSnapshot {
    return toSnapshot(graph, { checksum: true });
}
