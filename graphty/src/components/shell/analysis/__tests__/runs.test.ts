import { describe, expect, it, vi } from "vitest";

import { type ElementGraph, type ElementNodeLike, repaintStyles } from "../elementBridge";
import { readDegreeResults, runCommunityDetection, runDegreePass } from "../runs";

/** A node the stub can write results onto. */
interface StubNode {
    /** The node's id. */
    id: number | string;
    /** Nested `algorithmResults.<namespace>.<type>.<name>`, written by the stub's runs. */
    algorithmResults?: Record<string, unknown>;
}

/** What a stub run writes, standing in for the real algorithms. */
interface StubPlan {
    /** Degree per node id, as `DegreeAlgorithm` would compute it. */
    readonly degrees?: Readonly<Record<string, number>>;
    /** Whether the stub writes degreePct, as the real pass does. */
    readonly writeDegreePct?: boolean;
    /** Community id per node id, as `LouvainAlgorithm` would assign it. */
    readonly communities?: Readonly<Record<string, number>>;
    /** Modularity, as the edited `LouvainAlgorithm` publishes it. Omitted writes none. */
    readonly modularity?: unknown;
    /** A groupCount graph result that deliberately disagrees with the node assignments. */
    readonly storedGroupCount?: number;
}

/** The stub and the calls a test wants to see. */
interface Stub {
    /** The graph under test. */
    readonly graph: ElementGraph;
    /** Every (namespace, type) pair the caller ran, in order. */
    readonly runs: [string, string][];
    /** How many times the node repaint ran. */
    readonly nodeRepaints: () => number;
    /** How many times the edge repaint ran. */
    readonly edgeRepaints: () => number;
}

/**
 * Writes a nested value, the way the element's `deepSet` does.
 * @param root - the object to write into.
 * @param path - the keys to walk, creating objects as needed.
 * @param value - the value to set at the end of the path.
 */
function writePath(root: Record<string, unknown>, path: readonly string[], value: unknown): void {
    let current = root;
    for (let index = 0; index < path.length - 1; index++) {
        const key = path[index];
        const next = current[key];
        if (typeof next !== "object" || next === null) {
            current[key] = {};
        }

        current = current[key] as Record<string, unknown>;
    }

    current[path[path.length - 1]] = value;
}

/**
 * An element graph whose `runAlgorithm` writes exactly the results the real degree and
 * Louvain algorithms write -- per-node values under `algorithmResults`, graph-level
 * values under the data manager's `graphResults`.
 * @param ids - the node ids the graph holds.
 * @param plan - what a run should write.
 * @returns the stub.
 */
