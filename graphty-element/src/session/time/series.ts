/**
 * @file `time.series`: every window of a step in one run, counted as stepping would count them.
 *
 * A series counts the windows away from the masks ({@link WindowWalk}), so what is on screen, the
 * project and history never see it. Component and algorithm measures need a pass per window and
 * are not here yet: {@link TimeMeasure} is a union so they add to it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { GraphtyError } from "../../errors";
import type { Progress, RunExecutionContext } from "../runs";
import type { TimeStep, TimeWindow, WindowWalk } from "../visibility";
import type { TimeCountPair, TimePlayMode } from "./TimeApi";
import { type IndexWork, inSlices } from "./timeIndex";

/** The most windows one series holds: a step far too small for the data refuses, not fills memory. */
const MAX_WINDOWS = 10_000;

/** The measures a series can take. */
const MEASURES: ReadonlySet<string> = new Set<TimeMeasure>(["nodes", "edges", "density"]);

/**
 * What a series can measure in each window: the visible nodes, the visible edges, and the density
 * of the visible graph (null under two nodes).
 * @experimental timeline
 * @beta
 */
export type TimeMeasure = "nodes" | "edges" | "density";

/**
 * What `time.series` takes. `step`, `mode` and `timeZone` left out come from the window in force,
 * else the settings.
 * @experimental timeline
 * @beta
 */
export interface TimeSeriesOptions {
    /** How far each window moves on from the last. */
    readonly step?: TimeStep;
    /** Sliding windows, or `"cumulative"` to grow from the start. */
    readonly mode?: TimePlayMode;
    /** Where the first window starts (a step aligns it down); default the start of the data. */
    readonly from?: number;
    /** Where the last window reaches; default the end of the data. */
    readonly to?: number;
    /** The IANA zone calendar steps read in. */
    readonly timeZone?: string;
    /** What to put in each row's `values`, keyed by measure. */
    readonly measures?: readonly TimeMeasure[];
    /** Aborting it cancels the run. */
    readonly signal?: AbortSignal;
    /** Called as each window is counted. */
    readonly onProgress?: (progress: Progress) => void;
}

/**
 * One window of a series. `entered` and `left` compare it with the row before; the first row's
 * `entered` is everything it shows.
 * @experimental timeline
 * @beta
 */
export interface TimeSeriesRow {
    readonly from: number;
    readonly to: number;
    readonly visible: TimeCountPair;
    readonly entered: TimeCountPair;
    readonly left: TimeCountPair;
    /** One value per measure asked for, keyed by the measure. */
    readonly values: Readonly<Record<string, number | null>>;
}

/**
 * What `time.series` resolves to.
 * @experimental timeline
 * @beta
 */
export interface TimeSeries {
    readonly rows: readonly TimeSeriesRow[];
}

/**
 * Refuse a measure a series does not have.
 * @param measures - The measures asked for.
 * @throws `E_BAD_COMMAND` with `reason: "measure"`.
 */
export function assertMeasures(measures: readonly string[]): void {
    const unknown = measures.find((measure) => !MEASURES.has(measure));
    if (unknown !== undefined) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `A series measures nodes, edges or density, not "${unknown}".`,
            source: "data",
            details: { field: "measures", reason: "measure", value: unknown },
        });
    }
}

/**
 * Refuse a series bound that is not a finite number, as a window does.
 * @param options - What the series asked for.
 * @param options.from - Where it starts.
 * @param options.to - Where it ends.
 * @throws `E_OPTION_RANGE` naming the bound.
 */
export function assertSeriesBounds({ from, to }: Pick<TimeSeriesOptions, "from" | "to">): void {
    for (const [option, value] of [
        ["from", from],
        ["to", to],
    ] as const) {
        if (value !== undefined && !Number.isFinite(value)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `A series' ${option} must be a finite number.`,
                source: "data",
                details: { option, value },
            });
        }
    }
}

/**
 * The windows from a first one until one reaches an end.
 * @param first - The first window.
 * @param end - Where the last must reach.
 * @param next - The window after one.
 * @param reach - Where a window ends.
 * @returns The windows.
 * @throws `E_OPTION_RANGE` for more than {@link MAX_WINDOWS} of them.
 */
export function windowsUntil(
    first: TimeWindow,
    end: number,
    next: (window: TimeWindow) => TimeWindow,
    reach: (window: TimeWindow) => number,
): readonly TimeWindow[] {
    const windows = [first];
    let at = first;
    while (reach(at) < end) {
        if (windows.length === MAX_WINDOWS) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `A series holds at most ${MAX_WINDOWS} windows: use a larger step or a shorter range.`,
                source: "data",
                details: { option: "step", value: first.step, max: MAX_WINDOWS },
            });
        }

        at = next(at);
        windows.push(at);
    }

    return windows;
}

/**
 * The density of a graph: its edges over the edges it could hold.
 * @param visible - The counts.
 * @param visible.nodes - The nodes.
 * @param visible.edges - The edges.
 * @param directed - Whether an edge runs one way only.
 * @returns The density, or null under two nodes.
 */
function densityOf({ nodes, edges }: TimeCountPair, directed: boolean): number | null {
    if (nodes < 2) {
        return null;
    }

    const density = edges / (nodes * (nodes - 1));

    return directed ? density : 2 * density;
}

/**
 * The measures of one window.
 * @param measures - The measures asked for.
 * @param visible - What the window shows.
 * @param directed - Whether the graph is directed.
 * @returns The values.
 */
function valuesOf(
    measures: readonly TimeMeasure[],
    visible: TimeCountPair,
    directed: boolean,
): Readonly<Record<string, number | null>> {
    const all = { nodes: visible.nodes, edges: visible.edges, density: densityOf(visible, directed) };

    return Object.freeze(Object.fromEntries(measures.map((measure) => [measure, all[measure]])));
}

/**
 * Walk the windows, stopping at a cancel.
 * @param windows - The windows.
 * @param walk - The walk.
 * @param measures - The measures.
 * @param bounds - A window's bounds as instants.
 * @param context - The run.
 * @yields After each window.
 * @returns The rows.
 */
function* rowsOf(
    windows: readonly TimeWindow[],
    walk: WindowWalk,
    measures: readonly TimeMeasure[],
    bounds: (window: TimeWindow) => readonly [number, number],
    context: RunExecutionContext,
): IndexWork<readonly TimeSeriesRow[]> {
    const rows: TimeSeriesRow[] = [];
    for (const window of windows) {
        const { visible, entered, left } = walk.move(window);
        const [from, to] = bounds(window);
        rows.push(
            Object.freeze({
                from,
                to,
                visible,
                entered,
                left,
                values: valuesOf(measures, visible, walk.directed),
            }),
        );
        context.report({ completed: rows.length, total: windows.length });
        context.signal.throwIfAborted();
        yield undefined;
    }

    return Object.freeze(rows);
}

/**
 * Count every window, a slice at a time, so a long series leaves the thread its frames.
 * @param windows - The windows.
 * @param walk - The walk.
 * @param measures - The measures.
 * @param bounds - A window's bounds as instants.
 * @param context - The run.
 * @returns The series.
 */
export async function walkSeries(
    windows: readonly TimeWindow[],
    walk: WindowWalk,
    measures: readonly TimeMeasure[],
    bounds: (window: TimeWindow) => readonly [number, number],
    context: RunExecutionContext,
): Promise<TimeSeries> {
    const rows = await inSlices(rowsOf(windows, walk, measures, bounds, context), () => context.signal.aborted);
    context.signal.throwIfAborted();

    return Object.freeze({ rows: rows ?? [] });
}
