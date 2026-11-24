/**
 * @file How graph-io's neutral drawing vocabulary is drawn by graphty-element: each node shape, line style, border
 * style and arrow name as the element's own. Every table maps a neutral name to the element's one equivalent, the
 * same for every file: graph-io has already written each program's own spellings as these names.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/** The node shapes the neutral vocabulary names, each drawn as the element's flat shape of the same name. */
const NEUTRAL_SHAPES = [
    "ellipse",
    "rectangle",
    "round-rectangle",
    "triangle",
    "diamond",
    "pentagon",
    "hexagon",
    "octagon",
    "parallelogram",
    "trapezoid",
    "star",
    "vee",
    "polygon",
    // a node with no body, which draws only its label
    "none",
    "cross",
    "house",
    "man",
    "woman",
    "round-triangle",
    "round-diamond",
    "round-pentagon",
    "round-hexagon",
    "round-octagon",
    "round-polygon",
    "barrel",
    "top-round-rectangle",
    "bottom-round-rectangle",
    "database",
] as const;

/** The element's node shape for each neutral node shape: the shape of the same name. */
export const NODE_SHAPES: ReadonlyMap<string, string> = new Map(NEUTRAL_SHAPES.map((shape) => [shape, shape]));

/** The element's line pattern for each neutral line style. */
export const LINE_STYLES: ReadonlyMap<string, string> = new Map([
    ["solid", "solid"],
    ["dashed", "dash"],
    ["dotted", "dot"],
    ["dash-dot", "dash-dot"],
    ["zigzag", "zigzag"],
    ["sinewave", "sinewave"],
    ["double", "double"],
    ["long-dash", "dash"],
    ["forward-slash", "forward-slash"],
    ["backward-slash", "backward-slash"],
    ["vertical-slash", "vertical-slash"],
    ["separate-arrow", "separate-arrow"],
    ["contiguous-arrow", "contiguous-arrow"],
]);

/** The element's outline band pattern for each neutral line style an edge's outline can be drawn in. */
export const OUTLINE_STYLES: ReadonlyMap<string, string> = new Map([
    ["solid", "solid"],
    ["dashed", "dash"],
    ["dotted", "dot"],
    ["long-dash", "dash"],
    ["dash-dot", "dash-dot"],
]);

/** The line styles drawn as the nearest pattern rather than exactly. */
export const LINE_STYLES_NEAREST: ReadonlySet<string> = new Set(["long-dash"]);

/** The element's node border style for each neutral border style. */
export const BORDER_STYLES: ReadonlyMap<string, string> = new Map([
    ["solid", "solid"],
    ["dashed", "dashed"],
    ["dotted", "dotted"],
    ["double", "double"],
    ["dash-dot", "dash-dot"],
    ["zigzag", "zigzag"],
    ["sinewave", "sinewave"],
    ["forward-slash", "forward-slash"],
    ["backward-slash", "backward-slash"],
    ["vertical-slash", "vertical-slash"],
    ["separate-arrow", "separate-arrow"],
    ["contiguous-arrow", "contiguous-arrow"],
]);

/** The element's arrow for each neutral arrow shape. */
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
    ["half-barb", "half-barb"],
    ["half-barb-flipped", "half-barb-flipped"],
    ["inverted-vee", "inverted-vee"],
    ["half-open-flipped", "half-open-flipped"],
    ["half-circle", "half-circle"],
    ["open-half-circle", "open-half-circle"],
    ["curve", "curve"],
    ["triangle-tee", "triangle-tee"],
    ["triangle-cross", "triangle-cross"],
    ["circle-triangle", "circle-triangle"],
    ["open-box", "open-box"],
    ["open-inverted", "open-inverted"],
    ["cross-delta", "cross-delta"],
    ["open-cross-delta", "open-cross-delta"],
    ["image", "image"],
    ["cross", "cross"],
    ["kite", "kite"],
    ["deltoid", "deltoid"],
    ["open-vee", "open-vee"],
    ["stem", "stem"],
    ["slash", "slash"],
]);
