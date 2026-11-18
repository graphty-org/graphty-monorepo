// The release scheduler on AWS (#3608): EventBridge Scheduler invokes this at 00:00, 06:00, 12:00 and 18:00 UTC to
// start release.yml as the graphty-release-scheduler App, as tools/release-scheduler/ (the Cloudflare Worker) does.
// It runs in dry run beside the Worker -- logging the dispatch it would make and dispatching nothing -- until it has
// fired every slot for two weeks; RELEASE_DISPATCH=live switches it on, in the change that deletes the Worker.

import { ssmGetParams } from "../collector/aws.js";
import { DISPATCH_APP_PARAMS, type Fetch, GitHub, installationToken, readAppConfig } from "../collector/github.js";

/** The one dispatch the scheduler makes per slot: the Worker's, byte for byte. */
export const RELEASE_DISPATCH = {
    path: "repos/graphty-org/graphty-monorepo/actions/workflows/release.yml/dispatches",
    body: { ref: "master", inputs: { scheduled: "true", mode: "full" } },
} as const;

/** What one slot did; `releaseScheduler` is the switch it ran under. */
export interface SlotReport {
    releaseScheduler: "dry-run" | "live";
    slot: string;
    dispatched: boolean;
    dispatch: typeof RELEASE_DISPATCH;
}

/**
 * Runs one slot: in dry run logs the dispatch and returns; live posts it through `post`.
 * @param slot - the scheduled time this run is for (ISO)
 * @param live - true only when RELEASE_DISPATCH is "live"
 * @param post - posts a body to a GitHub API path as the release-scheduler App (called only when live)
 * @returns what the slot did, also logged as one JSON line
 */
export async function runSlot(
    slot: string,
    live: boolean,
    post: (path: string, body: unknown) => Promise<void>,
): Promise<SlotReport> {
    const report: SlotReport = {
        releaseScheduler: live ? "live" : "dry-run",
        slot,
        dispatched: false,
        dispatch: RELEASE_DISPATCH,
    };
    if (live) {
        await post(RELEASE_DISPATCH.path, RELEASE_DISPATCH.body);
        report.dispatched = true;
    }
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return report;
}

/**
 * A poster signed in as the release-scheduler App, its key read from SSM only when a post is made.
 * @param getParams - reads SSM parameters by name
 * @param f - the fetch to call GitHub with
 * @returns the poster
 */
export function appPoster(
    getParams: (names: string[]) => Promise<Record<string, string>>,
    f: Fetch = fetch,
): (path: string, body: unknown) => Promise<void> {
    return async (path, body) => {
        const app = await readAppConfig(getParams, DISPATCH_APP_PARAMS);
        if (!app) {
            throw new Error("release scheduler: the release-scheduler App's SSM parameters are missing");
        }
        await new GitHub(() => installationToken(app, f, Date.now()), f).post(path, body);
    };
}

/**
 * The scheduled entry point.
 * @param event - the schedule's input
 * @param event.slot - the slot's scheduled time (`<aws.scheduler.scheduled-time>`)
 * @returns what the slot did
 */
export function handler(event: { slot?: string } = {}): Promise<SlotReport> {
    return runSlot(
        event.slot ?? new Date().toISOString(),
        process.env.RELEASE_DISPATCH === "live",
        appPoster(ssmGetParams()),
    );
}
