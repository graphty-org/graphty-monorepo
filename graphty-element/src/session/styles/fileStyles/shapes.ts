/**
 * @file How a file's flat drawing vocabulary is drawn by graphty-element: the 2D node shapes as 3D
 * ones, and the line styles and arrows of the file's vocabulary as the element's own.
 *
 * The shape table is a choice another consumer may make differently, so a load takes its own
 * (`styleOptions.shapes`) and this one is only the default. The line and arrow tables are not
 * choices: each maps a name to the element's one equivalent.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/**
 * The element shape each 2D node shape of a file is drawn as, keyed by the neutral shape name
 * (`ellipse`, `rectangle`, `round-rectangle`, `triangle`, `diamond`, `pentagon`, `hexagon`,
 * `octagon`, `parallelogram`, `trapezoid`, `star`, `vee`, `none`). A shape the table leaves out
 * is not drawn from the file, and the load notes it.
 */
export type FileStyleShapeTable = Readonly<Record<string, string>>;

/**
 * The default shape table: no 2D shape has an exact 3D counterpart, so each is drawn as the
 * nearest solid, and the load notes every element drawn that way.
 */
export const FILE_STYLE_SHAPES: FileStyleShapeTable = Object.freeze({
    ellipse: "sphere",
    rectangle: "box",
    "round-rectangle": "box",
    triangle: "triangular_prism",
    diamond: "octahedron",
    pentagon: "pentagonal_prism",
    hexagon: "hexagonal_prism",
    octagon: "dodecahedron",
    parallelogram: "box",
    trapezoid: "box",
    star: "icosahedron",
    vee: "cone",
    none: "sphere",
});

/** The element's line pattern for each line style of a file. */
export const LINE_STYLES: ReadonlyMap<string, string> = new Map([
    ["solid", "solid"],
    ["dashed", "dash"],
    ["dotted", "dot"],
    ["dash-dot", "dash-dot"],
    ["zigzag", "zigzag"],
    ["sinewave", "sinewave"],
    ["double", "solid"],
    ["long-dash", "dash"],
]);

/** The line styles drawn as the nearest pattern rather than exactly. */
export const LINE_STYLES_NEAREST: ReadonlySet<string> = new Set(["double", "long-dash"]);

/** The element's arrow for each arrow shape of a file. */
export const ARROW_SHAPES: ReadonlyMap<string, string> = new Map([
    ["none", "none"],
    ["triangle", "normal"],
    ["triangle-open", "open-normal"],
    ["vee", "vee"],
    ["tee", "tee"],
    ["diamond", "diamond"],
    ["diamond-open", "open-diamond"],
    ["circle", "dot"],
    ["circle-open", "open-dot"],
    ["square", "box"],
    ["crow", "crow"],
    ["half", "half-open"],
    ["inverted", "inverted"],
]);
