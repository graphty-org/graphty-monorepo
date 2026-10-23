/**
 * @file The part of the viewport view insets leave free, as every fit reads it.
 *
 * Node-safe arithmetic shared by the cameras and the built-in views: no Babylon type.
 */

import type { ViewInsets } from "./types";

/** The narrowest share of a side a fit is ever squeezed into, so a huge inset cannot divide by zero. */
const MIN_FREE = 0.1;

/** The free part of the viewport in normalized device coordinates (-1 to 1 on each axis). */
export interface FreeArea {
    /** The free share of the width, 0.1 to 1: the half-width of the free area in NDC. */
    readonly width: number;
    /** The free share of the height, 0.1 to 1. */
    readonly height: number;
    /** Where the free area's center sits across, in NDC (positive is right). */
    readonly x: number;
    /** Where the free area's center sits up, in NDC (positive is up). */
    readonly y: number;
}

/**
 * Fill in the sides an inset leaves out, and refuse what cannot be a margin.
 * @param insets - The insets a caller gave, or undefined.
 * @returns Every side, a finite number of 0 or more.
 */
export function fullInsets(insets: ViewInsets | undefined): Required<ViewInsets> {
    const side = (value: number | undefined): number =>
        value !== undefined && Number.isFinite(value) && value > 0 ? value : 0;

    return {
        top: side(insets?.top),
        right: side(insets?.right),
        bottom: side(insets?.bottom),
        left: side(insets?.left),
    };
}

/**
 * Whether a value is a number above zero; false for NaN and for no value.
 * @param value - The value.
 * @returns true when it is positive.
 */
function isPositive(value: number): boolean {
    return value > 0;
}

/**
 * The part of a viewport the insets leave free.
 * @param insets - Margins in the same units as `width` and `height`.
 * @param width - The viewport's width; 0 (unmeasured) leaves everything free.
 * @param height - The viewport's height.
 * @returns The free area in NDC.
 */
export function freeArea(insets: ViewInsets | undefined, width: number, height: number): FreeArea {
    const { top, right, bottom, left } = fullInsets(insets);
    const across = (start: number, end: number, size: number): { share: number; center: number } => {
        // Not `size <= 0`: an unmeasured size (NaN, or none at all) must also leave everything free.
        if (!isPositive(size)) {
            return { share: 1, center: 0 };
        }

        let a = start / size;
        let b = end / size;
        const share = Math.max(MIN_FREE, 1 - a - b);
        // Squeezed past the floor, both margins give way in proportion.
        if (a + b > 1 - MIN_FREE) {
            const scale = (1 - MIN_FREE) / (a + b);
            a *= scale;
            b *= scale;
        }

        return { share, center: a - b };
    };

    const h = across(left, right, width);
    // Up is positive in NDC, so a top margin moves the center down.
    const v = across(bottom, top, height);

    return { width: h.share, height: v.share, x: h.center, y: v.center };
}
