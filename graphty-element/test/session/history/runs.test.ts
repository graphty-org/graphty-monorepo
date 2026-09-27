/**
 * @file Runs as steps: a finished run, its result and its layers are one step; undo keeps the
 * result instead of computing it again; undo while a run is still going cancels it, and a run
 * cancelled that way, or any way, never writes anything, however late its work finishes.
 *
 * The runs here are the fixture session's fake `degree` and `shortest-path`, with a gate in front
 * of `betweenness` that holds its work until the test opens it. The held work ignores the signal
 * the run is cancelled with, as an accelerator's kernel does, so a cancelled run's value still
 * arrives late. See design/undo/undo-design.md sections 4.8 and 6.1 to 6.3.
 */

import { assert, describe, it } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import type { RunChange } from "../../../src/session/runs";
import type { ElementSession, GraphSession } from "../../../src/session/types";
import { fixtureSession } from "./fixture-session";

/** A session whose `betweenness` runs wait for the test, and a count of the work started. */
interface Gated {
    readonly session: GraphSession;
    /** Let every held run finish. */
    open(): void;
    /** How many runs have started their work. */
    calls(): number;
}

/**
 * The fixture session, with `betweenness` held back until `open()`.
 * @returns The session and its gate.
 */
async function gated(): Promise<Gated> {
    let open: () => void = () => undefined;
    const opened = new Promise<void>((resolve) => {
        open = resolve;
    });
    let calls = 0;
    const session = await fixtureSession(undefined, async (context, fake) => {
        calls++;
        if (context.algorithm === "betweenness") {
            await opened;
        }

        return fake();
    });

    return { session, open, calls: () => calls };
}

/**
 * Let queued work start, and the passes after it run. Not `styles.settled()`, which waits for the
 * queue to empty and so for a held run.
 * @param session - The session.
 */
async function idle(session: GraphSession): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    await dispatcherOf(session as ElementSession).lane.settled();
}

/**
 * The layers bound to one run.
 * @param session - The session.
 * @param runId - The run.
 * @returns Their ids.
 */
function layersOf(session: GraphSession, runId: string): string[] {
    return session.styles
        .list()
        .filter((layer) => layer.source.by === "run" && layer.source.runId === runId)
        .map((layer) => layer.id);
}

/**
 * The `runs` slice's entry for a run.
 * @param session - The session.
 * @param runId - The run.
 * @returns The entry, or undefined.
 */
function entryOf(session: GraphSession, runId: string): unknown {
    return dispatcherOf(session as ElementSession).state.runs.get(runId);
}

describe("a run is one step", () => {
    it("records the run, its result and its layer as one step, and one undo takes all three", async () => {
        const { session } = await gated();

        await session.runs.start("degree", {}, { as: "deg" });

        assert.lengthOf(session.history.steps, 1);
        assert.isDefined(entryOf(session, "deg"));
        assert.lengthOf(layersOf(session, "deg"), 1);

        await session.undo();

        assert.isUndefined(entryOf(session, "deg"));
        assert.deepEqual(layersOf(session, "deg"), []);
        assert.isUndefined(session.runs.get("deg"), "an undone run is not listed");
        session.dispose();
    });

    it("redoes a run with the identical result, without computing it, on the handle held before the undo", async () => {
        const { session, calls } = await gated();
        const run = session.runs.start("degree", {}, { as: "deg" });
        const result = await run;
        const computed = calls();

        await session.undo();
        assert.strictEqual(run.status, "removed");
        assert.isUndefined(run.result);

        await session.redo();

        assert.strictEqual(calls(), computed, "nothing was computed again");
        assert.strictEqual(session.runs.get("deg"), run, "the same handle");
        assert.strictEqual(run.result, result, "the identical result object");
        assert.strictEqual(run.status, "succeeded");
        assert.lengthOf(layersOf(session, "deg"), 1, "and its layer is back");
        session.dispose();
    });

    it("restores the previous result when a re-run is undone, without computing", async () => {
        const { session, calls } = await gated();
        const run = session.runs.start("degree", {}, { as: "deg" });
        const first = await run;

        run.rerun();
        const second = await run;
        assert.notStrictEqual(second, first);
        assert.lengthOf(session.history.steps, 2, "the re-run is a step of its own");
        const computed = calls();

        await session.undo();

        assert.strictEqual(run.result, first, "the previous result, the same object");
        assert.strictEqual(run.status, "succeeded");
        assert.strictEqual(calls(), computed);
        assert.lengthOf(layersOf(session, "deg"), 1, "the re-run painted nothing new, so one layer stays");
        session.dispose();
    });

    it("keeps the last result readable while a re-run computes", async () => {
        const { session, open } = await gated();
        const run = session.runs.start("betweenness", {}, { as: "bet" });
        open();
        const first = await run;

        run.rerun();

        assert.strictEqual(run.status, "queued");
        assert.strictEqual(run.result, first);
        await run;
        session.dispose();
    });

    it("tells run watchers when history takes a run away and brings it back", async () => {
        const { session } = await gated();
        const changes: RunChange[] = [];
        const stop = session.on("run:changed", (change) => {
            changes.push(change);
        });
        await session.runs.start("degree", {}, { as: "deg" });
        changes.length = 0;

        await session.undo();
        await session.redo();
        stop();

        assert.deepEqual(
            changes.map((change) => [change.phase, change.cause, change.generation]),
            [
                ["removed", "undo", 1],
                ["restored", "redo", 1],
            ],
        );
        session.dispose();
    });

    it("makes a batch one step: one undo takes every member and the layer they painted", async () => {
        const { session } = await gated();

        await session.runs.batch([{ algorithm: "degree", as: "a" }, { algorithm: "pagerank", as: "b" }]);

        assert.lengthOf(session.history.steps, 1);
        assert.lengthOf(session.runs.list(), 2);
        await session.undo();

        assert.lengthOf(session.runs.list(), 0);
        assert.deepEqual([...layersOf(session, "a"), ...layersOf(session, "b")], []);
        session.dispose();
    });

    it("records a removal and the layers it took as one step", async () => {
        const { session } = await gated();
        await session.runs.start("degree", {}, { as: "deg" });

        const removal = session.runs.remove("deg");
        await idle(session);

        assert.strictEqual(removal.removedLayers, 1);
        assert.lengthOf(session.history.steps, 2);
        await session.undo();
        assert.isDefined(session.runs.get("deg"));
        assert.lengthOf(layersOf(session, "deg"), 1);
        session.dispose();
    });
});

