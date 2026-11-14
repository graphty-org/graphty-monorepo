import { Color3 } from "@babylonjs/core";

import { colorToHex } from "../config/common";
import type { EdgeStyleConfig } from "../config/EdgeStyle";
import { cssWords } from "./nodeDecoration";

/**
 * How many pieces a line painted in a gradient is drawn as, each in the color of the gradient at
 * its middle: enough that no step shows on an edge a few hundred pixels long, and that a radial
 * gradient, whose pieces meet each color twice, still shows each stop's own color.
 *
 * ponytail: each distinct piece color is a batch of its own (one draw call), shared by every edge
 * that draws it; many edges in many different gradients would want one ramp-textured batch instead.
 */
const GRADIENT_PIECES = 64;

/**
 * A color as `#rrggbb`, or null for text no CSS color parser reads.
 * @param text - The color as written.
 * @returns The hex, or null.
 */
function hexOf(text: string): string | null {
    return colorToHex(text) ?? null;
}

/**
 * A gradient's colors written as CSS colors separated by spaces, as `#rrggbb`; a space inside a
 * color's parentheses is kept ("rgb(1, 2, 3) red") and a color no parser reads is left out.
 * @param text - The colors as written.
 * @returns The colors.
 */
export function gradientColorList(text: string | undefined): string[] {
    return cssWords(text).flatMap((c) => {
        const hex = hexOf(c);
        return hex === null ? [] : [hex];
    });
}

/**
 * Where each of a gradient's colors sits, fractions separated by spaces, or null unless there is
 * exactly one number per color.
 * @param text - The stops as written.
 * @param count - How many colors the gradient has.
 * @returns The stops, or null.
 */
export function gradientStopList(text: string | undefined, count: number): number[] | null {
    const given = (text ?? "")
        .trim()
        .split(/\s+/)
        .filter((s) => s !== "")
        .map(Number);
    return given.length === count && given.every((s) => Number.isFinite(s)) ? given : null;
}

/**
 * Where each of a gradient's colors sits, from 0 to 1: the given stops when there is one per color,
 * otherwise evenly spaced. One color sits at 0, which paints the whole ramp in it; evenly spacing
 * it as `i / (count - 1)` would be NaN, which `addColorStop` throws on.
 * @param count - How many colors the gradient has.
 * @param stops - Where each sits, or none.
 * @returns One offset per color.
 */
function gradientOffsets(count: number, stops?: readonly number[] | null): number[] {
    if (stops?.length === count) {
        return [...stops];
    }
    return Array.from({ length: count }, (_, i) => (count === 1 ? 0 : i / (count - 1)));
}

/**
 * Add a gradient's colors to a canvas ramp, each at its offset from {@link gradientOffsets}. The
 * one place node, label and legend ramps add their stops, so one color or a stop list means the
 * same everywhere.
 * @param ramp - The canvas gradient, with no stops yet.
 * @param colors - The colors.
 * @param stops - Where each sits, or none.
 */
export function addGradientStops(
    ramp: Pick<CanvasGradient, "addColorStop">,
    colors: readonly (string | undefined)[],
    stops?: readonly number[] | null,
): void {
    const offsets = gradientOffsets(colors.length, stops);
    colors.forEach((color, i) => {
        ramp.addColorStop(offsets[i], color ?? "transparent");
    });
}

/**
 * The colors of a line's gradient pieces, from its source end to its target end, or null when the
 * style paints the line in no gradient: `line.gradient` with fewer than two colors, or kind "none".
 * A linear gradient runs from the source end to the target end; a radial one out from the line's
 * middle to both ends, so its first color is at the middle. `stops` place the colors when there is
 * one per color, as Cytoscape.js reads its stop positions; otherwise the colors are evenly spaced.
 * @param gradient - The line's gradient block.
 * @param pieces - How many pieces.
 * @returns One `#rrggbb` color per piece, or null.
 */
export function gradientPieceColors(
    gradient: NonNullable<EdgeStyleConfig["line"]>["gradient"],
    pieces = GRADIENT_PIECES,
): string[] | null {
    if (gradient === undefined || gradient.kind === "none") {
        return null;
    }

    const colors = gradientColorList(gradient.colors);
    if (colors.length < 2) {
        return null;
    }

    const stops = gradientOffsets(colors.length, gradientStopList(gradient.stops, colors.length));

    return Array.from({ length: pieces }, (_, i) => {
        const t = (i + 0.5) / pieces;
        return colorAt(colors, stops, gradient.kind === "radial" ? Math.abs(2 * t - 1) : t);
    });
}

/**
 * A gradient's color at a fraction of its length: the color of the stop before it blended into the
 * one after, the first color before the first stop and the last after the last.
 * @param colors - The colors, `#rrggbb`.
 * @param stops - Where each sits, rising.
 * @param s - The fraction.
 * @returns The color, `#rrggbb`.
 */
function colorAt(colors: readonly string[], stops: readonly number[], s: number): string {
    if (s <= stops[0]) {
        return colors[0].toLowerCase();
    }

    for (let i = 1; i < stops.length; i++) {
        if (s <= stops[i]) {
            const span = stops[i] - stops[i - 1];
            const f = span > 0 ? (s - stops[i - 1]) / span : 1;
            return Color3.Lerp(Color3.FromHexString(colors[i - 1]), Color3.FromHexString(colors[i]), f)
                .toHexString()
                .toLowerCase();
        }
    }

    return (colors.at(-1) ?? colors[0]).toLowerCase();
}
