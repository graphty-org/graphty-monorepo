// "Now" lists the collector keeps as JSON cursors and the page builder reads as tables: the pull requests waiting
// on the owner, the release attempts and workflows, the quarantine in force. A list the collector has not
// written yet reads as undefined (the section says "not collected"), never as an empty list.

import { getCursor } from "./raw.js";
import type { Store } from "./store.js";

/** The pull requests behind three PR stocks: the oldest open one, and those armed too long or green and stuck. */
export interface PrStockPrs {
    oldest?: number;
    greenStuck: number[];
    armedLong: number[];
}

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
    /** Its "Deploy the nightly site" job's result ("passed": promoted to nightly); absent on attempts read before it was kept. */
    nightly?: string;
    /** The run's conclusion ("success", "failure", "cancelled", ...). */
    conclusion?: string;
}

/** The release attempts a channel's tile shows, newest last (the design's 14 dots). */
export const CHANNEL_ATTEMPTS = 14;

/** How one release attempt of a channel ended: promoted or deployed, failed, passed but held back, or cancelled. */
export type ChannelOutcome = "ok" | "bad" | "held" | "cancelled";

/** One release attempt of a channel (#4460): a deploy-pages.yml run, a nightly promotion, a production promotion. */
export interface ChannelAttempt {
    /** Its end, epoch ms. */
    at: number;
    outcome: ChannelOutcome;
    /** The commit it deployed or tested; absent for a production promotion (the channel's ref says what it serves). */
    sha?: string;
    run: number;
}

/** The release channels' attempts the collector reads; nightly's come from the `release` cursor. */
export interface ChannelsSnapshot {
    /** deploy-pages.yml runs on master that did not skip, newest first. */
    canary: ChannelAttempt[];
    /** promote.yml runs by `<run id>.<attempt>`: a production promotion, or null for any other run (a dry run). */
    promotions: Record<string, ChannelAttempt | null>;
    /** The head of channel/nightly and channel/production: what each serves. */
    refs: { nightly?: string; production?: string };
}

/** A release workflow's newest runs (4.5, Release workflows). */
export interface WorkflowState {
    workflow: string;
    /** Completed runs created in the last 24 hours, and how many failed. */
    runs: number;
    failed: number;
    /** Newest runs failed in a row (of the runs read). */
    inRow: number;
    /** The oldest run of that streak, epoch ms. */
    since?: number;
}

/** A quarantined test: an entry of the results store's quarantine, or of tools/test-quarantine.json. */
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
    channels: ChannelsSnapshot;
    /** The pull requests behind the PR stocks (the oldest open one, armed too long, green and stuck). */
    "pr-stocks": PrStockPrs;
}

/**
 * Reads a stored snapshot, kept as JSON in the cursor of its name.
 * @param store - the table
 * @param name - snapshot name
 * @returns the snapshot, or undefined when absent or not valid JSON
 */
export async function readSnapshot<K extends keyof Snapshots>(
    store: Store,
    name: K,
): Promise<Snapshots[K] | undefined> {
    const raw = await getCursor(store, name);
    if (raw === undefined) {
        return undefined;
    }
    try {
        return JSON.parse(raw) as Snapshots[K];
    } catch {
        return undefined;
    }
}
