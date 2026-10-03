/**
 * @file `session.data.find`: what a find box lists as the reader types, without selecting anything.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isGraphtyError } from "../../session";

/**
 * A small cast: nodes carry a name and a group, edges a kind.
 * @returns The session, loaded.
 */
async function cast(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "n1", name: "Valjean", group: 2 },
        { id: "n2", name: "Javert", group: 2 },
        { id: "n3", name: "Fantine", group: 3 },
        { id: "val", name: "Cosette", group: 2 },
        { id: "n5", name: "Valjeanne", group: 4 },
    ]);
    await session.data.addEdges([
        { source: "n1", target: "n2", kind: "enemies" },
        { source: "n1", target: "val", kind: "family" },
    ]);
    await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });
    return session;
}

describe("finding without selecting", () => {
    it("lists node hits by label with the attribute that matched, and changes nothing", async () => {
        const session = await cast();
        const { version } = session.history;

        const found = session.data.find("valjean");

        assert.deepEqual(
            found.elements.map((hit) => [hit.kind, hit.id, hit.label, hit.matched.path, hit.matched.value]),
            [
                ["node", "n1", "Valjean", "data.name", "Valjean"],
                ["node", "n5", "Valjeanne", "data.name", "Valjeanne"],
            ],
            "the exact name ranks before a longer one",
        );
        assert.strictEqual(found.total, 2);
        assert.lengthOf(session.selection.nodes, 0, "the selection did not change");
        assert.strictEqual(session.history.version, version, "no step was recorded");
        session.dispose();
    });

    it("ranks an exact id or name first, then names that start with the text, then the rest", async () => {
        const session = await cast();

        const found = session.data.find("val");

        assert.deepEqual(
            found.elements.map((hit) => [hit.id, hit.matched.path]),
            [
                ["val", "id"],
                ["n1", "data.name"],
                ["n5", "data.name"],
            ],
        );
        session.dispose();
    });

    it("finds edges by their values, named by their ends", async () => {
        const session = await cast();

        const found = session.data.find("enem", { kinds: ["edge"] });

        assert.lengthOf(found.elements, 1);
        const [hit] = found.elements;
        assert.strictEqual(hit.kind, "edge");
        assert.deepEqual(hit.matched, { path: "data.kind", value: "enemies" });
        assert.strictEqual(hit.label, "Valjean -> Javert");
        assert.strictEqual(hit.kind === "edge" ? session.data.edge(hit.id)?.source : undefined, "n1");
        assert.deepEqual(found.values, [], "only the kinds asked for");
        session.dispose();
    });

    it("lists one row per matched value, with the count scope.count gives and a rule to select it", async () => {
        const session = await cast();

        const found = session.data.find("2", { kinds: ["value"] });

        assert.deepEqual(found.elements, []);
        assert.lengthOf(found.values, 1);
        const [row] = found.values;
        assert.deepInclude(row, { kind: "node", path: "data.group", value: 2, count: 3 });
        const counted = await session.scope.count({ where: row.where });
        assert.strictEqual(counted.nodes, row.count);

        await session.selection.apply({ where: row.where });
        assert.deepEqual([...session.selection.nodes].sort(), ["n1", "n2", "val"]);
        session.dispose();
    });

    it("lists edge value rows whose rule selects exactly the counted edges", async () => {
        const session = await cast();

        const [row] = session.data.find("family", { kinds: ["value"] }).values;

        assert.deepInclude(row, { kind: "edge", path: "data.kind", value: "family", count: 1 });
        await session.selection.apply({ where: row.where });
        assert.lengthOf(session.selection.edges, row.count);
        assert.lengthOf(session.selection.nodes, 0);
        session.dispose();
    });

    it("never matches an edge by the counter id the element assigned it", async () => {
        const session = await cast();

        const found = session.data.find("1", { kinds: ["edge"] });

        assert.deepEqual(found.elements, [], 'edge ids are "0" and "1", which no reader typed');
        session.dispose();
    });

    it("says when a filter leaves a hit out", async () => {
        const session = await cast();
        await session.visibility.set({ kind: "member", of: { nodes: ["n2", "n3"] } });

        const found = session.data.find("javert");
        const hidden = session.data.find("valjean").elements[0];

        assert.isUndefined(found.elements[0].excludedBy);
        assert.strictEqual(hidden.excludedBy, "filter");
        session.dispose();
    });

    it("stops at the limit but reports the total, and finds nothing for blank text", async () => {
        const session = await cast();

        const found = session.data.find("n", { limit: 2, kinds: ["node"] });

        assert.lengthOf(found.elements, 2);
        assert.isAbove(found.total, 2);
        assert.deepEqual(session.data.find("   "), { elements: [], values: [], total: 0 });
        session.dispose();
    });

    it("falls back to the id as the label when no label attribute is set", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "ada" }]);

        assert.deepEqual(session.data.find("ADA").elements[0], {
            kind: "node",
            id: "ada",
            label: "ada",
            matched: { path: "id", value: "ada" },
        });
        session.dispose();
    });

    it("refuses a limit that is not a whole number", async () => {
        const session = await cast();
        let code: unknown;
        try {
            session.data.find("v", { limit: -1 });
        } catch (error) {
            code = isGraphtyError(error) ? error.code : error;
        }
        assert.strictEqual(code, "E_OPTION_RANGE");
        session.dispose();
    });
});
