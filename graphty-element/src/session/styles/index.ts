/**
 * @file Style layers: what a layer is, what it paints, and the stack a session holds.
 *
 * Seven things live under this directory. `./selector` and `./predicate` are the selector engine
 * -- what a layer matches, compiled once into a closure rather than parsed per element.
 * `./channels` and `./scales` are the vocabulary -- the closed set of properties a layer can
 * paint and the closed set of ways a value becomes one. `./encoding` and `./EncodingSpec` are
 * how a run's measurement becomes paint, declared rather than evaluated. `./derive` and
 * `./autoApply` are what a run draws by itself: the suggestion its shape calls for, and the one
 * policy that applies it on a first completion. `./legend` and `./explain` are what a reader is
 * told: the legend of the whole picture, and why one element looks the way it does. `./Layer` is
 * the layer itself, the check every layer passes before it is accepted, and the seam a repaint
 * plugs into. `./StylesApi` is the stack and the verbs that change it, and it is the one door --
 * everything above is reached through it.
 *
 * The two sentences to carry away: a layer is addressed by its ID and never by its place in the
 * stack, and `list()` returns the stack BOTTOM FIRST, so a layer later in the list paints over
 * one earlier in it.
 *
 * Nothing in this module's import graph reaches Babylon.js, Lit or the DOM.
 */

export type { AutoApplyPolicy, AutoApplyRun, AutoApplySources, AutoApplyStyles } from "./autoApply";
export { createAutoApplyPolicy } from "./autoApply";
export type { ColorWrite, StyleColor } from "./colors";
export type { EncodingSuggestion, HighlightSuggestion, MarkSuggestion, StyleSuggestion } from "./derive";
export { suggestStyles } from "./derive";
export type {
    BindingPreview,
    BindingPreviewBin,
    PreviewDefaultedPart,
    PreviewSpan,
    StyleAdjustmentCode,
    StyleSequence,
} from "./encoding";
export { OVERFLOW_PATTERNS, OVERFLOW_SHAPES } from "./encoding";
export type {
    ColumnEncodingSpec,
    EncodingOptions,
    EncodingProposal,
    EncodingRefusalCode,
    EncodingRun,
    EncodingSource,
    EncodingSpec,
    ParamEncodingSpec,
} from "./EncodingSpec";
export type {
    ChannelAgreement,
    ChannelCovers,
    ChannelExplanation,
    ChannelRefusalCode,
    ChannelShare,
    ExplainTarget,
    LeftOutCode,
    StyleAgreement,
    StyleContribution,
    StyleCounts,
    StyleExplanation,
    TopFactCode,
    UnboundLayer,
    UnboundLayerCode,
    UndrawnCode,
} from "./explain";
export type {
    CompiledLayer,
    Layer,
    LayerEdit,
    LayerPosition,
    LayerProblem,
    LayerRepaint,
    PathDirectory,
    RepaintContext,
    RepaintReason,
    RepaintReport,
    RepaintRequest,
    ValidationResult,
} from "./Layer";
export type {
    FieldResult,
    FieldWords,
    LegendBlock,
    LegendFact,
    LegendFactCode,
    LegendReading,
    LegendSwatch,
} from "./legend";
export { quotePath, renamePaths, rulePath } from "./predicate";
export type { ElementPaint } from "./repaint";
export type { RowEncoding, RowParts, RowSpec, RowStyle, RowTarget, RowWrite } from "./rows";
export type { RuleSelector, Selector } from "./selector";
export { selectorRule } from "./selector";
export type {
    AgreementOptions,
    BranchesView,
    DefaultPalettes,
    ElementLayerSpec,
    HighlightSpec,
    LayerPatch,
    LayerReach,
    MarkSpec,
    SessionStylesApi,
    StyleBatchChange,
    StyleChange,
    StyleFileDocument,
    StylesApi,
    StylesSources,
    StyleUpdateOptions,
    TemplateOptions,
    TemplatePosition,
    TemplateReport,
    UpdateManyResult,
} from "./StylesApi";
export { createStylesApi } from "./StylesApi";
export type { StyleRow, StyleRowId, StyleRowPin, StyleRowPlace } from "./tree";
export type { LayerGroup, ValueCategory, ValueEntryWrite, ValueGroup } from "./values";
