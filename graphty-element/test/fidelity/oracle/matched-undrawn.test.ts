/**
 * A position-matched drawing places the nodes the program's drawing does not show among their neighbours
 * (`placeUndrawn`), not where graphty's own layout left them.
 */
import { assert, describe, it } from "vitest";

import { placeUndrawn, type Pt } from "./primitives";

describe("placeUndrawn", () => {
    it("puts a node the drawing lacks at the middle of its placed neighbours, and one behind it after", () => {
        const placed = new Map<string, Pt>([
            ["a", [0, 0]],
            ["b", [10, 0]],
            ["c", [5, 10]],
        ]);
        const edges: [string, string][] = [
            ["hidden", "a"],
            ["b", "hidden"],
            ["hidden", "c"],
            ["behind", "hidden"],
            ["behind", "c"],
            ["leaf", "a"],
        ];
        const out = placeUndrawn(placed, ["a", "b", "c", "hidden", "behind", "leaf", "alone"], edges);
        assert.deepEqual(out.get("hidden"), [5, 10 / 3]);
        assert.deepEqual(out.get("behind"), [5, (10 / 3 + 10) / 2]);
        // one placed neighbour or none: left without a place (on its one neighbour it would cover it), and the placed
        // nodes are not moved
        assert.deepEqual([...out.keys()].sort(), ["behind", "hidden"]);
    });
});
