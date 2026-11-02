/**
 * Cytoscape desktop's gradient and image custom graphics (`NODE_CUSTOMGRAPHICS_1` .. `_9` holding
 * `org.cytoscape.LinearGradient:{...}`, `org.cytoscape.RadialGradient:{...}` or a picture's URL), read per node as the
 * neutral fill gradient properties (`fill`, `fillGradient`, `fillGradientColors`, `fillGradientStops`,
 * `fillGradientAngle`, `fillGradientKind`) and `image` (https://manual.cytoscape.org/en/stable/Styles.html).
 *
 * As Cytoscape 3.10.5 draws them (measured from the pictures its SVG export embeds for specimen-images-charts): a
 * linear gradient runs across the whole node, `cy_angle` degrees counter-clockwise from left to right; a radial one
 * runs out from the node's middle to `cy_radius` times half the node's diagonal, and `cy_center` (fractions of the
 * node's box) moves its focus.
 */

import { num6 } from "../canon/number.js";
import { STYLE_ISSUE } from "../codes.js";
import type { StyleNotes } from "../notes.js";
import type { StyleColumn, StyleValue } from "../types.js";

/** The custom graphics slots, in the order Cytoscape stacks them. */
const SLOTS = Array.from({ length: 9 }, (_, k) => `NODE_CUSTOMGRAPHICS_${String(k + 1)}`);

/** A gradient's options as Cytoscape writes them. */
interface GradientOptions {
    readonly cy_angle?: unknown;
    readonly cy_gradientFractions?: unknown;
    readonly cy_gradientColors?: unknown;
    readonly cy_radius?: unknown;
    readonly cy_center?: unknown;
}

/** A gradient custom graphic. */
interface Gradient {
    readonly radial: boolean;
    readonly options: GradientOptions;
}

const GRADIENT_CLASS = /^org\.cytoscape\.(LinearGradient|RadialGradient)$/;

/** A color as Cytoscape writes a gradient's. */
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * The gradient a custom graphics value holds, or null for anything else.
 * @param raw - the value: `<class>:<options as JSON>` (the desktop, CX, sessions), or an object (CX2)
 * @returns the gradient
 */
function gradientOf(raw: unknown): Gradient | null {
    if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
        const o = raw as { name?: unknown; properties?: unknown };
        const kind = GRADIENT_CLASS.exec(typeof o.name === "string" ? o.name : "")?.[1];
        return kind !== undefined && typeof o.properties === "object" && o.properties !== null
            ? { radial: kind === "RadialGradient", options: o.properties }
            : null;
    }
    if (typeof raw !== "string") {
        return null;
    }
    const m = /^org\.cytoscape\.(LinearGradient|RadialGradient):(\{.*\})\s*$/s.exec(raw.trim());
    if (m === null) {
        return null;
    }
    try {
        const options = JSON.parse(m[2]) as unknown;
        return typeof options === "object" && options !== null ? { radial: m[1] === "RadialGradient", options } : null;
    } catch {
        return null;
    }
}

/**
 * The picture a custom graphics value names: a URL (a passthrough of a column of addresses, as the desktop maps
 * one), or the desktop's `<image class>,<id>,<URL>,<name>`.
 * @param raw - the value
 * @returns its URL, or null
 */
function imageOf(raw: unknown): string | null {
    if (typeof raw !== "string") {
        return null;
    }
    const v = raw.trim();
    if (/^(?:https?:\/\/|data:image\/)/i.test(v)) {
        return v;
    }
    const m = /^org\.cytoscape\.[\w.]*ImageCustomGraphics,[^,]*,([^,]+)/.exec(v);
    return m !== null && /^(?:https?|file|bundle):/i.test(m[1]) ? m[1] : null;
}

/** A gradient's colors and where each sits, 0 to 1. */
interface Ramp {
    colors: string[];
    stops: number[];
}

/**
 * A gradient's colors and stops, as written: one fraction per color, else evenly spaced.
 * @param options - the gradient's options
 * @returns the ramp, or null when it has fewer than two colors
 */
function rampOf(options: GradientOptions): Ramp | null {
    const colors = Array.isArray(options.cy_gradientColors)
        ? options.cy_gradientColors.filter((c): c is string => typeof c === "string" && HEX.test(c))
        : [];
    if (colors.length < 2) {
        return null;
    }
    const written = Array.isArray(options.cy_gradientFractions) ? options.cy_gradientFractions.map(Number) : [];
    const stops =
        written.length === colors.length && written.every((f) => f >= 0 && f <= 1)
            ? written
            : colors.map((_, k) => k / (colors.length - 1));
    return { colors: colors.map((c) => c.toLowerCase()), stops };
}

/**
 * The color a ramp has at a place, mixed between its stops.
 * @param ramp - the ramp
 * @param at - the place
 * @returns `#rrggbb`
 */
