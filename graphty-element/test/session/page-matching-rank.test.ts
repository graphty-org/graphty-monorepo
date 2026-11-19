/**
 * @file A ranked text match on a page: `nodePage({ matching: { text, rank: true } })` orders the
 * matches exact, then starts-with, then contains, and says which field matched (issue #9080).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/**
 * Three nodes the text "jav" finds three ways.
 * @returns the session
 */
async function cast(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "Javert", role: "inspector" },
        { id: "Valjean", role: "JAV" },
        { id: "Jav", role: "spy" },
        { id: "Cosette", role: "ward" },
    ]);
    await session.data.addEdges([
        { source: "Javert", target: "Valjean" },
        { source: "Valjean", target: "Cosette" },
    ]);
    return session;
}

/**
 * The ids of a page's records.
 * @param page - the page
 * @param page.records - its records
 * @returns the ids, in page order
 */
function ids(page: { readonly records: readonly { readonly id: unknown }[] }): unknown[] {
    return page.records.map((record) => record.id);
}

describe("a ranked text match on a page", () => {
    it("puts exact matches first, then starts-with, then contains, keeping graph order within a rank", async () => {
        const session = await cast();
        const page = session.data.nodePage({ matching: { text: "jav", rank: true } });

        assert.deepStrictEqual(ids(page), ["Valjean", "Jav", "Javert"]);
        assert.deepStrictEqual(page.matches, [
            { field: "data.role", rank: "exact" },
            { field: "id", rank: "exact" },
            { field: "id", rank: "starts-with" },
        ]);
        assert.strictEqual(page.total, 3);
        session.dispose();
    });

    it("orders within a rank by the page's sort, and counts every match whatever the window", async () => {
        const session = await cast();
        const page = session.data.nodePage({
            matching: { text: "jav", rank: true },
            sort: { key: "id" },
            limit: 2,
        });

        assert.deepStrictEqual(ids(page), ["Jav", "Valjean"]);
        assert.strictEqual(page.total, 3);
        assert.strictEqual(page.matches?.length, 2);
        session.dispose();
    });

    it("says contains for a value holding the text after its start", async () => {
        const session = await cast();
        const page = session.data.nodePage({ matching: { text: "ean", rank: true } });

        assert.deepStrictEqual(ids(page), ["Valjean"]);
        assert.deepStrictEqual(page.matches, [{ field: "id", rank: "contains" }]);
        session.dispose();
    });

    it("names an edge's endpoint as the field it matched", async () => {
        const session = await cast();
        const page = session.data.edgePage({ matching: { text: "cosette", rank: true } });

        assert.deepStrictEqual(page.matches, [{ field: "target", rank: "exact" }]);
        session.dispose();
    });

    it("leaves a page without rank as it was: no matches, graph order", async () => {
        const session = await cast();
        const page = session.data.nodePage({ matching: { text: "jav" } });

        assert.deepStrictEqual(ids(page), ["Javert", "Valjean", "Jav"]);
        assert.isFalse("matches" in page);
        session.dispose();
    });
});
