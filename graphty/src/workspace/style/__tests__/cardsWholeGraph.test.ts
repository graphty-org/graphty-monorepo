/**
 * The card model on a session that reads the working graph, as the app's does: a card with no base
 * of its own (a filter's own card) counts over the whole graph by name, and a style layer's Highest
 * rule ranks among what is shown (owner decision C, design/working-graph/design.md).
 */
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { type Card, cardFields, cardWords, selectorOf } from "../cards";

let session: GraphSession | null = null;

afterEach(() => {
    session?.dispose();
    session = null;
});

/**
 * Six scored nodes in a chain, those scored 3 or less hidden by a filter.
 * @returns the session and a Highest card on the score.
 */
async function filtered(): Promise<{ session: GraphSession; card: Extract<Card, { type: "number" }> }> {
    const made = createGraphSession({ workingGraph: true });
    session = made;
    await made.data.addNodes(Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}`, score: i + 1 })));
    await made.data.addEdges(
        Array.from({ length: 5 }, (_, i) => ({ source: `n${String(i)}`, target: `n${String(i + 1)}` })),
    );
    await made.visibility.set({ kind: "threshold", path: "data.score", above: 3 });
    assert.strictEqual(made.visibility.summary.visibleNodes, 3);
    const field = cardFields(made, "node").find((each) => each.path === "data.score");
    if (field === undefined) {
        throw new Error("no score field");
    }
    return { session: made, card: { type: "number", key: "score", field, match: "top", top: 6 } };
}

describe("cards over the working graph", () => {
    it("says a Highest count of every node over the whole graph, not what is shown", async () => {
        const { session: on, card } = await filtered();
        assert.match(cardWords(on, card), /: all 6$/);
    });

    it("writes a style layer's Highest rule to rank among what is shown", async () => {
        const { card } = await filtered();
        const selector = selectorOf([card]);
        assert.deepInclude(selector, {
            match: "rule",
            where: { kind: "threshold", path: "data.score", top: 6, ties: "all", within: "visible" },
        });
    });
});
