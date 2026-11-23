/**
 * @file session.time's less common asks, through the public session only: spans of ids the graph
 * does not hold, bin budgets that whole calendar steps cannot meet, fractional and single-value
 * ordinal time, a window given one bound, playback settings changed under a cumulative or zoned
 * window, a play asking for a new step, and what the time API reads before any field is designated.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { windowCount } from "../../helpers/time-window";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

/** Five edges a day apart, Jan 1 to Jan 5. */
const DAILY =
    "source,target,sent\n" +
    "A,B,2026-01-01\n" +
    "B,C,2026-01-02\n" +
    "C,D,2026-01-03\n" +
    "D,E,2026-01-04\n" +
    "E,F,2026-01-05\n";

/**
 * A session over CSV edges, with `sent` designated when the CSV has it.
 * @param csv - The edges.
 * @param field - The field to designate, or null for none.
 * @returns The session.
 */
async function open(
    csv: string,
    field: Parameters<GraphSession["time"]["setField"]>[0] | null = { edges: { start: "sent" } },
): Promise<GraphSession> {
    const session = createGraphSession({ workingGraph: false });
    await session.data.import({ type: "csv", config: { data: csv } });
    if (field !== null) {
        await session.time.setField(field);
    }

    return session;
}

/**
 * The next `time:step` event.
 * @param session - The session.
 * @returns Its detail.
 */
function nextStep(session: GraphSession): Promise<{ from: number; to: number }> {
    return new Promise((resolve) => {
        const off = session.on("time:step", (detail) => {
            off();
            resolve(detail);
        });
    });
}

describe("time.spanOf with ids the graph does not hold", () => {
    it("leaves unknown nodes and edges out, and spans an edge given alone with incident", async () => {
        const session = await open(DAILY);
        assert.isNull(session.time.spanOf({ nodes: ["nobody"], edges: ["no-edge"], incident: true }));
        const [first] = [...session.visibility.edges];
        // incident with no nodes adds nothing: the span is the given edge's day.
        assert.deepEqual(session.time.spanOf({ edges: [first], incident: true }), { from: T0, to: T0 + 1 });
        assert.deepEqual(session.time.spanOf({ nodes: ["nobody", "A"], incident: true }), { from: T0, to: T0 + 1 });
        session.dispose();
    });
});

describe("time.bins with a bin budget", () => {
    /**
     * Check bins cover every edge once, within the budget.
     * @param session - The session.
     * @param maxCount - The budget.
     * @param edges - How many timed edges there are.
     * @returns The bins.
     */
    function budgeted(
        session: GraphSession,
        maxCount: number,
        edges: number,
    ): ReturnType<GraphSession["time"]["bins"]> {
        const bins = session.time.bins({ maxCount }) ?? [];
        assert.isAtLeast(bins.length, 1);
        assert.isAtMost(bins.length, maxCount);
        assert.strictEqual(
            bins.reduce((sum, bin) => sum + bin.edges, 0),
            edges,
        );
        for (let bin = 1; bin < bins.length; bin++) {
            assert.strictEqual(bins[bin].start, bins[bin - 1].end, "bins are contiguous");
        }

        return bins;
    }

    it("widens a day step to a week when aligned days would need one bin too many", async () => {
        // 1.75 days fits two days by length, but aligned to midnight it touches three.
        const session = await open("source,target,sent\nA,B,2026-01-01T12:00:00Z\nB,C,2026-01-03T06:00:00Z\n");
        const bins = budgeted(session, 2, 2);
        assert.strictEqual(bins?.[0].step, "week");
        session.dispose();
    });

    it("leaves calendar steps for a plain length when aligned years need one bin too many", async () => {
        // About 1.6 years: two years by length, three aligned to January.
        const session = await open("source,target,sent\nA,B,2020-07-01\nB,C,2022-02-01\n");
        const bins = budgeted(session, 2, 2);
        assert.isNumber(bins?.[0].step);
        session.dispose();
    });

    it("bins a span longer than the budget's years in plain lengths", async () => {
        const session = await open("source,target,sent\nA,B,2001-03-01\nB,C,2003-01-01\nC,D,2009-11-01\n");
        const bins = budgeted(session, 2, 3);
        assert.isNumber(bins?.[0].step);
        session.dispose();
    });

    it("cuts fractional ordinal time into bins narrower than one", async () => {
        const session = await open("source,target,score\nA,B,0.1\nB,C,0.2\nC,D,0.35\n", {
            edges: { start: "score", unit: "ordinal" },
        });
        const bins = budgeted(session, 20, 3);
        assert.isBelow(bins?.[0].step as number, 1);
        session.dispose();
    });
});

