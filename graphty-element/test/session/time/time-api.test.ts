import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { GraphtyError } from "../../../src/errors";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";
import { addSteps, alignTo, readInstant } from "../../../src/session/time/parse";
import type { TimeStepEvent } from "../../../src/session/time/TimeApi";
import { type Harness, makeSession } from "../helpers";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

/** Five nodes in a line; each edge happens one day after the last, and node e has none. */
function emails(): Harness {
    const harness = makeSession();
    harness.add(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }, { id: "f" }],
        [
            { src: "a", dst: "b", sent: "2026-01-01" },
            { src: "b", dst: "c", sent: "2026-01-02T00:00:00" },
            { src: "c", dst: "d", sent: "2026-01-03T00:00:00Z" },
            { src: "d", dst: "e", sent: "2026-01-04T00:00:00Z" },
            { src: "e", dst: "f" },
        ],
    );

    return harness;
}

/**
 * Brute force: what the window should leave, by the design's definition of nodes "ends".
 * @param harness - The session.
 * @param from - The window start.
 * @param to - The window end.
 * @returns The visible node ids, sorted.
 */
function bruteNodes(harness: Harness, from: number, to: number): string[] {
    const graph = harness.session.data.snapshot();
    const kept = new Set<string>();
    for (let edge = 0; edge < graph.edgeCount; edge++) {
        const value = harness.edgeAttributes.get(edge)?.sent;
        const at = value === undefined ? null : readInstant(value, "ms").at;
        if (at === null || (at >= from && at < to)) {
            kept.add(String(graph.ids.idOf(graph.edgeSource(edge))));
            kept.add(String(graph.ids.idOf(graph.edgeTarget(edge))));
        }
    }

    return [...kept].sort();
}

describe("reading instants", () => {
    it("reads strict ISO 8601 in UTC, including zone-less date-times and expanded years", () => {
        assert.strictEqual(readInstant("2026-01-02T00:00:00", "ms").at, T0 + DAY);
        assert.strictEqual(readInstant("2026-01-02T01:00:00+01:00", "ms").at, T0 + DAY);
        assert.strictEqual(readInstant("2026-03", "ms").at, Date.UTC(2026, 2, 1));
        const bce = new Date(0);
        bce.setUTCFullYear(-500, 0, 1);
        assert.strictEqual(readInstant("-000500", "ms").at, bce.getTime());
        assert.strictEqual(readInstant("0099", "ms").how, "strict");
        assert.strictEqual(new Date(readInstant("0099", "ms").at).getUTCFullYear(), 99);
    });

    it("reads numbers by unit, counts loose and unparsed text, and rejects impossible dates", () => {
        assert.strictEqual(readInstant(1_700_000_000, "s").at, 1_700_000_000_000);
        assert.strictEqual(readInstant("1850", "ordinal").at, 1850);
        assert.strictEqual(readInstant("Jan 5 2026", "ms").how, "loose");
        assert.strictEqual(readInstant("not a date", "ms").how, "unparsed");
        assert.strictEqual(readInstant("2026-02-30", "ms").how, "loose");
        assert.strictEqual(readInstant(null, "ms").how, "missing");
    });

    it("steps calendars in UTC and clamps to the end of a short month", () => {
        assert.strictEqual(addSteps(Date.UTC(2026, 0, 31), "month", 1), Date.UTC(2026, 1, 28));
        assert.strictEqual(addSteps(Date.UTC(2026, 0, 31), "quarter", -1), Date.UTC(2025, 9, 31));
        assert.strictEqual(alignTo(Date.UTC(2026, 0, 7, 13), "week"), Date.UTC(2026, 0, 5));
        assert.strictEqual(alignTo(Date.UTC(2026, 4, 7), "quarter"), Date.UTC(2026, 3, 1));
    });
});

