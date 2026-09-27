/**
 * @file Every snapshot a scoped run hands an accelerator is released exactly once, and never while
 * a run still computes over it (design/sets/sets-design.md section 10.3). Device memory is not
 * garbage collected, so a derived input the cache forgets without releasing is a leak on the GPU,
 * and one it releases under a running kernel is a use-after-free.
 *
 * The shared fake accelerator records what it was handed (`uploaded`) beside what it was told to
 * free (`release`); the runs go through `accelerated()`, the seam a real adapter uses.
 */

import { accelerated } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { BFSAlgorithm } from "../../../src/algorithms/BFSAlgorithm";
import { ConnectedComponentsAlgorithm } from "../../../src/algorithms/ConnectedComponentsAlgorithm";
import { DijkstraAlgorithm } from "../../../src/algorithms/DijkstraAlgorithm";
import { derivedInputsOf, type ResolvedInputScope, withRunInput } from "../../../src/algorithms/input/ScopedInput";
import { KruskalAlgorithm } from "../../../src/algorithms/KruskalAlgorithm";
import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { detachedRunContext } from "../../../src/algorithms/results";
import type { Graph } from "../../../src/Graph";
import { createFakeAccelerator, type FakeAccelerator } from "../../../src/testing/fakeAccelerator";
import { InputGraph } from "./harness";

/** A PageRank-shaped test algorithm that computes over its scope through `accelerated()`. */
class ScopedRank extends Algorithm {
    static namespace = "test";
    static type = "scoped-rank";
    static scopeInput = "subgraph" as const;

