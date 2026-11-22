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
        // Pinned off, so the On test configuration (every experiment on) checks the off path too.
        const session = createGraphSession({ features: [] });
        const { sources, events, saved } = await run(session);
        assert.notInclude(saved, "sourceSteps");
        assert.notInclude(saved, "join.add");
        assert.notInclude(saved, '"joins"', "no sources and steps in the sources member");
        const digest = createHash("sha256").update(JSON.stringify({ sources, events, saved })).digest("hex");
        assert.strictEqual(digest, "c2a513501e341417c4cbcafe2c8e03a71346320259fafcc707dc8ddfb682669c");
        session.dispose();
    });

    it("refuses a draft with E_FEATURE_OFF, publishes no draft event, and refuses no write or undo", async () => {
        const session = createGraphSession({ features: [] });
        const drafts: unknown[] = [];
        session.on("data:draft-changed", (change) => drafts.push(change));
        for (const call of [() => session.data.draft(), () => session.data.currentDraft()]) {
            let code: unknown = null;
            try {
                call();
            } catch (error) {
                ({ code } = error as { code?: string });
            }
            assert.strictEqual(code, "E_FEATURE_OFF");
        }
        await session.data.addNodes([{ id: "a" }]);
        await session.undo();
        assert.strictEqual(session.data.store.getSnapshot().ids.size, 0);
        assert.deepStrictEqual(drafts, []);
        session.dispose();
    });

    it("writes today's starting rows, and graphty.draft reads nothing", async () => {
        const session = createGraphSession({ features: [] });
        await session.data.import({ type: "csv", config: { data: "source,target\na,b\n" }, name: "one.csv" });
        await session.config.set({ startingRows: true });
        await session.styles.settled();
        const rows = session.styles
            .list()
            .map(({ id: _, row: _row, ...each }) => each)
            .sort((x, y) => `${x.name}${x.target}`.localeCompare(`${y.name}${y.target}`));
        assert.deepStrictEqual(
            session.styles.tree().map((each) => each.name),
            ["Everything", "Selected", "Hovered"],
        );
        assert.notInclude(JSON.stringify(rows), "graphty:source-draft");
        // Taken with the experiment off: the rows as every consumer gets them today.
        const digest = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
        assert.strictEqual(digest, "9d21404bf9d223b6fcdf0ee1ea1ae9a30a5c5fff1d77731f903a6e38f5e4a551");
        const reads = await session.styles.add({
            name: "Draft",
            target: "node",
            selector: { match: "expression", where: "graphty.draft == 'unchanged'" },
            set: { "node.size": 2 },
        });
        assert.strictEqual(session.styles.counts(reads.id).matched, 0);
        session.dispose();
    });

    it("refuses the data.steps-set command with E_FEATURE_OFF and leaves the graph and the file as they were", async () => {
        const session = createGraphSession({ features: [] });
        const before = (await session.project.save()).text;
        await session
            .execute({
                op: "data.steps-set",
                edit: {
                    kind: "add",
                    source: {
                        id: "src_x",
                        origin: { copy: "c" },
                        mapping: { nodes: { key: "id" } },
                        kind: "file",
                        label: "x",
                        tables: [],
                    },
                },
                copies: { c: { nodes: [{ id: "a" }, { id: "b" }] } },
            })
            .then(
                () => assert.fail("refused"),
                (error: unknown) => assert.strictEqual((error as { code?: string }).code, "E_FEATURE_OFF"),
            );
        assert.strictEqual(session.data.store.getSnapshot().ids.size, 0);
        assert.strictEqual(
            (await session.project.save()).text.replaceAll(CLOCK, '"T"'),
            before.replaceAll(CLOCK, '"T"'),
        );
        session.dispose();
    });
});
