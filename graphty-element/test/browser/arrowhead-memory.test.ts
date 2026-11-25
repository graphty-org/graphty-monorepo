/**
 * @file Arrowheads on every edge, counted (issue #10027): what they draw and what their buffers hold.
 *
 * Giving every edge of a 1,000,000-node graph an arrowhead crashed the renderer after 45-50 seconds.
 * What an arrowed edge costs comes in two parts, and this file counts both on each render path:
 *
 * - On batched, an arrowed edge is drawn as an `Edge` object of its own (about 1.4-1.8 KB of JS heap
 *   each), so how many there are is what bounds that memory: at most `limits.objectEdges`, past which
 *   an edge is drawn as a plain line with `W_OBJECT_CAP`.
 * - On both paths, each cap is a slot in an `ArrowCapBatch`: a 4x4 matrix and the billboard values,
 *   26 floats (104 bytes) in Float32Arrays. Those are ArrayBuffers outside the JS heap, so
 *   `performance.memory` never sees them: they are counted here from the batches themselves. A batch
 *   doubles when full, so up to twice that is allocated.
 *
 * The heap each path's per-edge cost adds, measured, is in `arrowhead-memory.bench.test.ts`.
 */
import { afterEach, assert, describe, it } from "vitest";

import { DEFAULT_LIMITS } from "../../src/session/limits";
import { arrowCost, capBuffers } from "../helpers/arrowhead-load";

/** Floats one cap slot holds: a 4x4 matrix and the billboard shader's 3 + 1 + 4 + 1 + 1. */
const FLOATS_PER_CAP = 16 + 10;

/** The most cap buffer bytes an arrowed edge may hold: one slot, allowing for a batch that just doubled. */
const CAP_BYTES_PER_EDGE = 2 * FLOATS_PER_CAP * Float32Array.BYTES_PER_ELEMENT;

afterEach(() => {
    document.body.replaceChildren();
});

describe("arrowheads on every edge, counted", () => {
    for (const path of ["objects", "batched"] as const) {
        it(`draw one cap an edge and hold at most ${String(CAP_BYTES_PER_EDGE)} buffer bytes for it, ${path}`, async () => {
            const edges = 20_000;
            const { before, after, element } = await arrowCost(path, 2_000, edges, capBuffers);

            assert.strictEqual(before.caps, 0, "no caps before the arrowheads");
            assert.strictEqual(after.caps, edges, "one cap an edge");
            const perEdge = (after.bytes - before.bytes) / edges;
            assert.isAtMost(perEdge, CAP_BYTES_PER_EDGE, "cap buffer bytes an edge");

            const { pulledEdges, objectEdges } = element.rowCounts;
            assert.strictEqual(pulledEdges + objectEdges, edges, "every edge is drawn");
            assert.isAtMost(
                objectEdges,
                DEFAULT_LIMITS.objectEdges,
                "arrowed edges drawn as objects stay within objectEdges",
            );
            if (path === "batched") {
                assert.strictEqual(objectEdges, edges, "every arrowed edge is an object on batched");
            }
        });
    }
});