describe("session.time: the designated field", () => {
    it("designates an edge field, counts what parsed, and makes the column time", async () => {
        const harness = emails();
        const { time } = harness.session;
        assert.isNull(time.field);
        assert.isNull(time.extent());

        const result = await time.setField({ edges: { start: "sent" } });

        assert.deepStrictEqual(result.field, { edges: { start: "sent" } });
        assert.deepStrictEqual(result.edges, { timed: 4, untimed: 1, unparsed: 0 });
        assert.deepStrictEqual(time.extent(), {
            from: T0,
            to: T0 + 3 * DAY + 1,
            nodes: { timed: 0, untimed: 0, unparsed: 0 },
            edges: { timed: 4, untimed: 1, unparsed: 0 },
        });
        const column = harness.session.data.attributes().find((each) => each.kind === "edge" && each.name === "sent");
        assert.strictEqual(column?.measurement, "time");
        harness.session.dispose();
    });

    it("is one undoable step", async () => {
        const harness = emails();
        await harness.session.time.setField({ edges: { start: "sent" } });
        await harness.session.undo();
        assert.isNull(harness.session.time.field);
        harness.session.dispose();
    });

    it("reports unparsed values and numbers that look like epoch seconds", async () => {
        const harness = makeSession();
        harness.add(
            [{ id: "a" }, { id: "b" }],
            [
                { src: "a", dst: "b", at: 1_700_000_000 },
                { src: "b", dst: "a", at: "not a date" },
            ],
        );
        const result = await harness.session.time.setField({ edges: { start: "at" } });
        const codes = result.notices.map((notice) => notice.code).sort();
        assert.deepStrictEqual(codes, ["time.unit-suspect", "time.unparsed"]);
        assert.deepStrictEqual(result.notices.find((n) => n.code === "time.unparsed")?.params.examples, ["not a date"]);
        harness.session.dispose();
    });

    it("refuses a column declared as something else", async () => {
        const harness = emails();
        await harness.session.data.declare({ kind: "edge", name: "sent" }, { measurement: "categorical" });
        try {
            await harness.session.time.setField({ edges: { start: "sent" } });
            assert.fail("expected a refusal");
        } catch (error) {
            assert.instanceOf(error, GraphtyError);
            assert.strictEqual(error.details?.reason, "declared-not-time");
        }

        harness.session.dispose();
    });
});

describe("session.time: bins", () => {
    it("sum to the timed total, by count and by calendar step", async () => {
        const harness = emails();
        const { time } = harness.session;
        await time.setField({ edges: { start: "sent" } });

        const bins = time.bins({ count: 7 }) ?? [];
        assert.lengthOf(bins, 7);
        assert.strictEqual(
            bins.reduce((sum, bin) => sum + bin.edges, 0),
            4,
        );
        const days = time.bins({ step: "day" }) ?? [];
        assert.deepStrictEqual(
            days.map((bin) => bin.edges),
            [1, 1, 1, 1],
        );
        assert.strictEqual(days[0].start, T0);
        harness.session.dispose();
    });

    it("count only the given elements, or only what is visible", async () => {
        const harness = emails();
        const { time } = harness.session;
        await time.setField({ edges: { start: "sent" } });
        const edges = [...harness.session.visibility.edges];
        const ofTwo = time.bins({ step: "day", of: { edges: edges.slice(0, 2) } }) ?? [];
        assert.deepStrictEqual(
            ofTwo.map((bin) => bin.edges),
            [1, 1, 0, 0],
        );
        // Node c's edges are b-c (day 2) and c-d (day 3); incident counts them for a node selection.
        const ofC = time.bins({ step: "day", of: { nodes: ["c"], incident: true } }) ?? [];
        assert.deepStrictEqual(
            ofC.map((bin) => bin.edges),
            [0, 1, 1, 0],
        );
        const withoutIncident = time.bins({ step: "day", of: { nodes: ["c"] } }) ?? [];
        assert.strictEqual(
            withoutIncident.reduce((sum, bin) => sum + bin.edges, 0),
            0,
        );

        await time.window({ from: T0, to: T0 + 2 * DAY });
        const visible = time.bins({ step: "day", scope: "visible" }) ?? [];
        assert.deepStrictEqual(
            visible.map((bin) => bin.edges),
            [1, 1, 0, 0],
        );
        harness.session.dispose();
    });

    it("fill bounds left out: from the window, else one step at the start of the data", async () => {
        const harness = emails();
        const { time } = harness.session;
        await time.setField({ edges: { start: "sent" } });
        await time.window({ step: "day" });
        assert.deepInclude(time.current, { from: T0, to: T0 + DAY, step: "day" });
        await time.window({ mode: "cumulative" });
        assert.deepInclude(time.current, { from: T0, to: T0 + DAY, step: "day", mode: "cumulative" });
        harness.session.dispose();
    });

    it("start a first calendar window on the step's boundary", async () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b", sent: "2026-01-01T08:05:00Z" }]);
        const { time } = harness.session;
        await time.setField({ edges: { start: "sent" } });
        await time.window({ step: "day" });
        assert.deepInclude(time.current, { from: T0, to: T0 + DAY });
        harness.session.dispose();
    });

    it("refuse a calendar step on ordinal time", async () => {
        const harness = makeSession();
        harness.add([
            { id: "a", year: 1850 },
            { id: "b", year: 1900 },
        ]);
        await harness.session.time.setField({ nodes: { start: "year", unit: "ordinal" } });
        assert.throws(() => harness.session.time.bins({ step: "year" }), /calendar step/);
        assert.deepStrictEqual(
            (harness.session.time.bins({ step: 10 }) ?? []).map((bin) => bin.nodes),
            [1, 0, 0, 0, 0, 1],
        );
        harness.session.dispose();
    });
});

