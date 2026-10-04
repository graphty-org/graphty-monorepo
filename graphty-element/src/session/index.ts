/**
 * @file The session: the element's headless model.
 *
 * A session is a graph with no screen attached -- the data, the coordinates, the runs and their
 * results, what is selected, what is visible, the style layers that say what paints what, the
 * statistics, the catalogue, the configuration and what the machine can do. A renderer binds to
 * one, a Node test uses one on its own, and two synchronised views of one dataset share one.
 *
 * Nothing in this module's import graph reaches Babylon.js, Lit or the DOM, and a packaging test
 * enforces it.
 */

export { createElementSession, createGraphSession } from "./GraphSession";
export type { LayoutRecommendation, LayoutRecommendationOptions } from "./layout";
export { recommendLayout } from "./layout";
export type { DefaultableLimits } from "./limits";
export { DEFAULT_LIMITS } from "./limits";
export type { AlgorithmRunCommand, Plan, PlanBlock, PlanEffect, SessionCommand } from "./planning";
export { isAlgorithmRunCommand } from "./planning";
export type { CodedFact, ColumnRef, ProgressChange, ResultRef } from "./shared";
export type {
    ColumnHistogram,
    CommandOutcome,
    CommandOutcomeMap,
    ComponentStatistics,
    CreateGraphSessionOptions,
    DataSourceDescriptor,
    DataSourceInput,
    EdgePageOptions,
    EdgeRecord,
    EdgeRecordInput,
    ElementSession,
    FindEnd,
    FindHit,
    FindHitBase,
    FindKind,
    FindOptions,
    FindResult,
    FindValueRow,
    GraphSession,
    GraphShapeStatistics,
    GraphStatistics,
    HistoryCause,
    HistoryOutcome,
    HistoryStep,
    HistoryStepId,
    ImportOptions,
    Neighbor,
    NeighborOptions,
    NeighborPage,
    NeighborSort,
    NodeRecord,
    NodeRecordInput,
    PageColumn,
    PendingId,
    PendingStep,
    PositionEntry,
    ProjectConfig,
    ProjectConfigPatch,
    ProjectSlice,
    ReadonlyElementPositions,
    RecordPage,
    RecordPageOptions,
    RecordSort,
    ResultCell,
    ResultColumn,
    ResultSort,
    RowUpdate,
    SessionAttributes,
    SessionCatalogApi,
    SessionConfig,
    SessionDataApi,
    SessionDataConfig,
    SessionEventMap,
    SessionGraphStore,
    SessionHistory,
    SessionLayout,
    SessionPositions,
    SessionRunsOptions,
    SessionStatus,
    SessionViews,
    StyleProblem,
    TransactionOptions,
    TransactionScope,
} from "./types";
export { COMPONENT_SIZE_CAP } from "./types";
