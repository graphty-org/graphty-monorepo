/**
 * @file Comparing two results: two rankings, or two groupings.
 *
 * Two runs over the same graph -- PageRank and degree, Louvain and label propagation, one run
 * before an edit and one after -- are compared element by element. A ranking comparison says who
 * kept their place, who moved and by how much, and who was tied; a grouping comparison says which
 * groups map onto which and which members left the rest of their group. Everything is a number,
 * an id or a group value the runs published: the application words it.
 *
 * Nothing in this module's import graph reaches Babylon.js, Lit or the DOM.
 */

import type { FieldDescriptor, NodeId, RunId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import { elementIdsOf } from "./RunResult";
import { fieldMeasurement, resultShapeContract, type RunRef, type RunResult } from "./types";

/** One side of a comparison when it is not the run's primary field. */
export interface CompareSide {
    /** The run, its result, or its id. */
    readonly run: RunRef;
    /** The field to compare; the run's primary field when absent. */
    readonly field?: string;
}

/** Which run and field one side of a comparison read. */
export interface ComparedField {
    /** The run. */
    readonly runId: RunId;
    /** The field. */
    readonly field: string;
}

/** What every comparison carries: the two sides, and which elements only one of them has. */
export interface ComparisonBase {
    /** The first side. */
    readonly a: ComparedField;
    /** The second side. */
    readonly b: ComparedField;
    /** Whether the fields are on nodes or on edges. */
    readonly elements: "node" | "edge";
    /** How many elements both sides carry a value for; every figure below is over these. */
    readonly shared: number;
    /** Elements only the first side carries a value for. */
    readonly onlyA: readonly NodeId[];
    /** Elements only the second side carries a value for. */
    readonly onlyB: readonly NodeId[];
}

/** One element's place in both rankings. */
export interface RankChange {
    /** The element. */
    readonly id: NodeId;
    /** Its rank in the first ranking, best first from 1; tied elements share a rank (1, 2, 2, 4). */
    readonly rankA: number;
    /** Its rank in the second ranking. */
    readonly rankB: number;
    /** `rankA - rankB`: positive when it rose in the second ranking, 0 when it kept its place. */
    readonly move: number;
    /** How many elements share its rank in the first ranking, itself included; 1 when untied. */
    readonly tiedA: number;
    /** How many elements share its rank in the second ranking. */
    readonly tiedB: number;
}

/** Two rankings of the same elements compared. */
export interface RankingComparison extends ComparisonBase {
    /** A ranking comparison. */
    readonly kind: "ranking";
    /**
     * How far the two orders agree: Spearman's rank correlation over the shared elements, from 1
     * (the same order) through 0 (unrelated) to -1 (reversed), ties given their average rank.
     * Undefined with fewer than two shared elements, or when either side gives all of them one value.
     */
    readonly correlation: number | undefined;
    /** How many shared elements changed rank. */
    readonly moved: number;
    /** Every shared element, the largest move first, then by the first ranking. */
    readonly changes: readonly RankChange[];
}

/** How many elements one group of the first side shares with one group of the second. */
export interface GroupOverlap {
    /** The group in the first grouping, as the run published it. */
    readonly a: string | number;
    /** The group in the second grouping. */
    readonly b: string | number;
    /** How many elements are in both. */
    readonly count: number;
}

/** An element that did not go where the rest of its group went. */
export interface GroupMove {
    /** The element. */
    readonly id: NodeId;
    /** Its group in the first grouping. */
    readonly a: string | number;
    /** Its group in the second grouping. */
    readonly b: string | number;
    /** The group in the second grouping that holds most of its first group's members. */
    readonly mostOfGroup: string | number;
}

/** Two groupings of the same elements compared. */
export interface PartitionComparison extends ComparisonBase {
    /** A grouping comparison. */
    readonly kind: "partition";
    /** How many groups each side has among the shared elements. */
    readonly groups: { readonly a: number; readonly b: number };
    /**
     * How far the two groupings agree: the adjusted Rand index over the shared elements, 1 for the
     * same grouping whatever the groups are called, around 0 for chance agreement. Undefined with
     * fewer than two shared elements.
     */
    readonly agreement: number | undefined;
    /** Every pair of groups that share an element, the largest overlap first. */
    readonly overlaps: readonly GroupOverlap[];
    /** The elements that left the rest of their group, in the first grouping's element order. */
    readonly moves: readonly GroupMove[];
}

/** Two results compared: two rankings, or two groupings. */
export type ResultComparison = RankingComparison | PartitionComparison;

/** A side resolved to its result and field. */
interface Side {
    readonly result: RunResult;
    readonly field: FieldDescriptor;
}

/**
 * Refuse a comparison.
 * @param message - What is wrong.
 * @param details - The figures it is about.
 * @returns The error to throw.
 */
function refuse(message: string, details: Record<string, unknown>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", source: "run", message, details });
}

/**
 * Resolve one side to its result's per-element field.
 * @param result - The result.
 * @param name - The field asked for; the primary field when absent.
 * @returns The side.
 * @throws E_BAD_COMMAND when the field is missing or is not published per element.
 */
function sideOf(result: RunResult, name: string | undefined): Side {
    const fieldName = name ?? resultShapeContract(result.shape).primaryField ?? undefined;
    const field = result.fields.find((candidate) => candidate.name === fieldName);
    if (field === undefined || field.kind === "graph") {
        throw refuse(`Run "${result.runId}" publishes no per-element field "${String(fieldName)}" to compare.`, {
            reason: "no-element-field",
            run: result.runId,
            field: fieldName ?? null,
            available: result.fields
                .filter((candidate) => candidate.kind !== "graph")
                .map((candidate) => candidate.name),
        });
    }

    return { result, field };
}

/**
 * Compare two results' fields element by element.
 * @param first - The first result.
 * @param second - The second result.
 * @param fieldA - The first result's field; its primary field when absent.
 * @param fieldB - The second result's field; its primary field when absent.
 * @returns A ranking comparison for two measurements, a partition comparison for two groupings.
 * @throws E_BAD_COMMAND when a field is not per element, the two are on different elements, or one
 *   is a grouping and the other a measurement.
 */
export function compareResults(
    first: RunResult,
    second: RunResult,
    fieldA?: string,
    fieldB?: string,
): ResultComparison {
    const a = sideOf(first, fieldA);
    const b = sideOf(second, fieldB);
    if (a.field.kind !== b.field.kind) {
        throw refuse("One field is on nodes and the other on edges.", {
            reason: "elements-differ",
            a: a.field.kind,
            b: b.field.kind,
        });
    }

    const groupingA = fieldMeasurement(a.field, first.shape) === "categorical";
    const groupingB = fieldMeasurement(b.field, second.shape) === "categorical";
    if (groupingA !== groupingB) {
        throw refuse("One field is a grouping and the other a measurement.", {
            reason: "kinds-differ",
            a: groupingA ? "partition" : "ranking",
            b: groupingB ? "partition" : "ranking",
        });
    }

    return groupingA ? comparePartitions(a, b) : compareRankings(a, b);
}

/**
 * The fields both sides read, and which ids only one side carries.
 * @param a - The first side.
 * @param b - The second side.
 * @param idsA - The first side's ids, in its order.
 * @param hasB - Whether the second side carries an id.
 * @param idsB - The second side's ids.
 * @param hasA - Whether the first side carries an id.
 * @returns The base of the comparison.
 */
function baseOf(
    a: Side,
    b: Side,
    idsA: readonly NodeId[],
    hasB: (id: NodeId) => boolean,
    idsB: readonly NodeId[],
    hasA: (id: NodeId) => boolean,
): Omit<ComparisonBase, "shared"> {
    return {
        a: { runId: a.result.runId, field: a.field.name },
        b: { runId: b.result.runId, field: b.field.name },
        elements: a.field.kind === "edge" ? "edge" : "node",
        onlyA: idsA.filter((id) => !hasB(id)),
        onlyB: idsB.filter((id) => !hasA(id)),
    };
}

/**
 * Average ranks, 1 for the highest value, tied values sharing the mean of their places.
 * @param values - The values.
 * @returns One rank per value.
 */
function averageRanks(values: readonly number[]): Float64Array {
    const order = values.map((_, index) => index).sort((x, y) => values[y] - values[x]);
    const ranks = new Float64Array(values.length);
    for (let start = 0; start < order.length;) {
        let end = start + 1;
        while (end < order.length && values[order[end]] === values[order[start]]) {
            end++;
        }

        const rank = (start + end + 1) / 2;
        for (let place = start; place < end; place++) {
            ranks[order[place]] = rank;
        }

        start = end;
    }

    return ranks;
}

/**
 * Pearson's correlation of two equally long series.
 * @param x - One series.
 * @param y - The other.
 * @returns The correlation, or undefined below two values or with no spread.
 */
function correlationOf(x: Float64Array, y: Float64Array): number | undefined {
    const n = x.length;
    if (n < 2) {
        return undefined;
    }

    let meanX = 0;
    let meanY = 0;
    for (let i = 0; i < n; i++) {
        meanX += x[i] / n;
        meanY += y[i] / n;
    }

    let xy = 0;
    let xx = 0;
    let yy = 0;
    for (let i = 0; i < n; i++) {
        xy += (x[i] - meanX) * (y[i] - meanY);
        xx += (x[i] - meanX) ** 2;
        yy += (y[i] - meanY) ** 2;
    }

    return xx === 0 || yy === 0 ? undefined : xy / Math.sqrt(xx * yy);
}

/** One element's place in one ranking. */
interface Place {
    readonly rank: number;
    readonly value: number;
    readonly tied: number;
}

/**
 * Every ranked element's place, by id.
 * @param side - The side.
 * @returns The places, in ranking order.
 */
function placesOf(side: Side): Map<NodeId, Place> {
    const entries = side.result.ranking(side.field.name);
    const tied = new Map<number, number>();
    for (const entry of entries) {
        tied.set(entry.rank, (tied.get(entry.rank) ?? 0) + 1);
    }

    return new Map(
        entries.map((entry) => [entry.id, { rank: entry.rank, value: entry.value, tied: tied.get(entry.rank) ?? 1 }]),
    );
}

/**
 * Compare two rankings.
 * @param a - The first side.
 * @param b - The second side.
 * @returns The comparison.
 */
function compareRankings(a: Side, b: Side): RankingComparison {
    const placesA = placesOf(a);
    const placesB = placesOf(b);
    const changes: RankChange[] = [];
    const valuesA: number[] = [];
    const valuesB: number[] = [];
    for (const [id, placeA] of placesA) {
        const placeB = placesB.get(id);
        if (placeB !== undefined) {
            valuesA.push(placeA.value);
            valuesB.push(placeB.value);
            changes.push({
                id,
                rankA: placeA.rank,
                rankB: placeB.rank,
                move: placeA.rank - placeB.rank,
                tiedA: placeA.tied,
                tiedB: placeB.tied,
            });
        }
    }

    // Stable: equal moves keep the first ranking's order.
    changes.sort((x, y) => Math.abs(y.move) - Math.abs(x.move));

    return {
        kind: "ranking",
        ...baseOf(
            a,
            b,
            [...placesA.keys()],
            (id) => placesB.has(id),
            [...placesB.keys()],
            (id) => placesA.has(id),
        ),
        shared: changes.length,
        correlation: correlationOf(averageRanks(valuesA), averageRanks(valuesB)),
        moved: changes.filter((change) => change.move !== 0).length,
        changes,
    };
}

/**
 * Every element's group on one side, by id, in the result's element order.
 * @param side - The side.
 * @returns The groups; an element with no group is left out.
 */
function groupsOf(side: Side): Map<NodeId, string | number> {
    const half = side.field.kind === "edge" ? "edge" : "node";
    const groups = new Map<NodeId, string | number>();
    for (const id of elementIdsOf(side.result, half)) {
        const values = half === "edge" ? side.result.edge(String(id)) : side.result.node(id);
        const value = values?.[side.field.name];
        if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) {
            groups.set(id, value);
        } else if (typeof value === "boolean") {
            groups.set(id, String(value));
        }
    }

    return groups;
}

