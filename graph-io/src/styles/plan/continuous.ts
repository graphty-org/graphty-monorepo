/**
 * A continuous mapping on one numeric feature: the fewest linear pieces (at most 8, each explaining at least 3
 * distinct inputs), exact first, else within the rounding the writing tool did per element.
 */

import type { ContinuousPoint, StyleValue } from "../types.js";
import { MIN_MAPPED } from "./discrete.js";
import type { Family } from "./families.js";
import type { FeatureInfo } from "./features.js";
import { interpolate, within } from "./resolve.js";

/** The most linear pieces a ramp may have. */
const MAX_PIECES = 8;
/** The most distinct inputs a ramp is fitted over. */
const MAX_DISTINCT_X = 4096;
const HEX6 = /^#[0-9a-f]{6}$/;

/**
 * A continuous mapping that explains a family.
 */
export interface ContinuousCandidate {
    /** The kind of candidate. */
    readonly type: "continuous";
    /** The feature the ramp reads. */
    readonly info: FeatureInfo;
    /** The points per property. */
    readonly points: ReadonlyMap<string, ContinuousPoint[]>;
    /** Whether the ramp matches only within the tool's rounding. */
    readonly tolerant: boolean;
    /** The description cost. */
    readonly cost: number;
}

/**
 * Whether a value can be interpolated: a number or a canonical color.
 * @param v - the value
 * @returns true when it can
 */
function interpolable(v: StyleValue | null): v is number | string {
    return typeof v === "number" || (typeof v === "string" && HEX6.test(v));
}

/**
 * The fewest linear pieces over sorted distinct points, or null when more than `MAX_PIECES` are needed.
 * @param xs - the inputs, ascending
 * @param ys - the outputs
 * @param tolerant - whether a piece may miss a point by the tool's rounding
 * @param spend - spends work from the budget
 * @returns each piece's first and last point index, or null
 */
function fitPieces(
    xs: readonly number[],
    ys: readonly StyleValue[],
    tolerant: boolean,
    spend: (ops: number) => void,
): [number, number][] | null {
    const pieces: [number, number][] = [];
    let a = 0;
    while (a < xs.length) {
        let b = a;
        // extend while the line from a to b + 1 reproduces every point between
        while (b + 1 < xs.length) {
            const c = b + 1;
            let ok = true;
            for (let j = a + 1; j < c; j++) {
                const v = interpolate(ys[a], ys[c], (xs[j] - xs[a]) / (xs[c] - xs[a]));
                if (tolerant ? !within(v, ys[j]) : v !== ys[j]) {
                    ok = false;
                    break;
                }
            }
            spend(c - a);
            if (!ok) {
                break;
            }
            b = c;
        }
        pieces.push([a, b]);
        if (pieces.length > MAX_PIECES) {
            return null;
        }
        a = b + 1;
    }
    return pieces;
}

/**
 * The points of a fitted ramp.
 * @param xs - the inputs
 * @param ys - the outputs
 * @param pieces - the pieces
 * @returns the points, ascending
 */
function piecesToPoints(
    xs: readonly number[],
    ys: readonly StyleValue[],
    pieces: [number, number][],
): ContinuousPoint[] {
    const out: ContinuousPoint[] = [];
    for (const [a, b] of pieces) {
        out.push({ at: xs[a], below: ys[a], value: ys[a], above: ys[a] });
        if (b !== a) {
            out.push({ at: xs[b], below: ys[b], value: ys[b], above: ys[b] });
        }
    }
    return out;
}

/**
 * Tests a continuous mapping on one feature.
 * @param fam - the family
 * @param info - the feature
 * @param truth - the values per property
 * @param spend - spends work from the budget
 * @returns the candidate, or null when the feature does not explain the family
 */
export function continuousCandidate(
    fam: Family,
    info: FeatureInfo,
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
    spend: (ops: number) => void,
): ContinuousCandidate | null {
    if (!info.numeric || info.raw || fam.styled.length < MIN_MAPPED) {
        return null;
    }
    const { values } = info.feature;
    spend(values.length);
    // the feature must be a number exactly where the family has a value
    for (let i = 0; i < values.length; i++) {
        const has = typeof values[i] === "number";
        if (fam.blocks[i] === 0 ? has : !has) {
            return null;
        }
    }
    for (const tolerant of [false, true]) {
        const points = new Map<string, ContinuousPoint[]>();
        let entries = 0;
        let good = true;
        for (const p of fam.props) {
            const ys0 = truth.get(p) ?? [];
            const byX = new Map<number, StyleValue>();
            for (const i of fam.styled) {
                const y = ys0[i];
                const x = values[i] as number;
                const seen = byX.get(x);
                if (!interpolable(y) || (seen !== undefined && seen !== y)) {
                    good = false;
                    break;
                }
                byX.set(x, y);
            }
            spend(fam.styled.length);
            // a ramp needs at least 3 distinct outputs: two values over a number are a threshold, not a mapping
            if (!good || byX.size < 2 || byX.size > MAX_DISTINCT_X || new Set(byX.values()).size < 3) {
                good = false;
                break;
            }
            const xs = Array.from(byX.keys()).sort((a, b) => a - b);
            const ys = xs.map((x) => byX.get(x) as StyleValue);
            const pieces = fitPieces(xs, ys, tolerant, spend);
            // every piece must explain at least 3 distinct inputs, or a few points fit anything
            if (pieces === null || pieces.length * 3 > xs.length) {
                good = false;
                break;
            }
            const pts = piecesToPoints(xs, ys, pieces);
            points.set(p, pts);
            entries += pts.length;
        }
        if (good) {
            return { type: "continuous", info, points, tolerant, cost: 50 + entries + (tolerant ? 10 : 0) };
        }
    }
    return null;
}
