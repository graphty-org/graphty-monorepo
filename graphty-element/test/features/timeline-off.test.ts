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
import { FakeClock, FakeLocks } from "../autosave/fakes";

const GHOST = "graphty:timeline-ghost";
const OFF = { features: [] };
const ON = { features: ["timeline"] };
const CSV = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\nD,A,2026-01-04\n";
const DAY = 86_400_000;
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
        assert.deepEqual(createGraphSession({ features: ["all"] }).features.enabled, ["timeline"]);
        assert.deepEqual(
            createGraphSession({ features: featuresFromUrl("https://x.test/?features=timeline") }).features.enabled,
            ["timeline"],
        );
        setDefaultFeatures(["timeline"]);
        assert.deepEqual(createGraphSession().features.enabled, ["timeline"]);
    });
});

describe("session.time with the timeline off", () => {
    it("can be read, and every member refuses with E_FEATURE_OFF", () => {
        const { time } = createGraphSession(OFF);
        const members = ["field", "settings", "playing", "extent", "bins", "play", "pause", "setField", "window"];
        for (const member of members) {
            const error = thrownBy(() => time[member as keyof typeof time]);
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

    it("applies only a window's bounds", async () => {
        const session = await loaded(OFF);
        await session.visibility.setWindow({ ...FIRST_DAYS, nodes: "ends", missing: "outside" });
        // A window that took `nodes: "ends"` would leave only the three nodes of those two edges.
        assert.strictEqual(session.visibility.summary.visibleNodes, 4);
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
    it("keeps its time field, its settings and its Ghost row, and draws no ghosts", async () => {
        const saved = await loaded(ON);
        await saved.config.set({ startingRows: true });
        await saved.time.setField({ edges: { start: "sent", unit: "ms" } });
        await saved.time.setSettings({ mode: "cumulative", outside: "ghost" });
        await saved.time.window({ from: FIRST_DAYS.from, to: FIRST_DAYS.to });
        const { text } = await saved.project.save();

        const session = createGraphSession({ ...OFF, runs: { execute } });
        const report = await session.project.open(text);
        assert.deepEqual(report.problems, []);
        assert.strictEqual(session.config.data.knownFields.edgeTimePath, "sent");
        assert.strictEqual(session.config.data.knownFields.edgeTimeUnit, "ms");
        const ghostRows = (each: GraphSession): number =>
            each.styles.list().filter((layer) => layer.source.by === "template" && layer.source.templateId === GHOST)
                .length;
        assert.strictEqual(ghostRows(session), ghostRows(saved));
        assert.isAbove(ghostRows(saved), 0);
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
    });
});