describe("time windows on less common data", () => {
    it("fills a window given only its end from the first window of the mode asked", async () => {
        const session = await open(DAILY);
        await session.time.window({ to: T0 + 3 * DAY, mode: "cumulative" });
        const window = session.time.committed;
        assert.strictEqual(window?.mode, "cumulative");
        assert.strictEqual(window?.from, T0);
        assert.strictEqual(window?.to, T0 + 3 * DAY);
        assert.strictEqual(windowCount(session.visibility).edges, 3);
        session.dispose();
    });

    it("keeps a cumulative window's start when its step changes", async () => {
        const session = await open(DAILY);
        await session.time.window({ from: T0, to: T0 + 2 * DAY, step: "day", mode: "cumulative" });
        await session.time.setSettings({ mode: "cumulative", step: "week" });
        const window = session.time.committed;
        assert.strictEqual(window?.step, "week");
        assert.strictEqual(window?.from, T0);
        // The end moves out to the end of the week holding the old end: Monday, Jan 5.
        assert.strictEqual(window?.to, Date.UTC(2026, 0, 5));
        session.dispose();
    });

    it("keeps an unaligned window's bounds when its zone changes", async () => {
        const session = await open(DAILY);
        const from = T0 + 3 * 3_600_000;
        await session.time.window({ from, to: from + DAY, step: "day" });
        await session.time.setSettings({ step: "day", timeZone: "America/New_York" });
        const window = session.time.committed;
        assert.strictEqual(window?.timeZone, "America/New_York");
        assert.strictEqual(window?.from, from);
        assert.strictEqual(window?.to, from + DAY);
        session.dispose();
    });

    it("keeps a cumulative window's start when its zone changes", async () => {
        const session = await open(DAILY);
        await session.time.window({ from: T0, to: T0 + 2 * DAY, step: "day", mode: "cumulative" });
        await session.time.setSettings({ mode: "cumulative", step: "day" });
        await session.time.setSettings({ timeZone: "Asia/Tokyo" });
        const window = session.time.committed;
        assert.strictEqual(window?.timeZone, "Asia/Tokyo");
        assert.strictEqual(window?.from, T0);
        assert.isAbove(Number(window?.to), T0);
        session.dispose();
    });

    it("counts edges with no time inside again once missing is set back to inside", async () => {
        const session = await open(`${DAILY}F,A,\n`);
        await session.time.window({ from: T0, to: T0 + DAY, step: "day" });
        await session.time.setSettings({ step: "day" });
        const shown = windowCount(session.visibility).edges;
        await session.time.setSettings({ missing: "outside" });
        assert.strictEqual(windowCount(session.visibility).edges, shown - 1);
        await session.time.setSettings({ missing: "inside" });
        assert.strictEqual(windowCount(session.visibility).edges, shown);
        assert.isUndefined(session.time.committed?.missing);
        session.dispose();
    });

    it("plays from the current window on the step the play asks for", async () => {
        const session = await open(DAILY);
        await session.time.window({ from: T0, to: T0 + DAY, step: "day" });
        const stepped = nextStep(session);
        session.time.play({ step: "week", mode: "sliding", interval: 1_000_000, motion: "steps" });
        const step = await stepped;
        session.time.pause();
        assert.strictEqual(session.time.current?.step, "week");
        assert.strictEqual(step.from, T0);
        session.dispose();
    });
});

describe("session.time before and beside a designated field", () => {
    it("reads text as milliseconds and reports the settings' zone with no field", async () => {
        const session = await open(DAILY, null);
        assert.strictEqual(session.time.parse("2026-01-02T00:00:00Z"), T0 + DAY);
        assert.strictEqual(session.time.timeZone, session.time.settings.timeZone);
        session.dispose();
    });

    it("reports the unit a node field with no unit is read in, and no edge field", async () => {
        const session = createGraphSession({ workingGraph: false });
        await session.data.import({ type: "csv", config: { data: "source,target\nA,B\n" } });
        await session.data.updateNodes([
            { id: "A", values: { born: 1990 } },
            { id: "B", values: { born: 2004 } },
        ]);
        await session.time.setField({ nodes: { start: "born" } });
        const { field } = session.time;
        assert.isUndefined(field?.edges);
        assert.strictEqual(field?.nodes?.start, "born");
        assert.strictEqual(field?.nodes?.unit, "year");
        // Years read the same everywhere: the zone is UTC.
        assert.strictEqual(session.time.timeZone, "UTC");
        session.dispose();
    });
});
