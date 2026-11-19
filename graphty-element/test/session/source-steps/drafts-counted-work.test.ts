/**
 * @file What a draft of the sources and steps costs: each act builds the draft's value once and
 * dispatches nothing, and its commit writes only what changed, so a one-cell pick committed on a
 * graph four times larger retains the same bytes.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { dispatcherOf } from "../../../src/session/dispatchers";
import { build } from "../../../src/session/sources/steps/build";
import { assertScalesLinearly } from "../../helpers/cost";

vi.mock("../../../src/session/sources/steps/build", async (original) => {
    const real = await original<typeof import("../../../src/session/sources/steps/build")>();
    return { ...real, build: vi.fn(real.build) };
});

/**
 * Two people files of `size` rows each, the second merged onto the first on its key: their amt
 * cells meet on every node.
 * @param size - How many rows each holds.
 * @returns The session and the second file's source.
 */
async function people(size: number): Promise<{ session: GraphSession; b: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    const rows = (amt: number): string =>
        Array.from({ length: size }, (_, i) => `p${String(i)},${String(i + amt)}`).join("\n");
    await session.data.import(
        { type: "csv", config: { data: `id,amt\n${rows(0)}` }, name: "crm.csv" },
        { key: "id", type: "person" },
    );
    const b = await session.data.stage(
        { type: "csv", config: { data: `id,amt\n${rows(1)}` }, name: "erp.csv" },
        {
            key: "id",
            type: "person",
        },
    );
    await session.data.add(b, { overlap: "merge" });
    return { session, b };
}

describe("source-steps drafts: counted work", () => {
    it("each draft act builds the draft once and dispatches nothing", async () => {
        const { session, b } = await people(20);
        const builds = vi.mocked(build);
        const dispatcher = dispatcherOf(session);
        let sent = 0;
        dispatcher.events.dispatched = () => {
            sent++;
        };
        const d = session.data.draft();
        const step = d
            .steps()
            .map((s) => s.source === b)
            .lastIndexOf(true);
        const acts: (() => void)[] = [
            () => d.pick({ space: "person", key: "p1" }, "amt", b),
            () => d.editStep(step, { clash: { amt: "overwrite" } }),
            () => d.renameColumn({ kind: "node", name: "amt" }, "amount", { source: b }),
            () => d.declareType({ name: "vip", kind: "node", rules: [{ source: b }] }),
            () => d.removeStep(step),
        ];
        for (const act of acts) {
            builds.mockClear();
            act();
            assert.strictEqual(builds.mock.calls.length, 1, `one build for act ${String(acts.indexOf(act))}`);
        }
        assert.strictEqual(sent, 0, "no act dispatches");
        d.dispose();
        session.dispose();
    });

    it("an add that asks the overlap question builds the draft once; its answer builds it once and two more per asked source; neither dispatches", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "id,amt\np1,1\np2,2" }, name: "crm.csv" },
            { key: "id", type: "person" },
        );
        const b = await session.data.stage(
            { type: "csv", config: { data: "id,amt\np1,3\np9,4" }, name: "erp.csv" },
            { key: "id", type: "person" },
        );
        const builds = vi.mocked(build);
        const dispatcher = dispatcherOf(session);
        let sent = 0;
        dispatcher.events.dispatched = () => {
            sent++;
        };
        const d = session.data.draft({ askOverlap: true });
        d.preview();
        builds.mockClear();
        d.add(b);
        assert.strictEqual(builds.mock.calls.length, 1, "the add builds the draft once");
        assert.lengthOf(d.preview().questions, 1);
        builds.mockClear();
        d.answerOverlap(b, "merge");
        // Each asked source is worked out again as data.add would add it: the value before its add,
        // and that value with it added.
        assert.strictEqual(builds.mock.calls.length, 1 + 2, "the draft once, and two for the one asked source");
        assert.strictEqual(sent, 0, "neither dispatches");
        d.dispose();
        session.dispose();
    });

    it("a committed one-cell pick retains the same bytes however large the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const { session, b } = await people(size);
                const d = session.data.draft();
                d.pick({ space: "person", key: "p1" }, "amt", b);
                await d.commit();
                const bytes = session.history.steps.at(-1)?.bytes ?? 0;
                session.dispose();
                return bytes;
            },
            { sizes: [500, 2_000], growth: "constant", counter: "bytes the commit's step retains" },
        );
    });
});
