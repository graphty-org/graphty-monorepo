/**
 * @file Declared algorithm results: what a run produces and how it reaches a reader.
 *
 * One door for the two parts: the shape of what an algorithm returns, and the base class that
 * runs it.
 */

export { DeclaredAlgorithm } from "./DeclaredAlgorithm";
export {
    communityFieldSpecs,
    LAYERED_GROUPING_FIELD_SPECS,
    metricFieldSpecs,
    PATH_FIELD_SPECS,
    setFieldSpecs,
} from "./fields";
export {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    declaredCaveats,
    detachedRunContext,
    forEachChunked,
    type ResultFieldSpec,
} from "./types";
