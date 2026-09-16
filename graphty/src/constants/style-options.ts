/**
 * The option lists the style inspector's pickers are built from.
 */

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
 * Every node shape graphty-element can actually build, in the order the picker offers
 * them: the everyday solids first, then the spheres, then the polyhedra.
 *
 * THE DEFECT THIS LIST CLOSES, in the product owner's words: "there is no 'plane' shape,
 * and when selected a box shows up". This table used to be a SECOND, hand-maintained copy
 * of the element's shape vocabulary, and the two had drifted in both directions. It
 * offered three shapes -- "torus", "disc" and "plane" -- that graphty-element's
 * `NodeShapes` enum did not contain, and rather than fail, the write bridge's
 * `SHAPE_TYPE_MAP` silently substituted the nearest thing it could build: plane became a
 * box, disc became a geodesic, torus became a torus-knot. The read half inverted only the
 * `torusKnot` rename, so re-opening the layer showed the substitute rather than the
 * reader's choice -- the control was guaranteed to lie, not merely likely to. In the
 * other direction it was MISSING twelve solids the element has always been able to build
 * (rhombicuboctahedron, the three prisms, the two pyramids, the four dipyramids, the
 * elongated cupola and the Goldberg polyhedron).
 *
 * THE VALUES ARE THE ELEMENT'S OWN ENUM MEMBERS, spelled exactly as
 * `graphty-element/src/config/NodeStyle.ts` spells them -- note the UNDERSCORES in
 * `triangular_prism` and its siblings, and the HYPHEN in `torus-knot`. Nothing maps or
 * renames on the way to the layer any more, so there is nothing left to drift.
 *
 * WHY THE LIST IS RESTATED HERE RATHER THAN IMPORTED. `NodeShapes` is a public value
 * export of `@graphty/graphty-element`, but that package's entry point pulls Babylon.js
 * in with it, and this module is imported by the style inspector and so by most of the
 * app's test suite. The drift the import was meant to prevent is instead prevented by a
 * test: `constants/__tests__/style-options.test.ts` imports the element's narrow config
 * module -- which costs only Zod -- and asserts this list and `NodeShapes.options` hold
 * exactly the same members. Adding a shape to the element without adding it here is
 * therefore a test failure rather than a silent omission.
 *
 * "torus" IS A REAL SHAPE AGAIN. `NodeMesh` has always registered a working `torus`
 * creator; only the enum omitted it, which is the sole reason Torus was ever degraded.
 */
export const NODE_SHAPE_OPTIONS: StyleOption[] = [
    { value: "sphere", label: "Sphere" },
    { value: "box", label: "Box" },
    { value: "cylinder", label: "Cylinder" },
    { value: "cone", label: "Cone" },
    { value: "capsule", label: "Capsule" },
    { value: "torus", label: "Torus" },
    { value: "torus-knot", label: "Torus knot" },
    { value: "icosphere", label: "Icosphere" },
    { value: "geodesic", label: "Geodesic" },
    { value: "tetrahedron", label: "Tetrahedron" },
    { value: "octahedron", label: "Octahedron" },
    { value: "dodecahedron", label: "Dodecahedron" },
    { value: "icosahedron", label: "Icosahedron" },
    { value: "rhombicuboctahedron", label: "Rhombicuboctahedron" },
    { value: "goldberg", label: "Goldberg" },
    { value: "triangular_prism", label: "Triangular prism" },
    { value: "pentagonal_prism", label: "Pentagonal prism" },
    { value: "hexagonal_prism", label: "Hexagonal prism" },
    { value: "square_pyramid", label: "Square pyramid" },
    { value: "pentagonal_pyramid", label: "Pentagonal pyramid" },
    { value: "triangular_dipyramid", label: "Triangular dipyramid" },
    { value: "pentagonal_dipyramid", label: "Pentagonal dipyramid" },
    { value: "elongated_square_dipyramid", label: "Elongated square dipyramid" },
    { value: "elongated_pentagonal_dipyramid", label: "Elongated pentagonal dipyramid" },
    { value: "elongated_pentagonal_cupola", label: "Elongated pentagonal cupola" },
];

/**
 * The three ways a node's colour can be filled.
 *
 * Drawn as a `StyleSelect` rather than an `IconGroupRow` deliberately: an icon group
 * needs one glyph per option, and compact-mantine's glyph register is CLOSED and holds no
 * colour-mode glyph. Drawing three SVGs at the call site to get an icon group would be
 * exactly the bespoke substitute for a library control that design 6.17 check 1 forbids.
 *
 * All three modes are LIVE. Gradient node colour was rendered by nothing in
 * graphty-element until `NodeMesh` learned to build a ramp texture, so these were, for a
 * while, two modes that painted a plain white node.
 */
export const COLOR_MODE_OPTIONS: StyleOption[] = [
    { value: "solid", label: "Solid" },
    { value: "gradient", label: "Linear gradient" },
    { value: "radial", label: "Radial gradient" },
];

/**
 * Edge line type options.
 * Matches graphty-element LineType enum.
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
 * Matches graphty-element ArrowType enum.
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

/**
 * Font family options for text labels.
 */
export const FONT_OPTIONS = [
    { value: "Arial", label: "Arial" },
    { value: "Helvetica", label: "Helvetica" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Georgia", label: "Georgia" },
    { value: "Verdana", label: "Verdana" },
    { value: "Courier New", label: "Courier New" },
    { value: "monospace", label: "Monospace" },
] as const;

/**
 * Font weight options for text labels.
 */
export const FONT_WEIGHT_OPTIONS = [
    { value: 100, label: "Thin" },
    { value: 300, label: "Light" },
    { value: 400, label: "Normal" },
    { value: 500, label: "Medium" },
    { value: 700, label: "Bold" },
    { value: 900, label: "Black" },
] as const;

/**
 * Text location options for labels.
 * Matches graphty-element TextLocation enum.
 */
export const TEXT_LOCATION_OPTIONS = [
    { value: "static", label: "Static" },
    { value: "textPath", label: "Text Path" },
] as const;

/**
 * Text attach position options.
 * Matches graphty-element TextAttachPosition enum.
 */
export const TEXT_ATTACH_POSITION_OPTIONS = [
    { value: "above", label: "Above" },
    { value: "below", label: "Below" },
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
    { value: "center", label: "Center" },
] as const;

/**
 * Text animation options.
 * Matches graphty-element TextAnimation enum.
 */
export const TEXT_ANIMATION_OPTIONS = [
    { value: "none", label: "None" },
    { value: "typewriter", label: "Typewriter" },
    { value: "fade-in", label: "Fade In" },
    { value: "slide-in", label: "Slide In" },
] as const;
