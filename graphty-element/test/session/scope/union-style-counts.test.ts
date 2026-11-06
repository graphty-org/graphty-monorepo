/**
 * @file A layer whose selector is a `union` rule is read by the coverage facts and the legend
 * exactly as the painter draws it: an edit to its steps never makes it read as painted over.
 */

import { assert, describe, it } from "vitest";

import type { UnionLeaf } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";

/**
 * Six nodes on a path, each with a score, painted red by a base layer and by score above it.
 * @returns The session and the score layer's id.
 */
async function scored(): Promise<{ session: GraphSession; score: string }> {
    const session = createGraphSession();
    await session.data.addNodes(["a", "b", "c", "d", "e", "f"].map((id, at) => ({ id, score: at / 5 })));
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "d" },
        { source: "d", target: "e" },
        { source: "e", target: "f" },
    ]);
    await session.styles.add({
        name: "Everything",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#FF0000" },
    });
    const { id } = await session.styles.add({
        name: "Score",
        target: "node",
        selector: { match: "has", path: "data.score" },
        encode: { "node.color": { by: "data.score", scale: "linear", palette: "viridis" } },
    });
    await session.styles.settled();
    return { session, score: id };
}

describe("a union selector in the coverage facts and the legend", () => {
    it("keeps the layer's legend and coverage when its selector is edited during a branches view", async () => {
        const { session, score } = await scored();
        const before = session.styles.counts(score);
        const where = session.scope.asUnion(
            { kind: "text", reads: "data.score", mode: "regex", text: "" },
            { side: "nodes", within: "visible" },
        ) as UnionLeaf;
        const view = session.styles.showBranches({ rule: where, rest: "faint" });
        await session.styles.update(score, { selector: { match: "rule", where } });
        await session.styles.settled();
        const during = session.styles.counts(score);
        assert.deepEqual(during.covers, before.covers, "never painted over by the layer below");
        assert.deepEqual(during.painted, before.painted);
        assert.isTrue(
            session.styles.legend().some((block) => block.layerId === score),
            "the layer keeps its legend",
        );
        view.end();
        await session.styles.settled();
        assert.deepEqual(session.styles.counts(score).covers, before.covers);
    });
});

describe("scope.asUnion", () => {
    it("reads a converted 'has a value' step as applied, leaving out the unmeasured", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a", score: 1 }, { id: "b" }, { id: "c", score: 2 }]);
        const where = session.scope.asUnion(
            { kind: "text", reads: "data.score", mode: "regex", text: "" },
            { side: "nodes", within: "graph" },
        ) as UnionLeaf;
        const watch = session.scope.watchSteps(where, () => undefined);
        const step = watch.current.branches[0]?.steps[0];
        watch.end();
        assert.strictEqual(step?.state, "applied");
        assert.strictEqual(step?.count, 2);
    });
});

/**
 * A ring a-b-c-d-e with a hub m joined to a and d, and the hub filtered out.
 * @returns The session.
 */
async function hubFilteredOut(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(["a", "b", "c", "d", "e", "m"].map((id) => ({ id, hub: id === "m" })));
    await session.data.addEdges(
        [
            ["a", "b"],
            ["b", "c"],
            ["c", "d"],
            ["d", "e"],
            ["m", "a"],
            ["m", "d"],
        ].map(([source, target]) => ({ source, target })),
    );
    await session.visibility.addCondition({
        effect: "keep",
        rule: { kind: "not", of: { kind: "categories", attribute: "data.hub", values: ["true"] } },
    });
    return session;
}

/**
 * The members of a one-step selection over the filtered graph.
 * @param session - The session.
 * @param rule - The step's rule.
 * @returns The members' ids, sorted.
 */
async function membersOf(
    session: GraphSession,
    rule: UnionLeaf["branches"][number]["steps"][number]["rule"],
): Promise<string[]> {
    const watch = session.scope.watchSteps(
        {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [{ start: "none", steps: [{ op: "add", rule }] }],
        },
        () => undefined,
    );
    const members = (await session.scope.resolve(watch.current.result)).nodes;
    watch.end();
    return [...members].map(String).sort();
}

describe("a step over the filtered graph", () => {
    it("never walks through a filtered-out node", async () => {
        const session = await hubFilteredOut();
        assert.deepEqual(await membersOf(session, { kind: "hops", of: { nodes: ["a"] }, max: 2 }), ["a", "b", "c"]);
    });

    it("counts degree over the filtered graph's edges", async () => {
        const session = await hubFilteredOut();
        assert.deepEqual(await membersOf(session, { kind: "degree", min: 2, max: 2 }), ["b", "c", "d"]);
        const histogram = session.scope.histogram("graphty.degree", { within: "visible" });
        assert.strictEqual(histogram.kind === "numeric" ? histogram.max : undefined, 2);
    });
});