    run(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Upload the input, then let the test act while the run still holds it.
     * @param during - What happens mid-run.
     * @returns The snapshot the accelerator was handed.
     */
    async rank(during: (snapshot: GraphSnapshot) => Promise<void> | void = () => undefined): Promise<GraphSnapshot> {
        const { run } = this.accelerated("pageRank", "directed");
        const { value } = await run(async (dispatch, snapshot) => {
            await dispatch.pageRank(snapshot);
            await during(snapshot);
            return snapshot;
        });

        return value;
    }
}

/** A ring of twelve, with a fake accelerator attached. */
function setup(): { graph: InputGraph; fake: FakeAccelerator } {
    const ids = Array.from({ length: 12 }, (_, index) => `n${String(index)}`);
    const graph = new InputGraph(
        ids,
        ids.map((id, index) => [id, ids[(index + 1) % ids.length], 1] as const),
    );
    const fake = createFakeAccelerator();
    graph.acceleration.setAccelerator(fake);

    return { graph, fake };
}

/**
 * One scoped run, as `AlgorithmManager` makes it.
 * @param graph - The graph.
 * @param scope - The run's scope.
 * @param during - What happens mid-run.
 * @returns The snapshot it computed over.
 */
function scopedRun(graph: InputGraph, scope: () => ResolvedInputScope, during?: (snapshot: GraphSnapshot) => Promise<void> | void): Promise<GraphSnapshot> {
    const algorithm = new ScopedRank(graph.asGraph());

    return withRunInput(algorithm, graph, scope, undefined, () => algorithm.rank(during));
}

/**
 * Close the books as a teardown would, then compare what was uploaded with what was released.
 * @param graph - The graph.
 * @param fake - Its accelerator.
 */
function assertBalanced(graph: InputGraph, fake: FakeAccelerator): void {
    derivedInputsOf(graph).dispose();
    const uploaded = new Set(fake.calls.uploaded);
    const released = fake.calls.release;

    assert.isAbove(uploaded.size, 0);
    assert.strictEqual(new Set(released).size, released.length, "nothing is released twice");
    assert.sameMembers([...released], [...uploaded], "every upload is released, and nothing else is");
}

describe("uploaded equals released", () => {
    it("across repeated scoped runs: one upload, served again from the cache", async () => {
        const { graph, fake } = setup();
        const scope = graph.scope(["n0", "n1", "n2", "n3"]);
        for (let run = 0; run < 3; run++) {
            await scopedRun(graph, () => scope);
        }

        assert.strictEqual(new Set(fake.calls.uploaded).size, 1, "a repeated scope hands the accelerator the same snapshot");
        assert.lengthOf(fake.calls.release, 0, "still cached, so still resident");
        assertBalanced(graph, fake);
    });

    it("across re-freezes: the input of a snapshot that has gone is released", async () => {
        const { graph, fake } = setup();
        await scopedRun(graph, () => graph.scope(["n0", "n1", "n2"]));
        const first = fake.calls.uploaded[0];

        graph.add([`x0`]);
        derivedInputsOf(graph).freeze();
        assert.include(fake.calls.release, first, "released at the freeze");

        await scopedRun(graph, () => graph.scope(["n0", "n1", "n2"]));
        graph.add([`x1`]);
        // No freeze hook this time: the next run notices the snapshot moved.
        await scopedRun(graph, () => graph.scope(["n0", "n1", "n2"]));

        assert.strictEqual(new Set(fake.calls.uploaded).size, 3);
        assertBalanced(graph, fake);
    });

    it("across two overlapping scoped runs", async () => {
        const { graph, fake } = setup();
        let letGo = (): void => undefined;
        const gate = new Promise<void>((resolve) => {
            letGo = resolve;
        });
        let arrived = 0;
        let allThere = (): void => undefined;
        const there = new Promise<void>((resolve) => {
            allThere = resolve;
        });
        const hold = (): Promise<void> => {
            arrived++;
            if (arrived === 3) {
                allThere();
            }

            return gate;
        };
        const one = scopedRun(graph, () => graph.scope(["n0", "n1", "n2"]), hold);
        const two = scopedRun(graph, () => graph.scope(["n6", "n7", "n8"]), hold);
        const same = scopedRun(graph, () => graph.scope(["n0", "n1", "n2"]), hold);
        await there;

        derivedInputsOf(graph).freeze();
        assert.lengthOf(fake.calls.release, 0, "all three still compute: nothing is released");
        letGo();
        const [a, , c] = await Promise.all([one, two, same]);

        assert.strictEqual(a, c, "the two runs over one scope shared one input");
        assertBalanced(graph, fake);
    });

    it("across a freeze during a run: released only once the run lets go", async () => {
        const { graph, fake } = setup();
        const computed = await scopedRun(
            graph,
            () => graph.scope(["n0", "n1", "n2", "n3"]),
            (snapshot) => {
                graph.add(["late"]);
                derivedInputsOf(graph).freeze();
                assert.notInclude(fake.calls.release, snapshot, "the run still computes over it");
            },
        );

        assert.include(fake.calls.release, computed, "released when the run published");
        assertBalanced(graph, fake);
    });
});

/**
 * The shared fake, with the three members it lacks answered by the CPU port and recorded as
 * uploads, so every accelerated adapter hands it its input.
 * @returns The fake.
 */
function everyMember(): FakeAccelerator {
    const cpu = accelerated(null);
    const recorded =
        <A extends unknown[], R>(name: string, work: (snapshot: GraphSnapshot, ...rest: A) => Promise<R>) =>
        (snapshot: GraphSnapshot, ...rest: A): Promise<R> => {
            fake.calls.uploaded.push(snapshot);
            return work(snapshot, ...rest).then((value) => {
                assert.isDefined(value, name);
                return value;
            });
        };
    const fake = createFakeAccelerator({
        members: {
            sssp: recorded("sssp", (snapshot, source: number) => cpu.sssp(snapshot, source)),
            breadthFirstSearch: recorded("breadthFirstSearch", (snapshot, source: number) => cpu.breadthFirstSearch(snapshot, source)),
            minimumSpanningTree: recorded("minimumSpanningTree", (snapshot) => cpu.minimumSpanningTree(snapshot)),
        },
    });

    return fake;
}

/** The five adapters that run through `accelerated()`, as a scoped run builds them. */
const ADAPTERS: readonly (readonly [string, (graph: Graph) => Algorithm])[] = [
    ["pagerank", (graph) => new PageRankAlgorithm(graph)],
    ["dijkstra", (graph) => new DijkstraAlgorithm(graph)],
    ["bfs", (graph) => new BFSAlgorithm(graph)],
    ["connected components", (graph) => new ConnectedComponentsAlgorithm(graph)],
    ["kruskal", (graph) => new KruskalAlgorithm(graph)],
];

describe("uploaded equals released, through the five real adapters", () => {
    for (const [name, build] of ADAPTERS) {
        it(`${name}: repeated scoped runs, a re-freeze, and teardown`, async () => {
            const ids = Array.from({ length: 12 }, (_, index) => `n${String(index)}`);
            const graph = new InputGraph(
                ids,
                ids.map((id, index) => [id, ids[(index + 1) % ids.length], index + 1] as const),
            );
            const fake = everyMember();
            graph.acceleration.setAccelerator(fake);
            const run = async (): Promise<void> => {
                const algorithm = build(graph.asGraph());
                const scope = graph.scope(["n0", "n1", "n2", "n3"]);
                await withRunInput(algorithm, graph, () => scope, undefined, () => algorithm.publishResult(detachedRunContext(), "r"));
            };

            await run();
            await run();
            assert.strictEqual(new Set(fake.calls.uploaded).size, 1, "a repeated scope hands the accelerator the same snapshot");
            assert.strictEqual(fake.calls.uploaded[0].nodeCount, 4, "the scope's input, not the whole graph");

            graph.add(["late"]);
            derivedInputsOf(graph).freeze();
            await run();

            assert.strictEqual(new Set(fake.calls.uploaded).size, 2);

            /* An undirected adapter's input is derived through a declared intermediate that is
               cached beside it and never uploaded; it is released too, which a real accelerator
               answers as a no-op for a snapshot it never saw. So: every upload is released, once. */
            derivedInputsOf(graph).dispose();
            const released = fake.calls.release;
            assert.strictEqual(new Set(released).size, released.length, "nothing is released twice");
            for (const snapshot of new Set(fake.calls.uploaded)) {
                assert.include(released, snapshot, "every upload is released");
            }
        });
    }
});
