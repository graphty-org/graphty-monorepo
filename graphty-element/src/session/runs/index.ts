/**
 * @file Runs: starting a computation, watching it, stopping it, and finding it again.
 *
 * One door for everything a consumer needs to start an algorithm and live with the result. The
 * run object and the runs API sit in front of the element's existing operation queue rather than
 * replacing any part of it, and nothing here reaches Babylon.js, Lit or the DOM.
 */

export { ENGINE_VERSIONS } from "./engine";
export { createLocalRunQueue } from "./localQueue";
export type {
    RunBody,
    RunDefinition,
    RunExecutionContext,
    RunExecutor,
    RunOutcome,
    RunProgressReport,
    RunProgressSink,
    RunQueueContext,
    RunSurroundings,
    RunTicket,
} from "./Run";
export { ManagedRun } from "./Run";
export type { RunIdentity } from "./runId";
export {
    algorithmSlug,
    assertRunId,
    canonicalIdentity,
    canonicalize,
    canonicalizeParams,
    computeScopeDigest,
    deriveRunId,
    stableDigest,
} from "./runId";
export type { RunQueue, RunsApiOptions, SessionRunsApi } from "./RunsApi";
export { createRunsApi } from "./RunsApi";
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
    RunOptions,
    RunPhase,
    RunRecord,
    RunRemoval,
    RunsApi,
    RunScopeRecord,
    RunSpec,
    RunStatus,
    StaleNote,
    StartOptions,
    WeightMeaning,
} from "./types";
export {
    isRunId,
    isRunStatus,
    isTerminalRunStatus,
    QUEUE_POLICIES,
    RUN_ID_PATTERN,
    RUN_PHASES,
    RUN_STATUSES,
    TERMINAL_RUN_STATUSES,
} from "./types";
