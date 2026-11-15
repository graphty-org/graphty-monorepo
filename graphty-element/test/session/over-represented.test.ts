/**
 * @file `session.data.overRepresented`: per group, the values that occur more often than chance,
 * with the hypergeometric p and the Benjamini-Hochberg p over every test performed, checked by hand.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { isGraphtyError } from "../../src/errors";
import { benjaminiHochberg, bonferroni, holm } from "../../src/session/overRepresented";

/**
 * Ten nodes: group A holds seven (five red, two blue), group B three (all blue). Tags are lists:
 * a1-a3 carry x and y, a4-a7 carry y, B carries z.
 * @param extra - values every node also carries
 * @returns the session
 */
async function fixture(extra: Readonly<Record<string, unknown>> = {}): Promise<GraphSession> {
    const session = createGraphSession();
    const nodes = [];
    for (let i = 1; i <= 7; i++) {
        nodes.push({
            id: `a${String(i)}`,
            community: "A",
            team: i <= 5 ? "red" : "blue",
            tags: i <= 3 ? ["x", "y"] : ["y"],
            ...extra,
        });
    }

    for (let i = 1; i <= 3; i++) {
        nodes.push({ id: `b${String(i)}`, community: "B", team: "blue", tags: ["z"], ...extra });
    }

    await session.data.addNodes(nodes);
    return session;
}

const close = (actual: number | undefined, expected: number, what: string): void => {
    assert.ok(
        actual !== undefined && Math.abs(actual - expected) < 1e-12,
        `${what}: ${String(actual)} != ${String(expected)}`,
    );
};

describe("over-represented values", () => {
    it("matches the hand-checked counts, raw p and Benjamini-Hochberg p", async () => {
        const session = await fixture();
        const profile = session.data.overRepresented("data.community", { columns: ["data.team", "data.tags"] });

        assert.strictEqual(profile.correction, "benjamini-hochberg");
        // A-red, A-blue, B-blue, A-x, A-y, B-z: A-blue is under-represented, tested but not listed.
        assert.strictEqual(profile.testCount, 6);
        assert.deepStrictEqual(
            profile.groups.map((group) => [group.group, group.size]),
            [
                ["A", 7],
                ["B", 3],
            ],
        );

        const [a, b] = profile.groups;
        assert.deepStrictEqual(
            a.values.map((row) => [row.path, row.value, row.count]),
            [
                ["data.tags", "y", 7],
                ["data.team", "red", 5],
                ["data.tags", "x", 3],
            ],
        );
        // red: C(5,5) C(5,2) / C(10,7) = 10 / 120; expected 7 * 5 / 10.
        close(a.values[1].p, 1 / 12, "A red p");
        close(a.values[1].expected, 3.5, "A red expected");
        close(a.values[1].adjustedP, 0.125, "A red adjusted");
        // y: every carrier of y is in A: 1 / C(10,7).
        close(a.values[0].p, 1 / 120, "A y p");
        close(a.values[0].adjustedP, 0.025, "A y adjusted");
        // x: C(7,4) / C(10,7) = 35 / 120.
        close(a.values[2].p, 7 / 24, "A x p");
        close(a.values[2].adjustedP, 0.35, "A x adjusted");

        assert.deepStrictEqual(
            b.values.map((row) => [row.value, row.count]),
            [
                ["z", 3],
                ["blue", 3],
            ],
        );
        close(b.values[1].p, 1 / 12, "B blue p");
        close(b.values[1].adjustedP, 0.125, "B blue adjusted");
        close(b.values[0].adjustedP, 0.025, "B z adjusted");
        session.dispose();
    });

    it("tests every categorical node column but the grouping one by default", async () => {
        const session = await fixture();
        const profile = session.data.overRepresented("data.community");
        assert.strictEqual(profile.testCount, 6);
        assert.ok(profile.groups.every((group) => group.values.every((row) => row.path !== "data.community")));
        session.dispose();
    });

    it("leaves out nodes with no group", async () => {
        const session = await fixture();
        await session.data.addNodes([{ id: "loose", team: "red" }]);
        const profile = session.data.overRepresented("data.community", { columns: ["data.team"] });
        assert.deepStrictEqual(
            profile.groups.map((group) => group.size),
            [7, 3],
        );
        close(profile.groups[0].values[0].p, 1 / 12, "red p unchanged by the ungrouped node");
        session.dispose();
    });
});