function makeStub(ids: (number | string)[], plan: StubPlan): Stub {
    const nodes: StubNode[] = ids.map((id) => ({ id }));
    const graphResults: Record<string, unknown> = {};
    const runs: [string, string][] = [];
    const applyStylesToExistingNodes = vi.fn();
    const applyStylesToExistingEdges = vi.fn();

    /**
     * Writes the degree pass's results.
     */
    function runDegree(): void {
        const degrees = plan.degrees ?? {};
        const maxDegree = Math.max(0, ...Object.values(degrees));
        writePath(graphResults, ["graphty", "degree", "maxDegree"], maxDegree);

        for (const node of nodes) {
            const degree = degrees[String(node.id)];
            if (degree === undefined) {
                continue;
            }

            node.algorithmResults ??= {};
            writePath(node.algorithmResults, ["graphty", "degree", "degree"], degree);
            if (plan.writeDegreePct !== false) {
                writePath(
                    node.algorithmResults,
                    ["graphty", "degree", "degreePct"],
                    maxDegree > 0 ? degree / maxDegree : 0,
                );
            }
        }
    }

    /**
     * Writes the community run's results, node ids then the two graph results the
     * edited LouvainAlgorithm publishes.
     */
    function runLouvain(): void {
        const communities = plan.communities ?? {};
        for (const node of nodes) {
            const communityId = communities[String(node.id)];
            if (communityId === undefined) {
                continue;
            }

            node.algorithmResults ??= {};
            writePath(node.algorithmResults, ["graphty", "louvain", "communityId"], communityId);
        }

        const groupCount = plan.storedGroupCount ?? new Set(Object.values(communities)).size;
        writePath(graphResults, ["graphty", "louvain", "groupCount"], groupCount);
        if ("modularity" in plan) {
            writePath(graphResults, ["graphty", "louvain", "modularity"], plan.modularity);
        }
    }

    const graph: ElementGraph = {
        runAlgorithm: (namespace, type) => {
            runs.push([namespace, type]);
            if (type === "degree") {
                runDegree();
            } else if (type === "louvain") {
                runLouvain();
            }

            return Promise.resolve();
        },
        getNodes: () => nodes as readonly ElementNodeLike[],
        getDataManager: () => ({
            graphResults,
            applyStylesToExistingNodes,
            applyStylesToExistingEdges,
        }),
        getStyleManager: () => ({
            addLayer: () => undefined,
            getLayers: () => [],
            removeLayerByIndex: () => false,
        }),
    };

    return {
        graph,
        runs,
        nodeRepaints: () => applyStylesToExistingNodes.mock.calls.length,
        edgeRepaints: () => applyStylesToExistingEdges.mock.calls.length,
    };
}

describe("runDegreePass", () => {
    it("runs graphty:degree and reads the readings back highest degree first", async () => {
        const stub = makeStub(["a", "b", "c"], { degrees: { a: 2, b: 9, c: 5 } });

        const results = await runDegreePass(stub.graph);

        expect(stub.runs).toEqual([["graphty", "degree"]]);
        expect(results.byDegreeDescending.map((reading) => reading.id)).toEqual(["b", "c", "a"]);
        expect(results.degreesDescending).toEqual([9, 5, 2]);
        expect(results.maxDegree).toBe(9);
    });

    it("breaks ties by node id, so the ranking is the same on every run", async () => {
        const stub = makeStub(["zeta", "alpha", "mid"], { degrees: { zeta: 4, alpha: 4, mid: 4 } });

        const results = await runDegreePass(stub.graph);

        expect(results.byDegreeDescending.map((reading) => reading.id)).toEqual(["alpha", "mid", "zeta"]);
    });

    it("reads numeric node ids as strings", async () => {
        const stub = makeStub([1, 2], { degrees: { 1: 3, 2: 8 } });

        const results = await runDegreePass(stub.graph);

        expect(results.byDegreeDescending).toEqual([
            { id: "2", degree: 8, degreePct: 1 },
            { id: "1", degree: 3, degreePct: 3 / 8 },
        ]);
    });
});

describe("readDegreeResults", () => {
    it("reads a pass that already ran without running another one", async () => {
        const stub = makeStub(["a", "b"], { degrees: { a: 1, b: 4 } });
        await runDegreePass(stub.graph);

        const again = readDegreeResults(stub.graph);

        expect(stub.runs).toHaveLength(1);
        expect(again.degreesDescending).toEqual([4, 1]);
    });

    it("returns nothing at all before a pass has run", () => {
        const stub = makeStub(["a", "b"], { degrees: { a: 1, b: 4 } });

        const results = readDegreeResults(stub.graph);

        expect(results.byDegreeDescending).toEqual([]);
        expect(results.maxDegree).toBe(0);
        expect(results.degreesDescending).toEqual([]);
    });

    it("skips a node the pass did not reach rather than reading it as degree zero", async () => {
        const stub = makeStub(["a", "b", "unmeasured"], { degrees: { a: 2, b: 1 } });

        const results = await runDegreePass(stub.graph);

        expect(results.byDegreeDescending.map((reading) => reading.id)).toEqual(["a", "b"]);
    });

    it("derives degreePct from the readings when the element did not publish one", async () => {
        const stub = makeStub(["a", "b"], { degrees: { a: 10, b: 5 }, writeDegreePct: false });

        const results = await runDegreePass(stub.graph);

        expect(results.byDegreeDescending.map((reading) => reading.degreePct)).toEqual([1, 0.5]);
    });
});

