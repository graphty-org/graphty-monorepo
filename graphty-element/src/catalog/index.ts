/**
 * @file The catalogue: descriptor types, and the one emitter that produces option descriptors.
 *
 * Everything exported here is plain data or a pure function over plain data. Nothing reaches
 * the renderer, the DOM or a graph, which is what lets a catalogue be built, serialised and
 * inspected without a canvas.
 */

export type {
    LabelAnimation,
    LabelBadge,
    LabelGradientDirection,
    LabelGradientType,
    LabelIconPosition,
    LabelLocation,
    LabelPointerDirection,
    LabelTextAlign,
} from "./label-style";
export { LABEL_STYLE_FIELDS } from "./label-style";
export type { OptionsFromZodOptions, OptionsSource, OptionUiMeta } from "./optionsFromZod";
export { optionsFromZod } from "./optionsFromZod";
export type {
    AlgorithmDescriptor,
    AlgorithmKey,
    AttributeDescriptor,
    AttributeType,
    Binding,
    CameraDescriptor,
    CameraId,
    CatalogApi,
    Channel,
    ChannelValue,
    CostClass,
    DrawingMode,
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
    LogSinkDescriptor,
    LogSinkId,
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
    KNOWN_CAMERA_IDS,
    KNOWN_FORMAT_IDS,
    KNOWN_LAYOUT_IDS,
    KNOWN_LOG_SINK_IDS,
    KNOWN_PALETTE_IDS,
    OPTION_BOUND_SOURCES,
    OPTION_TYPES,
    RESULT_SHAPES,
} from "./types";

/**
 * What the element does NOT serve on the styling surface, said out loud.
 *
 * The same promise `UNSERVED_LAYOUT_IDS` and `UNSERVED_FORMAT_IDS` make for layouts and file
 * formats: a capability the element cannot give you is named here with a reason, rather than
 * left to be discovered by writing a layer that quietly does nothing. Both lists are checked
 * against the element itself -- the schemas, the channel table and a real painted frame -- so
 * an entry cannot outlive the gap it describes.
 */
export type {
    ByDesignWaiver,
    DefectWaiver,
    UnpaintedChannel,
    UnreachableStyleField,
    Waiver,
    WithdrawnCapability,
} from "./unreachable";
export {
    UNPAINTED_CHANNELS,
    UNREACHABLE_STYLE_FIELDS,
    WAIVER_EXPIRY_UNSET,
    WAIVER_HORIZON_DAYS,
    WAIVER_OWNER_UNASSIGNED,
    WITHDRAWN_CAPABILITIES,
} from "./unreachable";
