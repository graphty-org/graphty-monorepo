/**
 * @file The value picker's Relative to section offers Downstream of and Upstream of whenever some
 * edge has a direction to follow: on a directed graph and on one mixing directed and undirected
 * edges (#309), never on an undirected graph. Read from a real headless session.
 */
import { createGraphSession, type GraphSession, type UnionLeaf } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { pickSections } from "../values";

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

const rule: UnionLeaf = { kind: "union", side: "nodes", within: "graph", branches: [] };

/**
 * The keys the picker lists for a graph of two edges.
 * @param directed - the graph's direction.
 * @param second - the second edge's own direction, if it states one.
 * @returns every item key.
 */
async function keys(directed: boolean, second?: boolean): Promise<string[]> {
    const session = createGraphSession({ config: { data: { directed } } });
    sessions.push(session);
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c", ...(second === undefined ? {} : { directed: second }) },
    ]);
    return pickSections(session, rule, () => undefined, "selector").flatMap((section) =>
        section.items.map((item) => item.key),
    );
}

describe("pickSections: following direction", () => {
    it("offers downstream and upstream on a directed graph and on a mixed one, not on an undirected one", async () => {
        assert.includeMembers(await keys(true), ["downstream", "upstream"]);
        assert.includeMembers(await keys(false, true), ["downstream", "upstream"]);
        assert.notInclude(await keys(false), "downstream");
    });
});
