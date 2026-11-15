/**
 * @file With the timeline experiment off a session behaves as the last release without it did;
 * session.time refuses, and a project that holds time settings keeps them. Every session here
 * names its features, so these hold in the On configuration too.
 */

import { assert, beforeEach, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { GraphtyError } from "../../src/errors";
import { FEATURES } from "../../src/features/registry";
import { featuresFromUrl, setDefaultFeatures } from "../../src/features/resolve";
import { dispatcherOf } from "../../src/session/GraphSession";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { slideCounters } from "../../src/session/visibility/slide";
import { FakeClock, FakeLocks } from "../autosave/fakes";

const GHOST = "graphty:timeline-ghost";
const OFF = { features: [] };
const ON = { features: ["timeline"] };
const CSV = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\nD,A,2026-01-04\n";
const DAY = 86_400_000;
const YEARS = [1995, 2000, 2005, 2010];
const SECONDS = [1_700_000_000, 1_700_100_000, 1_700_200_000, 1_700_300_000];
const FIRST_DAYS = { attribute: "data.sent", from: Date.UTC(2026, 0, 1), to: Date.UTC(2026, 0, 1) + 2 * DAY };

/**
 * A stand-in algorithm.
 * @param context - The run.
 * @returns The outcome.
 */
async function execute(context: RunExecutionContext): Promise<RunOutcome> {
    await Promise.resolve();
    return {
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [],
            measured: { nodes: 1, edges: 0 },
            nodes: [],
            edges: [],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "test", facts: [], notes: [] },
            durationMs: 1,
        }),
    };
}

/**
 * A session over a small graph whose edges carry text dates.
 * @param options - Its features.
 * @param options.features - The ids.
 * @returns The session.
 */
async function loaded(options: { readonly features: readonly string[] }): Promise<GraphSession> {
    const session = createGraphSession({ ...options, runs: { execute } });
    await session.data.import({ type: "csv", config: { data: CSV } });
    return session;
}

/**
 * The error a call throws.
 * @param call - The call.
 * @returns What it threw.
 */
function thrownBy(call: () => unknown): unknown {
    try {
        call();
    } catch (error) {
        return error;
    }
    return undefined;
}

/**
 * Assert a call was refused for the timeline.
 * @param call - The call's promise.
 * @param key - What the refusal names.
 */
async function assertOff(call: Promise<unknown>, key: string): Promise<void> {
    const error = await call.then(
        () => undefined,
        (refusal: unknown) => refusal,
    );
    assert.instanceOf(error, GraphtyError, key);
    assert.strictEqual(error.code, "E_FEATURE_OFF");
    assert.deepEqual(error.details, { feature: "timeline", key });
}

/**
 * A session over a chain of nodes where the nodes, or the edges into them, carry one value each.
 * @param values - The values.
 * @param on - Which kind carries them.
 * @returns The session, with the timeline on.
 */
async function chain(values: readonly number[], on: "nodes" | "edges"): Promise<GraphSession> {
    const session = createGraphSession({ ...ON, runs: { execute } });
    const nodes = values.map((at, index) => ({ id: `n${String(index)}`, ...(on === "nodes" ? { at } : {}) }));
    const edges = values.slice(1).map((at, index) => ({
        source: `n${String(index)}`,
        target: `n${String(index + 1)}`,
        ...(on === "edges" ? { at } : {}),
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ directed: true, nodes, edges }) } });
    return session;
}

beforeEach(() => {
    setDefaultFeatures([]);
});

describe("the timeline's switch", () => {
    it("is declared with its tracking issue", () => {
        assert.deepInclude(
            FEATURES.map(({ id, issue }) => ({ id, issue })),
            { id: "timeline", issue: 300 },
        );
    });

    it("turns on by id, by all, by the page default and from a link", () => {
        assert.deepEqual(createGraphSession(ON).features.enabled, ["timeline"]);
        assert.include(createGraphSession({ features: ["all"] }).features.enabled, "timeline");
        assert.deepEqual(
            createGraphSession({ features: featuresFromUrl("https://x.test/?features=timeline") }).features.enabled,
            ["timeline"],
        );
        setDefaultFeatures(["timeline"]);
        assert.deepEqual(createGraphSession().features.enabled, ["timeline"]);
    });
});

