/**
 * How yEd paints a node's two-color gradient (`color` into `color2`), shared by the readers of its GraphML and GML.
 * Measured on yEd 3.25.1's own SVG export (yed-graphml-specimen-node-fills-borders, graphml-synthetic-nodes,
 * graphml-scala-collection-mutable, gml-synthetic-coverage): a flowchart or other generic node, and a diamond, run
 * from their box's top-left corner to its bottom-right one; every other shape node runs left to right.
 */

import type { StyleValue } from "../types.js";

/** How a yEd node runs its gradient: corner to corner, or left to right. */
type YedGradientRun = "corner" | "across";

/**
 * The `fillGradientAngle` yEd's gradient on a node translates into. graphty-element paints its ramp across a square and
 * stretches the square over the node's box, so the screen direction its color changes along is
 * atan2(sin(angle) / height, cos(angle) / width). yEd's corner-to-corner ramp changes color along the box's diagonal,
 * atan2(height, width) on the screen, which is the stretched ramp at atan2(height^2, width^2).
 * yEd's left-to-right ramp starts a third of the way across and mirrors back over the left third
 * (`spreadMethod="reflect"`): `yedGradientRamp` gives the colors it paints.
 * @param run - how the node runs its gradient
 * @param width - the node's width
 * @param height - the node's height
 * @returns the angle, in degrees
 */
export function yedGradientAngle(run: YedGradientRun, width: number, height: number): number {
    if (run === "across") {
        return 0;
    }
    if (!(width > 0 && height > 0)) {
        return 45;
    }
    return Math.round(((Math.atan2(height * height, width * width) * 180) / Math.PI) * 1000) / 1000;
}

/** A ramp's colors and where each sits, 0 to 1. */
interface Ramp {
    readonly colors: readonly string[];
    readonly stops: readonly number[];
}

/**
 * The colors a reflected or repeated ramp paints across its node, as one ramp from where the node starts along it
 * (`start`, 0 its first stop and 1 its last) to where it ends (`end`): yFiles' `REFLECT` runs its stops back and forth past
 * their ends, `REPEAT` starts them again (a seam is two stops at one place). The colors are `#rrggbb`, or `#rrggbbaa`
 * when one has an alpha (then every color the ramp gives has one).
 * @param ramp - the ramp's colors and stops, rising
 * @param spread - `reflect` or `repeat`
 * @param start - where the node starts along the ramp
 * @param end - where it ends, more than `start`
 * @returns the ramp across the node
 */
export function spreadRamp(ramp: Ramp, spread: "reflect" | "repeat", start: number, end: number): Ramp {
    // with an alpha on any color, every color carries one (`ff` where it had none)
    const alpha = ramp.colors.some((c) => c.length === 9);
    const colors = alpha ? ramp.colors.map((c) => (c.length === 9 ? c : `${c}ff`)) : ramp.colors;
    const flat = { colors, stops: ramp.stops };
    // where along its stops the ramp is at t; `late` reads a repeat's seam from its left
    const fold = (t: number, late: boolean): number => {
        if (spread === "repeat") {
            const u = t - Math.floor(t);
            return late && u === 0 ? 1 : u;
        }
        const u = t - 2 * Math.floor(t / 2);
        return u <= 1 ? u : 2 - u;
    };
    const [t0, t1] = [nearPlace(start), nearPlace(end)];
    const out: { color: string; stop: number }[] = [];
    for (const t of rampPlaces(ramp.stops, t0, t1)) {
        const stop = Math.round(((t - t0) / (t1 - t0)) * 1e6) / 1e6;
        const [late, early] = [colorAlong(flat, fold(t, true)), colorAlong(flat, fold(t, false))];
        if (t !== t0 && t !== t1 && late !== early) {
            out.push({ color: late, stop });
        }
        out.push({ color: t === t1 ? late : early, stop });
    }
    return { colors: out.map((o) => o.color), stops: out.map((o) => o.stop) };
}

/**
 * A place along a ramp rounded to 1e-9, so a corner a float's width off a stop is that stop.
 * @param t - the place
 * @returns it rounded
 */
const nearPlace = (t: number): number => Math.round(t * 1e9) / 1e9;

/**
 * Every place from `t0` to `t1` where a ramp's stops, run again past their ends either way, fall, with both ends.
 * @param stops - the stops, 0 to 1
 * @param t0 - the first place
 * @param t1 - the last
 * @returns the places, rising
 */
function rampPlaces(stops: readonly number[], t0: number, t1: number): number[] {
    const at = new Set([t0, t1]);
    for (let k = Math.floor(t0) - 1; k <= Math.ceil(t1) + 1; k++) {
        for (const t of stops.flatMap((s) => [nearPlace(k + s), nearPlace(k + 1 - s)])) {
            if (t > t0 && t < t1) {
                at.add(t);
            }
        }
    }
    return [...at].sort((a, b) => a - b);
}

/**
 * A ramp's color at a place along its stops, mixed channel by channel (and its alpha, for `#rrggbbaa` colors).
 * @param ramp - the ramp, its colors all one length
 * @param u - the place, 0 to 1
 * @returns the color
 */
