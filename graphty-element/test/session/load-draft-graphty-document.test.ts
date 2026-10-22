/**
 * @file A graphty document handed to `data.prepare` instead of `project.open`: it is refused with
 * E_PROJECT_FILE_AS_DATA, naming `project.open`, so a caller can open it, while a data file's draft
 * names no graphty document.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

describe("LoadDraft.graphtyDocument", () => {
    it("refuses a saved project read as data, naming project.open", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        const { text } = await session.project.save();

        const refused = await session.data.prepare({ config: { data: text }, name: "saved.graphty.json" }).then(
            () => null,
            (error: unknown) => error as { code?: string; details?: unknown },
        );

        assert.strictEqual(refused?.code, "E_PROJECT_FILE_AS_DATA");
        assert.deepStrictEqual(refused?.details, { kind: "graphty-document", use: "project.open" });
    });

    it("refuses a graphty document that is not a project, read from a file", async () => {
        const session = createGraphSession();
        const notes = JSON.stringify({ kind: "graphty-document", version: 1, members: [] });
        const file = new File([notes], "empty.graphty.json", { type: "application/json" });

        const refused = await session.data.prepare({ config: { file }, name: file.name }).then(
            () => null,
            (error: unknown) => (error as { code?: string }).code,
        );

        assert.strictEqual(refused, "E_PROJECT_FILE_AS_DATA");
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
