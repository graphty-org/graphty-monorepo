/**
 * The timeline's runs, designation, window and playback rules (design/ui/studio/timeline/
 * decisions.md), on a real session over imported CSV data.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { GraphtyError } from "../../../src/errors";
import { createRunResult } from "../../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../../src/session/runs";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

/** Five edges a day apart, Jan 1 to Jan 5, a team column, and one edge with no time. */
const CSV =
    "source,target,sent,team\n" +
    "A,B,2026-01-01,red\n" +
    "B,C,2026-01-02,red\n" +
    "C,D,2026-01-03,blue\n" +
    "D,E,2026-01-04,blue\n" +
    "E,F,2026-01-05,red\n" +
    "F,A,,blue\n";

/**
 * A stand-in algorithm with one value per node.
 * @param context - The run.
 * @returns The outcome.
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

/**
 * A session over the CSV, with `sent` designated when asked.
 * @param designate - Whether to designate `sent`.
 * @param csv - The data.
 * @returns The session and how many times a run executed.
 */
async function open(designate = true, csv = CSV): Promise<{ session: GraphSession; executions: () => number }> {
    let count = 0;
    const session = createGraphSession({
        runs: {
            execute: async (context) => {
                count++;
                return execute(context);
            },
        },
    });
    await session.data.import({ type: "csv", config: { data: csv } });
    if (designate) {
        await session.time.setField({ edges: { start: "sent" } });
    }

    return { session, executions: () => count };
}

describe("runs over a moving window", () => {
    it("a named run re-runs under its id after the window moved", async () => {
        const { session } = await open();
        await session.time.window({ from: T0, to: T0 + 2 * DAY, step: "day" });
        const run = session.runs.start("degree", undefined, { as: "degree", style: false });
        await run;
        await session.time.stepBy(1);
        assert.strictEqual(run.stale?.reason, "window-moved");

        // What the inspector's Rerun does: the same id, over the scope it named.
        const again = session.runs.start("degree", undefined, { as: "degree", scope: run.stale?.scopeSpec });
        await again;

        assert.strictEqual(again, run);
        assert.strictEqual(run.status, "succeeded");
        assert.isNull(run.stale);
        assert.deepInclude(run.caveats.window, { from: T0 + DAY, to: T0 + 3 * DAY });
        session.dispose();
    });

    it("is out of date in another window that leaves the same nodes visible", async () => {
        const { session } = await open();
        // Every node stays visible: the edge with no time keeps A and F, and the window keeps its ends.
        await session.time.window({ from: T0, to: T0 + 5 * DAY, step: "day" });
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        await session.time.window({ from: T0, to: T0 + 4 * DAY, step: "day" });
        await session.time.window({ from: T0 - DAY, to: T0 + 5 * DAY, step: "day" });
        assert.strictEqual(session.visibility.summary.visibleNodes, 6);
        assert.strictEqual(run.stale?.reason, "window-moved");
        session.dispose();
    });

    it("re-runs what was already out of date when Re-run is chosen, with no further move", async () => {
        const { session, executions } = await open();
        await session.time.window({ from: T0, to: T0 + DAY, step: "day" });
        const run = session.runs.start("degree", undefined, { style: false });
        await run;
        await session.time.stepBy(1);
        assert.isNotNull(run.stale);
        const before = executions();

        await session.time.setSettings({ results: "rerun" });

        assert.strictEqual(executions(), before + 1);
        assert.isNull(run.stale);
        session.dispose();
    });
});

