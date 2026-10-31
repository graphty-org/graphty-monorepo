/**
 * The common style format: the neutral description of how a graph file draws its nodes and edges, shared by every
 * format's style reader and writer and by the applications that draw it. Everything here is a type; the runtime
 * vocabulary is in `vocabulary.ts`.
 *
 * Every union below is OPEN: a later version may add members, and a consumer skips a member it does not know
 * (with a note of its own) instead of throwing.
 */

import type { StyleIssueCode } from "./codes.js";

// ============================================================ values

/**
 * A plain value a predicate or a mapping table compares with: a string, a number or a boolean.
 * @category Styles
 */
export type Scalar = string | number | boolean;

/**
 * A canonical color: lowercase `#rrggbb`. Alpha never appears here; it is moved to the property's opacity.
 * @category Styles
 */
export type StyleColor = `#${string}`;

/**
 * Node shapes. A shape the vocabulary has no name for is kept as `other:<the file's spelling>`.
 * @category Styles
 */
export type StyleNodeShape =
    | "ellipse"
    | "rectangle"
    | "round-rectangle"
    | "triangle"
    | "diamond"
    | "pentagon"
    | "hexagon"
    | "octagon"
    | "parallelogram"
    | "trapezoid"
    | "star"
    | "vee"
    | "polygon"
    | "none"
    | `other:${string}`;

/**
 * Node border styles; unknown spellings are kept as `other:<raw>`.
 * @category Styles
 */
export type StyleBorderStyle = "solid" | "dashed" | "dotted" | "dash-dot" | "double" | `other:${string}`;

/**
 * Where a node's border sits against its `width` and `height`: `center` runs the border's middle along them, half
 * in and half out, the way an SVG or canvas stroke is drawn (most programs); `inside` keeps the whole border within
 * them, so the node is drawn no larger than its size (Cytoscape desktop); `outside` draws it wholly beyond them.
 * @category Styles
 */
export type StyleBorderPosition = "inside" | "center" | "outside";

/**
 * Edge line styles; unknown spellings are kept as `other:<raw>`.
 * @category Styles
 */
export type StyleLineStyle =
    "solid" | "dashed" | "dotted" | "dash-dot" | "long-dash" | "double" | "zigzag" | "sinewave" | `other:${string}`;

/**
 * Arrow shapes at either end of an edge; unknown spellings are kept as `other:<raw>`.
 * @category Styles
 */
export type StyleArrowShape =
    | "none"
    | "triangle"
    | "triangle-open"
    | "vee"
    | "tee"
    | "diamond"
    | "diamond-open"
    | "circle"
    | "circle-open"
    | "square"
    | "crow"
    | "half"
    | "inverted"
    | `other:${string}`;

/**
 * The side of its line an arrowhead cut along the line keeps, looking along the line toward the arrowhead's tip.
 * @category Styles
 */
export type StyleArrowSide = "left" | "right";

/**
 * Label font weights.
 * @category Styles
 */
export type StyleLabelWeight = "normal" | "bold";

/**
 * Where a node's label sits relative to the node: `center` in its middle, a side or corner (`top`, `bottom-left`, ...)
 * outside the node beyond that side, and an `inside-` side or corner inside the node against that side, as a group's
 * header label sits along its top.
 * @category Styles
 */
export type StyleLabelPosition =
    | "center"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "inside-top"
    | "inside-bottom"
    | "inside-left"
    | "inside-right"
    | "inside-top-left"
    | "inside-top-right"
    | "inside-bottom-left"
    | "inside-bottom-right";

/**
 * How a label's lines line up with one another: their left edges, their middles or their right edges.
 * @category Styles
 */
export type StyleLabelTextAlign = "left" | "center" | "right";

/**
 * How a node grows to hold its label, when it does: its `width` and `height` are then minimums, and the label's box
 * (as wide as its widest line and as tall as its lines at one `labelSize` each), with `labelPaddingX` and
 * `labelPaddingY` added on each side, decides the rest.
 *
 * - `inside`: the padded box fits inside the node's outline, so an ellipse or a diamond grows past the box's corners
 *   (Graphviz).
 * - `bounds`: the padded box is the node's width and height, whatever its shape (vis-network).
 * @category Styles
 */
export type StyleLabelFit = "inside" | "bounds";

/**
 * The neutral node properties and the type of each value. Lengths are in the unit `FileStyles.units.length`
 * names; opacities are 0..1.
 * @category Styles
 */