/**
 * Pairs out of a count.
 * @param n - The count.
 * @returns n choose 2.
 */
function pairs(n: number): number {
    return (n * (n - 1)) / 2;
}

/**
 * The adjusted Rand index of two groupings, from their overlap table.
 * @param overlaps - The overlap counts.
 * @param sizesA - The first grouping's group sizes.
 * @param sizesB - The second grouping's group sizes.
 * @param n - The shared elements.
 * @returns The index, or undefined below two elements.
 */
function adjustedRand(
    overlaps: readonly GroupOverlap[],
    sizesA: Iterable<number>,
    sizesB: Iterable<number>,
    n: number,
): number | undefined {
    if (n < 2) {
        return undefined;
    }

    let index = 0;
    for (const overlap of overlaps) {
        index += pairs(overlap.count);
    }

    let sumA = 0;
    for (const size of sizesA) {
        sumA += pairs(size);
    }

    let sumB = 0;
    for (const size of sizesB) {
        sumB += pairs(size);
    }

    const expected = (sumA * sumB) / pairs(n);
    const most = (sumA + sumB) / 2;
    // Both groupings all one group, or both all singletons: identical, and the formula is 0/0.
    return most === expected ? 1 : (index - expected) / (most - expected);
}

/**
 * Compare two groupings.
 * @param a - The first side.
 * @param b - The second side.
 * @returns The comparison.
 */
