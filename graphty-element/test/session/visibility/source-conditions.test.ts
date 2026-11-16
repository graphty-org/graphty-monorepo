/**
 * @file A filter condition of one load (`FilterCondition.source`) judges only the nodes and edges
 * that load supplied and leaves every other load's alone; a `union` leaf narrowed to loads
 * (`UnionLeaf.sources`) starts from theirs, so a selection's totals read that load's count.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type RuleTree } from "../../../session";

/** Three teams with a score, two edges: the first load (s1). */
const TEAMS = JSON.stringify({
    nodes: [
        { id: "a1", score: 0.9 },
        { id: "b1", score: 0.2 },
        { id: "c1", score: 0.8 },
    ],
    edges: [
        { src: "a1", dst: "b1" },
        { src: "b1", dst: "c1" },
    ],
});
/** Two people with a score of the same name, one edge: the second load (s2). */
const PEOPLE = JSON.stringify({
    nodes: [
        { id: "a2", score: 0.95 },
        { id: "b2", score: 0.1 },
    ],
    edges: [{ src: "a2", dst: "b2" }],
});

const HIGH: RuleTree = { kind: "range", attribute: "data.score", min: 0.8 };

/**
 * A session holding both loads, TEAMS first.
 * @returns the session
 */
async function both(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "json", config: { data: TEAMS }, name: "teams.json" });
    await session.data.import({ type: "json", config: { data: PEOPLE }, name: "people.json" }, { mode: "merge" });
    assert.deepStrictEqual(
        session.data.sources().map((each) => each.key),
        ["s1", "s2"],
    );
    return session;
}

/**
 * The visible node ids, sorted.
 * @param session - the session
 * @returns the ids
 */
function nodesShown(session: GraphSession): string[] {
    return [...session.visibility.nodes].map(String).sort();
}

describe("a filter condition of one load", () => {
    it("keeps only that load's matches and never hides another load's elements", async () => {
        const session = await both();
        await session.visibility.addCondition({ effect: "keep", rule: HIGH, source: "s1" });
        assert.deepStrictEqual(nodesShown(session), ["a1", "a2", "b2", "c1"]);
        // b1 is hidden, so both of its edges go; people.json's edge stays.
        assert.strictEqual(session.visibility.summary.visibleEdges, 1);
        assert.strictEqual(session.visibility.conditions[0].source, "s1");
        session.dispose();
    });

    it("hides the same rule's matches in every load when it names none", async () => {
        const session = await both();
        await session.visibility.addCondition({ effect: "keep", rule: HIGH });
        assert.deepStrictEqual(nodesShown(session), ["a1", "a2", "c1"]);
        session.dispose();
    });

    it("excludes only that load's matches", async () => {
        const session = await both();
        await session.visibility.addCondition({ effect: "exclude", rule: HIGH, source: "s2" });
        assert.deepStrictEqual(nodesShown(session), ["a1", "b1", "b2", "c1"]);
        session.dispose();
    });

    it("counts its matches over that load's elements", async () => {
        const session = await both();
        await session.visibility.addCondition({ id: "teams", effect: "keep", rule: HIGH, source: "s1" });
        await session.visibility.addCondition({ id: "people", effect: "keep", rule: HIGH, source: "s2" });
        const [teams, people] = session.visibility.conditionCounts();
        assert.deepStrictEqual(teams.nodes, { matched: 2, total: 3, shown: 2 });
        assert.deepStrictEqual(people.nodes, { matched: 1, total: 2, shown: 1 });
        session.dispose();
    });

    it("moves to another load as one undo step", async () => {
        const session = await both();
        const { id } = await session.visibility.addCondition({ effect: "keep", rule: HIGH, source: "s1" });
        await session.visibility.updateCondition(id, { source: "s2" });
        assert.deepStrictEqual(nodesShown(session), ["a1", "a2", "b1", "c1"]);
        await session.undo();
        assert.deepStrictEqual(nodesShown(session), ["a1", "a2", "b2", "c1"]);
        session.dispose();
    });

    it("keeps its load through a project save and reopen", async () => {
        const session = await both();
        await session.visibility.addCondition({ id: "teams", effect: "keep", rule: HIGH, source: "s1" });
        const { text } = await session.project.save();
        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        assert.strictEqual(reopened.visibility.conditions[0].source, "s1");
        assert.deepStrictEqual(nodesShown(reopened), ["a1", "a2", "b2", "c1"]);
        session.dispose();
        reopened.dispose();
    });

    it("refuses a source that is not a load key", async () => {
        const session = await both();
        assert.throws(() => {
            void session.visibility.addCondition({ effect: "keep", rule: HIGH, source: "" });
        }, /source/u);
        session.dispose();
    });
});

describe("a union leaf narrowed to loads", () => {
    it("starts from that load's nodes, so a reading's totals are that load's", async () => {
        const session = await both();
        const watch = session.scope.watchSteps(
            {
                kind: "union",
                side: "nodes",
                within: "graph",
                sources: ["s2"],
                branches: [{ start: "all", steps: [{ op: "keep", rule: HIGH }] }],
            },
            () => undefined,
        );
        assert.strictEqual(watch.current.total.count, 1);
        assert.strictEqual(watch.current.total.of, 2);
        watch.end();
        session.dispose();
    });

    it("as a filter of the same load, keeps that load's matches and leaves the other's", async () => {
        const session = await both();
        await session.visibility.addCondition({
            effect: "keep",
            source: "s2",
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                sources: ["s2"],
                branches: [{ start: "all", steps: [{ op: "keep", rule: HIGH }] }],
            },
        });
        assert.deepStrictEqual(nodesShown(session), ["a1", "a2", "b1", "c1"]);
        assert.deepStrictEqual(session.visibility.conditionCounts()[0].nodes, { matched: 1, total: 2, shown: 1 });
        session.dispose();
    });

    it("refuses sources that are not a list of keys", () => {
        const session = createGraphSession();
        assert.throws(() => {
            void session.visibility.addCondition({
                effect: "keep",
                rule: {
                    kind: "union",
                    side: "nodes",
                    within: "graph",
                    sources: "s1" as unknown as readonly string[],
                    branches: [],
                },
            });
        }, /sources/u);
        session.dispose();
    });
});