export interface NodeStyleValues {
    /** The fill color. */
    readonly fill: StyleColor;
    /**
     * The color a linear gradient fill runs into: the fill is `fill` at the start of the gradient and this at its end.
     * Unset, the fill is flat.
     */
    readonly fillGradient: StyleColor;
    /**
     * Which way a gradient fill runs, in degrees on the screen: 0 from left to right, 90 from top to bottom, 45 from
     * the top-left corner to the bottom-right one. Unset, 0.
     */
    readonly fillGradientAngle: number;
    /**
     * Every color a gradient fill runs through, from its start to its end, `#rrggbb` separated by spaces (Cytoscape.js
     * `background-gradient-stop-colors`), in place of `fill` and `fillGradient` for the gradient. Unset, the gradient
     * runs from `fill` into `fillGradient`.
     */
    readonly fillGradientColors: string;
    /**
     * Where each color of a gradient fill sits, fractions from 0 to 1 separated by spaces, one per color
     * (`fillGradientColors`, else `fill` and `fillGradient`); absent, evenly spaced.
     */
    readonly fillGradientStops: string;
    /** How a gradient fill runs: `linear` across the node (`fillGradientAngle`), or `radial` out from its middle. */
    readonly fillGradientKind: string;
    /** The border (outline) color. */
    readonly borderColor: StyleColor;
    /** The label's text color. */
    readonly labelColor: StyleColor;
    /** The opacity of the fill alone, 0..1 (0 is an unfilled node). */
    readonly fillOpacity: number;
    /** The opacity of the whole node, 0..1. */
    readonly opacity: number;
    /** The opacity of the border alone, 0..1 (0 draws no border). */
    readonly borderOpacity: number;
    /** The width. */
    readonly width: number;
    /** The height. */
    readonly height: number;
    /** The border width (0 is no border). */
    readonly borderWidth: number;
    /** A rounded rectangle's corner radius, in the units of `width` and `height`. */
    readonly cornerRadius: number;
    /** The label's font size. */
    readonly labelSize: number;
    /** The width the label's lines wrap at, in the unit of `width`; unset, a line is as long as its words. */
    readonly labelWrapWidth: number;
    /**
     * Whether a space after each word counts toward `labelWrapWidth`, the last word's too: a line keeps a word only
     * while the word and a space after it still fit, as Cytoscape desktop measures a line (Cytoscape.js does so for
     * every word but a line's last). Unset or false, only the words count, as a browser wraps text.
     */
    readonly labelWrapTrailingSpace: boolean;
    /**
     * Whether a line wider than `labelWrapWidth` is cut to fit with an ellipsis after it, in place of wrapping
     * (Cytoscape.js `text-wrap: ellipsis`). Unset or false, it wraps.
     */
    readonly labelWrapEllipsis: boolean;
    /**
     * Whether a line may break between any two letters, filling each line to `labelWrapWidth`, not only at spaces
     * (Cytoscape.js `text-overflow-wrap: anywhere`). Unset or false, only at spaces.
     */
    readonly labelWrapAnywhere: boolean;
    /**
     * How many blanks one blank between two words counts as when a line is measured against `labelWrapWidth`; it
     * is still drawn once (vis-network joins a line's words and blanks each with a blank, so it counts three).
     * Unset, one.
     */
    readonly labelWrapSpaceCount: number;
    /**
     * Where runs of different sizes in one line of `labelRuns` meet: `baseline` (their alphabetic baselines, the
     * default), `hanging` (their hanging baselines, so their tops line up) or `middle` (their middles).
     */
    readonly labelRunAlign: string;
    /** Whether and how the node grows to hold its label; unset, `width` and `height` are its size. */
    readonly labelFit: StyleLabelFit;
    /** The space between the label's box and the node's sides, left and right each, when it grows to fit the label. */
    readonly labelPaddingX: number;
    /** The space between the label's box and the node's top and bottom, each, when it grows to fit the label. */
    readonly labelPaddingY: number;
    /** Whether a node that grows to fit its label stays as wide as it is tall (a circle, a square). */
    readonly labelFitSquare: boolean;
    /**
     * A length a node that grows to fit its label rounds its padded label box up to a multiple of, each way, before its
     * outline is fitted round it (Graphviz's `quantum`).
     */
    readonly labelFitQuantum: number;
    /** The shape. */
    readonly shape: StyleNodeShape;
    /**
     * A `polygon` node's corners, each as `x,y` relative to the node's center as fractions of its half width and half
     * height, y up, separated by spaces: `"0,1 1,-1 -1,-1"` is a triangle filling the box. A corner past 1 reaches
     * outside the box; a node that grows to hold its label (`labelFit`) then grows as far as its corners reach.
     */
    readonly shapePoints: string;
    /**
     * Whether a `polygon` node's corners are stretched about its center until the farthest on each axis reach its
     * sides (true, the default), or drawn exactly where `shapePoints` puts them (false: OGDF's regular polygons
     * inside the ellipse of the node's box).
     */
    readonly shapePointsStretch: boolean;
    /**
     * Further closed pieces of the node's body beside its outline: polygons written as `shapePoints` is, separated by
     * ";", drawn where they say (never stretched), each filled as the node is and outlined in its border's color and
     * width: Graphviz's `assembly` is two bars, its `noverhang` four.
     */
    readonly shapeParts: string;
    /**
     * Lines drawn over the node in its border's color, as `shapeParts` writes polygons: open polylines (one that ends
     * where it starts is closed), `shapeLineWidth` wide: Graphviz's `promoter` baseline, a `box3d`'s edges.
     */
    readonly shapeLines: string;
    /** How wide `shapeLines` are drawn; unset, the border's width. */
    readonly shapeLineWidth: number;
    /**
     * Further texts drawn on the node in its label's font, size and color, each one line centered on its point: a JSON
     * list of `[x, y, text]`, the point as `shapeParts` writes one (Graphviz's record fields, `[[-0.5, 0, "a"], [0.5,
     * 0, "b"]]`).
     */
    readonly shapeTexts: string;
    /** The border's line style. */
    readonly borderStyle: StyleBorderStyle;
    /** Where the border sits against the node's width and height. */
    readonly borderPosition: StyleBorderPosition;
    /**
     * How far a zigzag or sine-wave border swings to either side of the ring's middle (a length; Cytoscape desktop's
     * strokes swing 10 px). With it, `borderWidth` is the thickness of the waving line.
     */
    readonly borderWaveAmplitude: number;
    /** How far round the node a zigzag or sine-wave border runs before it repeats (a length; Cytoscape's: 20 px). */
    readonly borderWavePeriod: number;
    /** A second ring's color, drawn outside the border (Cytoscape.js `outline-color`). */
    readonly outerBorderColor: StyleColor;
    /** That ring's width (a length; Cytoscape.js `outline-width`); 0 or absent draws none. */
    readonly outerBorderWidth: number;
    /** That ring's opacity, 0..1. */
    readonly outerBorderOpacity: number;
    /** That ring's line style. */
    readonly outerBorderStyle: StyleBorderStyle;
    /**
     * How far beyond the border's outer edge that ring starts (a length). Cytoscape.js draws its outline half its
     * `outline-offset` out, so that is what is read.
     */
    readonly outerBorderOffset: number;
    /**
     * How many such rings are drawn, each `outerBorderOffset` beyond the one before (Graphviz's `peripheries` less the
     * node's own outline); absent, one.
     */
    readonly outerBorderCount: number;
    /**
     * The color of a filled shape drawn beneath the node, `underlayPadding` beyond its box on every side (Cytoscape.js
     * `underlay-*`); drawn only with an `underlayOpacity` above 0.
     */
    readonly underlayColor: StyleColor;
    /** The opacity of the underlay, 0..1; 0 draws none. */
    readonly underlayOpacity: number;
    /** How far beyond the node's box the underlay reaches on every side (a length). */
    readonly underlayPadding: number;
    /** The underlay's shape; absent, the node's own. */
    readonly underlayShape: StyleNodeShape;
    /** The largest radius of a rounded underlay's corners (a length). */
    readonly underlayCornerRadius: number;
    /** The color of the same filled shape drawn over the node (Cytoscape.js `overlay-*`). */
    readonly overlayColor: StyleColor;
    /** The opacity of the overlay, 0..1; 0 draws none. */
    readonly overlayOpacity: number;
    /** How far beyond the node's box the overlay reaches on every side (a length). */
    readonly overlayPadding: number;
    /** The overlay's shape; absent, the node's own. */
    readonly overlayShape: StyleNodeShape;
    /** The largest radius of a rounded overlay's corners (a length). */
    readonly overlayCornerRadius: number;
    /** The label text, as the tool draws it. */
    readonly label: string;
    /**
     * The label drawn in runs of styles of their own (a program's rich text: vis-network's multi-font labels), as a
     * JSON array of runs left to right, each `{ "text": string, "weight"?: "bold", "italic"?: true, "font"?: string,
     * "size"?: number, "color"?: "#rrggbb", "shift"?: number }`; a run's `text` may hold line breaks. A run gives only
     * what differs from the label's own font (`labelFont`, `labelSize` in the unit of `width`, `labelColor`,
     * `labelWeight`, `labelItalic`); `shift` is how far below the label's line the run is drawn, in the unit of its
     * size (negative: above). Its words, run after run, are `label`. Unset, the label is drawn in its own font
     * throughout.
     */
    readonly labelRuns: string;
    /** The tooltip text. */
    readonly tooltip: string;
    /** The label's font family, as the file names it. */
    readonly labelFont: string;
    /** The label's font weight. */
    readonly labelWeight: StyleLabelWeight;
    /** Whether the label is italic. */
    readonly labelItalic: boolean;
    /** Where the label sits relative to the node. */
    readonly labelPosition: StyleLabelPosition;
    /** How the label's lines line up with one another: `left`, `center` (the default) or `right`. */
    readonly labelTextAlign: StyleLabelTextAlign;
    /** How far right of where `labelPosition` puts it the label is drawn (a length). */
    readonly labelOffsetX: number;
    /** How far down from where `labelPosition` puts it the label is drawn (a length). */
    readonly labelOffsetY: number;
    /**
     * How far right the label is drawn again, as a fraction of its own width: -0.5 puts its right edge where its middle
     * was. With `labelPosition` `center` and the offsets, it pins any point of the label's box to any point of the
     * node's (Cytoscape desktop's label positions). Measured along the label's own axes, turned by `labelRotation`, so a
     * turned label turns about the point the shift pins, as Cytoscape and Pajek turn a label about its anchor.
     */
    readonly labelShiftX: number;
    /** How far down the label is drawn again, as a fraction of its own height; see `labelShiftX`. */
    readonly labelShiftY: number;
    /** The opacity of the label's words, 0..1. */
    readonly labelOpacity: number;
    /**
     * The label is not drawn while its letters are drawn smaller than this many screen pixels: a screen size, not a
     * length, so it is never scaled with the file's lengths (vis-network's `scaling.label.drawThreshold`). Unset, the
     * label is drawn at any size.
     */
    readonly labelMinScreenSize: number;
    /**
     * Whether the label is left out where it would overlap the label of another node drawn before it, the larger label
     * (then the larger node) first, as Gephi's Preview (`node.label.avoidOverlap`) thins out labels. Unset or false,
     * the label is drawn wherever it falls.
     */
    readonly labelAvoidOverlap: boolean;
    /**
     * The label is not drawn while its node is drawn smaller than this many screen pixels across (the smaller of its
     * width and height): a screen size, not a length, so it is never scaled with the file's lengths (sigma.js's
     * `labelRenderedSizeThreshold`, a radius of 6 px). Unset, the node's size never hides its label.
     */
    readonly labelMinNodeScreenSize: number;
    /**
     * The node labels are thinned by a grid of square cells this many px across, laid over the drawing as the program
     * first frames it in its canvas (its positions fitted to the canvas): each cell draws the label of its largest node
     * only (then the lesser id), and more of them as the view zooms in, n x n times as many at n times the zoom
     * (sigma.js's `labelGridCellSize`, `labelDensity` 1). Unset, no grid thins the labels.
     */
    readonly labelGridCellSize: number;
    /**
     * Whether the label is drawn over every node and edge, as sigma.js draws its labels on a layer of their own; unset
     * or false, a nearer node may cover it.
     */
    readonly labelOnTop: boolean;
    /** How far the label is turned, in degrees clockwise on screen, 0 up to 360. */
    readonly labelRotation: number;
    /** The color of a box drawn behind the label's text (vis-network `font.background`). */
    readonly labelBackground: StyleColor;
    /** The opacity of that box, 0..1. */
    readonly labelBackgroundOpacity: number;
    /** The color of an outline drawn round each letter of the label (vis-network `font.strokeColor`). */
    readonly labelOutlineColor: StyleColor;
    /**
     * How thick that outline is, a stroke centered on the letters' edges, in the units of `labelSize`; 0 draws none
     * (vis-network `font.strokeWidth`).
     */
    readonly labelOutlineWidth: number;
    /** The color of a line drawn round the box behind the label's words (yEd `lineColor`). */
    readonly labelBorderColor: StyleColor;
    /** How thick that line is, in the units of `labelSize`; 0 draws none. */
    readonly labelBorderWidth: number;
    /** How opaque the outline round the label's letters is, from 0 (none) to 1, over its color. Unset, 1. */
    readonly labelOutlineOpacity: number;
    /** How opaque the line round the box behind the label's words is, from 0 (none) to 1, over its color. Unset, 1. */
    readonly labelBorderOpacity: number;
    /**
     * How far the box behind the label's words (its background and border) reaches past the words' line box on every
     * side, in the units of `labelSize`; 0 puts the border against the words. Unset, the drawing program's default.
     */
    readonly labelPadding: number;
    /** How far the corners of the box behind the label's words are rounded, in the units of `labelSize`. Unset, square. */
    readonly labelCornerRadius: number;
    /** How tall one line of the label is, as a multiple of its font's ascent plus descent. Unset, 1.2. */
    readonly labelLineHeight: number;
    /** The URI of an image drawn on the node. */
    readonly image: string;
    /**
     * How the image is sized against the node: `contain` (keeps its proportions inside the node), `cover` (keeps them
     * over the whole node), `fill` (stretched to the node), or `none` (`imageWidth` x `imageHeight`, else its own
     * pixels, one length each). Unset, `contain`.
     */
    readonly imageFit: string;
    /** The image drawn instead when `image` cannot be loaded (vis-network's `brokenImage`). */
    readonly imageFallback: string;
    /** The image's width where `imageFit` is `none` (a length); with only `imageHeight`, its proportions decide. */
    readonly imageWidth: number;
    /** The image's height where `imageFit` is `none` (a length). */
    readonly imageHeight: number;
    /** Where the image sits across the room the node leaves it, 0 (left) to 1 (right); unset, 0.5. */
    readonly imagePositionX: number;
    /** Where the image sits up and down the room the node leaves it, 0 (top) to 1 (bottom); unset, 0.5. */
    readonly imagePositionY: number;
    /** How far right the image is moved from there (a length). */
    readonly imageOffsetX: number;
    /** How far down the image is moved from there (a length). */
    readonly imageOffsetY: number;
    /** Whether the image is tiled: `no-repeat` (unset), `repeat`, `repeat-x` or `repeat-y`. */
    readonly imageRepeat: string;
    /** `node` (unset) keeps the image inside the node's outline; `none` lets it reach past. */
    readonly imageClip: string;
    /** Whether the image's pixels are smoothed when it is scaled; false draws them as squares. Unset, true. */
    readonly imageSmoothing: boolean;
    /**
     * How an image whose `imageFit` is `none` fills the side `imageWidth` or `imageHeight` leaves unset: `proportional`
     * (unset) keeps its proportions to the side given; `natural` draws it at its own pixels (Cytoscape.js's `auto`).
     */
    readonly imageAutoSize: string;
    /** The image's opacity, 0..1. */
    readonly imageOpacity: number;
    /**
     * A character or short text drawn over the node, centered on it (vis-network's icon nodes: an icon font's
     * glyph), in `glyphFont` (a CSS font family) at `glyphSize` (the font's size, in the units of `width`),
     * `glyphWeight` and `glyphColor`.
     */
    readonly glyph: string;
    /** The glyph's CSS font family. */
    readonly glyphFont: string;
    /** The glyph's font size, in the units of `width`. */
    readonly glyphSize: number;
    /** The glyph's weight. */
    readonly glyphWeight: StyleLabelWeight;
    /** The glyph's color. */
    readonly glyphColor: string;
    /**
     * The colors of a pie chart drawn over the node, one slice each, `#rrggbb` separated by spaces (Cytoscape.js
     * `pie-N-background-color`, Graphviz `style=wedged`).
     */
    readonly pieColors: string;
    /** Each slice's share of the turn, fractions separated by spaces; a slice with none shares what is left. */
    readonly pieSizes: string;
    /** Each slice's opacity, 0..1 separated by spaces; unset, 1. */
    readonly pieOpacities: string;
    /** The pie's radius as a fraction of half the node's shorter side; unset, 1. */
    readonly pieRadius: number;
    /** The hole in the pie's middle as a fraction of its radius (a ring chart); unset, 0. */
    readonly pieHole: number;
    /** Where the first slice starts, in degrees clockwise from 12 o'clock; the slices run clockwise. */
    readonly pieRotation: number;
    /** Whether the pie fills the node's box as an ellipse rather than a circle (Graphviz's wedged ellipse). */
    readonly pieFitBox: boolean;
    /** How far right of the node's center the pie's center is (a length; Cytoscape's chart positions). */
    readonly pieOffsetX: number;
    /** How far down from the node's center the pie's center is (a length). */
    readonly pieOffsetY: number;
    /**
     * The colors of bands drawn over the node inside its outline, `#rrggbb` separated by spaces (Cytoscape.js
     * `stripe-N-background-color`, Graphviz `style=striped`).
     */
    readonly stripeColors: string;
    /** Each band's share of the node, fractions separated by spaces; a band with none shares what is left. */
    readonly stripeSizes: string;
    /** Each band's opacity, 0..1 separated by spaces; unset, 1. */
    readonly stripeOpacities: string;
    /** Which way the bands follow one another: `down` (unset, top to bottom) or `right` (left to right). */
    readonly stripeDirection: string;
    /** The size of the box the bands fill, as a fraction of the node's; unset, 1. */
    readonly stripeSize: number;
    /**
     * A chart drawn over the node (Cytoscape's bar, line, box and heat map charts): `bar` (bars side by side),
     * `stacked-bar` (the values piled into one bar), `line`, `box` (the values are the low whisker, the lower
     * quartile, the median, the upper quartile and the high whisker) or `cells` (a row of colored cells).
     */
    readonly chartKind: string;
    /** The chart's values, numbers separated by spaces, in the order they are drawn. */
    readonly chartValues: string;
    /** The chart's colors, `#rrggbb` separated by spaces: item i in color i, the last color for the rest. */
    readonly chartColors: string;
    /** The value at the start of the chart's value axis; unset, the smaller of 0 and the least value. */
    readonly chartMin: number;
    /** The value at the end of the chart's value axis; unset, the greatest value. */
    readonly chartMax: number;
    /** Whether the values run left to right (true) or bottom to top (unset); the categories run the other way. */
    readonly chartHorizontal: boolean;
    /** The size of the chart's plot box, as a fraction of the node's; unset, 1. */
    readonly chartSize: number;
    /** The width of the chart's plot box, as a fraction of the node's width; unset, `chartSize`. */
    readonly chartWidth: number;
    /** The height of the chart's plot box, as a fraction of the node's height; unset, `chartSize`. */
    readonly chartHeight: number;
    /** How far right of the node's middle the plot box's middle is (a length); unset, 0. */
    readonly chartOffsetX: number;
    /** How far down from the node's middle the plot box's middle is (a length); unset, 0. */
    readonly chartOffsetY: number;
    /** How much of the category side is left empty at each end, as a fraction of it; unset, 0. */
    readonly chartMargin: number;
    /** How much of the category side is left between the categories in all, as a fraction of it; unset, 0. */
    readonly chartGap: number;
    /** How wide the chart draws a line and a whisker (a length). */
    readonly chartLineWidth: number;
    /** The color of a bar's and a box's outline. */
    readonly chartBorderColor: StyleColor;
    /** How wide a bar's and a box's outline is (a length); unset, none. */
    readonly chartBorderWidth: number;
    /**
     * How far a group drawn round its members (a node other nodes name as their parent, with no box of its own) reaches
     * past their box on every side (a length; Cytoscape.js `padding` on a compound parent). Unset, the reader's own.
     */
    readonly groupPadding: number;
    /**
     * That padding as a fraction of the members' box instead, measured as `groupPaddingOf` says (Cytoscape.js
     * `padding: 20%`); it wins over `groupPadding`.
     */
    readonly groupPaddingRatio: number;
    /**
     * What `groupPaddingRatio` is a fraction of: the members' box's `width`, `height`, `average` of the two, `min` or
     * `max` (Cytoscape.js `padding-relative-to`); unset, `width`.
     */
    readonly groupPaddingOf: string;
    /** The narrowest the members' box is drawn, before the padding (a length; Cytoscape.js `min-width`). */
    readonly groupMinWidth: number;
    /** The shortest the members' box is drawn, before the padding (a length; Cytoscape.js `min-height`). */
    readonly groupMinHeight: number;
    /**
     * The share, 0..1, of the width `groupMinWidth` adds that goes on the left (Cytoscape.js `min-width-bias-left`
     * against `min-width-bias-right`); unset, half.
     */
    readonly groupMinWidthBiasLeft: number;
    /**
     * The share, 0..1, of the height `groupMinHeight` adds that goes on top, as the reader sees it (Cytoscape.js
     * `min-height-bias-top` against `min-height-bias-bottom`); unset, half.
     */
    readonly groupMinHeightBiasTop: number;
    /** Whether the members' labels count in the members' box (Cytoscape.js `compound-sizing-wrt-labels`). */
    readonly groupIncludeLabels: boolean;
    /** Whether the node is drawn at all. */
    readonly visible: boolean;
}

