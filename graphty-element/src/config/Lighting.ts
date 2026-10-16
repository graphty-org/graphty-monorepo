/**
 * Every way the element can light its 3D nodes, as a const array for validation and controls.
 */
export const LIGHTING_VALUES = ["studio", "headlight", "matte", "flat"] as const;

/**
 * How the element lights its 3D nodes.
 *
 * - "studio" (the default): a light that follows the camera from just above and left of it, a soft
 *   fill with a light ground, and a rim that lifts each node's own color toward its silhouette. No
 *   side of a node goes dark, from any angle: the darkest face is about three quarters of the style
 *   color's lightness, a lit face is at most about 1.07 times it, and no pixel is lifted to white.
 * - "headlight": the same lights without the rim. A face is never brighter than its style color.
 * - "matte": one soft light from above, no highlight. A lit face tops out at exactly the style
 *   color; shapes read flatter and the average node is darker than "studio".
 * - "flat": no lighting at all. Every pixel of a node is exactly its style color, with a thin dark
 *   outline so overlapping nodes stay apart.
 *
 * 2D view is always drawn flat, whatever this says.
 */
export type Lighting = (typeof LIGHTING_VALUES)[number];

/** The lighting a graph starts with. */
export const DEFAULT_LIGHTING: Lighting = "studio";

/**
 * Whether a value is one of the {@link LIGHTING_VALUES}.
 * @param value - The value to check.
 * @returns True when it names a lighting.
 */
export function isLighting(value: unknown): value is Lighting {
    return (LIGHTING_VALUES as readonly unknown[]).includes(value);
}