describe("runCommunityDetection", () => {
    it("runs graphty:louvain and reads the cat fixture's four groups back, largest first", async () => {
        const stub = makeStub(["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10"], {
            communities: {
                n1: 0,
                n2: 0,
                n3: 0,
                n4: 0,
                n5: 1,
                n6: 1,
                n7: 1,
                n8: 2,
                n9: 2,
                n10: 3,
            },
            modularity: 0.4471,
        });

        const result = await runCommunityDetection(stub.graph);

        expect(stub.runs).toEqual([["graphty", "louvain"]]);
        expect(result.groupCount).toBe(4);
        expect(result.largestGroupSize).toBe(4);
        expect(result.nodeCount).toBe(10);
        expect(result.modularity).toBe(0.4471);
        expect(result.groups).toEqual([
            { communityId: 0, size: 4 },
            { communityId: 1, size: 3 },
            { communityId: 2, size: 2 },
            { communityId: 3, size: 1 },
        ]);
    });

    it("orders equal-sized groups by community id, so the encoding is deterministic", async () => {
        const stub = makeStub(["a", "b", "c", "d", "e", "f"], {
            communities: { a: 5, b: 5, c: 1, d: 1, e: 3, f: 3 },
            modularity: 0.2,
        });

        const result = await runCommunityDetection(stub.graph);

        expect(result.groups.map((group) => group.communityId)).toEqual([1, 3, 5]);
    });

    it("reports no modularity at all when the element did not publish one", async () => {
        const stub = makeStub(["a", "b"], { communities: { a: 0, b: 1 } });

        const result = await runCommunityDetection(stub.graph);

        expect(result.modularity).toBeUndefined();
        expect("modularity" in result).toBe(false);
        expect(result.groupCount).toBe(2);
    });

    it("reports no modularity when the published value is not a finite number", async () => {
        const nan = makeStub(["a", "b"], { communities: { a: 0, b: 1 }, modularity: Number.NaN });
        const text = makeStub(["a", "b"], { communities: { a: 0, b: 1 }, modularity: "0.5" });

        expect((await runCommunityDetection(nan.graph)).modularity).toBeUndefined();
        expect((await runCommunityDetection(text.graph)).modularity).toBeUndefined();
    });

    it("takes the group count from the grouped nodes, not from the stored count", async () => {
        const stub = makeStub(["a", "b", "c"], {
            communities: { a: 0, b: 0, c: 1 },
            storedGroupCount: 99,
            modularity: 0.31,
        });

        const result = await runCommunityDetection(stub.graph);

        expect(result.groupCount).toBe(2);
    });

    it("covers only the nodes the run assigned a group", async () => {
        const stub = makeStub(["a", "b", "skipped"], { communities: { a: 0, b: 0 }, modularity: 0.1 });

        const result = await runCommunityDetection(stub.graph);

        expect(result.nodeCount).toBe(2);
        expect(result.groups).toEqual([{ communityId: 0, size: 2 }]);
    });

    it("reports an empty result for a graph with no assignments", async () => {
        const stub = makeStub([], {});

        const result = await runCommunityDetection(stub.graph);

        expect(result).toEqual({ groupCount: 0, largestGroupSize: 0, nodeCount: 0, groups: [] });
    });
});

describe("repaintStyles against the same stub", () => {
    it("calls both applyStylesToExisting doors exactly once", () => {
        const stub = makeStub(["a"], {});

        repaintStyles(stub.graph);

        expect(stub.nodeRepaints()).toBe(1);
        expect(stub.edgeRepaints()).toBe(1);
    });
});