/**
 * The neutral edge properties and the type of each value.
 * @category Styles
 */
export interface EdgeStyleValues {
    /** The line color. */
    readonly color: StyleColor;
    /** The color of the arrow at the source end. */
    readonly sourceArrowColor: StyleColor;
    /** The color of the arrow at the target end. */
    readonly targetArrowColor: StyleColor;
    /** The label's text color. */
    readonly labelColor: StyleColor;
    /** The opacity of the whole edge, 0..1. */
    readonly opacity: number;
    /**
     * How much wider than the line a band drawn under it is (a length, half of it each side; Cytoscape.js
     * `line-outline-width`, vis-network `background.size` less the line's width); 0 or absent draws none.
     */
    readonly outlineWidth: number;
    /** The color of that band. */
    readonly outlineColor: StyleColor;
    /** The opacity of that band, 0..1. */
    readonly outlineOpacity: number;
    /** The pattern that band is drawn in (vis-network `background.dashes`); unset, solid. */
    readonly outlineStyle: StyleLineStyle;
    /**
     * The color of a band drawn beneath the line along its whole length, `underlayPadding` either side of the line's
     * middle whatever its width (Cytoscape.js `underlay-*`); drawn only with an `underlayOpacity` above 0.
     */
    readonly underlayColor: StyleColor;
    /** The opacity of that band, 0..1; 0 draws none. */
    readonly underlayOpacity: number;
    /** How far either side of the line's middle the band reaches (a length). */
    readonly underlayPadding: number;
    /** The color of the same band drawn over the line (Cytoscape.js `overlay-*`). */
    readonly overlayColor: StyleColor;
    /** The opacity of the band over the line, 0..1; 0 draws none. */
    readonly overlayOpacity: number;
    /** How far either side of the line's middle the band over it reaches (a length). */
    readonly overlayPadding: number;
    /**
     * The colors a line painted in a gradient runs through, `#rrggbb` separated by spaces (Cytoscape.js
     * `line-gradient-stop-colors`); see `gradientKind`.
     */
    readonly gradientColors: string;
    /** Where each gradient color sits, fractions from 0 to 1 separated by spaces; absent, evenly spaced. */
    readonly gradientStops: string;
    /**
     * How the line's gradient runs: `linear` from the source end to the target end, `radial` out from the line's
     * middle, or `none` for a line in its `color` (Cytoscape.js `line-fill`).
     */
    readonly gradientKind: string;
    /** The line width. */
    readonly width: number;
    /**
     * The fewest screen pixels wide the line is drawn, whatever its `width` comes to on screen (0 included): a screen
     * size, not a length, so it is never scaled with the file's lengths (sigma.js's `minEdgeThickness`). Unset, the
     * line is drawn at its width alone.
     */
    readonly minScreenWidth: number;
    /** The label's font size. */
    readonly labelSize: number;
    /** The arrow size as a factor: 1 is the writing tool's normal size. With `sourceArrowSize`, the target's alone. */
    readonly arrowSize: number;
    /** The source end's arrow size, where the file sizes it apart from the target's: a factor as `arrowSize` is. */
    readonly sourceArrowSize: number;
    /**
     * How long the source arrowhead is along its line, as a fraction of its shape's normal length in the writing
     * tool: Cytoscape's DELTA_SHORT_1 is a `triangle` half as long as its DELTA (0.5).
     */
    readonly sourceArrowLength: number;
    /** How long the target arrowhead is, as `sourceArrowLength` says. */
    readonly targetArrowLength: number;
    /**
     * How wide the source arrowhead is across its line, as a fraction of its shape's normal width in the writing
     * tool: Cytoscape's ARROW_SHORT is a `vee` 0.8 as wide as its ARROW.
     */
    readonly sourceArrowWidth: number;
    /** How wide the target arrowhead is, as `sourceArrowWidth` says. */
    readonly targetArrowWidth: number;
    /**
     * How far from its node the source arrowhead is drawn, the line stopping there too, as a multiple of the
     * arrowhead's own length along its line: Cytoscape desktop draws its T bar 4 of its lengths off the node. Unset or
     * 0, the arrowhead touches the node.
     */
    readonly sourceArrowGap: number;
    /** How far from its node the target arrowhead is drawn, as `sourceArrowGap` says. */
    readonly targetArrowGap: number;
    /**
     * The side of its line the source arrowhead is drawn on alone, cut along the line: `left` or `right` looking along
     * the line toward the arrowhead's tip (Graphviz's `l` and `r` arrow modifiers: `lcrow`, `rdiamond`). Unset, the
     * whole arrowhead.
     */
    readonly sourceArrowSide: StyleArrowSide;
    /** The side of its line the target arrowhead is drawn on alone, as `sourceArrowSide` says. */
    readonly targetArrowSide: StyleArrowSide;
    /**
     * More arrowheads drawn in a row behind the source arrowhead, nearest first, each from where the one before it
     * ends, the line stopping at the last (Graphviz's `boxdotnormal`, `lteeoldiamond`): arrow shapes separated by
     * spaces, each optionally followed by `:left` or `:right` for the side it keeps alone (`circle triangle`,
     * `diamond-open:left`). Unset, the arrowhead alone.
     */
    readonly sourceArrowParts: string;
    /** More arrowheads drawn in a row behind the target arrowhead, as `sourceArrowParts` says. */
    readonly targetArrowParts: string;
    /**
     * Where along the line each arrowhead is drawn, as a fraction of the line measured from the arrow's own end: 0 (the
     * default) at the end, 0.5 at the middle, at most 1.
     */
    readonly arrowPosition: number;
    /** The line style. */
    readonly lineStyle: StyleLineStyle;
    /**
     * How far a zigzag or sine-wave line swings to either side of its path (a length; Cytoscape desktop's strokes
     * swing 10 px). With it, `width` is the thickness of the waving line.
     */
    readonly waveAmplitude: number;
    /** How far along its path a zigzag or sine-wave line runs before it repeats (a length; Cytoscape's: 20 px). */
    readonly wavePeriod: number;
    /** The arrow at the source end. */
    readonly sourceArrow: StyleArrowShape;
    /** The arrow at the target end. */
    readonly targetArrow: StyleArrowShape;
    /**
     * An arrow drawn at the middle of the line pointing toward the target, besides any at the ends (Cytoscape.js
     * `mid-target-arrow-shape`, vis-network `arrows.middle`), sized as the target's arrow is.
     */
    readonly midTargetArrow: StyleArrowShape;
    /** An arrow drawn at the middle of the line pointing toward the source (Cytoscape.js `mid-source-arrow-shape`). */
    readonly midSourceArrow: StyleArrowShape;
    /** The color of the arrow at the middle pointing toward the target. */
    readonly midTargetArrowColor: StyleColor;
    /** The color of the arrow at the middle pointing toward the source. */
    readonly midSourceArrowColor: StyleColor;
    /**
     * The picture an `other:image` target arrow draws, a URL or a data URL (vis-network `arrows.to.src` of type
     * `image`), standing on its line with its top edge across the arrow's point.
     */
    readonly targetArrowImage: string;
    /** The picture an `other:image` source arrow draws, as `targetArrowImage` says. */
    readonly sourceArrowImage: string;
    /** The picture an `other:image` middle arrow pointing toward the target draws, as `targetArrowImage` says. */
    readonly midTargetArrowImage: string;
    /** How wide across its line an image target arrow is drawn (vis-network `imageWidth`); absent, its picture's own. */
    readonly targetArrowImageWidth: number;
    /** How long along its line an image target arrow is drawn (vis-network `imageHeight`); absent, its picture's own. */
    readonly targetArrowImageHeight: number;
    /** How wide an image source arrow is drawn, as `targetArrowImageWidth` says. */
    readonly sourceArrowImageWidth: number;
    /** How long an image source arrow is drawn, as `targetArrowImageHeight` says. */
    readonly sourceArrowImageHeight: number;
    /** How wide an image middle arrow is drawn, as `targetArrowImageWidth` says. */
    readonly midTargetArrowImageWidth: number;
    /** How long an image middle arrow is drawn, as `targetArrowImageHeight` says. */
    readonly midTargetArrowImageHeight: number;
    /** Whether the edge is drawn curved. */
    readonly curved: boolean;
    /**
     * The points the edge's route passes through between its two nodes, each as `along,across` relative to the line
     * from the source node's center to the target's (`along` the fraction of the way along it, `across` the distance
     * to its left, y up, as a fraction of its length), separated by spaces: `"0,-0.5 1,-0.5"`. Drawn as straight
     * segments through them, with rounded corners when `curved`. A self-loop has no line between two centers, so its
     * points are written as `sourcePort` is, relative to its node's center and size.
     */
    readonly bends: string;
    /**
     * How far apart, at their middle, neighboring curved edges between the same two nodes are drawn (a length).
     */
    readonly fanSpacing: number;
    /**
     * Whether a curved edge is spread apart from the other curved edges between the same two nodes (true), or drawn
     * as its own curve, bowing to the left of its direction whatever its siblings are (false, as Gephi draws them).
     */
    readonly fanned: boolean;
    /**
     * How a curved edge is drawn through its bends: `"corners"`, straight through each bend with its corner rounded,
     * or `"midpoints"`, one smooth curve using the bends as control points, from the middle of each segment to the
     * next and leaving each end along its first and last segments (Cytoscape desktop), or `"bezier"`, one Bezier curve
     * whose control points are the bends (one: quadratic, two: cubic; vis-network's smooth edges), or `"arc"`, the arc
     * of the circle through both ends and the one bend, which lies on it (yEd's arc edge).
     */
    readonly bendCurve: string;
    /**
     * A curved edge drawn as an arc of the circle through both node centers, whose radius is this many times the
     * distance between them (Gephi: the distance over its arc curveness 1.2).
     */
    readonly arcRadius: number;
    /**
     * A curved edge drawn as one quadratic curve through a support point a force simulation places among the nodes,
     * wherever they are: `"barnesHut"` or `"forceAtlas2"`, the force law it settles under (vis-network's dynamic smooth
     * edges, under its solvers of those names). Tied to the edge's two nodes by two springs, pushed away by every node
     * and every other support point, pulled toward the middle of the nodes; the numbers below are in the file's units.
     */
    readonly supportModel: string;
    /** The rest length of a support point's two springs together (a length). */
    readonly supportSpringLength: number;
    /** How hard a support point's springs pull per unit they are stretched. */
    readonly supportSpringConstant: number;
    /**
     * How hard every node and every other support point push a support point away: over the distance squared under
     * barnesHut, over the distance under forceAtlas2.
     */
    readonly supportRepulsion: number;
    /** How hard a support point is pulled toward the middle of the nodes: a constant pull under barnesHut, in proportion to the distance under forceAtlas2. */
    readonly supportCentralGravity: number;
    /**
     * What unit a support point's numbers are in: absent, the file's own; `"drawing"`, the drawing's, the size at which
     * the forces hold the drawn nodes in balance, for a file the program lays out itself under the same forces
     * (vis-network's physics, on a file that does not place every node), so a curve bows among the nodes another
     * layout places as among the program's.
     */
    readonly supportScale: string;
    /**
     * How far from each of its nodes' outlines the edge's line (and its arrowhead) stops, leaving that much empty
     * (a length; Gephi's `edge.radius`).
     */
    readonly nodeGap: number;
    /** How far from its source node's outline the edge's line stops, over `nodeGap` at that end (a length). */
    readonly sourceNodeGap: number;
    /** How far from its target node's outline the line (and its arrowhead) stops; see `sourceNodeGap`. */
    readonly targetNodeGap: number;
    /**
     * Where the edge leaves its source node, when not at its center: `x,y` relative to the node's center as fractions
     * of its half width and half height, y up (`"1,0"` is the middle of its right side, `"0,1"` of its top), so the
     * point stays on the same spot of the node at any size. The line runs from that point instead of from where the
     * line from the center crosses the node's outline.
     */
    readonly sourcePort: string;
    /** Where the edge meets its target node, when not at its center: written as `sourcePort` is. */
    readonly targetPort: string;
    /** The label text. */
    readonly label: string;
    /**
     * The label drawn in runs of styles of their own (a program's rich text: vis-network's multi-font labels), as a
     * JSON array of runs left to right, each `{ "text": string, "weight"?: "bold", "italic"?: true, "font"?: string,
     * "size"?: number, "color"?: "#rrggbb" }`; a run's `text` may hold line breaks. A run gives only what differs
     * from the label's own font (`labelFont`, `labelSize`, `labelColor`, `labelWeight`,
     * `labelItalic`). Its words, run after run, are `label`. Unset, the label is drawn in its own font throughout.
     */
    readonly labelRuns: string;
    /** The tooltip text. */
    readonly tooltip: string;
    /** The label's font family. */
    readonly labelFont: string;
    /** The label's font weight. */
    readonly labelWeight: StyleLabelWeight;
    /** How the label's lines line up with one another; see the node's. */
    readonly labelTextAlign: StyleLabelTextAlign;
    /** Whether the label is italic. */
    readonly labelItalic: boolean;
    /** The width the label's lines wrap at (a length); see the node's. */
    readonly labelWrapWidth: number;
    /** Whether a line wider than `labelWrapWidth` is cut with an ellipsis; see the node's. */
    readonly labelWrapEllipsis: boolean;
    /** Whether a line may break between any two letters; see the node's. */
    readonly labelWrapAnywhere: boolean;
    /** How many blanks a blank between two words counts as against `labelWrapWidth`; see the node's. */
    readonly labelWrapSpaceCount: number;
    /**
     * Where runs of different sizes in one line of `labelRuns` meet: `baseline` (their alphabetic baselines, the
     * default), `hanging` (their hanging baselines, so their tops line up) or `middle` (their middles).
     */
    readonly labelRunAlign: string;
    /** Where the label sits against the line's middle: `center` on the line, `top` above it. */
    readonly labelPosition: StyleLabelPosition;
    /** How far right of where `labelPosition` puts it the label is drawn (a length). */
    readonly labelOffsetX: number;
    /** How far down from where `labelPosition` puts it the label is drawn (a length). */
    readonly labelOffsetY: number;
    /** How far right the label is drawn again, as a fraction of its own width; see the node's. */
    readonly labelShiftX: number;
    /** How far down the label is drawn again, as a fraction of its own height; see the node's. */
    readonly labelShiftY: number;
    /** The opacity of the label's words, 0..1. */
    readonly labelOpacity: number;
    /** How far the label is turned, in degrees clockwise on screen, 0 up to 360; see the node's. */
    readonly labelRotation: number;
    /** The color of a box drawn behind the label's text; see the node's. */
    readonly labelBackground: StyleColor;
    /** The opacity of that box, 0..1. */
    readonly labelBackgroundOpacity: number;
    /** The color of an outline drawn round each letter of the label; see the node's. */
    readonly labelOutlineColor: StyleColor;
    /** How thick that outline is, in the units of `labelSize`; 0 draws none. */
    readonly labelOutlineWidth: number;
    /** The color of a line drawn round the box behind the label's words (yEd `lineColor`). */
    readonly labelBorderColor: StyleColor;
    /** How thick that line is, in the units of `labelSize`; 0 draws none. */
    readonly labelBorderWidth: number;
    /** How opaque the outline round the label's letters is, from 0 (none) to 1, over its color. Unset, 1. */
    readonly labelOutlineOpacity: number;
    /** How opaque the line round the box behind the label's words is, from 0 (none) to 1, over its color. Unset, 1. */
    readonly labelBorderOpacity: number;
    /**
     * How far the box behind the label's words (its background and border) reaches past the words' line box on every
     * side, in the units of `labelSize`; 0 puts the border against the words. Unset, the drawing program's default.
     */
    readonly labelPadding: number;
    /** How far the corners of the box behind the label's words are rounded, in the units of `labelSize`. Unset, square. */
    readonly labelCornerRadius: number;
    /** How tall one line of the label is, as a multiple of its font's ascent plus descent. Unset, 1.2. */
    readonly labelLineHeight: number;
    /** The label text at the source end. */
    readonly sourceLabel: string;
    /** The label text at the target end. */
    readonly targetLabel: string;
    /**
     * Where the source end's label sits: its middle on the line, this far along it from where the line leaves the
     * source node (a length; Cytoscape.js `source-text-offset`). Absent, beside the end as the reader places it.
     */
    readonly sourceLabelOffset: number;
    /** Where the target end's label sits, as `sourceLabelOffset` says, from where the line meets the target node. */
    readonly targetLabelOffset: number;
    /**
     * How far the source end's label is moved right of where it sits, on the screen (a length; Cytoscape.js
     * `source-text-margin-x`).
     */
    readonly sourceLabelOffsetX: number;
    /** How far the source end's label is moved down, on the screen (a length; `source-text-margin-y`). */
    readonly sourceLabelOffsetY: number;
    /** How far the target end's label is moved right, on the screen (a length; `target-text-margin-x`). */
    readonly targetLabelOffsetX: number;
    /** How far the target end's label is moved down, on the screen (a length; `target-text-margin-y`). */
    readonly targetLabelOffsetY: number;
    /** How far the source end's label is turned, in degrees clockwise about its middle; unset, level. */
    readonly sourceLabelRotation: number;
    /** How far the target end's label is turned, in degrees clockwise about its middle; unset, level. */
    readonly targetLabelRotation: number;
    /** The source end's label's font size, in the units of `labelSize`; unset, the label's (`labelSize`). */
    readonly sourceLabelSize: number;
    /** The target end's label's font size; see `sourceLabelSize`. */
    readonly targetLabelSize: number;
    /** The color of the source end's label's words; unset, the label's (`labelColor`). */
    readonly sourceLabelColor: StyleColor;
    /** The color of the target end's label's words; see `sourceLabelColor`. */
    readonly targetLabelColor: StyleColor;
    /** The source end's label's font family, as the file names it; unset, the label's (`labelFont`). */
    readonly sourceLabelFont: string;
    /** The target end's label's font family; see `sourceLabelFont`. */
    readonly targetLabelFont: string;
    /** The label is not drawn while its letters are drawn smaller than this many screen pixels; see the node's. */
    readonly labelMinScreenSize: number;
    /** Whether the label is drawn over every node and edge; see the node's. */
    readonly labelOnTop: boolean;
    /** Whether the edge is drawn at all. */
    readonly visible: boolean;
}

