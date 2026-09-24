/**
 * The option lists the style inspector's pickers are built from.
 */

import { NodeShapes } from "@graphty/graphty-element/schema";

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
 * The word the menu draws for one of the element's shape names.
 *
 * The element's names are already the words, in the element's own spelling: a hyphen in
 * "torus-knot" and underscores in "triangular_prism" and its siblings. Separators become
 * spaces and the first letter is capitalised, which is the whole of the rule and covers
 * every member of the enum.
 * @param shape - a shape name exactly as `NodeShapes` spells it.
 * @returns the name in sentence case, e.g. "Torus knot", "Elongated pentagonal cupola".
 */
function shapeLabel(shape: string): string {
    const words = shape.replaceAll("_", " ").replaceAll("-", " ");

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
    label: shapeLabel(shape),
}));

/**
 * Edge line type options.
 *
 * STILL A HAND-MAINTAINED COPY, unlike the shapes above, and for one reason: the
 * element's `LineType` enum is a module-private const inside its EdgeStyle schema and is
 * published from no entry point, so there is nothing to derive from. Until it is
 * exported, this list can drift from what the element can draw exactly as the shape list
 * once did, with no test able to catch it.
 */
export const LINE_TYPE_OPTIONS = [
    { value: "solid", label: "Solid" },
    { value: "dash", label: "Dash" },
    { value: "dot", label: "Dot" },
    { value: "dash-dot", label: "Dash-Dot" },
    { value: "box", label: "Box" },
    { value: "diamond", label: "Diamond" },
    { value: "star", label: "Star" },
    { value: "sinewave", label: "Sinewave" },
    { value: "zigzag", label: "Zigzag" },
] as const;

/**
 * Arrow type options for edge heads and tails.
 *
 * A hand-maintained copy for the same reason as the line types above: the element's
 * `ArrowType` enum is module-private to its EdgeStyle schema and is published from no
 * entry point, so this list cannot be derived and cannot be pinned.
 */
export const ARROW_TYPE_OPTIONS = [
    { value: "none", label: "None" },
    { value: "normal", label: "Normal" },
    { value: "inverted", label: "Inverted" },
    { value: "vee", label: "Vee" },
    { value: "tee", label: "Tee" },
    { value: "diamond", label: "Diamond" },
    { value: "open-diamond", label: "Open Diamond" },
    { value: "box", label: "Box" },
    { value: "dot", label: "Dot" },
    { value: "sphere-dot", label: "Sphere Dot" },
    { value: "open-dot", label: "Open Dot" },
    { value: "crow", label: "Crow" },
    { value: "half-open", label: "Half Open" },
    { value: "open-normal", label: "Open Normal" },
] as const;
