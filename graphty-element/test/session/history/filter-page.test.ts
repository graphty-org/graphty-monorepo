/**
 * @file A record page read after a history move that changed the filter lists what the filter
 * leaves now: undo, redo and restoreTo all move the visible scope a page reads.
 */

import { afterEach, assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";

const sessions: GraphSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * Five nodes, loaded.
 * @returns The session.
 */
async function five(): Promise<GraphSession> {
    const session = createGraphSession();
    sessions.push(session);
    await session.data.addNodes(["a", "b", "c", "d", "e"].map((id) => ({ id })));
    return session;
}

/**
 * The ids and the total of the visible node page.
 * @param session - The session.
 * @returns What the page lists.
 */
function visible(session: GraphSession): { ids: unknown[]; total: number } {
    const page = session.data.nodePage({ scope: "visible" });
    return { ids: page.records.map((record) => record.id), total: page.total };
}

describe("a record page after a history move", () => {
    it("follows undo and redo of a filter change", async () => {
        const session = await five();
        await session.visibility.set({ kind: "member", of: { nodes: ["a", "b", "c"] } });
        assert.deepEqual(visible(session), { ids: ["a", "b", "c"], total: 3 });
        await session.visibility.set({ kind: "member", of: { nodes: ["d"] } });
        assert.deepEqual(visible(session), { ids: ["d"], total: 1 });

        await session.undo();
        assert.deepEqual(visible(session), { ids: ["a", "b", "c"], total: 3 }, "after undo");
        await session.redo();
        assert.deepEqual(visible(session), { ids: ["d"], total: 1 }, "after redo");
    });

    it("follows restoreTo, with and without dropping the redo steps", async () => {
        for (const redo of ["keep", "drop"] as const) {
            const session = await five();
            await session.visibility.set({ kind: "member", of: { nodes: ["a", "b", "c"] } });
            const before = session.history.steps.at(-1)?.id ?? null;
            assert.deepEqual(visible(session), { ids: ["a", "b", "c"], total: 3 });
            await session.visibility.set({ kind: "member", of: { nodes: ["e"] } });
            assert.deepEqual(visible(session), { ids: ["e"], total: 1 });

            await session.history.restoreTo(before, redo === "drop" ? { redo: "drop" } : undefined);
            assert.deepEqual(visible(session), { ids: ["a", "b", "c"], total: 3 }, `restoreTo, redo ${redo}`);
        }
    });
});