/**
 * The neutral properties of the graph as a whole.
 * @category Styles
 */
export interface GraphStyleValues {
    /** The background color. */
    readonly background: StyleColor;
}

/**
 * A property only graphty draws, carried as `graphty:<channel>` so a file graphty wrote keeps it; other programs
 * never see it.
 * @category Styles
 */
export type GraphtyStyleProperty = `graphty:${string}`;

/**
 * A node property name.
 * @category Styles
 */
export type NodeStyleProperty = keyof NodeStyleValues | GraphtyStyleProperty;

/**
 * An edge property name.
 * @category Styles
 */
export type EdgeStyleProperty = keyof EdgeStyleValues | GraphtyStyleProperty;

/**
 * A node or edge property name.
 * @category Styles
 */
export type StyleProperty = NodeStyleProperty | EdgeStyleProperty;

/**
 * A graph property name.
 * @category Styles
 */
export type GraphStyleProperty = keyof GraphStyleValues;

/**
 * One canonical style value: a color, a number, an enumeration value, a text or a boolean.
 * @category Styles
 */
export type StyleValue = string | number | boolean;

/**
 * Which part of the graph a rule or a note is about.
 * @category Styles
 */
export type StyleTarget = "node" | "edge";

/**
 * The graph's own style values.
 * @category Styles
 */