describe("session.time: the window", () => {
    it("fills in the attribute and keeps only nodes at the ends of edges inside it", async () => {
        const harness = emails();
        const { time, visibility } = harness.session;
        await time.setField({ edges: { start: "sent" } });

        for (const [from, to] of [
            [T0, T0 + DAY],
            [T0 + DAY, T0 + 3 * DAY],
            [T0 + 10 * DAY, T0 + 11 * DAY],
        ]) {
            await time.window({ from, to });
            assert.strictEqual(visibility.window?.attribute, "data.sent");
            assert.strictEqual(visibility.window?.nodes, "ends");
            assert.deepStrictEqual([...visibility.nodes].map(String).sort(), bruteNodes(harness, from, to));
        }

        harness.session.dispose();
    });

    it("hides elements with no time under missing: outside", async () => {
        const harness = emails();
        const { time, visibility } = harness.session;
        await time.setField({ edges: { start: "sent" } });
        await time.window({ from: T0, to: T0 + 10 * DAY });
        assert.strictEqual(visibility.summary.visibleEdges, 5);
        await time.window({ from: T0, to: T0 + 10 * DAY, missing: "outside" });
        assert.strictEqual(visibility.summary.visibleEdges, 4);
        assert.isFalse(visibility.isVisible("f"));
        harness.session.dispose();
    });

    it("leaves a window passed by hand to visibility.setWindow as it was", async () => {
        const harness = emails();
        await harness.session.time.setField({ edges: { start: "sent" } });
        await harness.session.visibility.setWindow({ attribute: "data.sent", from: T0, to: T0 + DAY });
        // No "ends": every node stays, only edges outside the window go.
        assert.strictEqual(harness.session.visibility.summary.visibleNodes, 6);
        assert.strictEqual(harness.session.visibility.summary.visibleEdges, 2);
        harness.session.dispose();
    });

    it("refuses with E_NO_TIME_FIELD when nothing is designated", () => {
        const harness = emails();
        assert.throws(() => {
            void harness.session.time.window({ from: 0, to: 1 });
        }, /No time field/);
        harness.session.dispose();
    });

    it("steps, seeks and lists what entered and left", async () => {
        const harness = emails();
        const { time } = harness.session;
        await time.setField({ edges: { start: "sent" } });
        await time.window({ from: T0, to: T0 + DAY, step: "day" });

        const stepped = await time.stepBy(1);
        assert.include(stepped, { index: 1, from: T0 + DAY, to: T0 + 2 * DAY, cause: "step" });
        assert.deepStrictEqual(stepped.entered, { nodes: 1, edges: 1 });
        assert.deepStrictEqual(stepped.left, { nodes: 1, edges: 1 });
        // e -> f has no time, so it stays in every window and keeps e and f.
        assert.deepStrictEqual([...time.changes().entered.nodes].map(String), ["c"]);
        assert.deepStrictEqual([...time.changes().left.nodes].map(String), ["a"]);

        const sought = await time.seek(T0 + 3 * DAY);
        assert.include(sought, { index: 3, from: T0 + 3 * DAY, cause: "seek" });
        const back = await time.stepBy(-3);
        assert.strictEqual(back.from, T0);
        harness.session.dispose();
    });
});

