// "Now" lists the collector keeps as JSON cursors and the page builder reads as tables: the pull requests waiting
// on the owner, the release attempts and workflows, the committed quarantine list. A list the collector has not
// written yet reads as undefined (the section says "not collected"), never as an empty list.

import { getCursor } from "./raw.js";
import type { Store } from "./store.js";

/** An open pull request with auto-merge off by rule (4.2). */
export interface OwnerWait {
    number: number;
    title: string;
    /** Ready for review (or created), epoch ms. */
    since: number;
    /** CODEOWNERS patterns its files match, leading "/" dropped (".github/"). */
    paths: string[];
    breaking: boolean;
    /** Hold labels it carries (hold, needs-decision). */
    labels: string[];
}

/** One lane's jobs in a release attempt. */
export interface LaneJob {
    /** The job's name, or the lane's name when the lane ran several jobs. */
    job: string;
    n: number;
    /** First start to last end, seconds. */
    s: number;
    /** The newest failed job's end, epoch ms. */
    redAt?: number;
}

/** Release modes that test nothing new by design (a promotion, a hold's end, a held candidate's re-test). */
export const NOT_A_TRAIN = new Set(["promote-nightly", "abandon", "candidate"]);

/** One release.yml run attempt, keyed `<run id>.<attempt>` in the `release` cursor. */
export interface ReleaseSeen {
    sha: string;
    /** Last update (its end), epoch ms. */
    at: number;
    tested: boolean;
    red: string[];
    ciFailed: boolean;
    run?: number;
    /** Its mode ("full", "restart", "candidate", "promote-nightly", ...), from the run title. */
    mode?: string;
    /** Its start (the train's slot), epoch ms. */
    created?: number;
    ok?: boolean;
    lanes?: Record<string, string>;
    jobs?: Record<string, LaneJob>;
    /** The first job that failed, for an attempt that failed before any lane. */
    failedJob?: string;
}

/** A release workflow's newest runs (4.5, Release workflows). */
export interface WorkflowState {
    workflow: string;
    /** Completed runs created in the last hour, and how many failed. */
    runs: number;
    failed: number;
    /** Newest runs failed in a row (of the runs read). */
    inRow: number;
    /** The oldest run of that streak, epoch ms. */
    since?: number;
}

/** An entry of tools/test-quarantine.json. */
export interface QuarantineEntry {
    file: string;
    name: string;
    family?: string;
    issue?: number;
    since?: string;
    expires?: string;
}

/** A job failing chronically (4.3, collector/jobs.ts), gating or not. */
export interface ChronicJob {
    workflow: string;
    /** Its name, bins and shards folded ("CI / Test (graphty-element-browser)"). */
    job: string;
    /** Its newest runs read (at most 10), and how many of them failed. */
    runs: number;
    failed: number;
    /** Its newest pass in the history read (14 days); absent: none. */
    lastPassAt?: number;
    /** The oldest run of its newest unbroken run of failures. */
    failingSince?: number;
    /** An open issue naming it. */
    issue?: number;
}

export interface Snapshots {
    "owner-wait": OwnerWait[];
    release: Record<string, ReleaseSeen>;
    "release-workflows": WorkflowState[];
    quarantine: QuarantineEntry[];
    codeowners: string[];
    "chronic-jobs": ChronicJob[];
    /** The jobs allowed to fail (job-level continue-on-error in ci.yml), by name; `${{ }}` matches anything. */
    "non-gating": string[];
    /** Every job ci.yml on master defines, by name; `${{ }}` matches anything. */
    "ci-jobs": string[];
}

/**
 * @param store
 * @param name
 */
export async function readSnapshot<K extends keyof Snapshots>(
    store: Store,
    name: K,
): Promise<Snapshots[K] | undefined> {
    const raw = await getCursor(store, name);
    if (raw === undefined) return undefined;
    try {
        return JSON.parse(raw) as Snapshots[K];
    } catch {
        return undefined;
    }
}