export type GraphStyle = Partial<GraphStyleValues>;

// ============================================================ dialects and tools

/**
 * How a file spells its style values, which decides how a color name, a number or a shape is read. One line per
 * value; the union is open.
 * @category Styles
 */
export type StyleDialect =
    /** CSS colors (names, `#rgb`, `rgb()`, `hsl()`) and CSS-like lengths: vis.js, sigma, most hand-made JSON. */
    | "css"
    /** X11 color names (`gray` is `#bebebe`). */
    | "x11"
    /** Graphviz: X11 and SVG names, color schemes and `/scheme/name`, `#rrggbbaa`, HSV triples, inches. */
    | "graphviz"
    /** Java's `java.awt.Color` names and `#rrggbb`. */
    | "java"
    /** The dvips CMYK color names Pajek uses (`Red`, `CadetBlue`). */
    | "dvips"
    /** yEd and yFiles for Java 2.x (`y:` GraphML and yEd GML): `#RRGGBBAA` with the alpha last. */
    | "yed"
    /** yFiles 3 and yFiles for HTML: named color constants and `#AARRGGBB` with the alpha first. */
    | "yfiles3"
    /** GEXF `viz:` values: separate r, g, b, a numbers and size factors. */
    | "gexf"
    /** Gephi's GraphML and GML keys (`r`, `g`, `b`, `size`). */
    | "gephi"
    /** Cytoscape desktop's visual property values (CX, CX2, XGMML, sessions). */
    | "cytoscape"
    /** Cytoscape.js stylesheet values. */
    | "cytoscape-js"
    /** vis-network options. */
    | "vis"
    /** graphology attributes as sigma draws them. */
    | "graphology"
    /** A `graphty.styles` block written by graphty: already canonical. */
    | "graphty"
    | (string & {}); // NOSONAR(S4335): an open union, so editors still offer its literal values