function colorAt(ramp: Ramp, at: number): string {
    const k = ramp.stops.findIndex((s) => s >= at);
    if (k <= 0) {
        return ramp.colors[k < 0 ? ramp.colors.length - 1 : 0];
    }
    const [s0, s1] = [ramp.stops[k - 1], ramp.stops[k]];
    const t = s1 === s0 ? 1 : (at - s0) / (s1 - s0);
    const [a, b] = [ramp.colors[k - 1], ramp.colors[k]];
    const channel = (i: number): string =>
        Math.round(Number.parseInt(a.slice(i, i + 2), 16) * (1 - t) + Number.parseInt(b.slice(i, i + 2), 16) * t)
            .toString(16)
            .padStart(2, "0");
    return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/**
 * A radial ramp of Cytoscape's, which reaches `radius` times half the node's diagonal, on graphty's radial fill, which
 * reaches half the node's side: each stop moved by `radius` times the square root of 2 (exact for a square node), and
 * a ramp reaching past the side cut at the side, its color there mixed.
 * @param ramp - the ramp as written
 * @param radius - `cy_radius`
 * @returns the ramp graphty draws
 */
function radialRamp(ramp: Ramp, radius: number): Ramp {
    const scale = radius * Math.SQRT2;
    const moved: Ramp = { colors: ramp.colors, stops: ramp.stops.map((s) => s * scale) };
    const inside = moved.stops.findIndex((s) => s > 1);
    if (inside < 0) {
        return moved;
    }
    const edge = colorAt(moved, 1);
    return {
        colors: [...moved.colors.slice(0, inside), edge],
        stops: [...moved.stops.slice(0, inside), 1],
    };
}

/**
 * A number as written, or a default where it is none.
 * @param v - the value
 * @param fallback - the default
 * @returns the number
 */
const numberOr = (v: unknown, fallback: number): number => {
    const x = Number(v);
    return v === undefined || v === null || !Number.isFinite(x) ? fallback : x;
};

/**
 * Whether a radial gradient's focus is off the node's middle.
 * @param center - `cy_center`, fractions of the node's box
 * @returns whether it is
 */
function offMiddle(center: unknown): boolean {
    if (typeof center !== "object" || center === null) {
        return false;
    }
    const c = center as { x?: unknown; y?: unknown };
    return numberOr(c.x, 0.5) !== 0.5 || numberOr(c.y, 0.5) !== 0.5;
}

/**
 * One node's fill gradient properties from its gradient custom graphic.
 * @param gradient - the gradient
 * @param written - its ramp as written
 * @returns the properties and whether its focus is off the node's middle
 */
function gradientProperties(gradient: Gradient, written: Ramp): { values: Record<string, StyleValue>; off: boolean } {
    const ramp = gradient.radial ? radialRamp(written, numberOr(gradient.options.cy_radius, 0.5)) : written;
    const values: Record<string, StyleValue> = {
        fill: ramp.colors[0],
        fillGradient: ramp.colors.at(-1) ?? ramp.colors[0],
        fillGradientStops: ramp.stops.map((s) => String(num6(s))).join(" "),
    };
    if (ramp.colors.length > 2) {
        values.fillGradientColors = ramp.colors.join(" ");
    }
    if (gradient.radial) {
        values.fillGradientKind = "radial";
    } else {
        // counter-clockwise from left to right; the neutral angle turns clockwise on the screen
        values.fillGradientAngle = num6(((-numberOr(gradient.options.cy_angle, 0) % 360) + 360) % 360);
    }
    return { values, off: gradient.radial && offMiddle(gradient.options.cy_center) };
}

/**
 * Sets each node's fill gradient from the first gradient among its custom graphics, and its `image` from the first
 * picture among them.
 * @param out - the node values per property, changed in place
 * @param n - the node count
 * @param graphicOf - a node's resolved value of a custom graphics slot
 * @param notes - where a gradient drawn differently is noted
 */
export function readCytoscapeGradientsAndImages(
    out: Partial<Record<string, StyleColumn>>,
    n: number,
    graphicOf: (slot: string, i: number) => unknown,
    notes: StyleNotes,
): void {
    const put = (property: string, i: number, v: StyleValue): void => {
        out[property] ??= new Array<StyleValue | null>(n).fill(null);
        (out[property] as (StyleValue | null)[])[i] = v;
    };
    for (let i = 0; i < n; i++) {
        const values = SLOTS.map((slot) => graphicOf(slot, i));
        const image = values.map(imageOf).find((v) => v !== null);
        if (image !== undefined) {
            put("image", i, image);
        }
        const gradient = values.map(gradientOf).find((v) => v !== null);
        const written = gradient === undefined ? null : rampOf(gradient.options);
        if (gradient === undefined || written === null) {
            continue;
        }
        const { values: properties, off } = gradientProperties(gradient, written);
        for (const [property, v] of Object.entries(properties)) {
            put(property, i, v);
        }
        if (off) {
            // ponytail: graphty's radial fill runs from the node's middle; a focus off it is drawn centered
            notes.add(STYLE_ISSUE.APPROXIMATED, "node", "fillGradientKind", {
                sample: JSON.stringify(gradient.options.cy_center),
                element: i,
            });
        }
    }
}
