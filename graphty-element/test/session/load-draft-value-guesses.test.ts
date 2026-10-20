/**
 * @file With `guess: "values"`, a draft reads a CSV's roles from its values when no header names them: two text columns
 * naming the same things are an edge's ends (`bait`, `prey`), and a single file's nearly unique
 * text column is its nodes' key (`account`). Columns that only look alike are left unguessed.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

/**
 * Prepares a file and reads the roles the draft suggests.
 * @param text - the file's text
 * @param name - its name
 * @param guess - how the draft guesses
 * @returns the suggested role of each column, and what the rows are
 */
async function guessed(
    text: string,
    name: string,
    guess: "names" | "values" = "values",
): Promise<{ roles: Record<string, string>; rowsAre?: string }> {
    const session = createGraphSession();
    const draft = await session.data.prepare({ config: { file: new File([text], name) } }, { guess });
    const [table] = draft.tables;
    const roles = Object.fromEntries(table.columns.map((column) => [column.name, column.suggested ?? "-"]));
    const { rowsAre } = draft.mapping.tables[table.id];
    draft.dispose();
    session.dispose();
    return { roles, rowsAre };
}

/** Twelve proteins, each interacting with the next two. */
const PROTEINS = Array.from({ length: 12 }, (_unused, at) => `P${String(at)}`);

describe("value-based role guesses", () => {
    it("reads two columns naming the same things as an edge's ends, the first as the source", async () => {
        const rows = PROTEINS.flatMap((protein, at) => [
            `${protein}\t${PROTEINS[(at + 1) % 12]}\t0.9\ttwo-hybrid`,
            `${protein}\t${PROTEINS[(at + 2) % 12]}\t0.5\tco-crystal`,
        ]);
        const { roles, rowsAre } = await guessed(["bait\tprey\tconfidence\tevidence", ...rows].join("\n"), "ppi.tsv");
        assert.strictEqual(rowsAre, "edges");
        assert.strictEqual(roles.bait, "source");
        assert.strictEqual(roles.prey, "target");
    });

    it("guesses from the header alone by default", async () => {
        const rows = PROTEINS.map((protein, at) => `${protein}\t${PROTEINS[(at + 1) % 12]}`);
        const { roles } = await guessed(["bait\tprey", ...rows].join("\n"), "ppi.tsv", "names");
        assert.deepEqual(roles, { bait: "-", prey: "-" });
    });

    it("loads such a file as edges with no mapping given", async () => {
        const session = createGraphSession();
        const rows = PROTEINS.map((protein, at) => `${protein},${PROTEINS[(at + 1) % 12]}`);
        const draft = await session.data.prepare(
            { config: { file: new File([["a,b", ...rows].join("\n")], "x.csv") } },
            { guess: "values" },
        );
        await draft.load();
        assert.strictEqual(session.data.nodes().length, 12);
        assert.strictEqual(session.data.edges().length, 12);
        session.dispose();
    });

    it("reads a single file's nearly unique text column as its nodes' key", async () => {
        const rows = Array.from({ length: 40 }, (_unused, at) => `A${String(at)},Holder ${String(at % 7)},no`);
        rows.push("A3,Holder again,yes");
        const { roles, rowsAre } = await guessed(["account,holder,flagged", ...rows].join("\n"), "accounts.csv");
        assert.strictEqual(rowsAre, "nodes");
        assert.strictEqual(roles.account, "key");
    });

    it("guesses no ends for columns that share a stray value, and no key from a column of times", async () => {
        const rows = Array.from(
            { length: 30 },
            (_unused, at) =>
                `2024-03-01T${String(at % 24).padStart(2, "0")}:${String(at).padStart(2, "0")}:00Z,user${String(at % 5)},host${String(at % 3)},admin`,
        );
        const { roles } = await guessed(["time,user,host,owner", ...rows].join("\n"), "log.csv");
        assert.notInclude(Object.values(roles), "source");
        assert.notInclude(Object.values(roles), "key");
    });
});
