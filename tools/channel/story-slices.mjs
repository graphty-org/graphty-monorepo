#!/usr/bin/env node
// story-slices.mjs -- the rolling screenshot slices (design/visual-testing/early-capture.md, 4a and 4c).
//
//   node tools/channel/story-slices.mjs plan --sha <X> --bins <n>
//       Which story units commit X's slice renders: the units the merges since the last sliced commit reach, then
//       every other unit oldest first, packed into at most n bins of STORY_BIN_LIMIT_MS (never stretched). Prints
//       `matrix=<json>` and `count=<n>` for $GITHUB_OUTPUT; the why goes to stderr.
//   node tools/channel/story-slices.mjs reach --plan <light-plan.json> --sha <X>
//       Posts the story units master commit X's merge reaches (ci.yml's select-graphs job), from
//       tools/test-select.mjs --plan for HEAD^1..HEAD.
//   node tools/channel/story-slices.mjs post --project <p> --results <results.json>
//       --files <json> --sha <X> --tree <visual-baselines tree> --artifact <name>
//       Posts one bin's renders and, when the capture finished, the units it captured whole. Then tells the owner's
//       phone (Pushover, PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY) when the rolling review queue went from empty to
//       non-empty, at most every 2 hours, and once before each full-run slot while it is not empty; the store keeps
//       when each was last sent (4d). REVIEW_URL, when set, is the link it opens.
//
// Reach only ORDERS the work: every story is rendered by the rotation whatever changed, and nothing here ever
// reuses a render or skips one (the owner's rule, early-capture.md section 2, option d). Node built-ins only, so
// the plan job installs nothing. Store: RESULTS_URL and the job's OIDC token (tools/results/client.mjs).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { STORYBOOKS } from "../ci-reuse-plan.mjs";
import { push } from "../release-status.mjs";
import { call, config } from "../results/client.mjs";
import { packBins, packStoryBins, STORY_BIN_LIMIT_MS, storyCount, storyUnitPlans } from "../test-select.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
// how many first-parent commits before X the planner asks the store about (D1 binds at most 100 per query)
const REACH_COMMITS = 100;
// results.json statuses (visual-review compare.mjs and capture.mjs) as the store's; `moved` needs an accept like a
// changed picture; `excluded` and `removed` are not renders
const STATUS = {
    unchanged: "unchanged",
    changed: "changed",
    moved: "changed",
    new: "new",
    unseeded: "unseeded",
    unstable: "unstable",
    failed: "failed",
};

const keyOf = (project, unit) => `${project}:${unit}`;

/**
 * Every story unit of every visual-review project, as storyBins() would bin them for a change that runs all.
 * @param projects visual-review.config.json `projects`
 * @param listFiles (dir) => repository paths under dir
 * @param storiesIn (file) => the stories the file declares
 * @returns storyUnitPlans()
 */
export function allUnits(projects, listFiles, storiesIn) {
    const stories = Object.keys(projects).map((project) => ({ project, mode: "all", files: [], baselines: [] }));
    return storyUnitPlans(stories, projects, listFiles, {}, storiesIn);
}

/**
 * The slice's order: reached units first, then the rest; within each, oldest last whole capture first (never
 * captured is oldest), then by name.
 * @param plans allUnits()
 * @param ages Map(`<project>:<unit>` -> ms of its newest whole capture)
 * @param reached reach keys: `<project>:<file>` or `<project>:*`
 * @returns `[{ project, unit, ms, reached, at }]`
 */
export function orderUnits(plans, ages, reached) {
    const units = plans.flatMap((p) =>
        [...p.unitMs].map(([unit, ms]) => ({
            project: p.project,
            unit,
            ms,
            reached: reached.has(keyOf(p.project, "*")) || reached.has(keyOf(p.project, unit.split("#")[0])),
            at: ages.get(keyOf(p.project, unit)) ?? -Infinity,
        })),
    );
    return units.sort(
        (a, b) =>
            Number(b.reached) - Number(a.reached) ||
            a.at - b.at ||
            keyOf(a.project, a.unit).localeCompare(keyOf(b.project, b.unit)),
    );
}

/**
 * Takes units in order while every project's units still pack into `bins` bins of STORY_BIN_LIMIT_MS in all; a unit
 * that does not fit is passed over and the next one tried.
 * @param plans allUnits()
 * @param ordered orderUnits()
 * @param bins the most bins
 * @returns packStoryBins() of the chosen units, at most `bins`
 */
export function sliceBins(plans, ordered, bins) {
    const chosen = new Map(plans.map((p) => [p.project, new Map()]));
    const count = new Map();
    let total = 0;
    for (const u of ordered) {
        const units = chosen.get(u.project);
        units.set(u.unit, u.ms);
        const n = packBins([...units.keys()], units, STORY_BIN_LIMIT_MS, 0).length;
        const next = total - (count.get(u.project) ?? 0) + n;
        if (next > bins) {
            units.delete(u.unit);
            continue;
        }
        count.set(u.project, n);
        total = next;
    }
    const subset = plans.map((p) => ({ ...p, unitMs: chosen.get(p.project) })).filter((p) => p.unitMs.size > 0);
    return packStoryBins(subset, STORY_BIN_LIMIT_MS);
}

