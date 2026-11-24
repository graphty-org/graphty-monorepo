/**
 * @file A data spec's Graph values: a count, sum, mean, min, max or most common value over a node's edges,
 * neighbors or members, kept by one `where` leaf and split by a value, the direction or a time period.
 *
 * Computed once per node per preparation (a preparation lives until the data or the structure moves), and
 * written into no column. Nothing here reaches Babylon.js or the DOM. Guide: docs/guide/data-lists.md.
 */

import { type GraphMeasure, instantOf, naturalCompare, type WalkPath } from "../../catalog/data-lists";
import type { Path, RuleTree } from "../../catalog/types";

/** What a Graph value walks: the structure, read once per preparation. */
export interface DataGraph {
    /** Whether the graph's edges have a direction. */
    readonly directed: boolean;
    /** How many edges there are. */
    readonly edgeCount: number;
    /**
     * Visit each arc at a node along a direction: the row at the other end, the edge's row and which way it points
     * from the node. An edge may be visited twice (a self-loop); the walk keeps it once.
     * @param node - The node's row.
     * @param direction - Which way to follow an edge.
     * @param visit - Called per arc.
     */
    adjacent(
        node: number,
        direction: "in" | "out" | "both",
        visit: (other: number, edge: number, way: "in" | "out") => void,
    ): void;
    /**
     * The rows of the nodes a group node holds.
     * @param node - The group node's row.
     */
    members(node: number): readonly number[];
    /**
     * The records a collapsed group keeps for members that left the graph.
     * @param node - The collapsed node's row.
     */
    held(node: number): readonly Readonly<Record<string, unknown>>[];
    /**
     * An edge's value for a path.
     * @param edge - The edge's row.
     * @param path - The path.
     */
    edgeValue(edge: number, path: Path): unknown;
}

/** One thing a walk reached: an edge and the node at its other end, a neighbor, a member, or a kept member's record. */
interface Item {
    readonly edge: number;
    readonly node: number;
    readonly record?: Readonly<Record<string, unknown>>;
    readonly way?: "in" | "out";
}

/** A period a time group is cut into. */
export type Period = "hour" | "day" | "week" | "month" | "quarter" | "year";

const HOUR = 3_600_000;
const DAY = 86_400_000;
/** The most periods a time group without a window fills, the newest kept. */
const MOST_PERIODS = 1000;

/**
 * The instant a period holding `ms` starts, in UTC (an ISO week starts on Monday).
 * @param ms - The instant.
 * @param period - The period.
 * @returns Its start.
 */
function periodStart(ms: number, period: Period): number {
    const date = new Date(ms);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    switch (period) {
        case "hour":
            return Math.floor(ms / HOUR) * HOUR;
        case "day":
            return Math.floor(ms / DAY) * DAY;
        case "week": {
            const day = Math.floor(ms / DAY) * DAY;
            return day - ((new Date(day).getUTCDay() + 6) % 7) * DAY;
        }
        case "month":
            return Date.UTC(year, month, 1);
        case "quarter":
            return Date.UTC(year, month - (month % 3), 1);
        default:
            return Date.UTC(year, 0, 1);
    }
}

/**
 * A period's start moved by whole periods.
 * @param start - A period's start.
 * @param period - The period.
 * @param by - How many periods, negative for earlier.
 * @returns The start of that period.
 */
function shiftPeriod(start: number, period: Period, by: number): number {
    const fixed: Partial<Record<Period, number>> = { hour: HOUR, day: DAY, week: 7 * DAY };
    const size = fixed[period];
    if (size !== undefined) {
        return start + by * size;
    }

    const months = { month: 1, quarter: 3, year: 12 }[period as "month" | "quarter" | "year"];
    const date = new Date(start);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + by * months, 1);
}

/**
 * The key of the period holding an instant, in UTC: `YYYY`, `YYYY-Qn`, `YYYY-MM`, `YYYY-Www` (ISO week),
 * `YYYY-MM-DD` or `YYYY-MM-DDTHH`. Keys of one period sort in time order.
 * @param ms - The instant.
 * @param period - The period.
 * @returns The key.
 */
