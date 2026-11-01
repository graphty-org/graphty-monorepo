// Pull request runs that failed on tests the pull request touched (issue #3951, design section 4.2): the trigger for
// turning merge batching back on. A finished attempt-1 ci.yml pull request run is marked `prCaused` true when the
// change failed it (failureCause "change", so not infrastructure or a check shared with master) on a recorded test
// that has no flaky detection in 28 days and whose file the change touched; false otherwise. Changed files come
// from one GraphQL query per cycle (pullRequest.files), and only when a candidate has such a failure.

import type { RunItem } from "../model/items.js";
import { isLive, type Store } from "../model/store.js";
import { flakyHistory, testKey } from "./flaky.js";
import type { GitHub } from "./github.js";

const FINISHED = new Set(["success", "failure", "timed_out", "startup_failure"]);

/**
 * The tests still `failed` in one run attempt (RUNTESTS rows, items.ts), as file and name.
 * @param store - the metrics store
 * @param runId - the workflow run id
 * @param attempt - the run attempt
 * @param now - the current time, in ms
 * @returns the failed tests
 */
export async function failedTests(
    store: Store,
    runId: number,
    attempt: number,
    now: number,
): Promise<{ file: string; name: string }[]> {
    const rows = (await store.query(`RUNTESTS#${runId}`, { from: `${attempt}#`, to: `${attempt}#￿` })).filter(
        (r) => isLive(r, now) && r.outcome === "failed",
    );
    return rows.map((r) => ({ file: String(r.file), name: String(r.name) }));
}

/**
 * The change touched a test file when its diff changed the file, or changed a file in its package (the top-level
 * directory). ponytail: a package the change only reaches through a dependency is not followed; read the gate's
 * test-select record when that matters.
 * @param file - the test's file path
 * @param changed - the paths the change touched
 * @returns whether the change touched the test file
 */
export function touched(file: string, changed: readonly string[]): boolean {
    if (changed.includes(file)) {
        return true;
    }
    const slash = file.indexOf("/");
    return slash > 0 && changed.some((f) => f.startsWith(file.slice(0, slash + 1)));
}

/**
 * Each pull request's changed paths, in one GraphQL query. ponytail: the first 100 files of each; a larger change
 * almost always touches the failing package within them.
 * @param gh - the GitHub client
 * @param repo - the repository, as owner/name
 * @param prs - the pull request numbers
 * @returns each pull request's changed paths, by number
 */
export async function changedFiles(gh: GitHub, repo: string, prs: number[]): Promise<Map<number, string[]>> {
    const [owner, name] = repo.split("/");
    const fields = prs.map((n) => `p${n}: pullRequest(number: ${n}) { files(first: 100) { nodes { path } } }`);
    const data = await gh.graphql<{ repository: Record<string, { files: { nodes: { path: string }[] } } | null> }>(
        `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields.join(" ")} } }`,
        { owner, name },
    );
    return new Map(prs.map((n) => [n, data.repository[`p${n}`]?.files.nodes.map((f) => f.path) ?? []]));
}

/**
 * Sets `prCaused` on the finished attempt-1 ci.yml pull request runs among `runs` (in place).
 * @param store - the metrics store
 * @param gh - the GitHub client
 * @param repo - the repository, as owner/name
 * @param runs - this cycle's run items
 * @param now - the current time, in ms
 */
export async function markPrCaused(
    store: Store,
    gh: GitHub,
    repo: string,
    runs: RunItem[],
    now: number,
): Promise<void> {
    const due = runs.filter(
        (r) =>
            r.workflow === "ci.yml" &&
            r.event === "pull_request" &&
            r.attempt === 1 &&
            r.status === "completed" &&
            FINISHED.has(r.conclusion ?? ""),
    );
    for (const r of due) {
        r.prCaused = false;
    }
    const cands = due.filter((r) => r.cause === "change" && r.pr !== undefined && r.repo === repo);
    if (!cands.length) {
        return;
    }
    const flaky = await flakyHistory(store, now);
    const fails = new Map<RunItem, string[]>();
    for (const r of cands) {
        const files = (await failedTests(store, r.runId, 1, now))
            .filter((t) => !flaky.has(testKey(t.file, t.name)))
            .map((t) => t.file);
        if (files.length) {
            fails.set(r, files);
        }
    }
    if (!fails.size) {
        return;
    }
    let changed: Map<number, string[]>;
    try {
        changed = await changedFiles(gh, repo, [
            ...new Set([...fails.keys()].flatMap((r) => (r.pr === undefined ? [] : [r.pr]))),
        ]);
    } catch {
        // ponytail: GitHub failed this cycle; these runs stay unjudged (left out of the rate), never retried.
        for (const r of fails.keys()) {
            delete r.prCaused;
        }
        return;
    }
    for (const [r, files] of fails) {
        r.prCaused = files.some((f) => touched(f, (r.pr === undefined ? undefined : changed.get(r.pr)) ?? []));
    }
}