describe("session.time: playback", () => {
    /**
     * Play to the end and collect the steps.
     * @param session - The session.
     * @param options - Play options.
     * @returns The steps it published.
     */
    async function playToEnd(
        session: GraphSession,
        options: Parameters<GraphSession["time"]["play"]>[0],
    ): Promise<TimeStepEvent[]> {
        const steps: TimeStepEvent[] = [];
        const stop = session.on("time:step", (step) => steps.push(step));
        await new Promise<void>((resolve) => {
            const off = session.on("time:end", () => {
                off();
                resolve();
            });
            session.time.play(options);
        });
        stop();

        return steps;
    }

    it("plays a sliding window to the end as one undoable step, and pauses", async () => {
        const harness = emails();
        const { session } = harness;
        await session.time.setField({ edges: { start: "sent" } });
        await session.time.window({ from: T0, to: T0 + DAY, step: "day" });
        const before = session.visibility.window;
        const historyBefore = session.history.steps.length;
        const paused: unknown[] = [];
        session.on("time:pause", (detail) => paused.push(detail));

        const steps = await playToEnd(session, { interval: 0 });

        assert.deepStrictEqual(
            steps.map((step) => step.index),
            [1, 2, 3],
        );
        assert.isFalse(session.time.playing);
        assert.lengthOf(paused, 1);
        assert.strictEqual(session.history.steps.length, historyBefore + 1);
        await session.undo();
        assert.deepStrictEqual(session.visibility.window, before);
        session.dispose();
    });

    it("plays a cumulative window that grows from the start", async () => {
        const harness = emails();
        const { session } = harness;
        await session.time.setField({ edges: { start: "sent" } });
        await session.time.window({ from: T0, to: T0 + DAY, step: "day", mode: "cumulative" });

        const steps = await playToEnd(session, { interval: 0 });

        assert.deepStrictEqual(
            steps.map((step) => [step.from, step.visible.edges]),
            [
                [T0, 3],
                [T0, 4],
                [T0, 5],
            ],
        );
        session.dispose();
    });

    it("opens a window at the start of the data when there is none", async () => {
        const harness = emails();
        const { session } = harness;
        await session.time.setField({ edges: { start: "sent" } });
        const steps = await playToEnd(session, { interval: 0, step: "day" });
        assert.strictEqual(steps[0].from, T0);
        assert.strictEqual(steps.at(-1)?.from, T0 + 3 * DAY);
        session.dispose();
    });
});

/**
 * A stand-in algorithm that counts the nodes it ran over.
 * @param context - The run.
 * @returns One value per node in scope.
 */
async function execute(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Value",
                    technicalName: "value",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: 1, edges: 0 },
            nodes: [{ id: "A", values: { value: 1 } }],
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

describe("session.time: what a window move does to finished runs", () => {
    const CSV = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\n";

    /**
     * A session with a designated field, a first window and one finished run over it.
     * @param results - The window's policy.
     * @returns The session and the run id.
     */
    async function withRun(
        results?: "keep" | "stale" | "rerun",
    ): Promise<{ session: GraphSession; id: string; executions: () => number }> {
        let count = 0;
        const session = createGraphSession({
            runs: {
                execute: (context) => {
                    count++;
                    return execute(context);
                },
            },
        });
        await session.data.import({ type: "csv", config: { data: CSV } });
        await session.time.setField({ edges: { start: "sent" } });
        if (results !== undefined) {
            await session.time.setSettings({ results });
        }

        await session.time.window({ from: T0, to: T0 + DAY, step: "day" });
        const run = session.runs.start("degree", undefined, { style: false });
        await run;

        return { session, id: run.id, executions: () => count };
    }

    it("marks them out of date by default, as a window set by hand does", async () => {
        const { session, id } = await withRun();
        await session.time.stepBy(1);
        const stale = session.runs.get(id)?.stale;
        assert.strictEqual(stale?.reason, "window-moved");
        // The note names the window the run was computed in and what it left visible then.
        assert.deepStrictEqual(stale?.window, {
            code: "window-moved",
            params: { from: T0, to: T0 + DAY, nodes: 2, edges: 1 },
        });
        assert.deepInclude(session.runs.get(id)?.caveats.window, { from: T0, to: T0 + DAY, nodes: 2, edges: 1 });
        session.dispose();
    });

    it("keeps them current under results: keep", async () => {
        const { session, id } = await withRun("keep");
        await session.time.stepBy(1);
        assert.isNull(session.runs.get(id)?.stale);
        await session.time.stepBy(1);
        assert.isNull(session.runs.get(id)?.stale);
        session.dispose();
    });

    it("runs them again over the new window under results: rerun", async () => {
        const { session, id, executions } = await withRun("rerun");
        assert.strictEqual(executions(), 1);
        await session.time.stepBy(1);
        assert.strictEqual(executions(), 2);
        assert.isNull(session.runs.get(id)?.stale);
        session.dispose();
    });

    it("saves the designation and the window with the project", async () => {
        const { session } = await withRun("keep");
        const { text } = await session.project.save();
        const reopened = createGraphSession({ runs: { execute } });
        await reopened.project.open(text);
        assert.deepStrictEqual(reopened.time.field, { edges: { start: "sent" } });
        assert.strictEqual(reopened.time.settings.results, "keep");
        assert.strictEqual(reopened.visibility.window?.nodes, "ends");
        session.dispose();
        reopened.dispose();
    });
});