export function periodKey(ms: number, period: Period): string {
    const start = periodStart(ms, period);
    const iso = new Date(start).toISOString();
    switch (period) {
        case "hour":
            return iso.slice(0, 13);
        case "day":
            return iso.slice(0, 10);
        case "month":
            return iso.slice(0, 7);
        case "year":
            return iso.slice(0, 4);
        case "quarter":
            return `${iso.slice(0, 4)}-Q${String(Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1)}`;
        default: {
            // The ISO week belongs to the year its Thursday falls in.
            const thursday = start + 3 * DAY;
            const year = new Date(thursday).getUTCFullYear();
            const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / DAY / 7) + 1;
            return `${String(year)}-W${String(week).padStart(2, "0")}`;
        }
    }
}

/**
 * The keys of every period from the one holding `first` to the one holding `last`, oldest first.
 * @param first - The earliest instant.
 * @param last - The latest instant.
 * @param period - The period.
 * @returns The keys, at most {@link MOST_PERIODS} (the newest kept).
 */
export function periodKeys(first: number, last: number, period: Period): string[] {
    const keys: string[] = [];
    // ponytail: a range longer than MOST_PERIODS keeps the newest; page through time if a reader needs more.
    const from = periodStart(first, period);
    for (
        let at = periodStart(last, period);
        at >= from && keys.length < MOST_PERIODS;
        at = shiftPeriod(at, period, -1)
    ) {
        keys.push(periodKey(at, period));
    }

    return keys.reverse();
}

/**
 * The keys of the last `last` periods, ending with the one holding `end` (the newest date in the data, or now).
 * @param period - The period.
 * @param last - How many periods.
 * @param end - The instant the window ends at.
 * @returns The keys, oldest first.
 */
export function windowKeys(period: Period, last: number, end: number): string[] {
    const newest = periodStart(end, period);
    return periodKeys(shiftPeriod(newest, period, 1 - last), end, period);
}

/** What one group gathers. */
interface Tally {
    count: number;
    sum: number;
    numbers: number;
    min: number;
    max: number;
    seen: Map<string, number> | null;
}

/**
 * A fresh tally.
 * @param mode - Whether it counts values for a mode.
 * @returns The tally.
 */
function tally(mode: boolean): Tally {
    return {
        count: 0,
        sum: 0,
        numbers: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        seen: mode ? new Map() : null,
    };
}

/**
 * Whether a value is missing.
 * @param value - The value.
 * @returns True for absent, null, "" and NaN.
 */
function absent(value: unknown): boolean {
    return value === undefined || value === null || value === "" || (typeof value === "number" && Number.isNaN(value));
}

/**
 * Whether one `range` or `categories` leaf keeps a value.
 * @param leaf - The leaf.
 * @param value - The value.
 * @returns True when it does.
 */
function keeps(leaf: RuleTree, value: unknown): boolean {
    if (absent(value) || (Array.isArray(value) && value.length === 0)) {
        return "missing" in leaf && leaf.missing === "include";
    }

    if (leaf.kind === "range") {
        const n = leaf.as === "time" ? instantOf(value) : Number(value);
        return (
            Number.isFinite(n) && (leaf.min === undefined || n >= leaf.min) && (leaf.max === undefined || n <= leaf.max)
        );
    }

    if (leaf.kind === "categories") {
        const words = (Array.isArray(value) ? value : [value]).map(String);
        return leaf.match === "all"
            ? words.every((word) => leaf.values.includes(word))
            : words.some((word) => leaf.values.includes(word));
    }

    return true;
}

/**
 * Add one value to a tally: its word for a mode, its number for the rest.
 * @param held - The tally.
 * @param value - The value.
 */
function gather(held: Tally, value: unknown): void {
    if (held.seen !== null && !absent(value)) {
        const word = String(value);
        held.seen.set(word, (held.seen.get(word) ?? 0) + 1);
    }

    // Text that is a number counts as one, as a field entry reads it (a CSV's "5").
    const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    if (typeof number === "number" && Number.isFinite(number)) {
        held.sum += number;
        held.numbers++;
        held.min = Math.min(held.min, number);
        held.max = Math.max(held.max, number);
    }
}

