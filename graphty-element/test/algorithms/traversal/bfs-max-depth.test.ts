/**
 * @file BFS's `maxDepth` bound, run through the session on a path graph n0-n1-...-n9 whose levels
 * are known: a node's level is its position on the path when the walk starts at n0.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { type Harness, makeSession } from "../../session/helpers";
import { builtInRuns } from "../../session/sets/algorithms";

const NODES = Array.from({ length: 10 }, (_, i) => `n${i}`);

/**
 * A session over the path graph, running built-in algorithms.
 * @returns The harness.
 */
function fixture(): Harness {
    let harness: Harness | null = null;
    const made = makeSession({ directed: false, runs: { execute: builtInRuns(() => harness as Harness) } });
    harness = made;
    made.add(
        NODES.map((id) => ({ id })),
        NODES.slice(1).map((id, i) => ({ src: NODES[i], dst: id })),
    );
    return made;
}

/**
 * Run BFS from n0 and read each node's level.
 * @param params - BFS's options beyond the source.
 * @returns The levels in node order (undefined for a node the walk did not reach) and the caveat codes.
 */
async function levels(params: Record<string, unknown>): Promise<{ levels: unknown[]; codes: string[] }> {
    const result = await fixture().session.runs.start(
        "bfs",
        { source: "n0", ...params },
        { scope: "graph", style: false },
    );
    return {
        levels: NODES.map((id) => result.node(id)?.level),
        codes: result.summary().caveats.facts.map((fact) => fact.code),
    };
}

describe("BFS maxDepth", () => {
    it("publishes levels 0 to 3 only with maxDepth 3, and notes the bound", async () => {
        const { levels: got, codes } = await levels({ maxDepth: 3 });

        assert.deepEqual(got, [0, 1, 2, 3, undefined, undefined, undefined, undefined, undefined, undefined]);
        assert.include(codes, "bfs.depth-bounded");
    });

    it("walks everything reachable without maxDepth", async () => {
        const { levels: got, codes } = await levels({});

        assert.deepEqual(got, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        assert.notInclude(codes, "bfs.depth-bounded");
    });

    it("reaches only the source with maxDepth 0", async () => {
        const { levels: got } = await levels({ maxDepth: 0 });

        assert.deepEqual(got.slice(0, 2), [0, undefined]);
    });

    it("stops at the target when it comes before the bound", async () => {
        const { levels: got } = await levels({ maxDepth: 5, targetNode: "n2" });

        assert.deepEqual(got.slice(0, 4), [0, 1, 2, undefined]);
    });

    it("stops at the bound when it comes before the target", async () => {
        const { levels: got, codes } = await levels({ maxDepth: 2, targetNode: "n7" });

        assert.deepEqual(got.slice(0, 4), [0, 1, 2, undefined]);
        assert.include(codes, "bfs.target-unreached");
    });

    for (const bad of [-1, 1.5]) {
        it(`refuses maxDepth ${bad} with E_OPTION_RANGE`, async () => {
            const error: unknown = await levels({ maxDepth: bad }).then(
                () => null,
                (e: unknown) => e,
            );

            assert.isTrue(isGraphtyError(error) && error.code === "E_OPTION_RANGE", String(error));
        });
    }
});
