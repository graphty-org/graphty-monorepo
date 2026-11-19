/**
 * @file With the source-steps experiment off nothing of it runs: a fixed load sequence gives the
 * same `sources()`, the same `data:changed` events and the same saved bytes as before the
 * experiment existed. The pinned digest was taken with the experiment off; a change to it is a
 * change to what every consumer gets today.
 */

import { createHash } from "node:crypto";

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

/** Saved text with its clock readings blanked, so two runs compare. */
const CLOCK = /"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z"/gu;

/** The session member's id, minted per session. */
const SESSION_ID = /"kind":"graphty-session","version":1,"id":"[0-9a-f]+"/u;

/**
 * Load the fixed sequence and read what it left.
 * @param session - The session.
 * @returns The sources, the events and the saved text.
 */
async function run(session: GraphSession): Promise<{ sources: unknown; events: unknown[]; saved: string }> {
    const events: unknown[] = [];
    session.on("data:changed", (change) => events.push(change));
    await session.data.import({ type: "csv", config: { data: "source,target\na,b\nb,c\n" }, name: "one.csv" });
    await session.data.import(
        { type: "csv", config: { data: "source,target\nc,d\n" }, name: "two.csv" },
        { mode: "merge" },
    );
    await session.data.addNodes([{ id: "x", score: 1 }]);
    await session.data.updateNodes([{ id: "a", values: { score: 2 } }]);
    await session.undo();
    const sources = session.data.sources().map(({ loadedAt: _, ...each }) => each);
    const { text } = await session.project.save();
    return {
        sources,
        events,
        saved: text.replaceAll(CLOCK, '"T"').replace(SESSION_ID, '"kind":"graphty-session","version":1,"id":"I"'),
    };
}

describe("source-steps off: nothing changes", () => {
    it("gives the pinned sources, events and saved bytes", async () => {
        const session = createGraphSession();
        const { sources, events, saved } = await run(session);
        assert.notInclude(saved, "sourceSteps");
        assert.notInclude(saved, "join.add");
        const digest = createHash("sha256").update(JSON.stringify({ sources, events, saved })).digest("hex");
        assert.strictEqual(digest, "1d38ec94e541d1374075eefbaafa10cd3fe1a6c61b1587f9d138e0e8528c00b5");
        session.dispose();
    });
});
