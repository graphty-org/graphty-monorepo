/**
 * @file `session.data.name(id)`: one node's name, the same text `neighbors()` gives it (issue #895).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

describe("session.data.name", () => {
    it("reads the label column, falls back to the id, and agrees with neighbors()", async () => {
        const session = createGraphSession();
        await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
        await session.data.addNodes([
            { id: "j", label: "Javert" },
            { id: "v", label: "Valjean" },
            { id: 7, label: "" },
            { id: "n" },
        ]);
        await session.data.addEdges([
            { source: "j", target: "v" },
            { source: "j", target: 7 },
            { source: "n", target: "j" },
        ]);

        assert.strictEqual(session.data.name("j"), "Javert");
        assert.strictEqual(session.data.name("n"), "n");
        assert.strictEqual(session.data.name(7), "7", "an empty label falls back to the id");
        assert.isUndefined(session.data.name("missing"));
        assert.strictEqual(session.data.name("7"), "7", "an integer id is found in either spelling");
        assert.isUndefined(session.data.name("7.0"), "text that only reads as the number is not an id");

        for (const neighbor of session.data.neighbors("j").records) {
            assert.strictEqual(session.data.name(neighbor.node.id), neighbor.name);
        }

        session.dispose();
    });

    it("falls back to the id as text when no label column is set", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: 1, label: "One" }]);
        assert.strictEqual(session.data.name(1), "1");
        session.dispose();
    });
});

describe("session.data.nodeName and edgeName", () => {
    it("gives the label with its id, falls back to the id, and names an edge by its ends", async () => {
        const session = createGraphSession();
        await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
        await session.data.addNodes([{ id: 71, label: "Ohio" }, { id: 7, label: "" }, { id: "n" }]);
        await session.data.addEdges([{ source: 71, target: 7 }]);

        assert.deepEqual(session.data.nodeName(71), { id: 71, name: "Ohio", labeled: true });
        assert.deepEqual(session.data.nodeName("71"), { id: 71, name: "Ohio", labeled: true }, "either spelling");
        assert.deepEqual(session.data.nodeName(7), { id: 7, name: "7", labeled: false }, "an empty label");
        assert.deepEqual(session.data.nodeName("n"), { id: "n", name: "n", labeled: false }, "no label value");
        assert.deepEqual(session.data.nodeName("gone"), { id: "gone", name: "gone", labeled: false });

        const [edge] = session.data.edges();
        const expected = { source: session.data.nodeName(71), target: session.data.nodeName(7) };
        assert.deepEqual(session.data.edgeName(edge.id), expected);
        assert.deepEqual(session.data.edgeName({ source: 71, target: 7 }), expected);
        assert.isUndefined(session.data.edgeName("999999"), "an edge id the graph has no edge for");

        session.dispose();
    });

    it("gives the id as the name when no label column is set", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: 1, label: "One" }]);
        assert.deepEqual(session.data.nodeName(1), { id: 1, name: "1", labeled: false });
        session.dispose();
    });
});
