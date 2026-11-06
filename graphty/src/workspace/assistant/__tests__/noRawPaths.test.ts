/**
 * @file The rows the app draws for what the Assistant did name a column as the reader knows it,
 * never by the path a tool call carries (`data.x`). A run's value: `RunValueLine.real-element`.
 */

import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { pickedWords, selectorName } from "../../style/cards";
import { emptyWords } from "../words";

/**
 * Four genes with an expression score and a yes-or-no column, joined in a line.
 * @returns the session.
 */
async function genes(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", gal4RGexp: -2, trained: true },
        { id: "b", gal4RGexp: -0.5, trained: false },
        { id: "c", gal4RGexp: 1, trained: true },
        { id: "d", gal4RGexp: -3, trained: true },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "d" },
    ]);
    return session;
}

const RAW = /\b(data|results)\./;

describe("no field path on an Assistant row", () => {
    let session: GraphSession | null = null;
    afterEach(() => {
        session?.dispose();
        session = null;
    });

    it("words an empty search for a rule as the rule in words", async () => {
        session = await genes();

        const words = emptyWords(session, "data.trained == false");

        assert.notMatch(words, RAW);
        assert.match(words, /^No matches for trained is /);
        assert.strictEqual(emptyWords(session, "Alice"), "No matches for Alice.");
        assert.strictEqual(emptyWords(session, ""), "No matches.");
    });

    it("words a rule no card draws without its paths", async () => {
        session = await genes();

        const below = selectorName(session, { match: "expression", where: "data.gal4RGexp < `-1`" });
        const either = selectorName(session, {
            match: "expression",
            where: "data.gal4RGexp < `-1` || data.trained == `false`",
        });

        assert.strictEqual(below, "gal4RGexp below -1");
        assert.notMatch(either ?? "", RAW);
        assert.match(either ?? "", /^Rule: gal4RGexp < -1 \|\| trained == false$/);
    });

    it("says a fixed list is picked, whoever picked it", () => {
        assert.strictEqual(pickedWords(9, 0), "Picked: 9 nodes");
    });
});
