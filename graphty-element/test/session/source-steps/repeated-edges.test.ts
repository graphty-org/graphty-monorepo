/**
 * @file The graph's `data.knownFields.repeatedEdges` under the source-steps experiment (issue #9690):
 * two rows naming one pair reduce to one edge, as they do with the experiment off.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";

const CSV = "source,target,w\na,b,2\na,b,5\n";

/**
 * A session that reads two edges between `a` and `b`.
 * @param steps - Whether the source-steps experiment is on.
 * @param repeatedEdges - The graph's `repeatedEdges`.
 * @returns The session.
 */
async function loaded(
    steps: boolean,
    repeatedEdges: "sum" | "min" | "max" | "first" | "last" | "error",
): Promise<GraphSession> {
    const session = createGraphSession({
        ...(steps ? { features: ["source-steps"] } : {}),
        config: { data: { knownFields: { repeatedEdges, edgeWeightPath: "w" } } },
    });
    await session.data.import({ type: "csv", config: { data: CSV }, name: "e.csv" });
    return session;
}

/**
 * Every edge's weight.
 * @param session - The session.
 * @returns The weights.
 */
function weights(session: GraphSession): unknown[] {
    return session.data.valueCounts("graphty.weight", { kind: "edge" }).values.map((v) => v.value);
}

describe("repeatedEdges under source-steps", () => {
    for (const [policy, weight] of [
        ["sum", 7],
        ["min", 2],
        ["max", 5],
        ["first", 2],
        ["last", 5],
    ] as const) {
        it(`${policy} reduces two rows of one pair to one edge weighing ${weight}, as with the experiment off`, async () => {
            const off = await loaded(false, policy);
            const on = await loaded(true, policy);
            assert.deepStrictEqual(off.data.count(), { nodes: 2, edges: 1 });
            assert.deepStrictEqual(on.data.count(), off.data.count());
            assert.deepStrictEqual(weights(on), [weight]);
            off.dispose();
            on.dispose();
        });
    }

    it("error refuses the repeat with E_DUPLICATE_EDGE and the same parameters, as with the experiment off (#9693)", async () => {
        const refusal = async (steps: boolean): Promise<unknown> => {
            try {
                await loaded(steps, "error");
            } catch (error) {
                return error;
            }
            return null;
        };
        const off = await refusal(false);
        const on = await refusal(true);
        assert.ok(isGraphtyError(off) && isGraphtyError(on), "both paths refuse the load");
        assert.strictEqual(on.code, "E_DUPLICATE_EDGE");
        assert.strictEqual(on.code, off.code);
        assert.strictEqual(on.message, off.message);
        const ends = (e: typeof on): unknown[] => [e.details.source, e.details.target];
        assert.deepStrictEqual(ends(on), ["a", "b"]);
        assert.deepStrictEqual(ends(on), ends(off));
    });
});
