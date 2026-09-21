/**
 * @file The catalogue: descriptor types, and the one emitter that produces option descriptors.
 *
 * Everything exported here is plain data or a pure function over plain data. Nothing reaches
 * the renderer, the DOM or a graph, which is what lets a catalogue be built, serialised and
 * inspected without a canvas.
 */

export type { OptionsFromZodOptions, OptionsSource, OptionUiMeta } from "./optionsFromZod";
export { optionsFromZod } from "./optionsFromZod";
export type {
    AlgorithmDescriptor,
    AlgorithmKey,
    AttributeDescriptor,
    AttributeType,
    Binding,
    CatalogApi,
    Channel,
    ChannelValue,
    CostClass,
    EdgeId,
    EdgeLinePattern,
    Encoding,
    FieldDescriptor,
    FormatDescriptor,
    FormatId,
    FunctionDescriptor,
    GraphtyErrorCode,
    KnownAlgorithm,
    LabelStyle,
    LayerId,
    LayerKind,
    LayerSource,
    LayerSpec,
    LayoutDescriptor,
    LayoutId,
    MetricAvailability,
    NodeId,
    OptionBound,
    OptionChoice,
    OptionDescriptor,
    OptionType,
    PaletteDescriptor,
    PaletteId,
    Path,
    Query,
    QueryValidation,
    ResultShape,
    Rgba,
    RunId,
    ScaleDescriptor,
    Scope,
    ScopeId,
    Selector,
    StaticStyle,
    StyleDocument,
    ThemeDescriptor,
} from "./types";
export {
    ATTRIBUTE_TYPES,
    COST_CLASSES,
    isAttributeType,
    isCostClass,
    isOptionBound,
    isOptionType,
    isResultShape,
    KNOWN_ALGORITHMS,
    KNOWN_FORMAT_IDS,
    KNOWN_LAYOUT_IDS,
    KNOWN_PALETTE_IDS,
    OPTION_BOUND_SOURCES,
    OPTION_TYPES,
    RESULT_SHAPES,
} from "./types";