describe("session.time with the timeline off", () => {
    it("answers a read as it does with no time field", async () => {
        const { time } = await loaded(OFF);
        assert.isNull(time.field);
        assert.isNull(time.current);
        assert.isFalse(time.playing);
        assert.isFalse(time.atStart);
        assert.isFalse(time.atEnd);
        assert.deepEqual(time.settings, createGraphSession(ON).time.settings);
        assert.isNull(time.extent());
        assert.isNull(time.bins());
        assert.deepEqual(time.candidates(), []);
        assert.deepEqual(time.notices(), []);
        assert.deepEqual(time.changes(), { entered: { nodes: [], edges: [] }, left: { nodes: [], edges: [] } });
        await time.ready;
    });

    it("still reads text as an instant, as a date condition needs", () => {
        const { time } = createGraphSession(OFF);
        assert.strictEqual(time.parse("2026-01-02"), Date.UTC(2026, 0, 2));
        assert.isNull(time.parse("not a date"));
    });

    it("throws from the actions that return no promise", () => {
        const { time } = createGraphSession(OFF);
        for (const member of ["play", "pause", "window", "spanOf", "committed"]) {
            const error = thrownBy(() => time[member as keyof typeof time]);
            assert.instanceOf(error, GraphtyError, member);
            assert.strictEqual(error.code, "E_FEATURE_OFF");
            assert.deepEqual(error.details, { feature: "timeline", key: `time.${member}` });
        }
    });

    it("rejects, and never throws, from the members that return a promise", async () => {
        const { time } = createGraphSession(OFF);
        const calls = {
            setField: () => time.setField({ edges: { start: "sent" } }),
            setSettings: () => time.setSettings({ mode: "cumulative" }),
            stepBy: () => time.stepBy(1),
            seek: () => time.seek("start"),
            commit: () => time.commit(),
        };
        for (const [member, call] of Object.entries(calls)) {
            const error = await (call() as Promise<unknown>).then(
                () => undefined,
                (refusal: unknown) => refusal,
            );
            assert.instanceOf(error, GraphtyError, member);
            assert.strictEqual(error.code, "E_FEATURE_OFF");
            assert.deepEqual(error.details, { feature: "timeline", key: `time.${member}` });
        }
    });

    it("refuses the playback command, and leaves visibility.setWindow working", async () => {
        const session = await loaded(OFF);
        const refused = await session.execute({ op: "visibility.playback", playback: { mode: "cumulative" } }).then(
            () => undefined,
            (error: unknown) => error,
        );
        assert.strictEqual((refused as GraphtyError).code, "E_FEATURE_OFF");

        await session.visibility.setWindow(FIRST_DAYS);
        assert.strictEqual(session.visibility.summary.visibleEdges, 2);
    });

    it("refuses the same request inside a batch, and keeps the marker of a restore private", async () => {
        const session = await loaded(OFF);
        const playback = { op: "visibility.playback", playback: { mode: "cumulative" } } as const;
        const window = { op: "visibility.window", window: { ...FIRST_DAYS, nodes: "ends" } } as const;
        await assertOff(session.execute({ op: "batch", steps: [playback] }), "batch");
        await assertOff(session.execute({ op: "batch", steps: [window] }), "batch");
        await assertOff(session.execute({ ...playback, restoring: true } as never), "visibility.playback");
        await assertOff(session.execute({ ...window, restoring: true } as never), "visibility.window");
        assert.isNull(session.visibility.window);
        assert.isUndefined(dispatcherOf(session).state.visibility.playback ?? undefined);
    });
});

