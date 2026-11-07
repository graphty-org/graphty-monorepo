/**
 * @file A page narrowed to the records an expression matches: `nodePage({ where })` tests each
 * node and `edgePage({ where })` each edge, where `scope: { where }` names nodes only.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { isGraphtyError } from "../../src/errors";

/**
 * Three cities and the roads between them.
 * @returns the session
 */
async function roads(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", size: 3 },
        { id: "b", size: 1 },
        { id: "c", size: 2 },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b", km: 10 },
        { source: "b", target: "c", km: 40 },
        { source: "a", target: "c", km: 25 },
    ]);
    return session;
}

describe("a page by expression", () => {
    it("pages the edges an expression matches, which a node scope cannot name", async () => {
        const session = await roads();
        const page = session.data.edgePage({ where: "data.km > `20`" });
        assert.deepStrictEqual(
            page.records.map((edge) => [edge.source, edge.target]),
            [
                ["b", "c"],
                ["a", "c"],
            ],
        );
        assert.strictEqual(page.total, 2);
        assert.strictEqual(session.data.edgePage({ scope: { where: "data.km > `20`" } }).total, 0);
    });

    it("pages the nodes, combined with a sort and counted with no records", async () => {
        const session = await roads();
        const page = session.data.nodePage({ where: "data.size >= `2`", sort: { key: "size" } });
        assert.deepStrictEqual(
            page.records.map((node) => node.id),
            ["c", "a"],
        );
        assert.strictEqual(session.data.nodePage({ where: "data.size >= `2`", limit: 0 }).total, 2);
    });

    it("follows an edit", async () => {
        const session = await roads();
        await session.data.updateEdges([{ id: session.data.edgePage().records[0].id, values: { km: 99 } }]);
        assert.strictEqual(session.data.edgePage({ where: "data.km > `20`" }).total, 3);
    });

    it("refuses an expression that does not parse", async () => {
        const session = await roads();
        try {
            session.data.nodePage({ where: "data.size >" });
            assert.fail("accepted");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_SELECTOR");
        }
    });
});
