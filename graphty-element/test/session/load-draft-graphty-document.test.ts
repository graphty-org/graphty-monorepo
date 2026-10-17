/**
 * @file A graphty document handed to `data.prepare` instead of `project.open`: the draft says
 * which kind it is, so a caller can open it, while a data file's draft says nothing.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

describe("LoadDraft.graphtyDocument", () => {
    it("names a saved project read as data, whose load would find nothing", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        const { text } = await session.project.save();

        const draft = await session.data.prepare({ config: { data: text }, name: "saved.graphty.json" });

        assert.strictEqual(draft.graphtyDocument, "project");
        const refused = await draft.report().then(
            () => null,
            (error: unknown) => (error as { code?: string }).code,
        );
        assert.strictEqual(refused, "E_EMPTY_LOAD");
    });

    it("names a graphty document that is not a project, read from a file", async () => {
        const session = createGraphSession();
        const notes = JSON.stringify({ kind: "graphty-document", version: 1, members: [] });
        const file = new File([notes], "empty.graphty.json", { type: "application/json" });

        const draft = await session.data.prepare({ config: { file }, name: file.name });

        assert.strictEqual(draft.graphtyDocument, "document");
    });

    it("is absent for a data file", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({
            config: { data: JSON.stringify({ nodes: [{ id: "a" }], links: [] }) },
            name: "graph.json",
        });

        assert.isUndefined(draft.graphtyDocument);
    });
});