/**
 * The most common word a tally saw; ties go to the first in natural name order.
 * @param seen - The words and how often each was seen.
 * @returns The word, or null when none was.
 */
function modeOf(seen: ReadonlyMap<string, number>): string | null {
    let best: string | null = null;
    let most = 0;
    for (const [value, times] of seen) {
        if (times > most || (times === most && best !== null && naturalCompare(value, best) < 0)) {
            best = value;
            most = times;
        }
    }

    return best;
}

/**
 * What a measure gives over one group.
 * @param measure - The measure.
 * @param held - The group's tally; absent, an empty group (0 for a count, missing otherwise).
 * @returns The value, or null when missing.
 */
function resultOf(measure: GraphMeasure["measure"], held: Tally | undefined): unknown {
    if (measure === "count") {
        return held?.count ?? 0;
    }

    if (held === undefined) {
        return null;
    }

    if (measure === "mode") {
        return modeOf(held.seen ?? new Map());
    }

    if (held.numbers === 0) {
        return null;
    }

    const results = { sum: held.sum, mean: held.sum / held.numbers, min: held.min, max: held.max };
    return results[measure];
}

/** What a measurer reads a node's values with. */
export interface MeasureSource {
    /** How many nodes there are. */
    count(): number;
    /**
     * A node's value for a path.
     * @param index - The node's row.
     * @param path - The path.
     */
    value(index: number, path: Path): unknown;
}

/**
 * A Graph value's computation over one graph, with its walks reused: a stamp per node and per edge, so a walk
 * allocates nothing per node it passes.
 * @param graph - The structure.
 * @param source - The node values.
 * @param now - The instant a window `from: "now"` ends at.
 * @returns The measure of one node; and how many walks it has made, for a counted-work test.
 */
