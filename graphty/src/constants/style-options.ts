/**
 * The option lists the style inspector's pickers are built from.
 */

import { EdgeArrowTypes, EdgeLineTypes, NodeShapes } from "@graphty/graphty-element/schema";

/**
 * One row of a `StyleSelect`: the value written into the layer and the word drawn for it.
 *
 * Structurally identical to compact-mantine's `StyleSelectOption`, and declared here
 * rather than imported so this module stays a plain constants file with no component
 * dependency. Every list below is assignable to `StyleSelectOption[]`.
 * @public
 */
export interface StyleOption {
    /** The value written into the style layer. */
    value: string;
    /** The word drawn in the menu. Sentence case. */
    label: string;
}

/**
 * The word the menu draws for one of the element's shape, line or arrow names.
 *
 * The element's names are already the words, in the element's own spelling: a hyphen in
 * "torus-knot" and "dash-dot", underscores in "triangular_prism" and its siblings.
 * Separators become spaces and the first letter is capitalised, which is the whole of the
 * rule and covers every member of each enum.
 * @param name - a name exactly as `NodeShapes`, `EdgeLineTypes` or `EdgeArrowTypes` spells it.
 * @returns the name in sentence case, e.g. "Torus knot", "Dash dot", "Open diamond".
 */
function optionLabel(name: string): string {
    const words = name.replaceAll("_", " ").replaceAll("-", " ");

    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Every node shape graphty-element can build, derived from the element's own
 * `NodeShapes` enum.
 *
 * THE DEFECT THIS CLOSES, in the product owner's words: "there is no 'plane' shape, and
 * when selected a box shows up". This table used to be a SECOND, hand-maintained copy of
 * the element's shape vocabulary, and the two had drifted in both directions. It offered
 * three shapes -- "torus", "disc" and "plane" -- that the element had no mesh for, and
 * rather than fail, the write bridge's `SHAPE_TYPE_MAP` silently substituted the nearest
 * thing it could build: plane became a box, disc became a geodesic, torus became a
 * torus-knot. The read half inverted only the `torusKnot` rename, so re-opening the layer
 * showed the substitute rather than the reader's choice -- the control was guaranteed to
 * lie, not merely likely to. In the other direction it was MISSING twelve solids the
 * element has always been able to build.
 *
 * There is now ONE list. `NodeShapes` is a published value export of
 * `@graphty/graphty-element/schema`, an entry point that carries no 3D engine, so the
 * picker reads the element's vocabulary directly and a shape added to or removed from the
 * element appears in or disappears from this menu with no edit here at all.
 *
 * THE ORDER IS THE ELEMENT'S, which is how deriving the list pays for itself: there is no
 * second ordering to maintain. The everyday solids come first, then the polyhedra, then
 * the sphere variants.
 */
export const NODE_SHAPE_OPTIONS: StyleOption[] = NodeShapes.options.map((shape) => ({
    value: shape,
    label: optionLabel(shape),
}));

/**
 * Every line pattern graphty-element can draw, derived from the element's own
 * `EdgeLineTypes` enum in the element's order, so a pattern added to or removed from the
 * element appears in or disappears from this menu with no edit here.
 */
export const LINE_TYPE_OPTIONS: StyleOption[] = EdgeLineTypes.options.map((type) => ({
    value: type,
    label: optionLabel(type),
}));

/**
 * Every arrow graphty-element can draw at an edge's head or tail, derived from the
 * element's own `EdgeArrowTypes` enum in the element's order.
 */
export const ARROW_TYPE_OPTIONS: StyleOption[] = EdgeArrowTypes.options.map((type) => ({
    value: type,
    label: optionLabel(type),
}));