/**
 * The matrix entries of a slice, as ci-test-matrix.mjs storiesPlan() makes them for the Stories jobs.
 * @param bins sliceBins()
 * @returns `[{ name, project, artifact, storybook, files }]`
 */
export function matrixOf(bins) {
    const artifactOf = Object.fromEntries(Object.entries(STORYBOOKS).map(([name, dir]) => [dir, name]));
    return bins.map((b) => {
        if (!artifactOf[b.storybook]) throw new Error(`${b.name} names a Storybook no build uploads: ${b.storybook}`);
        return {
            name: b.name,
            project: b.project,
            artifact: artifactOf[b.storybook],
            storybook: b.storybook,
            files: b.files,
        };
    });
}

/**
 * The reach keys of one merge, from tools/test-select.mjs --plan's `stories`: a project selected whole is
 * `<project>:*`, else each selected file. Changed baselines add none: the rotation renders them like any story.
 * @param lightPlan the --plan JSON
 * @returns sorted keys
 */
export function reachKeys(lightPlan) {
    const keys = (lightPlan.stories ?? []).flatMap((s) => {
        if (s.mode === "all") return [keyOf(s.project, "*")];
        return s.mode === "files" ? s.files.map((f) => keyOf(s.project, f)) : [];
    });
    return [...new Set(keys)].sort();
}

/**
 * One bin's rows for POST /v1/story-captures: each render's status and hashes, and (when the capture finished) the
 * units it captured whole.
 * @param project the visual-review project
 * @param results the capture's results.json
 * @param files the bin's units (matrix.files)
 * @returns `{ captures, units }`
 */
export function captureRows(project, results, files) {
    const captures = (results.items ?? [])
        .filter((i) => STATUS[i.status])
        .map((i) => ({
            project,
            story: i.id,
            ...(i.mode ? { mode: i.mode } : {}),
            status: STATUS[i.status],
            ...(i.capture ? { hash: i.capture } : {}),
            ...(i.baseline ? { baselineHash: i.baseline } : {}),
        }));
    // a capture that stopped part way has not rendered its units whole: they stay old, so the next slice takes them
    const units = results.complete === true ? files.map((unit) => ({ project, unit })) : [];
    return { captures, units };
}

// The full-run slots (tools/release-scheduler), in UTC hours, and when the owner is told about a waiting queue before
// one: once, between SLOT_EARLY and SLOT_LATE before it.
const SLOT_HOURS = [0, 6, 12, 18];
const SLOT_EARLY = 90 * 60_000;
const SLOT_LATE = 30 * 60_000;
const QUEUE_EVERY = 2 * 3_600_000;

/**
 * The next full-run slot after `now`.
 * @param now ms
 * @returns ms
 */
export function nextSlot(now) {
    const day = new Date(now);
    day.setUTCHours(0, 0, 0, 0);
    for (let d = 0; d < 2; d++) {
        for (const h of SLOT_HOURS) {
            const at = day.getTime() + d * 86_400_000 + h * 3_600_000;
            if (at > now) return at;
        }
    }
    throw new Error("unreachable");
}

/**
 * What to tell the owner after a bin posted its renders.
 * @param o the facts
 * @param o.before the rolling queue's size before this bin posted
 * @param o.after its size after
 * @param o.notified `{ queue, slot }`: when each was last sent (ms or null), from the store
 * @param o.now ms
 * @returns `[{ kind, outcome, what }]`: kind is the store's notify kind, outcome release-status.mjs's
 */
export function notices({ before, after, notified, now }) {
    const out = [];
    const n = `${after} ${after === 1 ? "picture" : "pictures"}`;
    if (before === 0 && after > 0 && !(now - (notified.queue ?? -Infinity) < QUEUE_EVERY)) {
        out.push({ kind: "queue", outcome: "rolling-queue", what: `${n} changed on master` });
    }
    const slot = nextSlot(now);
    const due =
        slot - now <= SLOT_EARLY && slot - now >= SLOT_LATE && !((notified.slot ?? -Infinity) >= slot - SLOT_EARLY);
    if (after > 0 && due) {
        const hhmm = new Date(slot).toISOString().slice(11, 16);
        out.push({ kind: "slot", outcome: "rolling-slot", what: `The ${hhmm} UTC slot holds nightly for ${n}` });
    }
    return out;
}

const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }).trim();

