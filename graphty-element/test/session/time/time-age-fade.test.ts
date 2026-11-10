/**
 * Fade by age: the `ageFade` setting, what the renderer reads for it (each edge's start and the
 * window, normalized over the extent), the notice where it cannot apply, and how it is saved.
 * test/browser/edge-age-fade.test.ts draws it.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import { isGraphtyError } from "../../../src/errors";
import { SLICED_ROWS } from "../../../src/session/time/timeIndex";
import type { ElementSession } from "../../../src/session/types";

const ON = { features: ["timeline"] };

/**
 * A session whose five edges start at 0, 10, 20, 30 and 40, and whose nodes start at 0.
 * @param features - The experiments it runs with.
 * @param features.features - The ids.
 * @returns The session, as the renderer reads it.
 */
async function edges(features: { readonly features: readonly string[] } = ON): Promise<ElementSession> {
    const session = createGraphSession(features) as ElementSession;
    await session.data.addNodes(Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}`, t: 0 })));
    await session.data.addEdges(
        Array.from({ length: 5 }, (_, i) => ({ src: `n${String(i)}`, dst: `n${String(i + 1)}`, t: i * 10 })),
    );
    return session;
}

/**
 * The age fade notices a session holds.
 * @param session - The session.
 * @returns Their reasons.
 */
function inactive(session: ElementSession): unknown[] {
    return session.time
        .notices()
        .filter((notice) => notice.code === "time.age-fade-inactive")
        .map((notice) => notice.params.reason);
}

describe("fade by age", () => {
    it("draws no fade by default", async () => {
        const session = await edges();
        await session.time.setField({ edges: { start: "t", unit: "ordinal" } });
        await session.time.window({ from: 0, to: 30 });
        assert.strictEqual(session.time.settings.ageFade, 1);
        assert.isNull(session.edgeAges());
        assert.deepEqual(inactive(session), []);
    });

    it("hands the renderer each edge's start and the window over the extent", async () => {
        const session = await edges();
        await session.time.setField({ edges: { start: "t", unit: "ordinal" } });
        await session.time.setSettings({ ageFade: 0.2 });
        await session.time.ready;

        const idle = session.edgeAges();
        assert.isNotNull(idle);
        assert.strictEqual(idle.fade, 1, "no window, no fade");

        await session.time.window({ from: 10, to: 30 });
        const aged = session.edgeAges();
        assert.isNotNull(aged);
        // The extent runs from 0 to just past 40: 41 units.
        assert.deepEqual(
            [...aged.ages].map((age) => Math.round(age * 41)),
            [0, 10, 20, 30, 40],
        );
        assert.closeTo(aged.from, 10 / 41, 1e-9);
        assert.closeTo(aged.to, 30 / 41, 1e-9);
        assert.strictEqual(aged.fade, 0.2);

        await session.time.stepBy(1);
        const stepped = session.edgeAges();
        assert.strictEqual(stepped?.ages, aged.ages, "a step reads the same ages");
        assert.isAbove(stepped?.from ?? 0, aged.from);
        assert.deepEqual(inactive(session), []);
    });

    it("refuses an opacity outside 0 to 1", async () => {
        const session = await edges();
        for (const ageFade of [-0.1, 1.5, Number.NaN]) {
            const refusal: unknown = await session.time.setSettings({ ageFade }).catch((error: unknown) => error);
            assert.isTrue(isGraphtyError(refusal) && refusal.code === "E_BAD_COMMAND", String(ageFade));
        }

        assert.strictEqual(session.time.settings.ageFade, 1);
    });

    it("says why it does nothing: no edge time, spells, ghosts", async () => {
        const nodesOnly = await edges();
        await nodesOnly.time.setField({ nodes: { start: "t", unit: "ordinal" } });
        await nodesOnly.time.setSettings({ ageFade: 0.5 });
        assert.deepEqual(inactive(nodesOnly), ["no-edge-time"]);
        assert.isNull(nodesOnly.edgeAges());

        const spells = createGraphSession(ON) as ElementSession;
        await spells.data.addNodes([{ id: "a" }, { id: "b" }]);
        await spells.data.addEdges([{ src: "a", dst: "b", t: 1, s: [[1, 3]] }]);
        await spells.time.setField({ edges: { start: "t", spells: "s", unit: "ordinal" } });
        await spells.time.setSettings({ ageFade: 0.5 });
        assert.deepEqual(inactive(spells), ["spells"]);
        assert.isNull(spells.edgeAges());

        const ghost = await edges();
        await ghost.time.setField({ edges: { start: "t", unit: "ordinal" } });
        await ghost.time.setSettings({ ageFade: 0.5 });
        assert.isNotNull(ghost.edgeAges());
        await ghost.time.setSettings({ outside: "ghost" });
        assert.deepEqual(inactive(ghost), ["ghost"], "switching to ghosts after saving a fade");
        assert.isNull(ghost.edgeAges());
    });

    it("is saved with the project and restored", async () => {
        const session = await edges();
        await session.time.setField({ edges: { start: "t", unit: "ordinal" } });
        await session.time.setSettings({ ageFade: 0.3 });
        const { text } = await session.project.save();

        const reopened = createGraphSession(ON) as ElementSession;
        await reopened.project.open(text);
        assert.strictEqual(reopened.time.settings.ageFade, 0.3);
    });

    it("with the timeline off, keeps a saved fade and draws none", async () => {
        const session = await edges();
        await session.time.setField({ edges: { start: "t", unit: "ordinal" } });
        await session.time.setSettings({ ageFade: 0.3 });
        await session.time.window({ from: 0, to: 30 });
        const { text } = await session.project.save();

        const off = createGraphSession({ features: [] }) as ElementSession;
        await off.project.open(text);
        assert.isNull(off.edgeAges());
        assert.include((await off.project.save()).text, '"ageFade":0.3');

        // A value the flag would refuse is not checked while it is off: it stays as it came.
        const odd = text.replace('"ageFade":0.3', '"ageFade":2');
        const offOdd = createGraphSession({ features: [] }) as ElementSession;
        await offOdd.project.open(odd);
        const kept = (await offOdd.project.save()).text;
        assert.include(kept, '"ageFade":2');
        assert.include(kept, '"playback"');
    });

    it("keeps fading while new edges are merged in", async () => {
        // Enough rows that the index merges new edges a slice at a time, after the add returns.
        const session = createGraphSession(ON) as ElementSession;
        await session.data.addNodes(Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}` })));
        await session.data.addEdges(
            Array.from({ length: SLICED_ROWS }, (_, i) => ({
                src: `n${String(i % 5)}`,
                dst: `n${String((i % 5) + 1)}`,
                t: i % 41,
            })),
        );
        await session.time.setField({ edges: { start: "t", unit: "ordinal" } });
        await session.time.setSettings({ ageFade: 0.2 });
        await session.time.window({ from: 10, to: 30 });
        await session.time.ready;
        const before = session.edgeAges();
        assert.isNotNull(before);

        const adding = session.data.addEdges([{ src: "n0", dst: "n5", t: 50 }]);
        assert.isNotNull(session.edgeAges(), "while the edges arrive");
        await adding;
        assert.isNotNull(session.edgeAges(), "while the index merges them");
        await session.time.ready;

        const after = session.edgeAges();
        assert.isNotNull(after);
        assert.notStrictEqual(after.ages, before.ages, "the merge rewrites the ages");
        assert.strictEqual(after.ages.length, SLICED_ROWS + 1);
    });
});
