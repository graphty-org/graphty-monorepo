import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { selectGroups } from "../../../webgpu-graph-algorithms/scripts/bench-groups.js";

import { classify } from "../../lib/classify.mjs";
import { emptyFacts, foldRuns } from "../../lib/lanes.mjs";
import { mergeDecision } from "../../lib/prs.mjs";
import { createReplay } from "./replay.mjs";

/**
 * `pr-merged.json`: every merged pull request of the record, read with `gh api` on 2026-10-03
 * (`pulls/{n}/files` and `pulls/{n}/commits`), cut to what the merge decision reads. Paths are
 * kept to two segments (three under `.github/`) with a trailing `/` when cut, dependency files
 * whole; commits are counted, and only the breaking ones are kept (subject plus any
 * `BREAKING CHANGE` line).
 *
 * What the record cannot say, and what the replay assumes instead:
 *
 * - Which pull request was an incident's fix: none is exempt, so a fix merged on a red lane shows
 *   as held in the printed list.
 * - Added packages and npm's answer, the release dry-run, owner items, githerd jobs, whether the
 *   release job was running: none (lines 4, 6, 7 and 8 and the release hold are unit tested).
 * - Labels: the final ones.
 */
const merged = /** @type {Record<string, {files: string[], commitCount: number, breakingCommits: string[]}>} */ (
    JSON.parse(readFileSync(new URL("data/pr-merged.json", import.meta.url), "utf8"))
);
const OWNER = "apowers313";
const MASTER = "repos/graphty-org/graphty-monorepo/actions/runs?branch=master&per_page=100";
/**
 * The `paths` globs of hosts.yml's `pull_request` trigger, as prefixes (`x/**`) or whole paths.
 * @returns {string[]} the globs
 */