describe("over-represented values: corrections and edge cases", () => {
    // The six raw p of the fixture, smallest first: A-y 1/120, B-z 1/120, A-red 1/12, B-blue 1/12,
    // A-x 7/24, A-blue 1 (tested, under-represented, not listed).
    it("corrects by Bonferroni when asked", async () => {
        const session = await fixture();
        const profile = session.data.overRepresented("data.community", {
            columns: ["data.team", "data.tags"],
            correction: "bonferroni",
        });
        assert.strictEqual(profile.correction, "bonferroni");
        const [a, b] = profile.groups;
        close(a.values[0].adjustedP, 0.05, "A y: 1/120 * 6");
        close(a.values[1].adjustedP, 0.5, "A red: 1/12 * 6");
        close(a.values[2].adjustedP, 1, "A x: 7/24 * 6, capped");
        close(a.values[1].p, 1 / 12, "raw p unchanged by the method");
        close(b.values[0].adjustedP, 0.05, "B z");
        session.dispose();
    });

    it("corrects by Holm when asked", async () => {
        const session = await fixture();
        const profile = session.data.overRepresented("data.community", {
            columns: ["data.team", "data.tags"],
            correction: "holm",
        });
        assert.strictEqual(profile.correction, "holm");
        const [a, b] = profile.groups;
        // Ranks 1-2: 1/120 * 6 = 0.05, 1/120 * 5 held up to 0.05; ranks 3-4: 1/12 * 4, 1/12 * 3 held
        // up to 1/3; rank 5: 7/24 * 2.
        close(a.values[0].adjustedP, 0.05, "A y");
        close(a.values[1].adjustedP, 1 / 3, "A red");
        close(a.values[2].adjustedP, 7 / 12, "A x");
        close(b.values[0].adjustedP, 0.05, "B z");
        close(b.values[1].adjustedP, 1 / 3, "B blue");
        session.dispose();
    });

    it("refuses a correction it does not know", async () => {
        const session = await fixture();
        const options = JSON.parse('{"correction":"made-up"}') as Parameters<typeof session.data.overRepresented>[1];
        let thrown: unknown;
        try {
            session.data.overRepresented("data.community", options);
        } catch (error) {
            thrown = error;
        }
        assert.isTrue(isGraphtyError(thrown) && thrown.code === "E_OPTION_RANGE", String(thrown));
        session.dispose();
    });

    it("tests a value every node carries but never lists it", async () => {
        const session = await fixture({ kind: "person" });
        const profile = session.data.overRepresented("data.community", { columns: ["data.team", "data.kind"] });
        // A-red, A-blue, B-blue, A-person, B-person.
        assert.strictEqual(profile.testCount, 5);
        assert.ok(profile.groups.every((group) => group.values.every((row) => row.path !== "data.kind")));
        // Two more tests raise A red's adjusted p from 1/12 * 3 / 2 to 1/12 * 5 / 2.
        close(profile.groups[0].values[0].adjustedP, 5 / 24, "A red over five tests");
        session.dispose();
    });

    it("returns no groups and no tests for an empty graph", () => {
        const session = createGraphSession();
        const profile = session.data.overRepresented("data.community");
        assert.deepStrictEqual([profile.groups.length, profile.testCount], [0, 0]);
        session.dispose();
    });
});

describe("Bonferroni and Holm", () => {
    it("match the textbook values on four p", () => {
        const p = [0.01, 0.04, 0.03, 0.9];
        assert.deepStrictEqual(
            [...bonferroni(p)].map((x) => +x.toFixed(12)),
            [0.04, 0.16, 0.12, 1],
        );
        // Sorted 0.01 * 4, 0.03 * 3, 0.04 * 2, 0.9 * 1, each at least the one before.
        assert.deepStrictEqual(
            [...holm(p)].map((x) => +x.toFixed(12)),
            [0.04, 0.09, 0.09, 0.9],
        );
    });
});

describe("Benjamini-Hochberg", () => {
    it("keeps the adjusted values monotone in the raw order and caps them at 1", () => {
        const adjusted = benjaminiHochberg([0.01, 0.04, 0.03, 0.9]);
        // Sorted 0.01, 0.03, 0.04, 0.9: rank 2 (0.03 * 4 / 2 = 0.06) takes rank 3's 0.04 * 4 / 3.
        close(adjusted[0], 0.04, "rank 1");
        close(adjusted[2], 0.04 * (4 / 3), "rank 2 takes rank 3's smaller value");
        close(adjusted[1], 0.04 * (4 / 3), "rank 3");
        close(adjusted[3], 0.9, "rank 4");
    });
});