function comparePartitions(a: Side, b: Side): PartitionComparison {
    const groupsA = groupsOf(a);
    const groupsB = groupsOf(b);
    const key = (value: string | number): string => `${typeof value}:${String(value)}`;
    const cells = new Map<string, { a: string | number; b: string | number; count: number }>();
    const sizesA = new Map<string, number>();
    const sizesB = new Map<string, number>();
    const shared: [NodeId, string | number, string | number][] = [];
    for (const [id, groupA] of groupsA) {
        const groupB = groupsB.get(id);
        if (groupB === undefined) {
            continue;
        }

        shared.push([id, groupA, groupB]);
        const cellKey = `${key(groupA)}\u0000${key(groupB)}`;
        const cell = cells.get(cellKey) ?? { a: groupA, b: groupB, count: 0 };
        cell.count++;
        cells.set(cellKey, cell);
        sizesA.set(key(groupA), (sizesA.get(key(groupA)) ?? 0) + 1);
        sizesB.set(key(groupB), (sizesB.get(key(groupB)) ?? 0) + 1);
    }

    // Largest overlap first; equal overlaps keep the order they were first met in.
    const overlaps: GroupOverlap[] = [...cells.values()].sort((x, y) => y.count - x.count);
    const destination = new Map<string, string | number>();
    for (const overlap of overlaps) {
        if (!destination.has(key(overlap.a))) {
            destination.set(key(overlap.a), overlap.b);
        }
    }

    const moves: GroupMove[] = [];
    for (const [id, groupA, groupB] of shared) {
        const mostOfGroup = destination.get(key(groupA)) ?? groupB;
        if (key(mostOfGroup) !== key(groupB)) {
            moves.push({ id, a: groupA, b: groupB, mostOfGroup });
        }
    }

    return {
        kind: "partition",
        ...baseOf(
            a,
            b,
            [...groupsA.keys()],
            (id) => groupsB.has(id),
            [...groupsB.keys()],
            (id) => groupsA.has(id),
        ),
        shared: shared.length,
        groups: { a: sizesA.size, b: sizesB.size },
        agreement: adjustedRand(overlaps, sizesA.values(), sizesB.values(), shared.length),
        overlaps,
        moves,
    };
}
