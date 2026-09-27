/**
 * @file Visibility under undo: the filter, the window and the context flag are steps, the masks
 * are derived from them, and a filter step keeps its after-masks (a mask copy) only when that is
 * both correct and about to be useful. A slider drag copies once, not per frame; undoing to a
 * step whose copy still matches puts the bytes back without evaluating; a copy whose graph or
 * run results have moved on is never used; copies are the first thing the byte budget drops; and
 * the masks a reader is handed are copies nothing can write through.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import type { ElementSession } from "../../../src/session/types";
import * as filterModule from "../../../src/session/visibility/filter";
import type { Filter, VisibilityChange } from "../../../src/session/visibility/index";
import { type Harness, makeSession } from "../helpers";

vi.mock("../../../src/session/visibility/filter", async (original) => {
    const actual = await original<typeof import("../../../src/session/visibility/filter")>();

    return { ...actual, compileVisibility: vi.fn(actual.compileVisibility) };
});

/** How many times a filter was evaluated since the last reset. */
const evaluations = vi.mocked(filterModule.compileVisibility);

/** The coalescing window, and a pause long enough to end it. */
const LAPSE_MS = 5000;

/** Hosts only. */
const HOSTS: Filter = { kind: "categories", attribute: "data.type", values: ["host"] };

/** Services only. */
const SERVICES: Filter = { kind: "categories", attribute: "data.type", values: ["service"] };

const harnesses: Harness[] = [];

afterEach(() => {
    for (const harness of harnesses.splice(0)) {
        harness.session.dispose();
    }

    evaluations.mockClear();
});

/** The run results the fake `score` run publishes, which a test changes between runs. */
let scores: Record<string, number> = {};

/**
 * A fake run of `degree` that publishes {@link scores} as each node's value.
 * @param harness - The session's harness, read when the run starts.
 * @param context - The run.
 * @returns Its outcome.
 */
function scoreRun(harness: () => Harness, context: RunExecutionContext): Promise<RunOutcome> {
    const snapshot = harness().store.getSnapshot();
    const ids = Array.from({ length: snapshot.nodeCount }, (_, index) => snapshot.ids.idOf(index));
    const result = createRunResult({
        runId: context.runId,
        shape: "node-metric",
        fields: [
            {
                name: "value",
                plainName: "value",
                technicalName: "value",
                kind: "node",
                type: "number",
                path: `results.${context.runId}.value`,
            },
        ],
        measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
        nodes: ids.map((id) => ({ id, values: { value: scores[String(id)] ?? 0 } })),
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "fake", notes: [] },
        durationMs: 1,
    });

    return Promise.resolve({ result });
}

/**
 * A session over `count` nodes in a line, alternating hosts and services, on a clock the test
 * moves.
 * @param count - How many nodes.
 * @returns The harness, the session and the clock.
 */
function clocked(count = 6): { harness: Harness; session: ElementSession; advance: (ms: number) => void } {
    let now = 0;
    const harness: Harness = makeSession({
        runs: { execute: (context) => scoreRun(() => harness, context) },
        internals: { now: () => now },
    });
    harnesses.push(harness);
    const nodes = Array.from({ length: count }, (_, index) => ({
        id: `n${String(index)}`,
        type: index % 2 === 0 ? "host" : "service",
        w: index,
    }));
    harness.add(
        nodes,
        nodes.slice(1).map((node, index) => ({ src: nodes[index].id, dst: node.id })),
    );

    return {
        harness,
        session: harness.session as ElementSession,
        advance: (ms) => {
            now += ms;
        },
    };
}

/**
 * The visible node ids, sorted.
 * @param session - The session.
 * @returns The ids.
 */
function visible(session: ElementSession): string[] {
    return [...session.visibility.nodes].map(String).sort();
}

/**
 * The kind of the filter in force, read through a call so an earlier assertion cannot narrow it.
 * @param session - The session.
 * @returns The kind, or undefined with no filter.
 */
function filterKind(session: ElementSession): string | undefined {
    return session.visibility.filter?.kind;
}

