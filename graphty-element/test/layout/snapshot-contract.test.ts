/**
 * @file The element's own one-pass layouts are built on the snapshot contract a plugin registers
 * through (`registerSnapshotLayout`), so a plugin layout reaches everything a built-in does.
 */
import "../../src/layout";

import type { F32 } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { LayoutEngine, layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { SnapshotLayoutEngine, type SnapshotLayoutInput } from "../../src/layout/SnapshotLayoutEngine";
import type { Node } from "../../src/Node";

/** Every layout the element ships that places the graph in one pass rather than stepping it. */
const STATIC_LAYOUTS = [
    "arf",
    "bfs",
    "bipartite",
    "circular",
    "fixed",
    "grid",
    "kamada-kawai",
    "multipartite",
    "planar",
    "radial",
    "random",
    "shell",
    "spectral",
    "spiral",
];

/** The layouts the element steps frame by frame, which the one-pass contract does not cover. */
const LIVE_LAYOUTS = ["d3", "forceatlas2", "ngraph", "spring", "spring-electrical"];

describe("the element's own layouts on the snapshot contract", () => {
    it("runs every built-in one-pass layout through the snapshot contract", () => {
        for (const type of STATIC_LAYOUTS) {
            const engine = LayoutEngine.getClass(type);
            assert.isNotNull(engine, `"${type}" is registered`);
            assert.isTrue(engine.prototype instanceof SnapshotLayoutEngine, `"${type}" is a snapshot layout`);
        }
    });

    it("leaves no built-in unaccounted for", () => {
        const builtIn = LayoutEngine.getRegisteredTypes().filter((type) => !type.startsWith("test-"));
        assert.sameMembers(builtIn, [...STATIC_LAYOUTS, ...LIVE_LAYOUTS]);
    });
});

/** An asynchronous line, x = 10 per row, counting how often it is asked. */
class AsyncLine extends SnapshotLayoutEngine {
    static override type = "test-direct-async-line";
    static maxDimensions = 2;
    protected readonly dimensions = 2 as const;
    protected readonly options = {};
    calls = 0;

    protected compute(input: SnapshotLayoutInput): Promise<F32> {
        this.calls++;
        const out = new Float32Array(2 * input.graph.nodeCount);
        for (let row = 0; row < input.graph.nodeCount; row++) {
            out[2 * row] = 10 * (row + 1);
        }

        return Promise.resolve(out);
    }
}

describe("an asynchronous snapshot layout driven without an element", () => {
    it("publishes its answer and settles, asking once", async () => {
        const nodes = ["a", "b", "c"].map((id) => ({ id, index: -1 }) as unknown as Node);
        const edges = [{ srcId: "a", dstId: "b", srcNode: nodes[0], dstNode: nodes[1] }] as unknown as Edge[];
        const layout = new AsyncLine({});
        layoutEngineInternals.addNodes(layout, nodes);
        layoutEngineInternals.addEdges(layout, edges);

        for (let i = 0; i < 5; i++) {
            layout.getNodePosition(nodes[0]);
            await Promise.resolve();
        }

        assert.isTrue(layout.isSettled);
        assert.strictEqual(layout.calls, 1);
        assert.deepStrictEqual(layout.getNodePosition(nodes[2]), { x: 30, y: 0, z: 0 });
    });
});
