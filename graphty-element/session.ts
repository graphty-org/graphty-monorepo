/**
 * @file `@graphty/graphty-element/session`: the headless half of the element.
 *
 * ```js
 * import type { NodeId, RunId } from "@graphty/graphty-element/session";
 * ```
 *
 * A session is a graph with no view attached: data, runs, scopes, selection and style layers,
 * usable in Node, in a worker and in a test, and bindable to one or more views in a browser.
 * The model exists so that a headless test, a server-side check and two synchronised views all
 * fall out of one structure instead of four, and so that "compare these two graphs" is two
 * sessions rather than a second element.
 *
 * **What is here today.** `createGraphSession` and the session it builds: the graph data -- the
 * store, the snapshot, node and edge lookup by id, the attribute listing and the graph
 * statistics -- the node coordinates, the O(1) status facts, the catalogue of everything the
 * element can offer, the configuration and what the machine can do. On top of those, runs: start
 * one and get back an object with an identity, a label, progress, a cancel and a promise that
 * resolves to the result; address what it produced at `results.<runId>.<field>`; and ask, before
 * the click, what a command would cost (`estimate`, synchronous) or what it would do (`plan`).
 * Beside them, the three models that say which elements anything applies to: `scope` turns a
 * specification into the elements it names, `selection` is the two sets a person is pointing at,
 * and `visibility` is what the filters and the time window have left showing. Then the style
 * stack: layers addressed by an id rather than by a position, read bottom first, each one a
 * selector saying which elements it paints and either literal values or declarative bindings
 * saying what it paints on them. `styles.encode()` turns a run's measurement into paint in one
 * call, `styles.legend()` reads the picture back as blocks and swatches, and `styles.explain()`
 * answers why one element looks the way it does, channel by channel and layer by layer. The
 * bottom of every stack is the element's own, marked as the element's and locked. Around all of
 * it,
 * the vocabulary a session speaks: the identities it mints and a saved document references, the
 * scope and selector shapes its verbs take, the ten result shapes a run publishes, the capability
 * document a host reads before it offers a feature, and the error model every failure arrives in.
 *
 * **One sentence to carry away about `visibility`.** It is the DATA scope -- the filters and the
 * time window -- and never the render set. Above the renderer's ceiling fewer elements are drawn
 * than are visible here, and analysis "on the visible graph" means this model rather than
 * whatever happened to be drawn.
 *
 * **What is missing.** `createComparison`, and the layout, camera, export and journal verbs that
 * hang off a session. They are absent rather than stubbed, so a consumer discovers the gap by
 * autocomplete finding nothing rather than by a call that throws at run time. Three limits are
 * worth knowing before you reach for them: the scope and filter shapes that need a query engine
 * -- `{ where }`, a `text` selection target, an `expression` filter -- are REFUSED with
 * `E_UNSUPPORTED` rather than quietly matching nothing; a session with no element behind it has
 * no algorithm executor -- every algorithm this package ships is built from the renderer -- so
 * `runs.start` on a standalone session answers `E_UNSUPPORTED` unless one was handed in; and the
 * style stack resolves what every element shows without anything yet DRAWING it, so a layer
 * added here changes the model and does not change the screen. The catalogue is here with its
 * five static tables and `metrics()`, which says which metrics this graph can support, what each
 * would cost and which have already been run; what an option's bounds resolve to over a scope,
 * and whether an expression references anything real, still wait on the query engine.
 *
 * Node-safety is enforced by a test: `test/packaging/node-safe-entries.test.ts` resolves this
 * module's import graph and fails if Babylon.js, Lit or a DOM global appears in it.
 */

// ---------------------------------------------------------------------------------------------
// The session itself
// ---------------------------------------------------------------------------------------------

export type {
    ComponentStatistics,
    CreateGraphSessionOptions,
    EdgeRecord,
    GraphSession,
    GraphStatistics,
    NodeRecord,
    SessionAttributes,
    SessionCatalogApi,
    SessionConfig,
    SessionDataApi,
    SessionDataConfig,
    SessionEventMap,
    SessionGraphStore,
    SessionRecordSource,
    SessionRunsOptions,
    SessionStatus,
    StyleProblem,
} from "./src/session";
export { createGraphSession } from "./src/session";

/**
 * What the element has to say about a load, once the load is over: which record keys named the
 * endpoints and how that was decided, what the repeat policy did, and how many edges the graph
 * actually holds -- as distinct from how many records arrived, which is the number the element
 * used to publish under the name `edgesLoaded` while the two disagreed by a whole file.
 *
 * Read it at any time from `session.data.lastImport()`, or take it off the detail of
 * `data-loaded` and `data-loading-complete`.
 */
export type { EndpointSpelling } from "./src/data/endpoints";
export type { ImportReport, RepeatedEdgeCounts } from "./src/data/report";

// ---------------------------------------------------------------------------------------------
// The node coordinates
// ---------------------------------------------------------------------------------------------

/**
 * The type of `session.positions`, so that a consumer holding one can name it.
 *
 * The type only, not the constructor: the coordinates belong to the graph the element froze, and
 * a second array built beside it would be lent to nothing.
 */
export type { ElementPositions } from "./src/data/positions";

// ---------------------------------------------------------------------------------------------
// Which arrangement suits a graph
// ---------------------------------------------------------------------------------------------

export type { LayoutRecommendation, LayoutRecommendationOptions } from "./src/session";
export { recommendLayout } from "./src/session";

// ---------------------------------------------------------------------------------------------
// Runs: starting a computation, watching it, stopping it, and finding it again
// ---------------------------------------------------------------------------------------------