function colorAlong(ramp: Ramp, u: number): string {
    const { colors, stops } = ramp;
    const k = stops.findIndex((s) => s >= u);
    if (k <= 0) {
        return colors[k < 0 ? colors.length - 1 : 0];
    }
    const f = stops[k] > stops[k - 1] ? (u - stops[k - 1]) / (stops[k] - stops[k - 1]) : 0;
    const [a, b] = [colors[k - 1], colors[k]];
    const ch = (h: string, i: number): number => Number.parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
    const channels = a.length === 9 ? [0, 1, 2, 3] : [0, 1, 2];
    return `#${channels
        .map((i) =>
            Math.round(ch(a, i) + f * (ch(b, i) - ch(a, i)))
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
}

/**
 * How far in from each side of its box yEd draws a shape whose sides do not reach the box's, by its yEd shape type, as
 * a fraction of the box's width, where graphty-element's star spans its box: yEd's six-pointed star is inscribed in the ellipse
 * of its box, so its side points sit sqrt(3)/2 of the way out (graphml-synthetic-nodes shape-star6, 69.3 of 80).
 * ponytail: only the star a gradient sample draws; another shape inset from its box is read as reaching it.
 */
const YED_SIDE_INSET: ReadonlyMap<string, number> = new Map([["star6", (1 - Math.sqrt(3) / 2) / 2]]);

/**
 * A color with an alpha under 1 as `#rrggbbaa`, otherwise as it is.
 * @param color - `#rrggbb`
 * @param alpha - its alpha, 0 to 1
 * @returns the color
 */
function withAlpha(color: string, alpha: number): string {
    return alpha < 1
        ? `${color}${Math.round(Math.max(0, alpha) * 255)
              .toString(16)
              .padStart(2, "0")}`
        : color;
}

/**
 * The colors yEd's ramp paints across its node, as `fillGradientColors` and `fillGradientStops`. A left-to-right ramp
 * runs from `color` a third of the way across the node's box to `color2` at its right side and mirrors back over the
 * left third (`spreadMethod="reflect"` in yEd 3.25.1's SVG export), so the left side shows the color halfway between
 * the two; on a shape inset from its box (`YED_SIDE_INSET`) the colors are the ones under the shape's own sides, since
 * graphty-element's shape spans its box. `color2`'s alpha is its stop's (yed-graphml-specimen-node-fills-borders
 * gradient-c8c8c8-00000000 fades to clear), over `color`'s, which the node's `fillOpacity` already carries.
 * ponytail: a `color2` more opaque than `color` is drawn at `color`'s alpha.
 * A corner-to-corner ramp of opaque colors spans its box and needs none.
 * @param run - how the node runs its gradient
 * @param from - its `color`, `#rrggbb`
 * @param to - its `color2`, `#rrggbb`
 * @param toAlpha - `color2`'s alpha
 * @param fromAlpha - `color`'s alpha
 * @param shape - the node's yEd shape type (`rectangle`, `star6`, ...)
 * @returns the colors and stops, or null for a ramp that is its two opaque colors
 */
export function yedGradientRamp(
    run: YedGradientRun,
    from: string,
    to: string,
    toAlpha = 1,
    fromAlpha = 1,
    shape = "",
): { colors: string; stops: string } | null {
    const hex = /^#[0-9a-f]{6}$/i;
    const alpha = fromAlpha > 0 ? Math.min(1, toAlpha / fromAlpha) : 1;
    if (!hex.test(from) || !hex.test(to) || (run === "corner" && alpha >= 1)) {
        return null;
    }
    const ends = { colors: [from, withAlpha(to, alpha)], stops: [0, 1] };
    const inset = YED_SIDE_INSET.get(shape) ?? 0;
    const ramp =
        run === "corner" ? ends : spreadRamp(ends, "reflect", (inset - 1 / 3) * 1.5, (1 - inset - 1 / 3) * 1.5);
    return { colors: ramp.colors.join(" "), stops: ramp.stops.join(" ") };
}

/**
 * Puts yEd's ramp (`yedGradientRamp`) as `fillGradientColors` and `fillGradientStops`, when it is not just its two
 * opaque colors; shared by the readers of yEd's GraphML and GML.
 * @param put - receives the values
 * @param run - how the node runs its gradient
 * @param fill - the `fill` and `fillOpacity` read from its `color`
 * @param fill.color - the `fill`
 * @param fill.alpha - the `fillOpacity`
 * @param second - its `color2`, `#rrggbb`, and its alpha
 * @param second.color - the color
 * @param second.alpha - its alpha
 * @param shape - its yEd shape type
 */
export function putYedRamp(
    put: (property: string, value: StyleValue | null) => void,
    run: YedGradientRun,
    fill: { color: StyleValue | null | undefined; alpha: StyleValue | null | undefined },
    second: { color: string; alpha: number },
    shape: string,
): void {
    if (typeof fill.color !== "string") {
        return;
    }
    const alpha = typeof fill.alpha === "number" ? fill.alpha : 1;
    const ramp = yedGradientRamp(run, fill.color, second.color, second.alpha, alpha, shape);
    if (ramp !== null) {
        put("fillGradientColors", ramp.colors);
        put("fillGradientStops", ramp.stops);
    }
}