describe("a visibility edit in the history", () => {
    it("is one labelled step, and undo and redo move the filter and the masks", async () => {
        const { session } = clocked();

        await session.visibility.set(HOSTS);

        assert.deepEqual(
            session.history.steps.map((step) => step.label),
            ["Filtered (categories)"],
        );
        assert.deepEqual(session.history.steps[0]?.slices, ["visibility"]);
        assert.deepEqual(visible(session), ["n0", "n2", "n4"]);

        await session.undo();
        assert.isNull(session.visibility.filter);
        assert.lengthOf(visible(session), 6);

        await session.redo();
        assert.strictEqual(filterKind(session), "categories");
        assert.deepEqual(visible(session), ["n0", "n2", "n4"]);
    });

    it("makes the window and the context flag steps of their own", async () => {
        const { session } = clocked();

        await session.visibility.setWindow({ attribute: "data.w", from: 0, to: 3 });
        session.visibility.showContext = true;
        await session.styles.settled();

        assert.deepEqual(
            session.history.steps.map((step) => step.ops[0]),
            ["visibility.window", "visibility.context"],
        );

        await session.undo();
        assert.isFalse(session.visibility.showContext);
        await session.undo();
        assert.isNull(session.visibility.window);
        assert.lengthOf(visible(session), 6);
    });

    it("tells a host what changed and why, once the masks have caught up", async () => {
        const { session } = clocked();
        const changes: VisibilityChange[] = [];
        session.on("visibility:changed", (change) => {
            changes.push(change);
        });

        await session.visibility.set(HOSTS);
        await session.undo();

        assert.deepEqual(
            changes.map((change) => [change.filterKind, change.cause, change.visible.nodes]),
            [
                ["categories", "command", 3],
                ["none", "undo", 6],
            ],
        );
    });

    it("keeps the caller's filter out of state: changing it afterwards changes nothing", async () => {
        const { session } = clocked();
        const mine = { kind: "categories", attribute: "data.type", values: ["host"] };

        await session.visibility.set(mine as Filter);
        mine.values.push("service");

        assert.deepEqual(session.visibility.filter, HOSTS);
        assert.isTrue(Object.isFrozen(session.visibility.filter));
    });

    it("writes nothing when its signal is already aborted, and keeps the edit when cancelled later", async () => {
        const { session } = clocked();
        const controller = new AbortController();
        controller.abort();

        const name = await session.visibility.set(HOSTS, { signal: controller.signal }).then(
            () => "resolved",
            (error: unknown) => (error instanceof Error ? error.name : "not-an-error"),
        );

        assert.strictEqual(name, "AbortError");
        assert.isNull(session.visibility.filter);
        assert.lengthOf(session.history.steps, 0);

        const run = session.visibility.set(HOSTS);
        run.cancel("changed my mind");
        const result = await run;

        assert.strictEqual(result.visible.nodes, 3);
        assert.strictEqual(filterKind(session), "categories");
        assert.lengthOf(session.history.steps, 1);
    });
});