describe("designating the time field", () => {
    it("refuses a column with no times, and leaves the field as it was", async () => {
        const { session } = await open();
        try {
            await session.time.setField({ edges: { start: "team" } });
            assert.fail("expected a refusal");
        } catch (error) {
            assert.instanceOf(error, GraphtyError);
            assert.strictEqual(error.details?.reason, "no-times");
        }

        assert.deepStrictEqual(session.time.field, { edges: { start: "sent" } });
        session.dispose();
    });

    it("counts parsed values as the designated column's completeness", async () => {
        const { session } = await open();
        const sent = session.data.attributes().find((each) => each.kind === "edge" && each.name === "sent");
        assert.closeTo(sent?.completeness ?? 0, 5 / 6, 1e-9);
        session.dispose();
    });

    it("clears the window when the field is cleared or its unit changes, and keeps a column's unit", async () => {
        const csv = "source,target,year\nA,B,1995\nB,C,2000\nC,D,2024\n";
        const { session } = await open(false, csv);
        await session.time.setField({ edges: { start: "year", unit: "ordinal" } });
        await session.time.stepBy(1);
        assert.isNotNull(session.time.current);

        await session.time.setField(null);
        assert.isNull(session.visibility.window);
        assert.strictEqual(session.visibility.summary.visibleNodes, 4);

        // Designated again with no unit: the unit given before.
        await session.time.setField({ edges: { start: "year" } });
        assert.deepStrictEqual(session.time.field, { edges: { start: "year", unit: "ordinal" } });
        await session.time.stepBy(1);
        await session.time.setField({ edges: { start: "year", unit: "ms" } });
        assert.isNull(session.time.current);
        session.dispose();
    });

    it("reads whole numbers that look like years as years, and suggests Year for them read as ms", async () => {
        const csv = "source,target,year\nA,B,1995\nB,C,2000\nC,D,2024\n";
        const { session } = await open(false, csv);
        const read = await session.time.setField({ edges: { start: "year" } });
        assert.deepStrictEqual(read.field, { edges: { start: "year", unit: "year" } });
        assert.deepStrictEqual(read.notices, []);
        assert.strictEqual(session.time.extent()?.from, Date.UTC(1995, 0, 1));

        const result = await session.time.setField({ edges: { start: "year", unit: "ms" } });
        assert.deepInclude(
            result.notices.map((notice) => notice.params),
            { path: "year", suggested: "year" },
        );
        await session.time.setField({ edges: { start: "year", unit: "ordinal" } });
        assert.deepInclude(session.time.extent(), { from: 1995, to: 2025 });
        session.dispose();
    });

    it("counts a stray number in a column of date text as unparsed", async () => {
        const csv = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,1.10\n";
        const { session } = await open(false, csv);
        const result = await session.time.setField({ edges: { start: "sent" } });
        assert.strictEqual(session.time.extent()?.from, T0);
        assert.include(
            result.notices.map((notice) => notice.code),
            "time.unparsed",
        );
        // The same notices for a field designated another way, such as an import.
        assert.deepStrictEqual(session.time.notices(), result.notices);
        session.dispose();
    });

    it("lists the columns that read as time, most first", async () => {
        const { session } = await open(false);
        const candidates = session.time.candidates();
        assert.deepStrictEqual(
            candidates.map((each) => [each.kind, each.column]),
            [["edge", "sent"]],
        );
        session.dispose();
    });

    it("reads typed dates in UTC", async () => {
        const { session } = await open();
        assert.strictEqual(session.time.parse("2026-01-02"), T0 + DAY);
        assert.strictEqual(session.time.parse("Jan 2, 2026"), T0 + DAY);
        assert.isNull(session.time.parse("not a date"));
        session.dispose();
    });
});

