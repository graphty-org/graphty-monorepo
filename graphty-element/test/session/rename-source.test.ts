/**
 * @file `session.data.renameSource(name)`: one undoable step, saved with the project (issue #894).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { isGraphtyError } from "../../src/errors";

const DATA = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });

/**
 * The code a call rejected with.
 * @param call - the call
 * @returns the code, or null when it settled
 */
async function codeOf(call: () => Promise<unknown>): Promise<unknown> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? [error.code, (error.details as { reason?: unknown }).reason] : error;
    }

    return null;
}

describe("session.data.renameSource", () => {
    it("renames the source as one undo step, and undo restores the old name", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: DATA }, name: "lesmis.json" });
        assert.strictEqual(session.data.source()?.name, "lesmis.json");

        await session.data.renameSource("Les Miserables characters");
        assert.strictEqual(session.data.source()?.name, "Les Miserables characters");
        assert.strictEqual(session.data.source()?.type, "json", "only the name changes");

        await session.undo();
        assert.strictEqual(session.data.source()?.name, "lesmis.json");
        await session.redo();
        assert.strictEqual(session.data.source()?.name, "Les Miserables characters");
        session.dispose();
    });

    it("keeps the name through a project save and reopen", async () => {
        const source = createGraphSession();
        await source.data.import({ type: "json", config: { data: DATA }, name: "lesmis.json" });
        await source.data.renameSource("Characters");
        const { text } = await source.project.save();

        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        assert.strictEqual(reopened.data.source()?.name, "Characters");
        source.dispose();
        reopened.dispose();
    });

    it("refuses with a coded error when no source is loaded, or for an empty name", async () => {
        const session = createGraphSession();
        assert.deepStrictEqual(await codeOf(() => session.data.renameSource("x")), ["E_BAD_COMMAND", "no-source"]);

        await session.data.import({ type: "json", config: { data: DATA } });
        assert.deepStrictEqual(await codeOf(() => session.data.renameSource("  ")), ["E_BAD_COMMAND", "empty-name"]);
        session.dispose();
    });
});
