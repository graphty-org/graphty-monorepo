/**
 * @file `@graphty/graphty-element`: the ordinary consumer's entry point.
 *
 * ```js
 * import "@graphty/graphty-element";
 * ```
 *
 * Importing this module defines the `<graphty-element>` custom element and registers the
 * built-in layouts, data sources and algorithms. That side effect is deliberate: every web
 * component package defines its tag on the default import, and a stranger's one-line script tag
 * depends on it.
 *
 * It also means this entry point carries the renderer, so it needs a DOM and a 3D engine. The
 * parts of the package that do not are published separately, and a consumer that wants a colour
 * ramp, a palette, an options list or a plugin base class should import one of those instead of
 * this:
 *
 * - `@graphty/graphty-element/schema` -- palettes, shapes, style defaults, the style document
 *   vocabulary and the colour helpers, the colour-vision simulators among them.
 * - `@graphty/graphty-element/catalog` -- the algorithms, layouts, formats, palettes and scales
 *   the element offers, as plain JSON descriptors.
 * - `@graphty/graphty-element/extend` -- the registration surface for a plugin.
 * - `@graphty/graphty-element/format` -- the vocabulary for reading a graph snapshot.
 * - `@graphty/graphty-element/session` -- the headless model.
 * - `@graphty/graphty-element/logging` -- the logger, the levels, the record, the destinations
 *   the element ships and `lazy`.
 * - `@graphty/graphty-element/ai` -- the natural-language layer and its optional peers.
 * - `@graphty/graphty-element/webgpu` -- one import that switches on GPU acceleration.
 *
 * Each of the first six resolves in Node with no renderer anywhere in its import graph.
 *
 * TWO GROUPS OF NAMES USED TO BE HERE AND ARE NOT ANY MORE, because each was published from two
 * addresses at once and a consumer reading two import lines for one symbol has no way to tell
 * they are the same object. The logging vocabulary is at `/logging`. The seven colour-vision
 * simulators are at `/schema`, beside the palettes they exist to check. Reaching either through
 * this file cost a 3D engine for code that never draws anything.
 */

// IMPORTANT: Import graphty-element as a side-effect to ensure the @customElement decorator runs
// and registers the <graphty-element> custom element. This prevents tree-shaking from removing
// the custom element registration when consumers do `import "@graphty/graphty-element";`
import "./src/graphty-element";

// =============================================================================
// Core classes
// =============================================================================
export { Edge } from "./src/Edge";
export { Graph } from "./src/Graph";
export { Graphty } from "./src/graphty-element";
export type { NodeIdType } from "./src/Node";
export { Node } from "./src/Node";
// `Styles`, `StylesOpts`, `NodeStyleId` and `EdgeStyleId` are no longer published, and neither is
// the 1.x style template that fed them -- `StyleSchema`, `StyleSchemaV1`, `StyleLayerType`,
// `StyleTemplate`, `AppliedNodeStyleConfig`, `AppliedEdgeStyleConfig`, `CalculatedStyle` and
// `CalculatedStyleConfig` are all gone from the published surface. They were the 1.x style
// engine: a layer stack addressed by array index, resolved per element by re-parsing a JMESPath
// expression, with a `calculatedStyle` string of JavaScript behind an `eval`. The 2.0 stack is
// `session.styles`: layers with stable ids, declarative encodings, a legend and an explain. What
// the template carried besides layers is now element properties -- `viewMode`, `layout`,
// `layoutConfig`, `nodeIdPath`, `edgeSrcIdPath`, `edgeDstIdPath`, `runAlgorithmsOnLoad`,
// `background` and `startingCameraDistance`. See design/element-api/.

// =============================================================================
// Config - Styles, Templates, and Types
// =============================================================================
// Style configuration types
export type {
    AdHocData,
    EdgeStyleConfig,
    // What the graph is drawn against, as `element.background` takes it
    GraphBackgroundConfig,
    ImageData,
    NodeStyleConfig,
    RichTextStyleType,
    // View mode types
    ViewMode,
    // XR configuration types
    XRConfig,
    XRInputConfig,
    XRModeConfig,
    XRTeleportationConfig,
    XRUIConfig,
} from "./src/config/index";

// One entry of `element.algorithmsOnLoad`: a name, or a name with its run options
export type { AlgorithmOnLoad } from "./src/config/DataConfig";

// XR partial config type (for setting XR options)
export type { PartialXRConfig } from "./src/config/xr-config-schema";

// Style configuration values and helpers
export {
    colorToHex,
    DEFAULT_VIEW_MODE,
    defaultEdgeStyle,
    defaultNodeStyle,
    defaultRichTextLabelStyle,
    defaultXRConfig,
    EdgeStyle,
    GraphBackground,
    isViewMode,
    NodeShapes,
    NodeStyle,
    RichTextStyle,
    VIEW_MODE_VALUES,
} from "./src/config/index";

// The suggested-styles types are gone with the hand-written blocks they described. A run derives
// what it suggests from its own result shape: `element.getSuggestedStyles(algorithm)` answers with
// `StyleSuggestion`s, and `session.styles.encode()` / `highlight()` apply them.
export type { EncodingSuggestion, HighlightSuggestion, StyleSuggestion } from "./src/session/styles";

// Color palettes for visualizations
export * from "./src/config/palettes/index";

