/**
 * @file The weight a graph was loaded with and what it means: chosen in the load mapping, kept
 * with the graph (saved in the project file, moved by undo), and read back as one fact.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";
import type { GraphSession, TableMapping } from "../../src/session/types";

const MESSAGES = "from,to,emails\np01,p02,14\np01,p03,9\np02,p03,11\n";
const PLAIN = "source,target\na,b\nb,c\n";

/**
 * Load the messages table with a mapping.
 * @param session - The session.
 * @param mapping - The mapping.
 * @returns Settles once loaded.
 */
async function loadMessages(session: GraphSession, mapping: TableMapping): Promise<void> {
    await session.data.import(
        { type: "csv", config: { data: MESSAGES } },
        { mapping: { rowsAre: "edges", source: "from", target: "to", ...mapping } },
    );
}

describe("session.data.loadedWeight", () => {
    it("reports the weight column and the meaning chosen at load", async () => {
        const session = createGraphSession();
        await loadMessages(session, { weight: "emails", weightMeaning: "strength" });
        assert.deepStrictEqual(session.data.loadedWeight(), { attribute: "emails", meaning: "strength" });
        session.dispose();
    });

    it("reports a null meaning when none was chosen", async () => {
        const session = createGraphSession();
        await loadMessages(session, { weight: "emails" });
        assert.deepStrictEqual(session.data.loadedWeight(), { attribute: "emails", meaning: null });
        session.dispose();
    });

    it("reports none when the graph was loaded without a weight", async () => {
        const session = createGraphSession();
        assert.isNull(session.data.loadedWeight());
        await session.data.import({ type: "csv", config: { data: PLAIN } });
        assert.isNull(session.data.loadedWeight());
        session.dispose();
    });

    it("takes capacity and refuses a meaning it does not know", async () => {
        const session = createGraphSession();
        await loadMessages(session, { weight: "emails", weightMeaning: "capacity" });
        assert.deepStrictEqual(session.data.loadedWeight(), { attribute: "emails", meaning: "capacity" });
        const refused = await loadMessages(session, {
            weight: "emails",
            weightMeaning: "loud" as TableMapping["weightMeaning"],
        }).then(
            () => null,
            (error: unknown) => error as { code?: string },
        );
        assert.strictEqual(refused?.code, "E_BAD_COMMAND");
        session.dispose();
    });

    it("is not inherited by a new graph loaded without a mapping", async () => {
        const session = createGraphSession();
        await loadMessages(session, { weight: "emails", weightMeaning: "strength" });
        // The weight column the first load named stays configured, so the second file's is read.
        await session.data.import({ type: "csv", config: { data: "source,target,emails\na,b,3\n" } });
        assert.deepStrictEqual(session.data.loadedWeight(), { attribute: "emails", meaning: null });
        session.dispose();
    });

    it("moves with undo and redo", async () => {
        const session = createGraphSession();
        await loadMessages(session, { weight: "emails", weightMeaning: "strength" });
        await loadMessages(session, { weight: "emails", weightMeaning: "distance" });
        assert.strictEqual(session.data.loadedWeight()?.meaning, "distance");
        await session.undo();
        assert.strictEqual(session.data.loadedWeight()?.meaning, "strength");
        await session.redo();
        assert.strictEqual(session.data.loadedWeight()?.meaning, "distance");
        session.dispose();
    });

    it("is kept by a saved project", async () => {
        const saved = createGraphSession();
        await loadMessages(saved, { weight: "emails", weightMeaning: "strength" });
        const opened = createGraphSession();
        await opened.project.open((await saved.project.save()).text);
        assert.deepStrictEqual(opened.data.loadedWeight(), { attribute: "emails", meaning: "strength" });
        saved.dispose();
        opened.dispose();
    });
});
