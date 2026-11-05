/**
 * Reads the gradient a program painted as a picture (Cytoscape desktop exports its gradient custom graphics as PNGs
 * embedded in its SVG): the picture's pixels as a linear ramp, their color a function of the place along one
 * direction, or a radial one, a function of the distance from the picture's middle or from a point off it -- whichever
 * fits the pixels, and only when it fits them closely. A picture of anything else (a logo) is no gradient.
 *
 * Test code only; nothing here is graphty-element API.
 */
import type { PGradient, PStop } from "./primitives";

/** A decoded picture: its size and RGBA bytes. */
export interface Pixels {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

/** How many places nearest an end the ramp is carried to it from. */
const END_PLACES = 4;
/** The most pixels a picture is read by. */
const MAX_PIXELS = 8192;
/** Places along a ramp the pixels are binned into. */
const BINS = 50;
/** The mean RGB distance of a pixel from its place's color under which the pixels are that ramp. */
const FIT = 8;
/** The RGB distance between a ramp's ends under which it is one flat color, no gradient. */
const FLAT = 12;
/** Steps across each side of the picture a radial ramp's off-middle center is looked for at. */
const CENTER_STEPS = 20;
/**
 * The largest share of a ramp's color spread one step between neighboring places may take. A ramp changes color a
 * little at a time; a picture whose neighboring places jump from one color to another is stripes or a checkerboard read
 * along a line that happens to put each color in places of its own (a 4 by 4 checkerboard has a pixel to a place at
 * most angles, and every place then fits its one pixel exactly: cytoscapejs-specimen-images-charts's checker.png).
 */
const MAX_STEP = 0.5;

/** One opaque pixel: where it is, from the picture's middle, and its color. */
interface Px {
    x: number;
    y: number;
    rgb: [number, number, number];
}

/**
 * The opaque pixels of a picture.
 * @param p - the picture
 * @returns its pixels, placed from its middle
 */
function opaque(p: Pixels): Px[] {
    const out: Px[] = [];
    for (let y = 0; y < p.height; y++) {
        for (let x = 0; x < p.width; x++) {
            const k = 4 * (y * p.width + x);
            if (p.data[k + 3] >= 250) {
                out.push({
                    x: x + 0.5 - p.width / 2,
                    y: y + 0.5 - p.height / 2,
                    rgb: [p.data[k], p.data[k + 1], p.data[k + 2]],
                });
            }
        }
    }
    return out;
}

/** A place along a ramp and its color as RGB. */
type Place = [number, number, number, number];

/**
 * Bins pixels by a place 0..1 along a ramp and measures how far each lies from its bin's mean color.
 * @param px - the pixels
 * @param t - each pixel's place
 * @returns the mean distance and each bin's mean place and color, in order
 */
function binned(px: readonly Px[], t: readonly number[]): { error: number; places: Place[] } {
    const sum = Array.from({ length: BINS }, () => [0, 0, 0, 0, 0]);
    const bin = t.map((v) => Math.min(BINS - 1, Math.max(0, Math.floor(v * BINS))));
    px.forEach((p, i) => {
        const s = sum[bin[i]];
        s[0] += t[i];
        s[1] += p.rgb[0];
        s[2] += p.rgb[1];
        s[3] += p.rgb[2];
        s[4]++;
    });
    const mean = sum.map((s): Place | null =>
        s[4] === 0 ? null : [s[0] / s[4], s[1] / s[4], s[2] / s[4], s[3] / s[4]],
    );
    let error = 0;
    px.forEach((p, i) => {
        const m = mean[bin[i]];
        error += m === null ? 0 : Math.hypot(p.rgb[0] - m[1], p.rgb[1] - m[2], p.rgb[2] - m[3]);
    });
    return { error: error / Math.max(1, px.length), places: mean.filter((m): m is Place => m !== null) };
}

/**
 * A ramp's stops from its places, carried on along the ramp to its ends at 0 and 1 (a pixel's middle lies inside the
 * ramp's end, and a round picture leaves the corners its box's ramp reaches unpainted).
 * @param places - the places, in order, at least two
 * @param end - the place the last stop is carried to
 * @returns the stops
 */
function stopsOf(places: readonly Place[], end = 1): PStop[] {
    const hex = (m: readonly number[]): string =>
        `#${m
            .map((v) =>
                Math.round(Math.min(255, Math.max(0, v)))
                    .toString(16)
                    .padStart(2, "0"),
            )
            .join("")}`;
    // the line through the places nearest the end (least squares, each channel against the place), carried to it
    const carry = (near: readonly Place[], to: number): Place => {
        const mt = near.reduce((a, m) => a + m[0], 0) / near.length;
        const vt = near.reduce((a, m) => a + (m[0] - mt) ** 2, 0);
        const at = (c: number): number => {
            const mc = near.reduce((a, m) => a + m[c], 0) / near.length;
            const slope = vt === 0 ? 0 : near.reduce((a, m) => a + (m[0] - mt) * (m[c] - mc), 0) / vt;
            return mc + slope * (to - mt);
        };
        return [to, at(1), at(2), at(3)];
    };
    const all = [carry(places.slice(0, END_PLACES), 0), ...places, carry(places.slice(-END_PLACES), end)];
    return all.map((m) => ({ offset: Math.round(m[0] * 1000) / 1000, color: hex(m.slice(1)), opacity: 1 }));
}

/** A ramp the pixels fit: how closely, and its places. */
type Fit = ReturnType<typeof binned>;

/**
 * The radial ramp centered anywhere in a picture that fits its pixels best (Cytoscape desktop's `cy_center`): its places
 * in halves of the picture's shorter side from that center, as a radial fill's stops are.
 * @param p - the picture
 * @param px - its pixels
 * @returns the fit, its center in fractions of the picture from its top left corner, and its farthest place
 */
function offMiddleRadial(p: Pixels, px: readonly Px[]): Fit & { center: [number, number]; reach: number } {
    const half = Math.min(p.width, p.height) / 2;
    let best: (Fit & { center: [number, number]; reach: number }) | null = null;
    // ponytail: 441 passes over the pixels, only for a picture no other ramp fits; coarse-to-fine if pictures grow large
    for (let i = 0; i <= CENTER_STEPS * CENTER_STEPS + 2 * CENTER_STEPS; i++) {
        const center: [number, number] = [
            (i % (CENTER_STEPS + 1)) / CENTER_STEPS,
            Math.floor(i / (CENTER_STEPS + 1)) / CENTER_STEPS,
        ];
        const [ox, oy] = [(center[0] - 0.5) * p.width, (center[1] - 0.5) * p.height];
        const from = px.map((q) => Math.hypot(q.x - ox, q.y - oy) / half);
        const reach = from.reduce((a, d) => Math.max(a, d), 0);
        const fit = binned(
            px,
            from.map((d) => d / reach),
        );
        if (best === null || fit.error < best.error) {
            best = { ...fit, center, reach };
        }
    }
    const { error, places, center, reach } = best as NonNullable<typeof best>;
    return { error, center, reach, places: places.map((m) => [m[0] * reach, m[1], m[2], m[3]]) };
}

/** The RGB distance between two places' colors. */
const distance = (a: Place, b: Place): number => Math.hypot(a[1] - b[1], a[2] - b[2], a[3] - b[3]);

/** How far a ramp's colors reach from its first. */
const spreadOf = (places: readonly Place[]): number => Math.max(...places.map((m) => distance(m, places[0])));

/**
 * Whether a ramp's colors change a step at a time, no step between neighboring places past `MAX_STEP` of its spread.
 * @param places - the ramp's places, in order
 * @returns whether it is a ramp rather than stripes
 */
function stepwise(places: readonly Place[]): boolean {
    const limit = MAX_STEP * spreadOf(places);
    return places.every((m, i) => i === 0 || distance(m, places[i - 1]) <= limit);
}

/**
 * The gradient a picture is, or null when it is none (too few pixels, one flat color, or not a ramp).
 * @param p - the picture
 * @returns the gradient, its linear direction in screen degrees (y down) from 0 up to 180
 */
export function pictureGradient(p: Pixels): PGradient | null {
    // a large picture (a logo) is judged on a sample of its pixels: a gradient's ramp shows in any of them
    const all = opaque(p);
    const stride = Math.ceil(all.length / MAX_PIXELS);
    const px = stride > 1 ? all.filter((_, i) => i % stride === 0) : all;
    if (px.length < 16) {
        return null;
    }
    // radial: out from the middle to half the shorter side, as a radial fill reaches
    const half = Math.min(p.width, p.height) / 2;
    let best: { error: number; places: Place[]; kind: "linear" | "radial"; angle: number | null } = {
        ...binned(
            px,
            px.map((q) => Math.hypot(q.x, q.y) / half),
        ),
        kind: "radial",
        angle: null,
    };
    // ponytail: every whole degree tried, 180 passes over the pixels; a coarse-to-fine search if pictures grow large
    for (let deg = 0; deg < 180; deg++) {
        const [c, s] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
        // linear: across the picture's whole box, corner to corner along the direction, as a linear fill runs
        const reach = (Math.abs(c) * p.width + Math.abs(s) * p.height) / 2;
        const fit = binned(
            px,
            px.map((q) => (q.x * c + q.y * s + reach) / (2 * reach)),
        );
        if (fit.error < best.error && stepwise(fit.places)) {
            best = { ...fit, kind: "linear", angle: deg };
        }
    }
    const off = best.error > FIT ? offMiddleRadial(p, px) : null;
    if (off !== null && off.error < best.error) {
        best = { ...off, kind: "radial", angle: null };
    }
    if (best.error > FIT || best.places.length < 2 || !stepwise(best.places) || spreadOf(best.places) < FLAT) {
        return null;
    }
    if (off !== null && best.kind === "radial") {
        return { kind: "radial", stops: stopsOf(best.places, off.reach), angle: null, center: off.center };
    }
    const gradient: PGradient = { kind: best.kind, stops: stopsOf(best.places), angle: best.angle };
    return best.kind === "linear" ? { ...gradient, halfTurn: true } : gradient;
}