export function createMeasurer(
    graph: DataGraph,
    source: MeasureSource,
    now: number = Date.now(),
): { measure: (measure: GraphMeasure, index: number) => unknown; walks: () => number } {
    const nodeStamp = new Int32Array(source.count());
    const edgeStamp = new Int32Array(graph.edgeCount);
    let walk = 0;
    /** The graph's first and newest instant per time path, read once. */
    const spans = new Map<string, readonly [number, number] | null>();

    const valueAt = (item: Item, read: WalkPath, fallback: "edge" | "node"): unknown => {
        if ((read.on ?? fallback) === "edge") {
            return item.edge < 0 ? undefined : graph.edgeValue(item.edge, read.path);
        }

        if (item.record !== undefined) {
            return read.path.startsWith("data.") ? item.record[read.path.slice("data.".length)] : undefined;
        }

        return source.value(item.node, read.path);
    };

    const walkOf = (measure: GraphMeasure, index: number): Item[] => {
        walk++;
        const items: Item[] = [];
        const direction = graph.directed ? (measure.direction ?? "both") : "both";
        if (measure.over === "members") {
            for (const node of graph.members(index)) {
                items.push({ edge: -1, node });
            }

            for (const record of graph.held(index)) {
                items.push({ edge: -1, node: -1, record });
            }

            return items;
        }

        if (measure.over === "edges") {
            graph.adjacent(index, direction, (other, edge, way) => {
                if (edgeStamp[edge] !== walk) {
                    edgeStamp[edge] = walk;
                    items.push({ edge, node: other, way });
                }
            });
            return items;
        }

        // ponytail: neighbors at 3 hops on a dense graph walk a lot, once per node per preparation; keep each
        // hop's frontier per node (a per-hop frontier cache) if a large graph's repaint shows it.
        nodeStamp[index] = walk;
        let frontier = [index];
        for (let hop = 0; hop < (measure.hops ?? 1) && frontier.length > 0; hop++) {
            const next: number[] = [];
            for (const from of frontier) {
                graph.adjacent(from, direction, (other) => {
                    if (nodeStamp[other] !== walk) {
                        nodeStamp[other] = walk;
                        next.push(other);
                        items.push({ edge: -1, node: other });
                    }
                });
            }

            frontier = next;
        }

        return items;
    };

    /**
     * The first and newest instant a time path holds over the whole graph.
     * @param read - The path.
     * @param fallback - Where it is read when it does not say.
     * @returns The span, or null when no element holds one.
     */
    const spanOf = (read: WalkPath, fallback: "edge" | "node"): readonly [number, number] | null => {
        const on = read.on ?? fallback;
        const key = `${on}:${read.path}`;
        if (!spans.has(key)) {
            let lo = Number.POSITIVE_INFINITY;
            let hi = Number.NEGATIVE_INFINITY;
            const total = on === "edge" ? graph.edgeCount : source.count();
            for (let at = 0; at < total; at++) {
                const ms = instantOf(on === "edge" ? graph.edgeValue(at, read.path) : source.value(at, read.path));
                if (Number.isFinite(ms)) {
                    lo = Math.min(lo, ms);
                    hi = Math.max(hi, ms);
                }
            }

            spans.set(key, Number.isFinite(lo) ? [lo, hi] : null);
        }

        return spans.get(key) ?? null;
    };

    /**
     * The groups one walked item falls in.
     * @param groupBy - The grouping.
     * @param item - The item.
     * @param fallback - Where a path is read when it does not say.
     * @returns The group keys.
     */
    const groupsOf = (
        groupBy: NonNullable<GraphMeasure["groupBy"]>,
        item: Item,
        fallback: "edge" | "node",
    ): string[] => {
        if (groupBy.by === "direction") {
            return [graph.directed ? (item.way ?? "out") : "both"];
        }

        const value = valueAt(item, groupBy, fallback);
        if (groupBy.by === "time") {
            const ms = instantOf(value);
            return Number.isFinite(ms) ? [periodKey(ms, groupBy.period)] : [];
        }

        return (Array.isArray(value) ? (value as unknown[]) : [value]).filter((each) => !absent(each)).map(String);
    };

    /**
     * The keys a grouped value holds: the groups seen, or every period of a time group's window or span.
     * @param groupBy - The grouping.
     * @param seen - The groups seen.
     * @param fallback - Where a path is read when it does not say.
     * @returns The keys, in natural (time) order.
     */
    const keysOf = (
        groupBy: NonNullable<GraphMeasure["groupBy"]>,
        seen: Iterable<string>,
        fallback: "edge" | "node",
    ): string[] => {
        if (groupBy.by !== "time") {
            return [...seen].sort(naturalCompare);
        }

        const span = spanOf(groupBy, fallback);
        const { window } = groupBy;
        if (window !== undefined) {
            return windowKeys(groupBy.period, window.last, window.from === "now" ? now : (span?.[1] ?? now));
        }

        return span === null ? [...seen].sort(naturalCompare) : periodKeys(span[0], span[1], groupBy.period);
    };

    const measureOf = (measure: GraphMeasure, index: number): unknown => {
        const fallback = measure.over === "edges" ? "edge" : "node";
        const { where, of, groupBy } = measure;
        const whereOn = measure.whereOn ?? fallback;
        const items = walkOf(measure, index).filter(
            (item) =>
                where === undefined ||
                !("attribute" in where) ||
                keeps(where, valueAt(item, { path: where.attribute, on: whereOn }, fallback)),
        );
        if (items.length === 0) {
            return null;
        }

        const groups = new Map<string, Tally>();
        for (const item of items) {
            const value = of === undefined ? undefined : valueAt(item, of, fallback);
            for (const key of groupBy === undefined ? [""] : groupsOf(groupBy, item, fallback)) {
                let held = groups.get(key);
                if (held === undefined) {
                    held = tally(measure.measure === "mode");
                    groups.set(key, held);
                }

                held.count++;
                gather(held, value);
            }
        }

        if (groupBy === undefined) {
            return resultOf(measure.measure, groups.get(""));
        }

        return Object.fromEntries(
            keysOf(groupBy, groups.keys(), fallback).map((key) => [key, resultOf(measure.measure, groups.get(key))]),
        );
    };

    return { measure: measureOf, walks: () => walk };
}
