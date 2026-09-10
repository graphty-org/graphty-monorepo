import { useDirection as useMantineDirection } from "@mantine/core";
import type React from "react";

// Section 2.3 of the hardening contract. Most of the right-to-left work is
// mechanical -- marginLeft becomes marginInlineStart, left becomes
// insetInlineStart, textAlign "left" becomes "start" -- and a component does
// that in its own style object with no help from here.
//
// This module exists for the parts CSS logical properties cannot express: a
// gradient's direction keyword, a clip-path polygon, and an SVG polyline, all of
// which are drawn in a coordinate space that has no idea which way the text
// runs.

/**
 * Which way text runs: left to right, or right to left.
 */
export type Direction = "ltr" | "rtl";

/**
 * The angle a CSS gradient runs at, from the inline start to the inline end.
 */
export type GradientDirection = "to right" | "to left";

/**
 * Reads the text direction in force.
 *
 * Wraps Mantine's own `DirectionProvider`, so a consumer who has already set the
 * direction for their app has set it for this library too. Returns `"ltr"` when
 * there is no provider above, which is Mantine's own default.
 * @returns The text direction in force
 */
export function useDirection(): Direction {
    return useMantineDirection().dir;
}

/**
 * Whether text runs right to left.
 * @param direction - The text direction in force
 * @returns True when text runs right to left
 */
export function isRtl(direction: Direction): boolean {
    return direction === "rtl";
}

/**
 * Turns a position measured from the inline start into one measured from the
 * left.
 *
 * Use it wherever a drawing is laid out as a fraction of its width but has to
 * read in the same order as the labels beside it -- the first point of a
 * sparkline sits at 0 in both directions, but that is the right-hand edge when
 * text runs right to left.
 * @param fraction - How far along the inline axis, from 0 at the start to 1 at the end
 * @param direction - The text direction in force
 * @returns How far from the left edge, from 0 to 1
 */
export function inlineFraction(fraction: number, direction: Direction): number {
    return isRtl(direction) ? 1 - fraction : fraction;
}

/**
 * Turns a position measured from the inline start into an x coordinate.
 *
 * This is the SVG form of `inlineFraction`: an SVG user space has no notion of
 * text direction, so a series plotted straight into it reads backwards under
 * reversed labels.
 * @param fraction - How far along the inline axis, from 0 at the start to 1 at the end
 * @param extent - The width of the coordinate space, in its own units
 * @param direction - The text direction in force
 * @returns The x coordinate, in the same units as `extent`
 * @example
 * ```ts
 * const x = inlineX(index / lastIndex, VIEWBOX_WIDTH, direction);
 * ```
 */
export function inlineX(fraction: number, extent: number, direction: Direction): number {
    return inlineFraction(fraction, direction) * extent;
}

/**
 * The direction keyword for a CSS gradient that runs from the inline start to
 * the inline end.
 *
 * A `linear-gradient(to right, ...)` runs the same way whichever direction the
 * text does, so a ramp built with a fixed keyword ends up contradicting the
 * minimum and maximum labels on either side of it.
 * @param direction - The text direction in force
 * @returns The keyword to open a `linear-gradient` with
 * @example
 * ```ts
 * const ramp = `linear-gradient(${inlineGradientDirection(direction)}, ${from}, ${to})`;
 * ```
 */
export function inlineGradientDirection(direction: Direction): GradientDirection {
    return isRtl(direction) ? "to left" : "to right";
}

/**
 * Styles that mirror a drawing about its own vertical centre line when text runs
 * right to left.
 *
 * The last resort for a drawing that cannot be re-expressed in logical terms: a
 * `clip-path` polygon, or a gradient string that came from outside this library
 * and cannot be rebuilt. Spread it into the style of the element that carries
 * the drawing -- never onto one that also holds text, which would come out
 * backwards.
 * @param direction - The text direction in force
 * @returns Style properties to spread into the drawing's own style
 * @example
 * ```tsx
 * <Box style={{clipPath: WEDGE, background: gradient, ...mirrorInline(direction)}} />
 * ```
 */
export function mirrorInline(direction: Direction): React.CSSProperties {
    return isRtl(direction) ? { transform: "scaleX(-1)" } : {};
}