describe("a live window with the timeline off", () => {
    /**
     * How many edges a window leaves on a column, with and without a time role from the config.
     * @param values - The column's values.
     * @param from - The window's start.
     * @param to - The window's end.
     * @returns The visible edges, undesignated and then designated.
     */
    async function shown(
        values: readonly (number | string)[],
        from: number | string,
        to: number | string,
    ): Promise<[number, number]> {
        const counts: number[] = [];
        for (const designated of [false, true]) {
            const session = createGraphSession({ ...OFF, runs: { execute } });
            const edges = values.map((at, index) => ({ source: `n${String(index)}`, target: "hub", at }));
            await session.data.import({ type: "json", config: { data: JSON.stringify({ edges }) } });
            if (designated) {
                await session.config.set({ data: { knownFields: { edgeTimePath: "at" } } });
            }
            await session.visibility.setWindow({ attribute: "at", from, to });
            counts.push(session.visibility.summary.visibleEdges);
        }
        return counts as [number, number];
    }

    it.each([
        ["years", [2001, 2005, 2009, 2015], 2000, 2010, 3],
        ["epoch seconds", SECONDS, 1_700_000_000, 1_700_250_000, 3],
        [
            "offset-less dates",
            ["2020-03-01T12:00", "2020-03-02T12:00", "2020-03-09T12:00"],
            "2020-03-01",
            "2020-03-05",
            2,
        ],
    ] as const)("reads %s the same on a column with a time role", async (_name, values, from, to, expected) => {
        assert.deepEqual(await shown(values, from, to), [expected, expected]);
    });

    it("reads the same after a save and an open", async () => {
        const session = await chain(YEARS, "edges");
        const off = createGraphSession({ ...OFF, runs: { execute } });
        await off.project.open((await session.project.save()).text);
        await off.config.set({ data: { knownFields: { edgeTimePath: "at" } } });
        await off.visibility.setWindow({ attribute: "at", from: 1999, to: 2006 });
        assert.strictEqual(off.visibility.summary.visibleEdges, 2);

        const { text } = await off.project.save();
        const reopened = createGraphSession({ ...OFF, runs: { execute } });
        await reopened.project.open(text);
        assert.strictEqual(reopened.visibility.summary.visibleEdges, 2);
        const again = createGraphSession({ ...OFF, runs: { execute } });
        await again.project.open((await reopened.project.save()).text);
        assert.strictEqual(again.visibility.summary.visibleEdges, 2);
    });
});

describe("the data with the timeline off", () => {
    it("does not read a text column of dates as time", async () => {
        const off = await loaded(OFF);
        const on = await loaded(ON);
        const measurement = (session: GraphSession): unknown =>
            session.data.attributes().find((each) => each.name === "sent")?.measurement;
        assert.notStrictEqual(measurement(off), "time");
        assert.strictEqual(measurement(on), "time");
    });

    it("keeps a time role, and it does not make the column measure time", async () => {
        const session = await loaded(OFF);
        await session.config.set({ data: { knownFields: { edgeTimePath: "sent" } } });
        const column = session.data.attributes().find((each) => each.name === "sent");
        assert.include(column?.roles ?? [], "time");
        assert.notStrictEqual(column?.measurement, "time");
    });

    it("refuses a time role, by setRole and by a load's mapping, and takes one away", async () => {
        const session = await loaded(OFF);
        const ref = { kind: "edge", name: "sent" } as const;
        await assertOff(session.data.setRole(ref, "time"), "data.setRole");
        const draft = await session.data.prepare({ type: "csv", config: { data: CSV } });
        await assertOff(draft.load({ mapping: { time: "sent" } }), "mapping.time");
        await assertOff(draft.load({ mapping: { timeUnit: "ms" } }), "mapping.timeUnit");
        assert.isNull(session.config.data.knownFields.edgeTimePath);

        await session.config.set({ data: { knownFields: { edgeTimePath: "sent" } } });
        await session.data.setRole(ref, null);
        assert.notInclude(session.data.attributes().find((each) => each.name === "sent")?.roles ?? [], "time");
    });

    it("loads a mapping that repeats the time role the configuration holds", async () => {
        const session = await loaded(OFF);
        await session.config.set({ data: { knownFields: { edgeTimePath: "sent" } } });
        const draft = await session.data.prepare({ type: "csv", config: { data: CSV } });
        await draft.load({ mapping: { time: "sent" } });
        assert.strictEqual(session.data.statistics().edgeCount, 4);
    });

    it("refuses a window's options by every door", async () => {
        const session = await loaded(OFF);
        for (const options of [{ nodes: "ends" }, { missing: "outside" }] as const) {
            const window = { ...FIRST_DAYS, ...options };
            const error = thrownBy(() => session.visibility.setWindow(window));
            assert.instanceOf(error, GraphtyError);
            assert.strictEqual(error.code, "E_FEATURE_OFF");
            assert.deepEqual(error.details, { feature: "timeline", key: "visibility.window" });
            await assertOff(session.execute({ op: "visibility.window", window }), "visibility.window");
        }
        assert.isNull(session.visibility.window);
    });

    it("writes no window on a run, and a moved window makes it scope-changed", async () => {
        const session = await loaded(OFF);
        await session.visibility.setWindow(FIRST_DAYS);
        const run = session.runs.start("degree", {}, { scope: "visible", as: "kept" });
        await run;
        assert.isDefined(run.caveats);
        assert.isUndefined(run.caveats?.window);

        await session.visibility.setWindow({ ...FIRST_DAYS, to: FIRST_DAYS.to + DAY });
        assert.strictEqual(run.stale?.reason, "scope-changed");
    });
});