/**
 * The program whose defaults fill in what a file leaves unset, by id: the keys of the tool defaults table.
 * @category Styles
 */
export type StyleTool =
    /** Cytoscape desktop's "default" visual style. */
    | "cytoscape"
    /** Cytoscape desktop's renderer fallbacks, used for sessions. */
    | "cytoscape-fallbacks"
    /** Cytoscape.js 3.x. */
    | "cytoscape-js"
    /** Graphviz. */
    | "graphviz"
    /** yEd and yFiles for Java 2.x. */
    | "yed"
    /** yFiles 3 and yFiles for HTML. */
    | "yfiles3"
    /** Gephi. */
    | "gephi"
    /** vis-network. */
    | "vis-network"
    /** sigma.js, which draws graphology files. */
    | "sigma"
    /** Pajek. */
    | "pajek"
    /** OGDF. */
    | "ogdf"
    /** NetworkX's matplotlib drawing (`draw_networkx`). */
    | "networkx"
    /** graphty itself, for a file holding a `graphty.styles` block. */
    | "graphty"
    | (string & {}); // NOSONAR(S4335): an open union, so editors still offer its literal values

// ============================================================ rules

/**
 * A reference to the per-element values a predicate or a mapping reads. Open union.
 * @category Styles
 */
export type ColumnRef =
    | {
          /** An attribute column of the snapshot, by name. */
          readonly data: string;
      }
    | {
          /** A column of `ExtractedStyles.columns`, by its generated key. */
          readonly style: string;
      }
    | {
          /** A value computed from the graph itself, live: it follows later edits. */
          readonly computed: "degree" | "indegree" | "outdegree";
      };

/**
 * Which elements a rule applies to. Readers and the planner emit only `all`, `has`, `not` over `has`, `eq` and `in`
 * (at most 8 values), with at most one `and`; a wider group is written onto the elements as a style column and
 * selected with `has`. Open union.
 * @category Styles
 */
export type Predicate =
    | {
          /** Every element. */
          readonly all: true;
      }
    | {
          /** The elements whose column holds a value (not null, not false). */
          readonly has: ColumnRef;
      }
    | {
          /** The elements whose column equals the value. */
          readonly eq: readonly [ColumnRef, Scalar];
      }
    | {
          /** The elements whose column equals one of the values. */
          readonly in: readonly [ColumnRef, readonly Scalar[]];
      }
    | {
          /** The elements every predicate matches. */
          readonly and: readonly Predicate[];
      }
    | {
          /** The elements any predicate matches. */
          readonly or: readonly Predicate[];
      }
    | {
          /** The elements the predicate does not match. */
          readonly not: Predicate;
      };

