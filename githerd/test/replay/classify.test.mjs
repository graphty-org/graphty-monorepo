import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { classify, othersWithKey } from "../../lib/classify.mjs";
import { createReplay } from "./replay.mjs";

/**
 * The pull request side of the record, read with `gh api` on 2026-10-03:
 *
 * - `pr-failed-jobs.jsonl`: every failed job of every failed pull request CI run in the month
 *   (`actions/runs/{id}/attempts/{n}/jobs`, the run's latest attempt), with its failed step names,
 *   runner labels and the pull request its branch belonged to.
 * - `pr-files.json`: each of those pull requests' changed files as of 2026-10-03, cut to what the
 *   classifier reads: every dependency file, plus one file per top-level directory and extension.
 */
const DATA = new URL("data/", import.meta.url);
const prJobs = readFileSync(new URL("pr-failed-jobs.jsonl", DATA), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
/** @type {Record<string, string[]>} */
const prFiles = JSON.parse(readFileSync(new URL("pr-files.json", DATA), "utf8"));
const HOUR = 3_600_000;

/**
 * Every pull request failure in time order, classified as the daemon would have on first sight:
 * other open pull requests' failures within the window make it shared.
 * @param {ReturnType<typeof createReplay>["record"]["prs"]} prs the recorded pull requests
 * @returns {{at: number, pr: number, branch: string, job: string, verdict: ReturnType<typeof classify>}[]}
 *   one entry per failed job, `All Checks Pass` left out (it only repeats the others)
 */
function replayPullRequests(prs) {
    const byNumber = new Map(prs.map((p) => [p.number, p]));
    const isOpen = (/** @type {number} */ n, /** @type {number} */ at) => {
        const p = byNumber.get(n);
        const closed = p?.closedAt ?? p?.mergedAt;
        return Boolean(p) && !(closed && Date.parse(closed) <= at);
    };
    const jobs = prJobs
        .filter((j) => j.job !== "All Checks Pass" && j.pr !== null)
        .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts) || a.jid - b.jid);
    /** @type {import("../../lib/classify.mjs").Sighting[]} */
    const seen = [];
    return jobs.map((j) => {
        const at = Date.parse(j.ts);
        const f = { workflow: "CI", job: j.job, steps: j.steps, labels: j.labels, files: prFiles[j.pr] ?? null };
        const key = classify(f).key;
        const others = othersWithKey(
            seen.filter((s) => isOpen(s.pr, at)),
            { key, pr: j.pr, at },
        );
        seen.push({ key, pr: j.pr, at });
        return { at, pr: j.pr, branch: j.branch, job: j.job, verdict: classify(f, { others }) };
    });
}

/**
 * The bursts the month's record names: the same failing job on four or more branches within three
 * hours (the method behind "ten bursts on Build and seven on Chromatic").
 * @param {ReturnType<typeof replayPullRequests>} list the classified failures
 * @returns {{job: string, items: ReturnType<typeof replayPullRequests>}[]} each burst's failures
 */
function bursts(list) {
    /** @type {Record<string, ReturnType<typeof replayPullRequests>>} */
    const byJob = {};
    for (const e of list) (byJob[e.job] ??= []).push(e);
    const out = [];
    for (const [job, es] of Object.entries(byJob)) {
        let i = 0;
        for (let k = 0; k < es.length; k++) {
            while (es[k].at - es[i].at > 3 * HOUR) i++;
            const window = es.slice(i, k + 1);
            if (new Set(window.map((e) => e.branch)).size >= 4) {
                out.push({ job, items: window });
                i = k + 1;
            }
        }
    }
    return out;
}

describe("classifier over the recorded month", () => {
    const replay = createReplay();
    const list = replayPullRequests(replay.record.prs);

    it("finds the record's 10 Build and 7 Chromatic bursts, and each is a shared incident by its second pull request", () => {
        const found = bursts(list);
        const build = found.filter((b) => b.job === "Build");
        const chromatic = found.filter((b) => b.job.startsWith("Chromatic"));
        expect(build).toHaveLength(10);
        expect(chromatic).toHaveLength(7);
        for (const b of [...build, ...chromatic]) {
            // The first shared verdict in the burst comes at the first or second pull request that
            // carries its key.
            const first = b.items.find((e) => e.verdict.class === "shared");
            expect(first, `${b.job} at ${new Date(b.items[0].at).toISOString()}`).toBeDefined();
            const prsOnKey = [...new Set(b.items.filter((e) => e.verdict.key === first?.verdict.key).map((e) => e.pr))];
            expect(prsOnKey.indexOf(/** @type {number} */ (first?.pr))).toBeLessThanOrEqual(1);
        }
    });

    it("makes every audit failure on a pull request that changes no dependency file master-side at the first", () => {
        const audits = list.filter((e) => e.verdict.key === "CI / Build / Security audit");
        const depFree = audits.filter(
            (e) =>
                !(prFiles[e.pr] ?? []).some((p) =>
                    /(?:^|\/)(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.npmrc)$/.test(p),
                ),
        );
        expect(depFree.length).toBeGreaterThan(20);
        for (const e of depFree) expect(e.verdict.class, `#${e.pr}`).toBe("shared");
        // Those with no other pull request failing yet were master-side from their file list alone.
        expect(depFree.some((e) => e.verdict.reason.startsWith("the pull request's files"))).toBe(true);
    });

    it("prints every recorded failure's class for review", async () => {
        const masterRows = replay.record.failedJobs.map((j) => {
            const log = replay.record.logs[j.jid];
            const verdict = classify(
                {
                    workflow: j.wf,
                    job: j.job,
                    steps: j.steps,
                    log: log ? `${log.errors ?? ""}\n${log.matches ?? ""}` : null,
                    // The record has no runner labels; gpu.yml sends every job but the hosted
                    // twin to the rented provider.
                    labels: j.wf === "GPU" && !j.job.includes("GitHub-hosted") ? ["machine/gpu=t4"] : ["ubuntu-latest"],
                },
                { where: "master" },
            );
            return `master  ${verdict.class.padEnd(13)} ${verdict.key}  (${verdict.reason})`;
        });
        const prRows = list.map(
            (e) =>
                `pr      ${e.verdict.class.padEnd(13)} ${e.verdict.key}  (${e.verdict.reason.replace(/\d+ other/, "N other")})`,
        );
        /** @type {Map<string, number>} */
        const counts = new Map();
        for (const r of [...masterRows, ...prRows]) counts.set(r, (counts.get(r) ?? 0) + 1);
        const text = [...counts]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([r, n]) => `${String(n).padStart(4)}  ${r}`)
            .join("\n");
        await expect(`${text}\n`).toMatchFileSnapshot("classified.txt");
    });
});
