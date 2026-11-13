// Pull request runs that failed on tests the pull request touched (issue #3951, design section 4.2): the trigger for
// turning merge batching back on. A finished attempt-1 ci.yml pull request run is marked `prCaused` true when the
// change failed it (failureCause "change", so not infrastructure or a check shared with master) on a recorded test
// that has no flaky detection in 28 days, did not also fail the same way (same error signature) in another pull
// request's run or a run with no pull request within a day (a shared failure: master or a flake, not the change;
// two changes each failing one contract test fail it with different messages), and whose file the change touched;
// false otherwise. Changed files come from one GraphQL query per cycle (pullRequest.files), and only when a
// candidate has such a failure.

import { DAY, homeKey, type RunItem, skTime } from "../model/items.js";
import { isLive, type Item, type Store } from "../model/store.js";
import { flakyHistory, testKey } from "./flaky.js";
import type { GitHub } from "./github.js";

const FINISHED = new Set(["success", "failure", "timed_out", "startup_failure"]);
/** How far apart two pull requests' failures of one test still make it a shared failure. */
const SHARED_MS = DAY;

/**
 * The other runs (by run id) that failed, or were flaky on, the test with the same signature within SHARED_MS of `at`, from its file's
 * history (TESTH, items.ts, read once per file per cycle); only CI rows, whose invocation id starts with the run id.
 * @param rowsOf - the file's history rows over the last two days, cached
 * @param t - the test, as file and name
 * @param t.file - the test's file path
 * @param t.name - the test's full name
 * @param t.signature - the failure's error signature
 * @param runId - the run being judged, left out
 * @param at - when the run being judged finished, in ms
 * @returns the other runs' ids
 */
async function otherRuns(
    rowsOf: (file: string) => Promise<Item[]>,
    t: { file: string; name: string; signature: string },
    runId: number,
    at: number,
): Promise<number[]> {
    const ids = (await rowsOf(t.file)).flatMap((r) => {
        const near = r.name === t.name && r.signature === t.signature && Math.abs(Number(r.seenAt) - at) <= SHARED_MS;
        const run = near && r.source === "ci" ? /^(\d+)\./.exec(String(r.invocation)) : null;
        return run && Number(run[1]) !== runId ? [Number(run[1])] : [];
    });
    return [...new Set(ids)];
}

/**
 * The tests still `failed` in one run attempt (RUNTESTS rows, items.ts), as file, name and error signature.
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
): Promise<{ file: string; name: string; signature: string }[]> {
    const rows = (await store.query(`RUNTESTS#${runId}`, { from: `${attempt}#`, to: `${attempt}#￿` })).filter(
        (r) => isLive(r, now) && r.outcome === "failed",
    );
    return rows.map((r) => ({ file: String(r.file), name: String(r.name), signature: String(r.signature) }));
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
 * @returns earlier runs, stored with prCaused true, that a shared failure found this cycle makes false
 */
export async function markPrCaused(
    store: Store,
    gh: GitHub,
    repo: string,
    runs: RunItem[],
    now: number,
): Promise<RunItem[]> {
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
        return [];
    }
    const flaky = await flakyHistory(store, now);
    const fails = new Map<RunItem, string[]>();
    const unmarked = new Map<number, RunItem>();
    const judged = new Set(due.map((r) => r.runId));
    const history = new Map<string, Promise<Item[]>>();
    const rowsOf = (file: string): Promise<Item[]> => {
        let rows = history.get(file);
        if (!rows) {
            rows = store
                .query(`TESTH#${file}`, { from: skTime(now - 2 * SHARED_MS) })
                .then((all) => all.filter((r) => isLive(r, now)));
            history.set(file, rows);
        }
        return rows;
    };
    for (const r of cands) {
        const files: string[] = [];
        for (const t of await failedTests(store, r.runId, 1, now)) {
            if (flaky.has(testKey(t.file, t.name))) {
                continue;
            }
            const shared = await sharedWith(store, rowsOf, r, t);
            if (!shared.length) {
                files.push(t.file);
            }
            // An earlier run of another pull request counted on the same test is not its change's either.
            for (const o of shared) {
                if (o.prCaused && !judged.has(o.runId) && !unmarked.has(o.runId)) {
                    unmarked.set(o.runId, { ...o, prCaused: false });
                }
            }
        }
        if (files.length) {
            fails.set(r, files);
        }
    }
    const out = [...unmarked.values()];
    if (!fails.size) {
        return out;
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
        return out;
    }
    for (const [r, files] of fails) {
        r.prCaused = files.some((f) => touched(f, (r.pr === undefined ? undefined : changed.get(r.pr)) ?? []));
    }
    return out;
}

/**
 * The other runs that failed the test the same way within SHARED_MS, of another pull request or of none (master, a full run):
 * with any, the failure is shared, not the change's. A run of the same pull request (an earlier push) is its own.
 * @param store - the metrics store
 * @param rowsOf - a file's history rows, cached (otherRuns)
 * @param r - the run being judged
 * @param t - the failed test
 * @param t.file - the test's file path
 * @param t.name - the test's full name
 * @param t.signature - the failure's error signature
 * @returns the other runs' stored items; a run not stored yet is left out
 */
async function sharedWith(
    store: Store,
    rowsOf: (file: string) => Promise<Item[]>,
    r: RunItem,
    t: { file: string; name: string; signature: string },
): Promise<RunItem[]> {
    const out: RunItem[] = [];
    for (const id of await otherRuns(rowsOf, t, r.runId, r.completedAt ?? 0)) {
        const o = (await store.get(homeKey({ kind: "run", id: `${r.repo}/${id}`, attempt: 1 }))) as
            (RunItem & { pk?: string; sk?: string; ttl?: number }) | undefined;
        if (o && o.pr !== r.pr) {
            const { pk: _pk, sk: _sk, ttl: _ttl, ...item } = o;
            out.push(item);
        }
    }
    return out;
}
