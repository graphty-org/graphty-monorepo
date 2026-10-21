/**
 * The Les Miserables co-appearance network for tests, read from graph-samples' build output
 * (`graph-samples/dist/data/v1/`, the file graphty.app publishes) instead of downloaded, so a test
 * never touches the network. Build graph-samples first (nx does).
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import { lesMiserables as fetchLesMiserables } from "@graphty/graph-samples/datasets/les-miserables";

/** The network as an edge list: node ids by index, and each edge's endpoints and weight. */
export interface EdgeListSample {
    readonly directed: boolean;
    readonly nodeCount: number;
    readonly ids: readonly string[];
    readonly src: Uint32Array;
    readonly dst: Uint32Array;
    readonly weights: Float32Array | undefined;
}

/**
 * The file's bytes: served by the test server in a browser, read from disk in Node.
 * @returns the response holding the gzipped snapshot.
 */
async function local(): Promise<Response> {
    const inNode = typeof process !== "undefined" && typeof process.versions.node === "string";
    if (!inNode) {
        const served = await import("../../../graph-samples/dist/data/v1/les-miserables.gsnp.gz?url");
        // The test server sends a .gz file with `Content-Encoding: gzip`, so the browser hands back
        // the unzipped bytes, and the loader's own gunzip failed on them ("Failed to fetch"):
        // zip them again when they arrive unzipped.
        const bytes = new Uint8Array(await (await fetch(served.default)).arrayBuffer());
        const zipped = bytes[0] === 0x1f && bytes[1] === 0x8b;
        return new Response(zipped ? bytes : new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")));
    }
    const { readFile } = await import("node:fs/promises");
    return new Response(
        await readFile(new URL("../../../graph-samples/dist/data/v1/les-miserables.gsnp.gz", import.meta.url)),
    );
}

/**
 * The snapshot as an edge list.
 * @param snapshot - the snapshot.
 * @returns the edge list.
 */
function edgeList(snapshot: GraphSnapshot): EdgeListSample {
    const src = new Uint32Array(snapshot.edgeCount);
    const dst = new Uint32Array(snapshot.edgeCount);
    const weights = snapshot.weights === null ? undefined : new Float32Array(snapshot.edgeCount);
    for (let e = 0; e < snapshot.edgeCount; e++) {
        src[e] = snapshot.edgeSource(e);
        dst[e] = snapshot.edgeTarget(e);
        if (weights !== undefined && snapshot.weights !== null) {
            weights[e] = snapshot.weights[snapshot.edgeToArc[e] ?? 0] ?? 1;
        }
    }
    const ids = Array.from({ length: snapshot.nodeCount }, (_, i) => String(snapshot.ids.idOf(i)));
    return { directed: snapshot.directed, nodeCount: snapshot.nodeCount, ids, src, dst, weights };
}

/**
 * Les Miserables: 77 characters (node ids are the names), 254 weighted co-appearances.
 * @returns the network as an edge list.
 */
export async function lesMiserables(): Promise<EdgeListSample> {
    return edgeList(await fetchLesMiserables({ fetch: local }));
}