describe("undo while a run is still going", () => {
    it("cancels the run and records nothing", async () => {
        const { session, open } = await gated();
        const run = session.runs.start("betweenness", {}, { as: "bet" });
        await idle(session);
        assert.strictEqual(run.status, "running");

        const outcome = await session.undo();

        assert.strictEqual(outcome.kind, "cancelled");
        assert.strictEqual(run.status, "canceled");
        open();
        await idle(session);
        assert.lengthOf(session.history.steps, 0);
        assert.isUndefined(entryOf(session, "bet"));
        assert.deepEqual(layersOf(session, "bet"), []);
        assert.isUndefined(session.runs.get("bet"), "an undone run is as if it had never been asked for");
        session.dispose();
    });

    it("leaves a style edit made while the run computed alone when the run is cancelled", async () => {
        const { session, open } = await gated();
        const run = session.runs.start("betweenness", {}, { as: "bet" });
        await idle(session);
        await session.styles.add({ name: "Mine", target: "node", selector: { match: "everything" }, set: { "node.color": "#00ff00" } });

        const pending = session.history.pending.at(0);
        assert.isDefined(pending);
        session.history.cancel(pending.id);
        open();
        await idle(session);

        assert.strictEqual(run.status, "canceled");
        assert.lengthOf(session.history.steps, 1, "the style edit is still a step");
        assert.include(
            session.styles.list().map((layer) => layer.name),
            "Mine",
        );
        session.dispose();
    });

    it("does not cancel a run started before the step it undoes; the run records on top when it finishes", async () => {
        const { session, open } = await gated();
        const run = session.runs.start("betweenness", {}, { as: "bet" });
        await idle(session);
        await session.styles.add({ name: "Mine", target: "node", selector: { match: "everything" }, set: { "node.color": "#00ff00" } });

        const outcome = await session.undo();

        assert.strictEqual(outcome.kind, "undone");
        assert.strictEqual(run.status, "running");
        open();
        await run;

        assert.lengthOf(session.history.steps, 1, "the run recorded on top and the redo tail went");
        assert.strictEqual(session.history.steps[0].label, "Ran betweenness");
        assert.isFalse(session.canRedo);
        session.dispose();
    });

    it("leaves an older run going when a redo happens", async () => {
        const { session, open } = await gated();
        const run = session.runs.start("betweenness", {}, { as: "bet" });
        await idle(session);
        await session.styles.add({ name: "Mine", target: "node", selector: { match: "everything" }, set: { "node.color": "#00ff00" } });
        await session.undo();

        const outcome = await session.redo();

        assert.strictEqual(outcome.kind, "redone");
        assert.strictEqual(run.status, "running");
        open();
        await run;
        assert.lengthOf(session.history.steps, 2);
        session.dispose();
    });

    it("writes nothing when a cancelled run's work finishes late", async () => {
        const { session, open } = await gated();
        const run = session.runs.start("betweenness", {}, { as: "bet" });
        await idle(session);

        run.cancel();
        open();
        await idle(session);

        assert.strictEqual(run.status, "canceled");
        assert.isUndefined(entryOf(session, "bet"), "no entry");
        assert.deepEqual(layersOf(session, "bet"), [], "no layer");
        assert.lengthOf(session.history.steps, 0);
        assert.isFalse(session.canUndo, "and nothing left pending");
        session.dispose();
    });
});
