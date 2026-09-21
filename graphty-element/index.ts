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
 * - `@graphty/graphty-element/schema` -- palettes, shapes, style defaults and the style
 *   document vocabulary.
 * - `@graphty/graphty-element/catalog` -- the algorithms, layouts, formats, palettes and scales
 *   the element offers, as plain JSON descriptors.
 * - `@graphty/graphty-element/extend` -- the registration surface for a plugin.
 * - `@graphty/graphty-element/format` -- the vocabulary for reading a graph snapshot.
 * - `@graphty/graphty-element/session` -- the headless model.
 * - `@graphty/graphty-element/ai` -- the natural-language layer and its optional peers.
 * - `@graphty/graphty-element/webgpu` -- one import that switches on GPU acceleration.
 *
 * Each of the first five resolves in Node with no renderer anywhere in its import graph.
 */

// WORKAROUND: Import InstancedMesh first to satisfy Babylon.js side-effect requirement
// See: https://github.com/graphty-org/graphty-element/issues/54
import "@babylonjs/core/Meshes/instancedMesh";
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
// `Styles`, `StylesOpts`, `NodeStyleId` and `EdgeStyleId` are no longer published. They were the
// 1.x style engine's surface -- a layer stack addressed by array index, and a style resolved per
// element by re-parsing a JMESPath expression. The 2.0 stack is `session.styles`: layers with
// stable ids, declarative encodings, a legend and an explain. See design/element-api/.

// =============================================================================
// Config - Styles, Templates, and Types
// =============================================================================
// Style configuration types
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
    // View mode types
    ViewMode,
    // XR configuration types
    XRConfig,
    XRInputConfig,
    XRModeConfig,
    XRTeleportationConfig,
    XRUIConfig,
} from "./src/config/index";

// XR partial config type (for setting XR options)
export type { PartialXRConfig } from "./src/config/xr-config-schema";

// Style configuration values and helpers
export {
    CalculatedStyle,
    colorToHex,
    DEFAULT_VIEW_MODE,
    defaultEdgeStyle,
    defaultNodeStyle,
    defaultRichTextLabelStyle,
    defaultXRConfig,
    EdgeStyle,
    isViewMode,
    NodeShapes,
    NodeStyle,
    RichTextStyle,
    StyleTemplate,
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
    EdgeClickEvent,
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

// Camera presets
export { BUILTIN_PRESETS } from "./src/camera/presets";

// =============================================================================
// Logging
// =============================================================================
export {
    // Storage
    clearLoggingConfig,
    // Configuration
    configureLogging,
    // Sinks
    type ConsoleSinkOptions,
    createConsoleSink,
    createRemoteSink,
    getLoggingConfig,
    // Core logger
    GraphtyLogger,
    type GraphtyLoggerConfig,
    isModuleEnabled,
    loadLoggingConfig,
    // Types
    LOG_LEVEL_NAMES,
    LOG_LEVEL_TO_NAME,
    type Logger,
    type LoggerConfig,
    LogLevel,
    type LogRecord,
    // URL parameters
    type ParsedLoggingParams,
    parseLoggingURLParams,
    parseLogLevel,
    type RemoteSinkOptions,
    resetLoggingConfig,
    saveLoggingConfig,
    type Sink,
} from "./src/logging/index";

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
export { ACCELERATION_ERROR_CODES, GRAPHTY_ERROR_CODES, GraphtyError, isGraphtyError, isGraphtyErrorCode } from "./src/errors";

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

// =============================================================================
// Colorblind Simulation Utilities
// =============================================================================
/**
 * Colorblind simulation utilities for accessibility testing.
 * @remarks
 * These functions help test whether color palettes are accessible to users
 * with various forms of color vision deficiency.
 * @see {@link https://graphty.app/storybook/element/?path=/story/algorithms-palettepicker--default | Palette Examples}
 */
export {
    areDistinguishableInGrayscale,
    colorDifference,
    isPaletteSafe,
    simulateDeuteranopia,
    simulateProtanopia,
    simulateTritanopia,
    toGrayscale,
} from "./src/utils/styleHelpers/accessibility/colorblindSimulation";
