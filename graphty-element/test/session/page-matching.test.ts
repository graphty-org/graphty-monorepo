/**
 * @file A page narrowed to the records matching a text: `nodePage({ matching })` and
 * `edgePage({ matching })` (issue #904).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/**
 * Five characters and the edges between some of them.
 * @returns the session
 */
async function cast(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "Javert", role: "inspector", age: 52 },
        { id: "Valjean", role: "mayor", age: 60 },
        { id: "Cosette", role: "ward", age: 8 },
        { id: "Fantine", role: "worker", age: 27 },
        { id: "Jondrette", role: "thief", age: 52 },
    ]);
    await session.data.addEdges([
        { source: "Javert", target: "Valjean", kind: "pursues" },
        { source: "Valjean", target: "Cosette", kind: "adopts" },
        { source: "Fantine", target: "Cosette", kind: "mother" },
        { source: "Jondrette", target: "Fantine", kind: "robs" },
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

describe("a page narrowed by matching text", () => {
    it("keeps the nodes whose id or a value contains the text, ignoring case, and counts them", async () => {
        const session = await cast();
        const page = session.data.nodePage({ matching: { text: "j" } });

        assert.deepStrictEqual(ids(page), ["Javert", "Valjean", "Jondrette"]);
        assert.strictEqual(page.total, 3);
        assert.strictEqual(session.data.nodePage({ matching: { text: "MAYOR" } }).total, 1);
        assert.strictEqual(session.selection.size, 0, "a page selects nothing");
        session.dispose();
    });

    it("takes the text modes selection.apply({ text }) takes, as a mode or a prefix", async () => {
        const session = await cast();
        assert.deepStrictEqual(ids(session.data.nodePage({ matching: { text: "52", mode: "exact" } })), [
            "Javert",
            "Jondrette",
        ]);
        assert.deepStrictEqual(ids(session.data.nodePage({ matching: { text: "role:ward" } })), ["Cosette"]);
        assert.deepStrictEqual(ids(session.data.nodePage({ matching: { text: "regex:^J.*t$" } })), ["Javert"]);
        session.dispose();
    });

    it("combines with sort, scope and the window", async () => {
        const session = await cast();
        const page = session.data.nodePage({
            matching: { text: "j" },
            sort: { key: "age", descending: true },
            limit: 2,
        });
        assert.deepStrictEqual(ids(page), ["Valjean", "Javert"]);
        assert.strictEqual(page.total, 3);

        await session.selection.apply({ nodes: ["Javert", "Cosette"] });
        assert.deepStrictEqual(ids(session.data.nodePage({ matching: { text: "j" }, scope: "selection" })), ["Javert"]);
        session.dispose();
    });

    it("matches an edge by its endpoints and its values", async () => {
        const session = await cast();
        const byEnd = session.data.edgePage({ matching: { text: "cosette" } });
        assert.strictEqual(byEnd.total, 2);

        const byValue = session.data.edgePage({ matching: { text: "kind:robs" } });
        assert.deepStrictEqual(
            byValue.records.map((edge) => [edge.source, edge.target]),
            [["Jondrette", "Fantine"]],
        );
        session.dispose();
    });
});