/**
 * One point of a continuous mapping, in Cytoscape's model: exactly at `at` the value is `value`; between two points
 * `above` of the left one interpolates to `below` of the right one (numbers linearly, colors per sRGB channel);
 * below the first point the value is its `below`, above the last its `above`.
 * @category Styles
 */
export interface ContinuousPoint {
    /** The input value. */
    readonly at: number;
    /** The value just below `at`. */
    readonly below: StyleValue;
    /** The value exactly at `at`. */
    readonly value: StyleValue;
    /** The value just above `at`. */
    readonly above: StyleValue;
}

/**
 * How a rule turns an element's value into a style value. A discrete table's absent key, a passthrough's null and
 * a continuous mapping over a missing or non-numeric value give no result, and the rules beneath decide.
 * Open union.
 * @category Styles
 */
export type Mapping =
    | {
          /** The column's value is the style value. */
          readonly kind: "passthrough";
          /** The column read. */
          readonly by: ColumnRef;
      }
    | {
          /** A table from the column's value to the style value. */
          readonly kind: "discrete";
          /** The column read. */
          readonly by: ColumnRef;
          /** `[key, style value]` pairs; a list value matches by its first item that has an entry. */
          readonly table: readonly (readonly [Scalar, StyleValue])[];
      }
    | {
          /** Points between which numbers and colors are interpolated. */
          readonly kind: "continuous";
          /** The column read; it must hold numbers. */
          readonly by: ColumnRef;
          /** The points, in increasing `at`. */
          readonly points: readonly ContinuousPoint[];
          /**
           * When set, a number the mapping gives is rounded to the nearest multiple of `step`, as the writing tool
           * draws a property that holds whole numbers (Cytoscape's font size: 1; its 0..255 transparency: 1/255).
           */
          readonly step?: number;
      };

/**
 * What a rule is: the defaults, a group, a data mapping, per-element copies or the exceptions on top. Open union.
 * @category Styles
 */
export type StyleRuleRole = "defaults" | "group" | "mapping" | "passthrough" | "exceptions" | (string & {}); // NOSONAR(S4335): an open union, so editors still offer its literal values

/**
 * Where a rule came from: written by the file, recovered from its values, or the writing tool's default. Open union.
 * @category Styles
 */
export type StyleRuleOrigin = "declared" | "inferred" | "tool" | (string & {}); // NOSONAR(S4335): an open union, so editors still offer its literal values

/**
 * Why a rule copies values instead of explaining them, or how it was built. Open union.
 * @category Styles
 */
export type StyleRuleReason =
    /** No attribute, degree or class explains the values: they are copied per element. */
    | "NO_EXPLANATION"
    /** The values are explained by classes of elements that share a combination of styles. */
    | "STYLE_CLASS"
    /** The rule was folded into a copy to keep the number of rules per kind bounded. */
    | "LAYER_CAP"
    /** Edges with no color of their own take their source node's color, as the writing tool draws them. */
    | "SOURCE_NODE_COLOR"
    /** Edges with no color of their own take the mean of their two nodes' colors, as the writing tool draws them. */
    | "END_NODES_COLOR"
    /** Nodes with no border of their own get a border darker than their fill and scaled with their size, as the writing tool draws them. */
    | "FILL_BORDER"
    /** Nodes with no label size of their own get a label size scaled with their size, as the writing tool draws them. */
    | "NODE_SIZE_LABEL"
    /** Edges with no width of their own are as thick as their weight, as the writing tool draws them. */
    | "EDGE_WEIGHT"
    /** Edges with no color of their own take the mix of their two end nodes' colors, as the writing tool draws them. */
    | "END_NODE_COLORS"
    /** Nodes with no outline color of their own are outlined in a shade of their fill, as the writing tool draws them. */
    | "NODE_FILL_SHADE"
    /** The values are in proportion to each node's size, as the writing tool draws them (an outline, a label). */
    | "NODE_SIZE"
    /** The values follow the distance between the nodes the file places, as the writing tool draws them. */
    | "NODE_POSITIONS"
    /** Nodes with no label of their own show their name, as the writing tool draws them (Graphviz's `\N`). */
    | "NODE_NAME"
    /** The file computes the value with a function; the drawn values are copied. */
    | "FUNCTION"
    /** The work budget ran out before the values were explained; they are copied. */
    | "BUDGET"
    /** The file's selector is too wide for a short predicate; its members are marked on the elements. */
    | "SELECTOR"
    /** A mapping table too large to keep as a table; its results are precomputed per element. */
    | "TABLE_SIZE"
    /** A scale the format cannot express (a palette, a logarithmic or quantile scale); values are copied. */
    | "SCALE"
    /** A calculated value; the computed values are copied. */
    | "CALCULATED"
    /** A value read from a path the file does not hold (an algorithm result); values are copied. */
    | "RESULT_PATH"
    | (string & {}); // NOSONAR(S4335): an open union, so editors still offer its literal values

/**
 * Facts about a rule an application may show; never sentences.
 * @category Styles
 */
export interface StyleRuleFacts {
    /** How many elements the rule applies to. */
    readonly elements?: number;
    /** How many classes a class rule holds. */
    readonly classes?: number;
    /** How many distinct values a copied column has. */
    readonly distinctValues?: number;
    /** Why the rule copies values or how it was built. */
    readonly reason?: StyleRuleReason;
    /** The file's own name for each generated value: `[generated key or class number, the file's name]`. */
    readonly names?: readonly (readonly [Scalar, string])[];
}

/**
 * One rule of a file's styles. Rules are ordered bottom to top; per property the topmost matching rule that gives a
 * value wins. A property is written by `set` or by `map`, never both, within one rule.
 * @category Styles
 */
export interface StyleRule {
    /** Stable within one extraction (`node.defaults`, `node.by.Modularity Class`). */
    readonly id: string;
    /** Nodes or edges. */
    readonly target: StyleTarget;
    /** What the rule is. */
    readonly role: StyleRuleRole;
    /** Written by the file, recovered from its values, or the writing tool's default. */
    readonly origin: StyleRuleOrigin;
    /** Which elements the rule applies to. */
    readonly where: Predicate;
    /** Constant values. */
    readonly set?: Partial<Record<StyleProperty, StyleValue>>;
    /** Values computed per element. */
    readonly map?: Partial<Record<StyleProperty, Mapping>>;
    /** Facts an application may show. */
    readonly facts?: StyleRuleFacts;
    /**
     * JSON a consumer attaches for its own round trip, keyed by the consumer's package name; carried untouched and
     * never interpreted.
     */
    readonly ext?: Readonly<Record<string, unknown>>;
}

// ============================================================ notes

/**
 * The code of a style note: every `W_STYLE_` code of `STYLE_ISSUE`.
 * @category Styles
 */
export type StyleNoteCode = Extract<StyleIssueCode, `W_STYLE_${string}`>;

/**
 * One aggregated note: everything approximated, dropped or malformed for one code, target and property.
 * @category Styles
 */
export interface StyleNote {
    /** The condition. */
    readonly code: StyleNoteCode;
    /** The facts. */
    readonly params: {
        /** The property (or the file's own name for the construct) the note is about, or null. */
        readonly property: string | null;
        /** Nodes, edges, the graph, or null for the file as a whole. */
        readonly target: StyleTarget | "graph" | null;
        /** How many times the condition occurred. */
        readonly count: number;
        /** Up to 8 distinct examples, each at most 80 characters. */
        readonly samples: readonly string[];
    };
    /**
     * The element indexes the note covers, sorted, when every occurrence named one; otherwise only how many
     * occurrences there were.
     */
    readonly elements?:
        | readonly number[]
        | {
              /** How many occurrences there were. */
              readonly count: number;
          };
    /** English for graph-io's own report; an application writes its own words from the code and params. */
    readonly message: string;
}

// ============================================================ the description

/**
 * The small, JSON-serializable description of a file's styles.
 * @category Styles
 */