export type {
    BatchResult,
    BatchStep,
    Caveats,
    EngineVersions,
    Precision,
    Progress,
    QueueEntry,
    QueuePolicy,
    ResolvedScope,
    Run,
    RunChange,
    RunDirection,
    RunExecutionContext,
    RunExecutor,
    RunOptions,
    RunOutcome,
    RunPhase,
    RunProgressReport,
    RunQueue,
    RunRecord,
    RunRemoval,
    RunsApi,
    RunScopeRecord,
    RunSpec,
    RunStatus,
    StaleNote,
    StartOptions,
    WeightMeaning,
} from "./src/session/runs";
export {
    isRunId,
    isRunStatus,
    isTerminalRunStatus,
    QUEUE_POLICIES,
    RUN_ID_PATTERN,
    RUN_PHASES,
    RUN_STATUSES,
    TERMINAL_RUN_STATUSES,
} from "./src/session/runs";

// ---------------------------------------------------------------------------------------------
// Reading what a run produced
// ---------------------------------------------------------------------------------------------

export type {
    Histogram,
    HistogramBin,
    HistogramBinning,
    HistogramOptions,
    Normalization,
    NumericColumnView,
    RankingEntry,
    ReadingOptions,
    ResultsApi,
    ResultSummary,
    RunRef,
    RunResult,
    SummaryEntry,
    SummaryGroup,
} from "./src/session/results";
export { defaultReading, RESULT_FIELD_NAMES, RESULT_ROOT, RESULT_SHAPE_CONTRACTS, resultPath } from "./src/session/results";

// ---------------------------------------------------------------------------------------------
// Which elements a piece of work is allowed to look at
// ---------------------------------------------------------------------------------------------

export type { SavedScope, ScopeApi, ScopeCount, ScopeCountOptions } from "./src/session/scope";
export { DEFAULT_SCOPE_SAMPLE } from "./src/session/scope";

// ---------------------------------------------------------------------------------------------
// What is selected: two sets, five set operations, one selection per session
// ---------------------------------------------------------------------------------------------

export type {
    SelectionApi,
    SelectionAttributeStatistics,
    SelectionCause,
    SelectionDelta,
    SelectionDirection,
    SelectionStatistics,
    SelectionTarget,
    SelectionTextMode,
    SetOp,
} from "./src/session/selection";
export { DEFAULT_SELECTION_CAP, SET_OPS } from "./src/session/selection";

// ---------------------------------------------------------------------------------------------
// What is visible: the data scope, never the render set
// ---------------------------------------------------------------------------------------------

export type {
    Filter,
    FilterDirection,
    FilterResult,
    TimeStep,
    TimeWindow,
    VisibilityApi,
    VisibilityChange,
    VisibilitySummary,
} from "./src/session/visibility";

// ---------------------------------------------------------------------------------------------
// Asking what something would do and cost, before doing it
// ---------------------------------------------------------------------------------------------

export type {
    AlgorithmRunCommand,
    Plan,
    PlanBlock,
    PlanEffect,
    SessionCommand,
} from "./src/session";
export { isAlgorithmRunCommand } from "./src/session";
export type {
    CostConfidence,
    CostEstimate,
    CostGateDecision,
    CostGateLimits,
    CostMeasurement,
    MachineCalibration,
} from "./src/session/cost";
export { DEFAULT_COST_GATE_LIMITS, DEFAULT_EXACT_COMPUTATION_CAP_SECONDS } from "./src/session/cost";

// ---------------------------------------------------------------------------------------------
// Identities, scopes and results
// ---------------------------------------------------------------------------------------------

export type {
    Binding,
    Channel,
    EdgeId,
    Encoding,
    FieldDescriptor,
    LayerId,
    LayerKind,
    LayerSource,
    LayerSpec,
    NodeId,
    Path,
    Query,
    QueryValidation,
    ResultShape,
    RunId,
    Scope,
    ScopeId,
    Selector,
    StaticStyle,
    StyleDocument,
} from "./src/catalog/types";
export { isResultShape, RESULT_SHAPES } from "./src/catalog/types";

// ---------------------------------------------------------------------------------------------
// Style layers: what paints what, in what order, and why one element looks the way it does
// ---------------------------------------------------------------------------------------------

export type {
    ChannelExplanation,
    ElementLayerSpec,
    EncodingRun,
    EncodingSpec,
    ExplainTarget,
    FieldWords,
    HighlightSpec,
    Layer,
    LayerPosition,
    LayerProblem,
    LegendBlock,
    LegendSwatch,
    RepaintReason,
    RepaintReport,
    SessionStylesApi,
    StyleChange,
    StyleContribution,
    StyleExplanation,
    StylesApi,
    TemplateOptions,
    TemplateReport,
    UnboundLayer,
    ValidationResult,
} from "./src/session/styles";
export { quotePath } from "./src/session/styles";

// ---------------------------------------------------------------------------------------------
// What a host may ask this session for before it offers a feature
// ---------------------------------------------------------------------------------------------

export type {
    AccelerationCapabilities,
    AccelerationPolicy,
    AccelerationState,
    AccelerationStatus,
    Capabilities,
    CaptureCapability,
    Limits,
    WorkerCapability,
    XrCapability,
} from "./src/acceleration";
export type { DefaultableLimits } from "./src/session";
export { DEFAULT_LIMITS } from "./src/session";

// ---------------------------------------------------------------------------------------------
// How every failure arrives
// ---------------------------------------------------------------------------------------------

export type {
    AccelerationErrorCode,
    GraphtyErrorCode,
    GraphtyErrorInit,
    GraphtyErrorJson,
    GraphtyErrorSource,
    GraphtyErrorTarget,
} from "./src/errors";
export { ACCELERATION_ERROR_CODES, GRAPHTY_ERROR_CODES, GraphtyError, isGraphtyError, isGraphtyErrorCode } from "./src/errors";
