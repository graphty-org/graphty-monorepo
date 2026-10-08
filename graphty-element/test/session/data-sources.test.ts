/**
 * @file `session.data.sources()`: every load still in the graph, with what it added.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

const FRIENDS = "source,target\nAva,Ben\nBen,Cara\nCara,Ava\n";
const MESSAGES = "source,target\nAva,Dan\nDan,Eve\n";

/**
 * Load a CSV text through a draft, as the app does.
 * @param session - the session
 * @param data - the CSV text
 * @param name - the file's name
 * @param mode - replace or merge
 */
async function load(
    session: ReturnType<typeof createGraphSession>,
    data: string,
    name: string,
    mode: "replace" | "merge",
): Promise<void> {
    const draft = await session.data.prepare({ type: "csv", config: { data }, name });
    await draft.load({ mode });
}

/**
 * The parts of each source the tests compare.
 * @param session - the session
 * @returns name, tables and counts per load
 */
function summary(session: ReturnType<typeof createGraphSession>): unknown[] {
    return session.data.sources().map((each) => [each.name, each.type, each.tables, each.added]);
}

describe("session.data.sources", () => {
    it("keeps one entry per load: a merge adds one, undo takes it away, a replace starts again", async () => {
        const session = createGraphSession();
        assert.deepStrictEqual(session.data.sources(), []);

        await load(session, FRIENDS, "friends.csv", "replace");
        await load(session, MESSAGES, "messages.csv", "merge");
        assert.deepStrictEqual(summary(session), [
            ["friends.csv", "csv", ["friends.csv"], { nodes: 3, edges: 3 }],
            ["messages.csv", "csv", ["messages.csv"], { nodes: 2, edges: 2 }],
        ]);
        assert.strictEqual(session.data.source()?.name, "messages.csv", "source() is the last load");

        await session.undo();
        assert.deepStrictEqual(summary(session), [["friends.csv", "csv", ["friends.csv"], { nodes: 3, edges: 3 }]]);
        await session.redo();
        assert.strictEqual(session.data.sources().length, 2);

        await load(session, MESSAGES, "messages.csv", "replace");
        assert.deepStrictEqual(summary(session), [["messages.csv", "csv", ["messages.csv"], { nodes: 3, edges: 2 }]]);
        session.dispose();
    });

    it("keeps every load through a project save and reopen, and a rename names the last", async () => {
        const session = createGraphSession();
        await load(session, FRIENDS, "friends.csv", "replace");
        await load(session, MESSAGES, "messages.csv", "merge");
        await session.data.renameSource("Messages");
        const { text } = await session.project.save();

        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        assert.deepStrictEqual(summary(reopened), [
            ["friends.csv", "csv", ["friends.csv"], { nodes: 3, edges: 3 }],
            ["Messages", "csv", ["messages.csv"], { nodes: 2, edges: 2 }],
        ]);
        session.dispose();
        reopened.dispose();
    });

    it("keeps the unmatched edge rows a load left out, and the rows themselves, through undo, redo, save and reopen", async () => {
        const session = createGraphSession();
        const people = new File(["id\nAva\nBen\n"], "people.csv");
        const passes = new File(["source,target\nAva,Ben\nBen,Zed\n"], "passes.csv");
        const draft = await session.data.prepare({ config: { nodeFile: people, edgeFile: passes } });
        await draft.load({ unmatched: "leave-out" });
        await load(session, MESSAGES, "messages.csv", "merge");
        const [first, second] = session.data.sources();
        const leftOut = { rows: 1, values: 1, edges: [{ source: "Ben", target: "Zed", values: {} }] };
        assert.deepStrictEqual(first?.leftOut, leftOut, "the row itself is kept, not only its count");
        assert.notProperty(second, "leftOut", "a load that left nothing out says nothing");

        await session.undo();
        await session.undo();
        assert.deepStrictEqual(session.data.sources(), []);
        await session.redo();
        assert.deepStrictEqual(session.data.sources()[0]?.leftOut, leftOut);

        const { text } = await session.project.save();
        const reopened = createGraphSession();
        await reopened.project.open(text, { discard: true });
        assert.deepStrictEqual(reopened.data.sources()[0]?.leftOut, leftOut);
        session.dispose();
        reopened.dispose();
    });
});