async function plan({ sha, bins }, cfg) {
    const projects = JSON.parse(readFileSync(join(ROOT, "visual-review.config.json"), "utf8")).projects;
    const listFiles = (dir) => git(["ls-files", "--", dir]).split("\n").filter(Boolean);
    const plans = allUnits(projects, listFiles, (f) => storyCount(readFileSync(join(ROOT, f), "utf8")));
    const store = await call(cfg, "GET", "/v1/story-captures");
    if (!store.ok)
        console.error(`::warning::story-slices: no answer from the store (${store.why}); oldest first by name`);
    const ages = new Map((store.data?.units ?? []).map((u) => [keyOf(u.project, u.unit), u.at]));
    let reached = new Set();
    const last = store.data?.summary?.lastSliced?.sha;
    if (last) {
        // the merges after the last sliced commit, up to X; a shallow clone or an unknown commit just asks about fewer
        const commits = [];
        for (const c of git(["rev-list", "--first-parent", `--max-count=${REACH_COMMITS}`, sha]).split("\n")) {
            if (c === last) break;
            commits.push(c);
        }
        if (commits.length) {
            const r = await call(cfg, "GET", `/v1/story-reach?shas=${commits.join(",")}`);
            if (!r.ok) console.error(`::warning::story-slices: no reach rows (${r.why}); ordered by age alone`);
            reached = new Set((r.data?.reach ?? []).map((x) => x.unit));
        }
    }
    const ordered = orderUnits(plans, ages, reached);
    const matrix = matrixOf(sliceBins(plans, ordered, bins));
    const taken = new Set(matrix.flatMap((m) => m.files.map((f) => keyOf(m.project, f))));
    const first = ordered.filter((u) => taken.has(keyOf(u.project, u.unit)));
    console.error(
        `story-slices: ${ordered.length} units, ${ordered.filter((u) => u.reached).length} reached since ${last ?? "(none)"}; ` +
            `this slice: ${first.length} units in ${matrix.length} bins, ${first.filter((u) => u.reached).length} reached, ` +
            `${first.filter((u) => u.at === -Infinity).length} never captured`,
    );
    console.log(`matrix=${JSON.stringify({ include: matrix })}`);
    console.log(`count=${matrix.length}`);
}

async function main(argv, env) {
    const [command, ...rest] = argv;
    const { values: o } = parseArgs({
        args: rest,
        options: Object.fromEntries(
            ["sha", "bins", "plan", "project", "results", "files", "tree", "artifact"].map((k) => [
                k,
                { type: "string" },
            ]),
        ),
    });
    const cfg = config(env);
    if (command === "plan") {
        const bins = Number(o.bins);
        if (!/^[0-9a-f]{40}$/.test(o.sha ?? "") || !(bins >= 1 && bins <= 20))
            throw new Error("plan needs --sha and --bins 1..20");
        await plan({ sha: o.sha, bins }, cfg);
        return;
    }
    let path;
    let body;
    if (command === "reach") {
        path = "/v1/story-reach";
        body = { sha: o.sha, units: reachKeys(JSON.parse(readFileSync(o.plan, "utf8"))) };
    } else if (command === "post") {
        path = "/v1/story-captures";
        const rows = captureRows(o.project, JSON.parse(readFileSync(o.results, "utf8")), JSON.parse(o.files));
        body = { sha: o.sha, baselinesTree: o.tree, artifact: o.artifact, ...rows };
    } else {
        throw new Error("usage: story-slices.mjs plan|reach|post (see the file's header)");
    }
    const queue = async () => {
        const g = command === "post" ? await call(cfg, "GET", "/v1/story-captures") : null;
        return g?.ok ? g.data : null;
    };
    const before = await queue();
    const r = await call(cfg, "POST", path, body);
    if (!r.ok) throw new Error(`POST ${path}: ${r.why}`);
    console.error(`story-slices ${command}: ${JSON.stringify(r.data)} (${body.units.length} units)`);
    const after = before && (await queue());
    if (!after) return; // never a notice on a guess
    // ponytail: bins finishing together can each send the same notice once; the store's times stop a second round
    const sent = [];
    for (const n of notices({
        before: before.summary.queue,
        after: after.summary.queue,
        notified: after.notified,
        now: Date.now(),
    })) {
        const url = env.REVIEW_URL || env.RUN_URL;
        if (
            await push(
                n.outcome,
                { what: n.what, run: url, sha: o.sha, urlTitle: env.REVIEW_URL ? "Review" : "Open run" },
                env,
                fetch,
                (l) => console.error(l),
            )
        )
            sent.push(n.kind);
    }
    if (sent.length) {
        const told = await call(cfg, "POST", path, { ...body, captures: [], units: [], notified: sent });
        if (!told.ok) console.error(`::warning::story-slices: the notice times were not kept (${told.why})`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        await main(process.argv.slice(2), process.env);
    } catch (e) {
        console.error(`story-slices: ${e instanceof Error ? e.message : e}`);
        process.exit(1);
    }
}