// =============================================================================
// Layout Engine
// =============================================================================
export type { EdgePosition, Position, SimpleLayoutConfigType, SimpleLayoutOpts } from "./src/layout/LayoutEngine";
export { LayoutEngine, SimpleLayoutConfig, SimpleLayoutEngine } from "./src/layout/LayoutEngine";

// =============================================================================
// Data Sources
// =============================================================================
export type { BaseDataSourceConfig, DataSourceChunk } from "./src/data/DataSource";
export { DataSource } from "./src/data/DataSource";

// Error aggregation for data loading
export type { DataLoadingError, ErrorSummary } from "./src/data/index";
export { ErrorAggregator } from "./src/data/index";

// =============================================================================
// Algorithms
// =============================================================================
export { Algorithm } from "./src/algorithms/Algorithm";

// =============================================================================
// Events
// =============================================================================
export type {
    CameraStateChangedEvent,
    DataLoadingCompleteEvent,
    DataLoadingErrorEvent,
    DataLoadingErrorSummaryEvent,
    DataLoadingProgressEvent,
    EdgeAddEvent,
    EdgeEvent,
    EdgeEventType,
    EdgeGenericEvent,
    EventCallbackType,
    EventType,
    GraphDataAddedEvent,
    GraphDataLoadedEvent,
    GraphErrorEvent,
    GraphEvent,
    GraphEventType,
    GraphGenericEvent,
    GraphLayoutInitializedEvent,
    GraphSettledEvent,
    NodeAddEvent,
    NodeClickEvent,
    NodeDragEndEvent,
    NodeDragStartEvent,
    NodeEvent,
    // What the four `graphty-node-*` DOM events carry, which is ids and numbers rather than the
    // live render object the internal event holds.
    NodeEventDetail,
    NodeEventType,
    NodeGenericEvent,
    NodeHoverEvent,
} from "./src/events";

// =============================================================================
// Managers
// =============================================================================
export type { Manager, ManagerConfig, ManagerContext, QueueableManager } from "./src/managers/index";

// Export specific managers that may be useful for advanced integration
export {
    AlgorithmManager,
    DataManager,
    EventManager,
    InputManager,
    LayoutManager,
    OperationQueueManager,
    RenderManager,
    SelectionManager,
    StatsManager,
    UpdateManager,
} from "./src/managers/index";

// GraphContext for custom node/edge implementations
export type { GraphContext, GraphContextConfig } from "./src/managers/index";

// =============================================================================
// Operation Queue Types
// =============================================================================
export type { QueueableOptions, RunAlgorithmOptions } from "./src/utils/queue-migration";

// =============================================================================
// Constants
// =============================================================================
export { EDGE_CONSTANTS, PolyhedronType, SHAPE_CONSTANTS } from "./src/constants/meshConstants";

// =============================================================================
// Screenshot exports
// =============================================================================
export { ScreenshotError, ScreenshotErrorCode } from "./src/screenshot/ScreenshotError";
export type {
    CameraAnimationOptions,
    CameraState,
    ClipboardStatus,
    QualityEnhancementOptions,
    ScreenshotOptions,
    ScreenshotResult,
} from "./src/screenshot/types";

// Capability check for screenshot support
export type { CapabilityCheck } from "./src/screenshot/capability-check";

// =============================================================================
// Video capture exports
// =============================================================================
export { AnimationCancelledError } from "./src/video/MediaRecorderCapture";
export type { AnimationOptions, AnimationResult, CameraWaypoint } from "./src/video/VideoCapture";

// Video capture estimation
export type { CaptureEstimate } from "./src/video/estimation";

/*
 * Camera presets.
 *
 * `BUILTIN_PRESETS` is the ids of the five views the element ships, kept so nothing published
 * breaks. What a picker should read instead is `session.catalog.cameras()` or `CAMERA_DESCRIPTORS`
 * from `@graphty/graphty-element/catalog`: both carry a plain name, a description and the drawing
 * modes each view works in, and both include the views a third party registered, which a fixed
 * array of five cannot.
 */
export { BUILTIN_PRESETS } from "./src/camera/presets";

// =============================================================================
// Errors
// =============================================================================
export type {
    AccelerationErrorCode,
    GraphtyErrorCode,
    GraphtyErrorInit,
    GraphtyErrorJson,
    GraphtyErrorSource,
    GraphtyErrorTarget,
} from "./src/errors";
export {
    ACCELERATION_ERROR_CODES,
    GRAPHTY_ERROR_CODES,
    GraphtyError,
    isGraphtyError,
    isGraphtyErrorCode,
} from "./src/errors";

// =============================================================================
// Acceleration
// =============================================================================
export type {
    AccelerationCapabilities,
    AccelerationPolicy,
    AccelerationPrecision,
    AccelerationState,
    AccelerationStatus,
    AcceleratorDeviceInfo,
    AcceleratorFactory,
    AcceleratorFactoryOptions,
    CalibrationRecord,
    Capabilities,
    CaptureCapability,
    GraphAccelerator,
    Limits,
    WorkerCapability,
    XrCapability,
} from "./src/acceleration";
export { ACCELERATION_MIN_NODES_DEFAULT, ACCELERATION_MIN_NODES_KEY, CPU_PRECISION } from "./src/acceleration";
