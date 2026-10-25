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

export { EXPORT_LOSS_CODES } from "../data/exportLossCodes";
export type { BrowserProjects, BrowserProjectSaveOptions, StoredProject } from "./browserProjects";
export { browserProjects } from "./browserProjects";
export { LOAD_ROLES } from "./draft";
export { createElementSession, createGraphSession } from "./GraphSession";
export type { DataIssue, FixCode, FixResult, IssueCode, IssueId } from "./issues";
export type { LayoutRecommendation, LayoutRecommendationCode, LayoutRecommendationOptions } from "./layout";
export { recommendLayout } from "./layout";
export type { DefaultableLimits } from "./limits";
export { DEFAULT_LIMITS } from "./limits";
export type { AlgorithmRunCommand, Plan, PlanBlock, PlanEffect, SessionCommand } from "./planning";
export { isAlgorithmRunCommand } from "./planning";
export type {
    RecipeColumn,
    RecipeDocument,
    RecipeIgnoredIssue,
    RecipeJoin,
    RecipeLeftOutCode,
    RecipeSource,
} from "./recipe";
export type { CodedFact, ColumnRef, ProgressChange, ResultRef } from "./shared";
export type { LoadStyleReport } from "./styles/fileStyles/apply";
export type {
    ExportStyleLossCode,
    FileStyleCode,
    FileStyleNoteCode,
    FileStyleTranslationCode,
} from "./styles/fileStyles/codes";
export {
    EXPORT_STYLE_LOSS_CODES,
    FILE_STYLE_CODES,
    FILE_STYLE_ISSUE,
    FILE_STYLE_TRANSLATION_ISSUE,
} from "./styles/fileStyles/codes";
export type {
    FileStyleMappingKind,
    FileStyleMeaning,
    FileStyleOrigin,
    FileStyleReason,
    FileStyleRole,
    FileStyleRuleOrigin,
} from "./styles/fileStyles/origin";
export { FILE_STYLE_REASONS, fileStyleOf } from "./styles/fileStyles/origin";
export type { FileStyleKind } from "./styles/fileStyles/path";
export type { FileStyleShapeTable } from "./styles/fileStyles/shapes";
export { FILE_STYLE_SHAPES } from "./styles/fileStyles/shapes";
export type { FileStyleColumnValues, FileStyleLoadValues, FileStyleScalar } from "./styles/fileStyles/store";
export type { FileStyleNote, FileStyleOptions } from "./styles/fileStyles/translate";
export type {
    ColumnHistogram,
    ColumnRole,
    CommandOutcome,
    CommandOutcomeMap,
    ComponentStatistics,
    CreateGraphSessionOptions,
    DataSourceDescriptor,
    DataSourceInput,
    DraftColumn,
    DraftRow,
    DraftRowFilter,
    DraftRowOptions,
    DraftTable,
    EdgeEnd,
    EdgePageOptions,
    EdgeRecord,
    EdgeRecordInput,
    ElementSession,
    Endpoint,
    FileStyleSummary,
    FileStyleTool,
    FindAtLeastRow,
    FindContainsRow,
    FindEnd,
    FindHit,
    FindHitBase,
    FindKind,
    FindMatchValue,
    FindNamedRow,
    FindOptions,
    FindResult,
    FindValueRow,
    GraphSession,
    GraphSettingKey,
    GraphStatistics,
    HistoryCause,
    HistoryClearOptions,
    HistoryCode,
    HistoryOutcome,
    HistoryStep,
    HistoryStepId,
    ImportOptions,
    JoinChoices,
    JoinKey,
    JoinRecord,
    JoinReport,
    JoinShape,
    JoinSuggestion,
    JoinWarning,
    LeftOutEdge,
    LoadChoices,
    LoadDraft,
    LoadedSource,
    LoadedSourceKind,
    LoadedWeight,
    LoadMapping,
    LoadMappingRead,
    LocationColumns,
    LocationKind,
    LocationUnused,
    LocationUsing,
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
    RemoveSourceResult,
    ReplaceCounts,
    ReplaceReport,
    ReplaceUnboundCode,
    ResultCell,
    ResultColumn,
    ResultColumnDescriptor,
    ResultSort,
    RowUpdate,
    RunPlacement,
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
    SettingEffect,
    SettingEffectCode,
    StyleProblem,
    TableMapping,
    TableMappingRead,
    TransactionOptions,
    TransactionScope,
    TypeChangePreview,
    ValueCounts,
    ValueType,
} from "./types";
export { COMPONENT_SIZE_CAP } from "./types";
