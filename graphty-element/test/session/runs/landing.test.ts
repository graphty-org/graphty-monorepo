/**
 * @file `runs.landing(runId)`: what a run's suggested style applied, held back, or took over.
 *
 * A run paints itself on its first completion, and two things about that moment were silent: a
 * suggestion an authored layer already drives on every element was dropped without a word, and a
 * run whose color now covers an earlier run's color gave no sign that the earlier picture had
 * gone beneath it. A reader then looked at the old colors and never saw the new result. The
 * landing report is what a consumer reads to say "Louvain now colors the drawing; PageRank moved
 * below" -- or "held back: your layer already colors every node".
 */

import { assert, describe, it } from "vitest";

import type { RunId } from "../../../src/catalog/types";
import type { GraphSession } from "../../../src/session/types";
import { fixtureSession } from "../history/fixture-session";

/**
 * The ids of the layers a run painted.
 * @param session - The session.
 * @param runId - The run.
 * @returns The layer ids, bottom first.
 */
function layerIdsOf(session: GraphSession, runId: RunId): string[] {
    return session.styles
        .list()
        .filter((each) => each.source.by === "run" && each.source.runId === runId)
        .map((each) => each.id);
}

describe("what a run's suggested style did when it landed", () => {
    it("lists the channels a run painted", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { as: "deg", style: { size: true } });

        assert.deepStrictEqual(session.runs.landing("deg"), {
            applied: ["node.color", "node.size"],
            withheld: [],
            tookOver: [],
        });
        session.dispose();
    });

    it("reports a suggestion held back by an authored layer, naming the layer", async () => {
        const session = await fixtureSession();
        const mine = await session.styles.add({
            name: "Everything blue",
            selector: { match: "everything" },
            set: { "node.color": "#0000ff" },
        });

        await session.runs.start("degree", {}, { as: "deg" });

        assert.deepStrictEqual(session.runs.landing("deg"), {
            applied: [],
            withheld: [{ channel: "node.color", byLayer: mine.id }],
            tookOver: [],
        });
        session.dispose();
    });

    it("lands on top of an earlier run and says which run it took the channel from", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { as: "deg" });
        await session.runs.start("pagerank", {}, { as: "pr" });

        const ids = session.styles.list().map((each) => each.id);
        assert.isAbove(ids.indexOf(layerIdsOf(session, "pr")[0]), ids.indexOf(layerIdsOf(session, "deg")[0]));
        assert.deepStrictEqual(session.runs.landing("pr")?.tookOver, [{ channel: "node.color", from: "deg" }]);
        assert.deepStrictEqual(session.runs.landing("deg")?.tookOver, [], "the earlier run took nothing over");
        session.dispose();
    });

    it("reports a sweep's held-back suggestion against the member that would have painted", async () => {
        const session = await fixtureSession();
        const mine = await session.styles.add({
            name: "Everything blue",
            selector: { match: "everything" },
            set: { "node.color": "#0000ff" },
        });

        await session.runs.batch([
            { algorithm: "degree", as: "deg" },
            { algorithm: "pagerank", as: "pr" },
        ]);

        assert.deepStrictEqual(session.runs.landing("pr")?.withheld, [{ channel: "node.color", byLayer: mine.id }]);
        assert.deepStrictEqual(session.runs.landing("pr")?.applied, []);
        session.dispose();
    });

    it("has nothing to report for a run that is unknown or not finished", async () => {
        const session = await fixtureSession();

        assert.isUndefined(session.runs.landing("nope"));
        session.dispose();
    });

    it("reports nothing applied for a run started with the picture turned off", async () => {
        const session = await fixtureSession();

        await session.runs.start("degree", {}, { as: "deg", style: false });

        assert.deepStrictEqual(session.runs.landing("deg"), { applied: [], withheld: [], tookOver: [] });
        session.dispose();
    });
});

/**
 * The example in `docs/guide/algorithms.md`, "What a run changed", with `element.session` as the
 * session and `element.run(...)` as `session.runs.start(...)`, which it forwards to.
 */
describe("the algorithms guide's landing example", () => {
    it("runs as written", async () => {
        const session = await fixtureSession();
        await session.runs.start("degree", {}, { as: "degree" });

        const run = session.runs.start("pagerank", {}, { as: "pagerank" });
        await run;

        const landing = session.runs.landing(run.id);
        const notes: string[] = [];
        for (const { channel, from } of landing?.tookOver ?? []) {
            notes.push(`${run.label} now paints ${channel}; ${from} moved below`);
        }
        for (const { channel, byLayer } of landing?.withheld ?? []) {
            notes.push(`${run.label} left ${channel} alone: layer ${byLayer} already paints it`);
        }

        assert.deepStrictEqual(landing?.applied, ["node.color"]);
        assert.lengthOf(notes, 1);
        assert.match(notes[0], /now paints node\.color; degree moved below$/);
        session.dispose();
    });
});
