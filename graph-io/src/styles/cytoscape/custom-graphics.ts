/**
 * Cytoscape desktop's gradient and image custom graphics (`NODE_CUSTOMGRAPHICS_1` .. `_9` holding
 * `org.cytoscape.LinearGradient:{...}`, `org.cytoscape.RadialGradient:{...}` or a picture's URL), read per node as the
 * neutral fill gradient properties (`fill`, `fillGradient`, `fillGradientColors`, `fillGradientStops`,
 * `fillGradientAngle`, `fillGradientKind`) and `image` (https://manual.cytoscape.org/en/stable/Styles.html).
 *
 * As Cytoscape 3.10.5 draws them (measured from the pictures its SVG export embeds for specimen-images-charts): a
 * linear gradient runs across the whole node, `cy_angle` degrees counter-clockwise from left to right; a radial one
 * runs out from `cy_center` (fractions of the node's box, the middle by default) to that center's distance from the
 * node's middle plus `cy_radius` times half the node's diagonal.
 */

import { num6 } from "../canon/number.js";
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
 * Where a radial gradient's middle is, fractions of the node's box.
 * @param center - `cy_center`
 * @returns the middle
 */
function centerOf(center: unknown): { x: number; y: number } {
    const c = typeof center === "object" && center !== null ? (center as { x?: unknown; y?: unknown }) : {};
    return { x: numberOr(c.x, 0.5), y: numberOr(c.y, 0.5) };
}

/**
 * How far a radial gradient of Cytoscape's reaches, in halves of the node's side: Cytoscape 3.10.5
 * (`RadialGradientLayer.getPaint`) runs it from its center to the center's distance from the node's middle plus
 * `cy_radius` times half the node's diagonal (taken on a square node).
 * @param center - its middle, fractions of the node's box
 * @param center.x - across
 * @param center.y - down
 * @param radius - `cy_radius`
 * @returns the reach
 */
function radialReach(center: { x: number; y: number }, radius: number): number {
    return 2 * Math.hypot(center.x - 0.5, center.y - 0.5) + Math.max(0, radius) * Math.SQRT2;
}

/**
 * One node's fill gradient properties from its gradient custom graphic.
 * @param gradient - the gradient
 * @param ramp - its ramp as written
 * @returns the properties
 */
function gradientProperties(gradient: Gradient, ramp: Ramp): Record<string, StyleValue> {
    const values: Record<string, StyleValue> = {
        fill: ramp.colors[0],
        fillGradient: ramp.colors.at(-1) ?? ramp.colors[0],
        fillGradientStops: ramp.stops.map((s) => String(num6(s))).join(" "),
    };
    if (ramp.colors.length > 2) {
        values.fillGradientColors = ramp.colors.join(" ");
    }
    if (gradient.radial) {
        const center = centerOf(gradient.options.cy_center);
        values.fillGradientKind = "radial";
        values.fillGradientRadius = num6(radialReach(center, numberOr(gradient.options.cy_radius, 0.5)));
        if (center.x !== 0.5 || center.y !== 0.5) {
            values.fillGradientCenterX = num6(center.x);
            values.fillGradientCenterY = num6(center.y);
        }
    } else {
        // counter-clockwise from left to right; the neutral angle turns clockwise on the screen
        values.fillGradientAngle = num6(((-numberOr(gradient.options.cy_angle, 0) % 360) + 360) % 360);
    }
    return values;
}

/**
 * Sets each node's fill gradient from the first gradient among its custom graphics, and its `image` from the first
 * picture among them.
 * @param out - the node values per property, changed in place
 * @param n - the node count
 * @param graphicOf - a node's resolved value of a custom graphics slot
 */
export function readCytoscapeGradientsAndImages(
    out: Partial<Record<string, StyleColumn>>,
    n: number,
    graphicOf: (slot: string, i: number) => unknown,
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
        for (const [property, v] of Object.entries(gradientProperties(gradient, written))) {
            put(property, i, v);
        }
    }
}
