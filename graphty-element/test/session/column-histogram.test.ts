/**
 * @file `session.data.histogram(column)`: a data column's distribution (issue #897).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { isGraphtyError } from "../../src/errors";

/**
 * A session of ten people with an age, a team and, on some, a score.
 * @returns the session
 */
async function people(): Promise<GraphSession> {
    const session = createGraphSession();
    const teams = ["red", "blue", "red", "green", "red", "blue", "red", "blue", "green", "gold"];
    await session.data.addNodes(
        teams.map((team, index) => ({
            id: `p${String(index)}`,
            age: 20 + index * 3,
            team,
            ...(index % 2 === 0 ? { score: index / 4 } : {}),
        })),
    );
    await session.data.addEdges([{ source: "p0", target: "p1", trips: 4 }]);
    return session;
}

describe("session.data.histogram", () => {
    it("bins a numeric column, counting only the elements that carry a number", async () => {
        const session = await people();
        const score = session.data.histogram({ kind: "node", name: "score" });

        assert.strictEqual(score.kind, "numeric");
        if (score.kind === "numeric") {
            assert.strictEqual(
                score.bins.reduce((sum, bin) => sum + bin.count, 0),
                5,
            );
            assert.strictEqual(score.binning, "per-value");
        }

        const age = session.data.histogram({ kind: "node", name: "age" }, { bins: 3 });
        assert.strictEqual(age.kind === "numeric" && age.binning, "banded");
        assert.strictEqual(age.kind === "numeric" && age.bins.length, 3);
        session.dispose();
    });

    it("counts a categorical column's values, commonest first, bounded with an Other count", async () => {
        const session = await people();
        const team = session.data.histogram({ kind: "node", name: "team" }, { bins: 2 });

        assert.deepStrictEqual(team, {
            kind: "categorical",
            values: [
                { value: "red", count: 4 },
                { value: "blue", count: 3 },
            ],
            otherCount: 3,
        });
        session.dispose();
    });

    it("reads a numeric column declared categorical as values, and edge columns too", async () => {
        const session = await people();
        await session.data.declare({ kind: "node", name: "age" }, { measurement: "categorical" });
        assert.strictEqual(session.data.histogram({ kind: "node", name: "age" }).kind, "categorical");

        const trips = session.data.histogram({ kind: "edge", name: "trips" });
        assert.deepStrictEqual(trips.kind === "numeric" && trips.bins, [{ from: 4, to: 4, count: 1 }]);
        session.dispose();
    });

    it("refuses a column no record carries", async () => {
        const session = await people();
        let code: unknown;
        try {
            session.data.histogram({ kind: "node", name: "nope" });
        } catch (error) {
            code = isGraphtyError(error) ? error.code : error;
        }

        assert.strictEqual(code, "E_UNKNOWN_ATTRIBUTE");
        session.dispose();
    });
});
