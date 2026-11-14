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