describe("mask copies", () => {
    it("makes a 60-frame slider drag one step, evaluated once, with no copy until it is over", async () => {
        const { session, advance } = clocked();

        for (let frame = 0; frame < 60; frame++) {
            advance(16);
            void session.visibility.set({ kind: "range", attribute: "data.w", min: frame % 6 });
        }

        await session.styles.settled();

        assert.lengthOf(session.history.steps, 1, "the whole drag is one step");
        assert.strictEqual(evaluations.mock.calls.length, 1, "only the last value was evaluated");
        assert.strictEqual(session.history.bytes, 512, "no mask copy while the drag is the coalesce target");
        assert.deepEqual(visible(session), ["n5"]);

        advance(LAPSE_MS);
        await session.visibility.set(HOSTS);

        // Six nodes and five edges: the drag's after-masks, copied once when the next step
        // rewrote them.
        assert.strictEqual(session.history.bytes, 2 * 512 + 6 + 5);
    });

    it("puts a kept copy back on undo and redo instead of evaluating, and the mask revision still moves", async () => {
        const { session, advance } = clocked();
        await session.visibility.set(HOSTS);
        advance(LAPSE_MS);
        await session.visibility.set(SERVICES);
        const { version } = session.visibility.masks.nodes();
        evaluations.mockClear();

        await session.undo();

        assert.deepEqual(visible(session), ["n0", "n2", "n4"]);
        assert.strictEqual(evaluations.mock.calls.length, 0, "the hosts step's copy was used");
        assert.isAbove(session.visibility.masks.nodes().version, version, "readers keyed on the version ask again");

        await session.redo();

        assert.deepEqual(visible(session), ["n1", "n3", "n5"]);
        assert.strictEqual(evaluations.mock.calls.length, 0, "the services step kept its masks when it was undone");
    });

    it("does not use a copy taken before a node attribute changed", async () => {
        const { harness, session, advance } = clocked();
        await session.visibility.set(HOSTS);
        advance(LAPSE_MS);
        await session.visibility.set(SERVICES);

        // n0 becomes a service beneath the session, written the way a write the history does not
        // record is: in place, with the store told and the graph token moved.
        harness.nodeAttributes.set(0, { type: "service", w: 0 });
        harness.touch();
        evaluations.mockClear();
        await session.undo();

        assert.deepEqual(visible(session), ["n2", "n4"], "a fresh evaluation, not the kept bytes");
        assert.strictEqual(evaluations.mock.calls.length, 1);
    });

    it("puts a copy back once a data step after it is undone, because the rows come back exactly", async () => {
        const { session, advance } = clocked();
        await session.visibility.set(HOSTS);
        advance(LAPSE_MS);
        await session.visibility.set(SERVICES);
        advance(LAPSE_MS);
        await session.data.addNodes([{ id: "extra", type: "host" }]);
        await session.undo();
        evaluations.mockClear();

        await session.undo();

        assert.deepEqual(visible(session), ["n0", "n2", "n4"]);
        assert.strictEqual(
            evaluations.mock.calls.length,
            0,
            "the hosts step's copy was taken under the same graph token",
        );
    });

    it("does not use a copy taken under results a later undo has replaced", async () => {
        // A re-run is a step of its own. The filter's copy is taken under the re-run's numbers,
        // so undoing the re-run, which puts the earlier numbers back, has to evaluate again.
        const { session, advance } = clocked();
        scores = { n0: 5, n1: 5 };
        await session.runs.start("degree", {}, { as: "score", style: false });
        await session.visibility.set({ kind: "expression", where: "results.score.value > `1`" });
        assert.deepEqual(visible(session), ["n0", "n1"]);

        scores = { n4: 5 };
        const rerun = session.runs.get("score");
        assert.isDefined(rerun);
        await rerun.rerun();
        assert.deepEqual(visible(session), ["n4"], "the filter reads the re-run's numbers");
        advance(LAPSE_MS);
        await session.visibility.set(SERVICES);

        evaluations.mockClear();
        await session.undo();
        assert.deepEqual(visible(session), ["n4"]);
        assert.strictEqual(evaluations.mock.calls.length, 0, "the copy matches the re-run's numbers");

        await session.undo();
        assert.deepEqual(visible(session), ["n0", "n1"], "the first run's numbers, not the kept bytes");
        assert.strictEqual(evaluations.mock.calls.length, 1);
    });

    it("drops mask copies before any step when the byte budget is exceeded", async () => {
        const { session, advance } = clocked(1000);
        await session.visibility.set(HOSTS);
        advance(LAPSE_MS);
        await session.visibility.set(SERVICES);
        advance(LAPSE_MS);
        await session.visibility.set(null);

        assert.strictEqual(session.history.bytes, 3 * 512 + 2 * (1000 + 999), "two copies kept");

        session.history.limitBytes = 2000;

        assert.lengthOf(session.history.steps, 3, "no step was evicted");
        assert.strictEqual(session.history.bytes, 3 * 512, "both copies were dropped");

        await session.undo();
        assert.strictEqual(visible(session).length, 500, "undo still works, by evaluating");
    });
});

describe("the masks a reader is handed", () => {
    it("are read-only copies carrying the live version, the same object until the membership moves", async () => {
        const { session } = clocked();
        const { masks } = session.visibility;
        const before = masks.nodes();

        assert.strictEqual(masks.nodes(), before, "no copy per read");

        let code: string | null = null;
        try {
            before.clear();
        } catch (error) {
            code = isGraphtyError(error) ? error.code : "not-a-graphty-error";
        }

        assert.strictEqual(code, "E_READONLY");
        assert.lengthOf(visible(session), 6, "the live masks are untouched");

        await session.visibility.set(HOSTS);
        const after = masks.nodes();

        assert.notStrictEqual(after, before);
        assert.isAbove(after.version, before.version);
        assert.strictEqual(after.size, 3);
    });
});
