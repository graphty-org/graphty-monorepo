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
export type {
    ComponentStatistics,
    CreateGraphSessionOptions,
    EdgeRecord,
    ElementSession,
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
} from "./types";
export { COMPONENT_SIZE_CAP } from "./types";
