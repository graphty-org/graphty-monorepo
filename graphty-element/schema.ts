/**
 * @file `@graphty/graphty-element/schema`: the vocabulary of a styled graph, as data.
 *
 * ```js
 * import { NodeShapes, defaultNodeStyle, VIRIDIS_COLORS } from "@graphty/graphty-element/schema";
 * ```
 *
 * Everything here is a type, a constant or a pure function over numbers and strings. Nothing
 * reaches a renderer, a canvas, a DOM node or a 3D engine, so this entry point runs in Node, in
 * a worker, in a test and in a build script. That is the whole reason it exists: a legend, a
 * settings panel, a colour picker and a saved document all need the element's palettes, shape
 * names and style defaults, and none of them need Babylon.js.
 *
 * The failure this prevents is copying. The one application that consumes this package copied
 * the ten viridis anchors into its own source because importing them meant importing a 3D
 * engine, and a palette edited here now repaints the graph and leaves the legend beside it
 * wrong, with nothing to notice the drift.
 *
 * Node-safety is enforced by a test: `test/packaging/node-safe-entries.test.ts` resolves this
 * module's import graph and fails if Babylon.js, Lit or a DOM global appears in it.
 */

// ---------------------------------------------------------------------------------------------
// The style document vocabulary: what a layer is, and what it may say
// ---------------------------------------------------------------------------------------------

export type {
    Binding,
    Channel,
    ChannelValue,
    EdgeId,
    EdgeLinePattern,
    Encoding,
    LabelStyle,
    LayerId,
    LayerKind,
    LayerSource,
    LayerSpec,
    NodeId,
    Path,
    Query,
    ResultShape,
    Rgba,
    RunId,
    Scope,
    ScopeId,
    Selector,
    StaticStyle,
    StyleDocument,
    ThemeDescriptor,
} from "./src/catalog/types";
export { isResultShape, RESULT_SHAPES } from "./src/catalog/types";

// ---------------------------------------------------------------------------------------------
// The 1.10 style configuration: the shapes, the defaults and the helpers
// ---------------------------------------------------------------------------------------------

export type {
    AdHocData,
    AppliedEdgeStyleConfig,
    AppliedNodeStyleConfig,
    CalculatedStyleConfig,
    EdgeStyleConfig,
    ImageData,
    NodeStyleConfig,
    RichTextStyleType,
    StyleLayerType,
    StyleSchema,
    StyleSchemaV1,
    ViewMode,
} from "./src/config/index";
export {
    CalculatedStyle,
    colorToHex,
    DEFAULT_VIEW_MODE,
    defaultEdgeStyle,
    defaultNodeStyle,
    defaultRichTextLabelStyle,
    EdgeStyle,
    isViewMode,
    NodeShapes,
    NodeStyle,
    RichTextStyle,
    StyleTemplate,
    VIEW_MODE_VALUES,
} from "./src/config/index";

// ---------------------------------------------------------------------------------------------
// The palettes themselves, and the colour maths that reads them
// ---------------------------------------------------------------------------------------------

export * from "./src/config/palettes/index";
export {
    areDistinguishableInGrayscale,
    colorDifference,
    isPaletteSafe,
    simulateDeuteranopia,
    simulateProtanopia,
    simulateTritanopia,
    toGrayscale,
} from "./src/utils/styleHelpers/accessibility/colorblindSimulation";
export type { RgbColor } from "./src/utils/styleHelpers/color/interpolation";
export { hexToRgb, interpolatePalette, MISSING_DATA_COLOR } from "./src/utils/styleHelpers/color/interpolation";
