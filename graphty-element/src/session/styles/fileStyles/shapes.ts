/**
 * @file How a file's flat drawing vocabulary is drawn by graphty-element: the 2D node shapes as
 * the element's flat ones, and the line styles and arrows of the file's vocabulary as the element's own.
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
 * `octagon`, `parallelogram`, `trapezoid`, `star`, `vee`, `polygon`, `none`, and the `other:` shapes a file's
 * own vocabulary keeps, such as Pajek's `other:cross`). A shape the table leaves out
 * is not drawn from the file, and the load notes it. A shape drawn as the element shape of the same
 * name is drawn exactly; any other is noted as drawn as the nearest.
 */
export type FileStyleShapeTable = Readonly<Record<string, string>>;

/**
 * The default shape table. Every 2D shape is drawn as the element's own flat shape of the same
 * name, exactly: `none` as a node with no body, which draws only its label, and Pajek's cross,
 * house, man and woman (`other:cross`, `other:house`, `other:man`, `other:woman`), Cytoscape.js's
 * rounded polygons and barrel (`other:round-triangle` ... `other:round-polygon`, `other:barrel`) and
 * vis-network's database (`other:database`) as the element's shapes of those names, and Graphviz's cylinder
 * (`other:cylinder`) as the database it is drawn as.
 */
export const FILE_STYLE_SHAPES: FileStyleShapeTable = Object.freeze({
    ellipse: "ellipse",
    rectangle: "rectangle",
    "round-rectangle": "round-rectangle",
    triangle: "triangle",
    diamond: "diamond",
    pentagon: "pentagon",
    hexagon: "hexagon",
    octagon: "octagon",
    parallelogram: "parallelogram",
    trapezoid: "trapezoid",
    star: "star",
    vee: "vee",
    polygon: "polygon",
    none: "none",
    "other:cross": "cross",
    "other:house": "house",
    "other:man": "man",
    "other:woman": "woman",
    // Cytoscape.js's rounded polygons and barrel, and vis-network's database
    "other:round-triangle": "round-triangle",
    "other:round-diamond": "round-diamond",
    "other:round-pentagon": "round-pentagon",
    "other:round-hexagon": "round-hexagon",
    "other:round-octagon": "round-octagon",
    "other:round-polygon": "round-polygon",
    "other:barrel": "barrel",
    "other:database": "database",
    // Graphviz's cylinder: a box between two ellipses, the near half of the top one drawn across it
    "other:cylinder": "database",
    // vis-network's icon node draws its icon's glyph and no body: drawn as a node with no body, its glyph left out
    "other:icon": "none",
});

/** The element's line pattern for each line style of a file. */
export const LINE_STYLES: ReadonlyMap<string, string> = new Map([
    ["solid", "solid"],
    ["dashed", "dash"],
    ["dotted", "dot"],
    ["dash-dot", "dash-dot"],
    ["zigzag", "zigzag"],
    ["sinewave", "sinewave"],
    ["double", "double"],
    ["long-dash", "dash"],
    // Cytoscape desktop's EDGE_LINE_TYPE strokes
    ["other:forward-slash", "forward-slash"],
    ["other:backward-slash", "backward-slash"],
    ["other:vertical-slash", "vertical-slash"],
    ["other:separate-arrow", "separate-arrow"],
    ["other:contiguous-arrow", "contiguous-arrow"],
]);

/** The element's outline band pattern for each line style of a file an edge's outline can be drawn in. */
export const OUTLINE_STYLES: ReadonlyMap<string, string> = new Map([
    ["solid", "solid"],
    ["dashed", "dash"],
    ["dotted", "dot"],
    ["long-dash", "dash"],
    ["dash-dot", "dash-dot"],
]);

/** The line styles drawn as the nearest pattern rather than exactly. */
export const LINE_STYLES_NEAREST: ReadonlySet<string> = new Set(["long-dash"]);

/** The element's node border style for each border style of a file. */
export const BORDER_STYLES: ReadonlyMap<string, string> = new Map([
    ["solid", "solid"],
    ["dashed", "dashed"],
    ["dotted", "dotted"],
    ["double", "double"],
    ["dash-dot", "dash-dot"],
    ["zigzag", "zigzag"],
    ["sinewave", "sinewave"],
    // Cytoscape desktop's NODE_BORDER_LINE_TYPE strokes, which graph-io's border styles keep as other:
    ["other:zigzag", "zigzag"],
    ["other:sinewave", "sinewave"],
    ["other:forward-slash", "forward-slash"],
    ["other:backward-slash", "backward-slash"],
    ["other:vertical-slash", "vertical-slash"],
    ["other:separate-arrow", "separate-arrow"],
    ["other:contiguous-arrow", "contiguous-arrow"],
]);

/** The border styles drawn as the nearest style rather than exactly: none, since every one has its own. */
export const BORDER_STYLES_NEAREST: ReadonlySet<string> = new Set();

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
    // Cytoscape's HALF_BOTTOM: the half arrow on the line's other side
    ["other:half-bottom", "half-open-flipped"],
    ["inverted", "inverted"],
    // Cytoscape's half circles, vis-network's curves and Cytoscape.js's compound arrows
    ["other:half-circle", "half-circle"],
    ["other:open-half-circle", "open-half-circle"],
    ["other:curve", "curve"],
    ["other:inv-curve", "open-half-circle"],
    ["other:triangle-tee", "triangle-tee"],
    ["other:triangle-cross", "triangle-cross"],
    ["other:circle-triangle", "circle-triangle"],
    ["other:open-square", "open-box"],
    // Graphviz's oinv
    ["other:open-inverted", "open-inverted"],
    // Cytoscape's CROSS_DELTA and CROSS_OPEN_DELTA
    ["other:cross-delta", "cross-delta"],
    ["other:cross-open-delta", "open-cross-delta"],
    // vis-network's image arrow: its picture, standing on the line
    ["other:image", "image"],
    // Cytoscape's arrows the element has no cap for, drawn as the nearest one: Cytoscape.js's chevron is a short vee
    ["other:chevron", "vee"],
]);

/**
 * The element's arrow for an arrow shape a program draws unlike the shape's own cap, per program: Cytoscape desktop
 * strokes its half arrows (HALF_TOP, HALF_BOTTOM) as one thin barb where Graphviz's halfopen is a filled wedge, and
 * vis-network's crow is a vee turned round where Graphviz's is a crow's foot with a tine along the line.
 */
export const TOOL_ARROW_SHAPES: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map(
    Object.entries({
        cytoscape: { half: "half-barb", "other:half-bottom": "half-barb-flipped" },
        "cytoscape-fallbacks": { half: "half-barb", "other:half-bottom": "half-barb-flipped" },
        "vis-network": { crow: "inverted-vee" },
    }).map(([tool, own]) => [tool, new Map([...ARROW_SHAPES, ...Object.entries(own)])]),
);

/**
 * The element's arrow for each arrow shape of a file the program wrote.
 * @param tool - The program, or null when unknown.
 * @returns The table: {@link ARROW_SHAPES} with the program's own drawings in place.
 */
export function arrowShapesOf(tool: string | null): ReadonlyMap<string, string> {
    return (tool === null ? undefined : TOOL_ARROW_SHAPES.get(tool)) ?? ARROW_SHAPES;
}

/**
 * The arrow shapes drawn as the nearest cap rather than exactly: vis-network's
 * inv_curve as an open half circle at the end, where vis-network draws its arc a little back from it, and Cytoscape.js's
 * chevron as a vee.
 */
export const ARROW_SHAPES_NEAREST: ReadonlySet<string> = new Set(["other:inv-curve", "other:chevron"]);
