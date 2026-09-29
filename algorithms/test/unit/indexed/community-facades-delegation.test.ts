/**
 * `kCoreDecomposition` and `girvanNewman` must call their `indexed.*` ports on a plain undirected
 * graph. Their differential test cannot see this, because the old code gives the same answer.
 */

import { describe, expect, it, vi } from "vitest";

import { girvanNewman } from "../../../src/algorithms/community/girvan-newman.js";
import { kCoreDecomposition } from "../../../src/clustering/k-core.js";
import { Graph } from "../../../src/core/graph.js";
import { girvanNewman as indexedGirvanNewman } from "../../../src/indexed/girvan-newman.js";
import { kCoreDecomposition as indexedKCoreDecomposition } from "../../../src/indexed/k-core.js";

vi.mock("../../../src/indexed/girvan-newman.js", async (importOriginal) => {
    const mod = await importOriginal<typeof import("../../../src/indexed/girvan-newman.js")>();
    return { ...mod, girvanNewman: vi.fn(mod.girvanNewman) };
});
vi.mock("../../../src/indexed/k-core.js", async (importOriginal) => {
    const mod = await importOriginal<typeof import("../../../src/indexed/k-core.js")>();
    return { ...mod, kCoreDecomposition: vi.fn(mod.kCoreDecomposition) };
});

function square(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("c", "d");
    g.addEdge("d", "a");
    return g;
}

describe("community facades call their ports", () => {
    it("kCoreDecomposition runs indexed.kCoreDecomposition", () => {
        kCoreDecomposition(square());
        expect(vi.mocked(indexedKCoreDecomposition)).toHaveBeenCalledTimes(1);
    });

    it("girvanNewman runs indexed.girvanNewman", () => {
        girvanNewman(square());
        expect(vi.mocked(indexedGirvanNewman)).toHaveBeenCalledTimes(1);
    });
});