describe("the window, its step and playback", () => {
    it("stops at the ends of the data and says where it is", async () => {
        const { session } = await open();
        await session.time.setSettings({ step: "day" });
        const first = await session.time.stepBy(1);
        assert.strictEqual(first.from, T0, "a first step forward opens the first window");
        assert.isTrue(first.atStart);
        assert.strictEqual(first.untimed.edges, 1);

        const last = await session.time.stepBy(99);
        assert.strictEqual(last.to, T0 + 5 * DAY);
        assert.isTrue(last.atEnd);
        assert.isTrue(session.time.atEnd);
        const again = await session.time.stepBy(1);
        assert.strictEqual(again.to, T0 + 5 * DAY, "no step past the end");

        await session.time.seek("start");
        assert.strictEqual(Number(session.time.current?.from), T0);
        await session.time.seek("end");
        assert.strictEqual(Number(session.time.current?.to), T0 + 5 * DAY);
        session.dispose();
    });

    it("plays to the window that ends the data, and no further", async () => {
        const { session } = await open();
        await session.time.setSettings({ step: "day" });
        const steps: number[] = [];
        session.on("time:step", (step) => steps.push(step.to));
        await new Promise<void>((resolve) => {
            session.on("time:end", () => {
                resolve();
            });
            session.time.play({ interval: 0 });
        });
        assert.strictEqual(steps.at(-1), T0 + 5 * DAY);
        assert.isTrue(steps.every((to) => to <= T0 + 5 * DAY));
        session.dispose();
    });

    it("picks a calendar step on Auto, and reports it on the window", async () => {
        const { session } = await open();
        assert.strictEqual(session.time.settings.step, "auto");
        await session.time.stepBy(1);
        // Five days over twenty steps is closest to an hour.
        assert.strictEqual(session.time.current?.step, "hour");
        session.dispose();
    });

    it("keeps step and mode when the window is cleared, and saves them with the project", async () => {
        const { session } = await open();
        await session.time.setSettings({ step: "day", mode: "cumulative", results: "keep" });
        await session.time.stepBy(1);
        await session.time.window(null);
        assert.deepStrictEqual(session.time.settings, {
            step: "day",
            mode: "cumulative",
            results: "keep",
            missing: "inside",
            outside: "hide",
        });

        const { text } = await session.project.save();
        const reopened = createGraphSession({ runs: { execute } });
        await reopened.project.open(text);
        assert.strictEqual(reopened.time.settings.mode, "cumulative");
        assert.strictEqual(reopened.time.settings.step, "day");
        session.dispose();
        reopened.dispose();
    });

    it("stores a step with no window, and snaps a sliding window to a new step", async () => {
        const { session } = await open();
        await session.time.setSettings({ step: "week" });
        assert.isNull(session.time.current);
        assert.strictEqual(session.visibility.summary.visibleEdges, 6);

        await session.time.setSettings({ step: "day" });
        await session.time.window({ from: T0 + DAY + 3_600_000, to: T0 + 4 * DAY });
        await session.time.setSettings({ step: "week" });
        // 2026-01-01 is a Thursday: the week holding Jan 2 starts on Monday Dec 29.
        assert.deepInclude(session.time.current ?? {}, { from: Date.UTC(2025, 11, 29), to: Date.UTC(2026, 0, 5) });
        session.dispose();
    });

    it("grows cumulative windows from the start of the data, and goes back to one step", async () => {
        const { session } = await open();
        await session.time.setSettings({ step: "day" });
        await session.time.stepBy(3);
        await session.time.setSettings({ mode: "cumulative" });
        assert.deepInclude(session.time.current, { from: T0, to: T0 + 3 * DAY, mode: "cumulative" });
        await session.time.setSettings({ mode: "sliding" });
        assert.deepInclude(session.time.current, { from: T0 + 2 * DAY, to: T0 + 3 * DAY });
        session.dispose();
    });

    it("hides untimed elements when the setting says so", async () => {
        const { session } = await open();
        await session.time.setSettings({ step: "day" });
        await session.time.stepBy(1);
        const shown = session.visibility.summary.visibleEdges;
        await session.time.setSettings({ missing: "outside" });
        assert.strictEqual(session.visibility.summary.visibleEdges, shown - 1);
        session.dispose();
    });

    it("bins on whole calendar steps within a budget, covering the data exactly", async () => {
        const { session } = await open();
        const bins = session.time.bins({ maxCount: 3 }) ?? [];
        assert.strictEqual(bins[0].step, "week");
        assert.strictEqual(bins[0].start, Date.UTC(2025, 11, 29));
        assert.strictEqual(bins.at(-1)?.end, Date.UTC(2026, 0, 12));
        assert.strictEqual(
            bins.reduce((sum, bin) => sum + bin.edges, 0),
            5,
        );
        session.dispose();
    });

    it("never cuts whole-number time into bins narrower than one", async () => {
        const { session } = await open(false, "source,target,year\nA,B,1995\nB,C,2010\nC,D,2024\n");
        await session.time.setField({ edges: { start: "year", unit: "ordinal" } });
        const bins = session.time.bins({ maxCount: 200 }) ?? [];
        assert.strictEqual(bins[0].step, 1);
        assert.strictEqual(bins.length, 30);
        session.dispose();
    });

    it("measures the visible graph when asked", async () => {
        const { session } = await open();
        await session.time.window({ from: T0, to: T0 + DAY, step: "day" });
        const visible = session.data.statistics({ scope: "visible" });
        assert.strictEqual(visible.edgeCount, session.visibility.summary.visibleEdges);
        assert.strictEqual(session.data.statistics().edgeCount, 6);
        session.dispose();
    });
});