function hostsPaths() {
    const text = readFileSync(new URL("../../../.github/workflows/hosts.yml", import.meta.url), "utf8");
    // The trigger's own keys (branches, paths) are the lines indented 8 under it.
    const lines = text.split("\n");
    const at = lines.indexOf("    pull_request:");
    const block = lines
        .slice(at + 1)
        .filter((_, i, rest) => rest.slice(0, i + 1).every((l) => l.startsWith("        ")));
    const paths = at < 0 ? undefined : block.find((l) => l.trimStart().startsWith("paths:"));
    if (!paths) throw new Error("hosts.yml has no pull_request paths");
    return [...paths.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}
const HOSTS_GLOBS = hostsPaths();

/**
 * Whether a gating lane can affect a pull request, from the sources the design cites rather than
 * from the merge decision: CI from anything; Hosts from the paths of hosts.yml's pull request
 * trigger; GPU from a file `scripts/bench-groups.js` maps to a benchmark group (every file under
 * the package's src/, so one group with an empty set stands for all of them), the lane's scripts
 * and benchmarks, and gpu.yml.
 * @param {string} workflow the lane
 * @param {string[]} files the recorded changed paths (cut paths end in `/`)
 * @returns {boolean} true when it can
 */
function canAffect(workflow, files) {
    if (workflow === "Hosts") {
        return files.some((f) => HOSTS_GLOBS.some((g) => (g.endsWith("/**") ? f.startsWith(g.slice(0, -2)) : f === g)));
    }
    if (workflow === "GPU") {
        const benched = selectGroups(files, new Map([["any", new Set()]])).groups.length > 0;
        return (
            benched ||
            files.some(
                (f) =>
                    f.startsWith("webgpu-graph-algorithms/scripts/") ||
                    f.startsWith("webgpu-graph-algorithms/benchmarks/") ||
                    f === ".github/workflows/gpu.yml",
            )
        );
    }
    return true;
}

const CONFIG = { gating: /** @type {const} */ ({ CI: "required", GPU: "required", Hosts: "if-run" }), ci: "CI" };

/**
 * Every merge of the record with the code-red gating lanes at its moment and the status githerd
 * would have posted on its head just before it merged.
 * @returns {{number: number, at: string, title: string, red: string[], affected: string[],
 *   holds: Record<string, boolean>, canAffect: Record<string, boolean>,
 *   status: ReturnType<typeof mergeDecision>}[]} one entry per merge, in time order; `holds` is
 *   whether the decision holds it on line 2 with only that lane red, `canAffect` whether the lane
 *   can affect it by the workflows' own paths
 */
function replayMerges() {
    const replay = createReplay();
    const jobsByRun = new Map();
    for (const j of replay.record.failedJobs) jobsByRun.set(j.run, [...(jobsByRun.get(j.run) ?? []), j]);
    /**
     * Whether a red run is code: any failed job past class 4, or no failed job recorded.
     * @param {string} workflow the lane
     * @param {number} runId its first red run
     * @returns {boolean} true for code
     */
    const isCode = (workflow, runId) => {
        const jobs = (jobsByRun.get(String(runId)) ?? []).filter((/** @type {any} */ j) => j.job !== "All Checks Pass");
        // The record has no runner labels; gpu.yml sends every job but the hosted twin to the rented provider.
        const labels = (/** @type {string} */ job) =>
            workflow === "GPU" && !job.includes("GitHub-hosted") ? ["machine/gpu=t4"] : ["ubuntu-latest"];
        return (
            jobs.length === 0 ||
            jobs.some(
                (/** @type {any} */ j) =>
                    classify({ workflow, job: j.job, steps: j.steps, labels: labels(j.job) }, { where: "master" })
                        .class === "code",
            )
        );
    };

    const merges = replay.record.prs
        .filter((p) => p.mergedAt)
        .map((p) => ({ p, at: Date.parse(p.mergedAt) }))
        .sort((a, b) => a.at - b.at || a.p.number - b.p.number);
    // Fold the master runs answer at every moment a run starts or ends, and just before each merge.
    const times = new Set(merges.map((m) => m.at - 1));
    for (const t of replay.record.master) {
        times.add(t.created);
        for (const a of t.attempts) times.add(a.start).add(a.end);
    }
    const from = merges[0].at - 7 * 86_400_000;
    let facts = emptyFacts();
    const out = [];
    let next = 0;
    for (const t of [...times].filter((x) => x >= from).sort((a, b) => a - b)) {
        facts = foldRuns(facts, replay.answer(MASTER, t).body.workflow_runs, CONFIG, t).facts;
        while (next < merges.length && merges[next].at - 1 <= t) {
            const { p } = merges[next++];
            const redLanes = Object.keys(CONFIG.gating)
                .map((w) => ({ w, lane: facts.lanes[w] }))
                .filter(({ w, lane }) => lane?.verdict === "red" && lane.redSince && isCode(w, lane.redSince.runId))
                .map(({ w, lane }) => ({ workflow: w, since: /** @type {any} */ (lane.redSince).createdAt }));
            const rec = merged[p.number];
            const pr = {
                number: p.number,
                author: p.author?.login ?? null,
                title: p.title,
                labels: p.labels.map((/** @type {any} */ l) => l.name),
                commits: rec.breakingCommits,
                files: rec.files,
                dependencies: { added: [], unknownToNpm: [] },
                releaseBumps: [],
            };
            const status = mergeDecision(pr, { login: OWNER, redLanes });
            const affected = redLanes.filter((l) => canAffect(l.workflow, rec.files)).map((l) => l.workflow);
            const holds = Object.fromEntries(
                Object.keys(CONFIG.gating).map((w) => [
                    w,
                    mergeDecision(pr, { login: OWNER, redLanes: [{ workflow: w, since: p.mergedAt }] }).line === 2,
                ]),
            );
            out.push({
                number: p.number,
                at: p.mergedAt,
                title: p.title,
                red: redLanes.map((l) => l.workflow),
                affected,
                holds,
                canAffect: Object.fromEntries(Object.keys(CONFIG.gating).map((w) => [w, canAffect(w, rec.files)])),
                status,
            });
        }
    }
    return out;
}

describe("githerd/merge over the recorded merges", () => {
    const list = replayMerges();

    it("covers every merge of the record", () => {
        expect(list).toHaveLength(Object.keys(merged).length);
        expect(list.every((m) => m.status.state !== "pending")).toBe(true);
    });

    it("holds a merge on a red lane exactly when that lane's own paths say it can affect the merge", () => {
        for (const m of list) expect(m.holds, `#${m.number}`).toEqual(m.canAffect);
        // The record exercises both answers for both path-scoped lanes.
        for (const w of ["GPU", "Hosts"]) {
            expect(list.some((m) => m.canAffect[w])).toBe(true);
            expect(list.some((m) => !m.canAffect[w])).toBe(true);
        }
    });

    it("would have held every merge that landed while a gating lane that can affect it was red", () => {
        const onRed = list.filter((m) => m.affected.length > 0);
        expect(onRed.length).toBeGreaterThan(50);
        for (const m of onRed) expect(m.status, `#${m.number}`).toMatchObject({ state: "failure", line: 2 });
        // CI can be broken by anything, so a red CI lane holds every merge.
        expect(list.filter((m) => m.red.includes("CI")).every((m) => m.affected.includes("CI"))).toBe(true);
    });

    it("prints every merge it would have held, and every red lane it let a merge past, for review", async () => {
        const rows = list
            .filter((m) => m.status.state === "failure" || m.red.length > 0)
            .map((m) => {
                const passed = m.red.filter((w) => !m.affected.includes(w));
                const note = passed.length ? `  [red but cannot affect it: ${passed.join(", ")}]` : "";
                const what =
                    m.status.state === "failure" ? `line ${m.status.line}: ${m.status.description}` : "success";
                return `${m.at.slice(0, 16)}  #${m.number}  ${what}${note}\n    ${m.title}`;
            });
        await expect(`${rows.join("\n")}\n`).toMatchFileSnapshot("merge-decisions.txt");
    });
});
