/**
 * @file The element's own one-pass layouts are built on the snapshot contract a plugin registers
 * through (`registerSnapshotLayout`), so a plugin layout reaches everything a built-in does.
 */
import "../../src/layout";

import { assert, describe, it } from "vitest";

import { LayoutEngine } from "../../src/layout/LayoutEngine";
import { SnapshotLayoutEngine } from "../../src/layout/SnapshotLayoutEngine";

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
