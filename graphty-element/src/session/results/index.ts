/**
 * @file What a run produced, and how a consumer reads it.
 *
 * Three things live behind this entry point and they answer three different questions. `./types`
 * says what the ten result shapes must publish and what each field name means, so a path is
 * guessable without the catalogue. `./RunResult` turns what an algorithm produced into an object
 * carrying its own ranking, distribution, range and bounded summary, so no consumer writes
 * statistics code. `./ResultsApi` builds the `results.<runId>.<field>` path and answers "did you
 * mean" for the ones that do not resolve.
 *
 * Nothing in this module's import graph reaches Babylon.js, Lit or the DOM.
 */

export { defaultReading } from "./reading";
export { createResultsApi, type ResultsRunEntry } from "./ResultsApi";
export { createRunResult, type ResultElementValues } from "./RunResult";
export {
    checkShapeContract,
    type Histogram,
    type HistogramBin,
    type HistogramBinning,
    type HistogramOptions,
    type Normalization,
    type NumericColumnView,
    type RankingEntry,
    type ReadingOptions,
    RESULT_FIELD_NAMES,
    RESULT_PATH_RUN_PLACEHOLDER,
    RESULT_ROOT,
    RESULT_SHAPE_CONTRACTS,
    resultPath,
    type ResultsApi,
    type ResultSummary,
    type RunRef,
    type RunResult,
    type SummaryEntry,
    type SummaryGroup,
    type TopRanking,
} from "./types";