describe("autosave with the timeline off", () => {
    it("writes a window change as it always did", async () => {
        const session = await loaded(OFF);
        const store = memoryAutosaveStore();
        const commit = vi.spyOn(store, "commit");
        const clock = new FakeClock();
        const saver = new Autosaver({ key: "off", session, store, clock, locks: new FakeLocks() });
        await saver.flush();
        const before = commit.mock.calls.length;

        await session.visibility.setWindow(FIRST_DAYS);
        clock.advance(60_000);
        await vi.waitFor(() => {
            assert.isAbove(commit.mock.calls.length, before);
        });
        session.dispose();
    });
});

describe("a project saved with the timeline on, opened with it off", () => {
    it("leaves no Ghost row behind when the next project opens", async () => {
        const saved = createGraphSession(ON);
        await saved.data.import({ type: "csv", config: { data: "source,target,sent\nA,B,2026-01-01\n" } });
        await saved.config.set({ startingRows: true });
        await saved.time.setField({ edges: { start: "sent", unit: "ms" } });
        const { text: timed } = await saved.project.save();
        const plain = createGraphSession(OFF);
        const { text: untimed } = await plain.project.save();
        const ghostLayers = (each: GraphSession): number =>
            each.styles.list().filter(({ source }) => source.by === "template" && source.templateId === GHOST).length;
        const once = ghostLayers(saved);
        assert.isAbove(once, 0);

        const session = createGraphSession(OFF);
        await session.project.open(timed, { discard: true });
        await session.project.open(timed, { discard: true });
        assert.strictEqual(ghostLayers(session), once, "opening it again adds none");
        await session.project.open(untimed, { discard: true });
        assert.strictEqual(ghostLayers(session), 0, "a project with none holds none");
        for (const each of [saved, plain, session]) {
            each.dispose();
        }
    });

    it('gives a saved `nodes: "ends"` window under a filter the masks of its bounds alone', async () => {
        const saved = await loaded(ON);
        await saved.time.setField({ edges: { start: "sent", unit: "ms" } });
        await saved.time.window({ from: FIRST_DAYS.from, to: FIRST_DAYS.to });
        const { text } = await saved.project.save();
        const session = createGraphSession({ ...OFF, runs: { execute } });
        await session.project.open(text);
        assert.strictEqual(session.visibility.window?.nodes, "ends");

        await session.visibility.setSteps([{ id: "first", on: true, rule: { kind: "edges", where: "source == 'A'" } }]);
        assert.strictEqual(session.visibility.summary.visibleEdges, 1);
        assert.strictEqual(session.visibility.summary.visibleNodes, 4, "the option stays saved and is not applied");
    });

    it("moves a window under a filter by plain passes, with no slide and no kept filter", async () => {
        const saved = await loaded(ON);
        await saved.time.setField({ edges: { start: "sent", unit: "ms" } });
        const { text } = await saved.project.save();
        const session = createGraphSession({ ...OFF, runs: { execute } });
        await session.project.open(text);
        await session.visibility.setSteps([{ id: "first", on: true, rule: { kind: "edges", where: "source == 'A'" } }]);

        const { jumps, rows, scans, filterReads, rewritten, spans } = slideCounters;
        for (const days of [1, 2, 3]) {
            const { full } = slideCounters;
            await session.visibility.setWindow({ ...FIRST_DAYS, to: FIRST_DAYS.from + days * DAY });
            assert.strictEqual(slideCounters.full, full + 1, "one full pass");
        }

        // Undo brings the masks back as they were, with no pass.
        await session.undo();
        assert.deepEqual(
            { ...slideCounters, full: 0 },
            { full: 0, jumps, rows, scans, filterReads, rewritten, spans },
            "nothing slid, jumped or kept the filter's tests",
        );
    });

    it("reads a saved window's column on a kind the field does not time", async () => {
        const saved = createGraphSession({ ...ON, runs: { execute } });
        await saved.data.addNodes([
            { id: "a", at: 1000 },
            { id: "b", at: 1000 },
            { id: "c", at: 9000 },
            { id: "d", at: 9000 },
        ]);
        await saved.data.addEdges([
            { source: "a", target: "b", at: 1000 },
            { source: "c", target: "d", at: 9000 },
        ]);
        await saved.time.setField({ edges: { start: "at", unit: "ms" } });
        await saved.time.window({ from: 0, to: 5000, nodes: "all" });
        const { text } = await saved.project.save();
        const session = createGraphSession({ ...OFF, runs: { execute } });
        await session.project.open(text);
        assert.strictEqual(session.visibility.summary.visibleNodes, 2);
    });

    it("keeps its time field, its settings and its Ghost row, and draws no ghosts", async () => {
        const saved = await loaded(ON);
        await saved.config.set({ startingRows: true });
        await saved.time.setField({ edges: { start: "sent", unit: "ms" } });
        await saved.time.setSettings({ mode: "cumulative", outside: "ghost" });
        await saved.time.window({ from: FIRST_DAYS.from, to: FIRST_DAYS.to });
        const { text } = await saved.project.save();

        const session = createGraphSession({ ...OFF, runs: { execute } });
        const report = await session.project.open(text);
        assert.sameDeepMembers(
            [...report.problems],
            ["visibility.playback", "visibility.window"].map((key) => ({
                code: "E_FEATURE_OFF",
                params: { feature: "timeline", key },
            })),
        );
        assert.strictEqual(session.config.data.knownFields.edgeTimePath, "sent");
        assert.strictEqual(session.config.data.knownFields.edgeTimeUnit, "ms");
        // The saved window keeps its `nodes: "ends"`, and only its bounds apply: that option would
        // leave only the three nodes of the two edges inside it.
        assert.strictEqual(session.visibility.window?.nodes, "ends");
        assert.strictEqual(session.visibility.summary.visibleEdges, 2);
        assert.strictEqual(session.visibility.summary.visibleNodes, 4);
        const ghostRows = (each: GraphSession): number =>
            each.styles.list().filter((layer) => layer.source.by === "template" && layer.source.templateId === GHOST)
                .length;
        assert.strictEqual(ghostRows(session), ghostRows(saved));
        assert.isAbove(ghostRows(saved), 0);
        const rowNames = (each: GraphSession): string[] => each.styles.tree().map((row) => row.name);
        assert.include(rowNames(saved), "Ghost");
        assert.notInclude(rowNames(session), "Ghost");
        assert.isFalse(dispatcherOf(session).state.visibility.playback === null);
        const visibility = (doc: string): Record<string, unknown> => {
            const { members } = JSON.parse(doc) as { members: { kind?: string; visibility?: object }[] };
            return members.find((member) => member.visibility !== undefined)?.visibility as Record<string, unknown>;
        };
        assert.deepEqual(visibility((await session.project.save()).text).playback, visibility(text).playback);

        const reopened = createGraphSession({ ...ON, runs: { execute } });
        await reopened.project.open((await session.project.save()).text);
        assert.strictEqual(reopened.time.settings.outside, "ghost");
        assert.strictEqual(reopened.time.field?.edges?.start, "sent");
        assert.include(rowNames(reopened), "Ghost");
    });

    it.each([
        ["years on nodes, unit inferred", YEARS, { nodes: { start: "at" } }],
        ["years on nodes", YEARS, { nodes: { start: "at", unit: "year" } }],
        ["epoch seconds on edges", SECONDS, { edges: { start: "at", unit: "s" } }],
    ] as const)("keeps a window on %s showing the same elements", async (_name, values, field) => {
        const saved = await chain(values, "nodes" in field ? "nodes" : "edges");
        await saved.time.setField(field);
        const { from, to } = saved.time.extent() ?? { from: 0, to: 0 };
        await saved.time.window({ from: (from + to) / 2, to: to + 1 });
        const { visibleNodes, visibleEdges, totalNodes, totalEdges } = saved.visibility.summary;
        assert.isAbove(visibleNodes + visibleEdges, 0);
        assert.isBelow(visibleNodes + visibleEdges, totalNodes + totalEdges);

        const session = createGraphSession({ ...OFF, runs: { execute } });
        await session.project.open((await saved.project.save()).text);
        assert.strictEqual(session.visibility.summary.visibleEdges, visibleEdges);
        if ("nodes" in field) {
            assert.strictEqual(session.visibility.summary.visibleNodes, visibleNodes);
        }
    });

    it("keeps a saved window's instants across undo and another save", async () => {
        const saved = await chain(YEARS, "edges");
        await saved.time.setField({ edges: { start: "at", unit: "year" } });
        const { from, to } = saved.time.extent() ?? { from: 0, to: 0 };
        await saved.time.window({ from: (from + to) / 2, to: to + 1 });
        const { visibleEdges } = saved.visibility.summary;
        assert.isAbove(visibleEdges, 0);

        const session = createGraphSession({ ...OFF, runs: { execute } });
        await session.project.open((await saved.project.save()).text);
        await session.visibility.setWindow(null);
        await session.undo();
        assert.strictEqual(session.visibility.summary.visibleEdges, visibleEdges);

        const reopened = createGraphSession({ ...OFF, runs: { execute } });
        await reopened.project.open((await session.project.save()).text);
        assert.strictEqual(reopened.visibility.summary.visibleEdges, visibleEdges);
    });

    it("hands out no saved run's window, and saves it", async () => {
        const saved = await loaded(ON);
        await saved.time.setField({ edges: { start: "sent" } });
        await saved.time.window({ from: FIRST_DAYS.from, to: FIRST_DAYS.to });
        await saved.runs.start("degree", {}, { scope: "visible", as: "kept" });
        const { window } = saved.runs.list()[0]?.caveats ?? {};
        assert.isDefined(window);

        const session = createGraphSession({ ...OFF, runs: { execute } });
        await session.project.open((await saved.project.save()).text);
        const run = session.runs.list()[0];
        assert.isDefined(run);
        assert.isUndefined(run?.caveats?.window);
        assert.isUndefined(run?.record.caveats.window);

        const reopened = createGraphSession({ ...ON, runs: { execute } });
        await reopened.project.open((await session.project.save()).text);
        assert.deepEqual(reopened.runs.list()[0]?.caveats?.window, window);
    });

    it("reports nothing for a project that holds only a time role", async () => {
        const saved = await loaded(OFF);
        await saved.config.set({ data: { knownFields: { edgeTimePath: "sent" } } });
        const { text } = await saved.project.save();
        const session = createGraphSession({ ...OFF, runs: { execute } });
        const report = await session.project.open(text);
        assert.deepEqual(report.problems, []);
        assert.strictEqual(session.config.data.knownFields.edgeTimePath, "sent");
    });

    it("reports nothing for a project that never used the timeline", async () => {
        const saved = await loaded(OFF);
        const { text } = await saved.project.save();
        const report = await createGraphSession({ ...OFF, runs: { execute } }).project.open(text);
        assert.deepEqual(report.problems, []);
    });
});