export interface FileStyles {
    /** Changes only when the meaning of an existing construct changes. */
    readonly version: 1;
    /** The format, the dialect of its values, and the program whose defaults were applied (null when unknown). */
    readonly source: {
        /** The graph-io format id. */
        readonly format: string;
        /** How the file spells its values. */
        readonly dialect: StyleDialect | null;
        /** The program whose defaults were applied, or null when the writer is not identified. */
        readonly tool: StyleTool | null;
    };
    /** The unit of every length: pixels, or the writing tool's relative size factor. */
    readonly units: {
        /** Pixels, or the writing tool's relative size factor. */
        readonly length: "px" | "relative";
    };
    /** The graph's own style. */
    readonly graph: GraphStyle;
    /** Bottom to top. */
    readonly rules: readonly StyleRule[];
    /** Everything approximated, dropped or malformed. */
    readonly notes: readonly StyleNote[];
}

/**
 * One column of per-element style values, by element index; null where the column has no value.
 * @category Styles
 */
export type StyleColumn = readonly (StyleValue | null)[];

/**
 * The per-element style columns a description's rules read through `{ style: key }`, per target. Keys are generated
 * by graph-io (`class`, `member.3`, `exceptions.fill`, `copy.fill`), never taken from file text.
 * @category Styles
 */
export interface StyleColumns {
    /** Node columns by key. */
    readonly node: ReadonlyMap<string, StyleColumn>;
    /** Edge columns by key. */
    readonly edge: ReadonlyMap<string, StyleColumn>;
}

/**
 * One candidate column that may explain style values: an attribute, a computed degree or a style column.
 * @category Styles
 */
export interface StyleFeature {
    /** Where the values come from. */
    readonly ref: ColumnRef;
    /** The values, by element index. */
    readonly values: readonly (Scalar | null)[];
}

/**
 * The candidate explaining columns per target, kept so a consumer can plan again with the same inputs.
 * @category Styles
 */
export interface StyleFeatures {
    /** Node features. */
    readonly node: readonly StyleFeature[];
    /** Edge features. */
    readonly edge: readonly StyleFeature[];
}

/**
 * Which graph a set of styles belongs to: style values are indexed by element, so they are never written onto a
 * different graph.
 * @category Styles
 */
export interface StyleFingerprint {
    /** The node count. */
    readonly nodes: number;
    /** The edge count. */
    readonly edges: number;
    /**
     * The edges a file holds: an undirected edge of a directed graph, which the graph holds as two halves, counted
     * once. Absent in a fingerprint made before it was recorded, which then means `edges`.
     */
    readonly heldEdges?: number;
    /** A hash of the node ids, whatever their order. */
    readonly ids: string;
}

/**
 * A file's styles: the description, the per-element values it reads, the candidate features and the graph it
 * belongs to.
 * @category Styles
 */
export interface ExtractedStyles {
    /** The JSON-serializable description. */
    readonly styles: FileStyles;
    /** The per-element values the description refers to. */
    readonly columns: StyleColumns;
    /** Candidate explaining columns, for planning again. */
    readonly features: StyleFeatures;
    /** The graph the styles were read from or built for. */
    readonly fingerprint: StyleFingerprint;
}

// ============================================================ reading styles (the importer contract)

/**
 * One counted work budget, shared by everything that reads, plans or replays one import's styles.
 * @category Styles
 */
export interface StyleWorkBudget {
    /** Spends `operations` for a target; false once that target's budget is exhausted. */
    spend(target: StyleTarget, operations: number): boolean;
    /** Whether the target's budget is exhausted. */
    exhausted(target: StyleTarget): boolean;
}

/**
 * What an importer's `styles()` receives.
 * @category Styles
 */
export interface StyleReadContext {
    /** Cancels the extraction. */
    readonly signal?: AbortSignal;
    /** The counted work budget. */
    readonly budget: StyleWorkBudget;
    /**
     * What this import's `import()` passed to `report.keepForStyles(value)`: a stylesheet, a groups object, a legend;
     * undefined when it kept nothing. Per import, so imports running at once never mix.
     */
    readonly kept: unknown;
}

/**
 * The simple path's raw values: per property, either a snapshot column by name (`{ data: "color" }`, read by
 * graph-io, list values flattened) or an array of raw values by element index.
 * @category Styles
 */
export type RawStyleValues = Partial<Record<StyleProperty, RawStyleColumn | readonly unknown[]>>;

/**
 * A snapshot column named as the source of raw style values.
 * @category Styles
 */
export interface RawStyleColumn {
    /** The column's name. */
    readonly data: string;
}

/**
 * The advanced path's per-target output: canonical values, the rules the file declares, and the reader's own
 * style columns and features.
 * @category Styles
 */
export interface ReaderOutput {
    /** Canonical values per property, by element index: what the writing tool draws. */
    readonly values: Partial<Record<StyleProperty, StyleColumn>>;
    /** Rules the file declares, bottom to top. */
    readonly rules?: readonly StyleRule[];
    /** The reader's own style columns (memberships, cascade winners). */
    readonly columns?: ReadonlyMap<string, StyleColumn>;
    /** Extra candidate features. */
    readonly features?: readonly StyleFeature[];
}

/**
 * What an importer's `styles()` returns: the simple path (a dialect and raw values; graph-io does the rest) or the
 * advanced path (canonical values and declared rules).
 * @category Styles
 */
export type ImporterStyles =
    | {
          /** How the raw values are spelled. */
          readonly dialect: StyleDialect;
          /** Raw node values. */
          readonly node?: RawStyleValues;
          /** Raw edge values. */
          readonly edge?: RawStyleValues;
      }
    | {
          /** Marks the advanced path. */
          readonly canonical: true;
          /** How the file spelled its values. */
          readonly dialect?: StyleDialect | null;
          /** The program whose defaults apply, or null. */
          readonly tool?: StyleTool | null;
          /** The unit of every length. */
          readonly units?: "px" | "relative";
          /** Node output. */
          readonly node?: ReaderOutput;
          /** Edge output. */
          readonly edge?: ReaderOutput;
          /** The graph's own style. */
          readonly graph?: GraphStyle;
          /** The reader's notes. */
          readonly notes?: readonly StyleNote[];
          /**
           * Whether the format writes a node's fill opacity and an edge's opacity as the alpha of its color (`rgba()`,
           * `#RRGGBBAA`), so the reader gives an opacity only below 1. In a file graphty wrote, an opaque color then
           * states opacity 1, which overrides a translucent value of the `graphty.styles` block (another program
           * made the element opaque).
           */
          readonly opacityInColor?: boolean;
          /**
           * The text of a `graphty.styles` block the file holds in a place of its own (an XML element, an aspect, a
           * comment) rather than as a graph attribute; graph-io reads it exactly as it reads a block carried as a
           * graph attribute.
           */
          readonly block?: string | null;
          /**
           * The data columns the values were read from (a format's own style columns), per target: they hold the
           * styles themselves, so they are not offered to the planner as columns that explain them.
           */
          readonly readFrom?: {
              /** Node columns. */
              readonly node?: readonly string[];
              /** Edge columns. */
              readonly edge?: readonly string[];
          };
      };

// ============================================================ writing styles (the exporter contract)

/**
 * What a format's writer can hold: per target, the properties it writes natively, and where the `graphty.styles`
 * block and the tagged per-element values go: `"native"` (the exporter places them itself), `"attributes"`
 * (graph-io adds them to the snapshot as a graph attribute and element attributes) or `"none"`.
 * @category Styles
 */
export interface StyleWriteCapabilities {
    /** Node properties written natively. */
    readonly node: readonly NodeStyleProperty[];
    /** Edge properties written natively. */
    readonly edge: readonly EdgeStyleProperty[];
    /** Graph properties written natively. */
    readonly graph?: readonly GraphStyleProperty[];
    /**
     * The program that draws the files this writer writes, when there is one. A graph property the format has no
     * place for is not reported lost when its value is what that program draws anyway (its tool default).
     */
    readonly tool?: StyleTool;
    /** Where the block and the tagged values go. */
    readonly block: "native" | "attributes" | "none";
}

/**
 * Why a `graphty.styles` block was ignored. Open union.
 * @category Styles
 */
export type StyleBlockIgnoredReason =
    /** The block is not valid JSON. */
    | "NOT_JSON"
    /** The block is larger than graph-io reads. */
    | "TOO_LARGE"
    /** The block's version is one this graph-io does not read. */
    | "VERSION"
    /** The block describes a different graph: elements were added or removed since it was written. */
    | "FINGERPRINT"
    /** The block's content does not have the expected shape. */
    | "INVALID"
    | (string & {}); // NOSONAR(S4335): an open union, so editors still offer its literal values
