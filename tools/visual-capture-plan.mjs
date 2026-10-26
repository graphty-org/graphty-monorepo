#!/usr/bin/env node
/**
 * visual-capture-plan.mjs -- the Storybook projects a pull request run of ci.yml leaves uncaptured.
 *
 * Capturing all five Storybooks costs about 453 runner hours a week, and about a third of that is
 * spent on Storybooks the pull request cannot change. ci.yml's build job calls this once; each
 * "visual (<project>)" job it names writes the not-affected marker (skipped.json) instead of
 * capturing, and the trusted gate accepts that marker on a pull request's own run only
 * (visual-review/trusted/gate.mjs). A project is left out only when ALL of these hold:
 *
 * - the switch is on (ci.yml's SKIP_UNAFFECTED_CAPTURES; off until master's gate accepts the marker)
 * - the run is a pull request's own run, not a merge-queue draft, master or a dispatch: the queue
 *   captures every project before anything merges, which is what makes trusting this pull
 *   request-controlled list acceptable
 * - the pull request does not carry the `dequeued` label: one ejected from the queue captures
 *   everything on its next run. The label is read from the event payload, so it takes a new push
 *   (not a re-run, which replays the old payload) to start that run
 * - every changed file is inside an nx project's directory, or is a workflow or a tool no Storybook reads
 *   (NOT_DRAWN): any other root file (lockfile, visual-baselines/, visual-fonts/, root configs, docs)
 *   counts as affecting every project
 * - nx does not call the project affected
 *
 * Usage: node tools/visual-capture-plan.mjs <all-projects-json> <affected-projects-json>
 *   env SKIP_UNAFFECTED_CAPTURES ("true" turns it on), PULL_REQUEST ("true" on a pull request's
 *   own run), LABELS (JSON array of the pull request's label names), BASE_REF (the base branch)
 * Prints two GITHUB_OUTPUT lines: visual-skip=<JSON array of visual-review project ids>, and
 * visual-on=<JSON array>, the projects captured a second time in the On configuration (onCaptureProjects)
 *
 *        node tools/visual-capture-plan.mjs --affected <affected-projects-json>
 * Prints the visual-review projects those nx projects can change, one per line (tools/visual-preview.sh).
 */

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// nx names remote-logger "@graphty/remote-logger"; every project's directory is its unscoped name.
const dirName = (project) => project.replace(/^@graphty\//, "");

// A visual-review project that is not an nx project of its own, and the nx projects whose changes
// can change its drawings: the style fidelity Storybook is part of graph-io and draws with
// graphty-element's source.
const DRAWN_BY = { "graph-io-fidelity": ["graph-io", "graphty-element"] };

// Root files no Storybook build or capture reads: the workflows other than ci.yml (which sets up the
// capture browser, its fonts and this plan step) and the repository's tools, except the brand theme a
// Storybook's manager imports and this planner itself. .github/actions/ (the capture browser's system
// packages and fonts) still counts as a root file. A pull request that changes only these and package files
// is judged by its packages alone. The full run captures every project on master every 6 hours, which is
// the backstop now that no merge queue captures before a merge.
const DRAWN_ROOT = new Set([
    ".github/workflows/ci.yml",
    "tools/storybook-brand-theme.mjs",
    "tools/visual-capture-plan.mjs",
    "tools/ci-reuse-plan.mjs",
]);
const NOT_DRAWN = (f) => (f.startsWith(".github/workflows/") || f.startsWith("tools/")) && !DRAWN_ROOT.has(f);

/**
 * The visual-review projects a run may leave uncaptured.
 * @param input what the run knows
 * @param input.on the switch
 * @param input.pullRequest whether this is a pull request's own run (not the queue, master or a dispatch)
 * @param input.labels the pull request's label names
 * @param input.visual the visual-review project ids
 * @param input.all every nx project
 * @param input.affected the nx projects nx calls affected
 * @param input.changed the files the pull request changes
 * @returns the projects to skip; empty means capture everything
 */
export function skippedProjects({ on, pullRequest, labels, visual, all, affected, changed }) {
    if (!on || !pullRequest || labels.includes("dequeued") || changed.length === 0) {
        return [];
    }
    const dirs = new Set(all.map(dirName));
    if (changed.some((f) => !NOT_DRAWN(f) && !dirs.has(f.split("/")[0]))) {
        return [];
    }
    const captured = affectedVisual(visual, affected);
    return visual.filter((p) => !captured.includes(p));
}

/**
 * The visual-review projects whose drawings the affected nx projects can change.
 * @param visual - the visual-review project ids
 * @param affected - the nx projects nx calls affected
 * @returns the affected visual-review projects
 */
export function affectedVisual(visual, affected) {
    const hit = new Set(affected.map(dirName));
    return visual.filter((p) => (DRAWN_BY[p] ?? [p]).some((d) => hit.has(d)));
}

/**
 * The files a pull request changes. Renames are listed as a delete and an add, so a root file moved
 * into a package still counts as a root change.
 * @param range the diff range; ci.yml's is the one nx affected uses, from the merge base with the
 *     base branch to the checkout
 * @param cwd the repository
 * @returns the changed paths
 */
export function changedFiles(range, cwd = process.cwd()) {
    return execFileSync("git", ["diff", "--name-only", "--no-renames", "-z", range], { cwd, encoding: "utf8" })
        .split("\0")
        .filter(Boolean);
}

const isMain = (() => {
    try {
        return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
    } catch {
        return false;
    }
})();

const visualProjects = () =>
    Object.keys(JSON.parse(readFileSync(new URL("../visual-review.config.json", import.meta.url), "utf8")).projects);

/** The story URL query that switches every declared experiment on (graphty-element/.storybook/preview.ts). */
export const ON_CAPTURE_QUERY = "features=all";

/**
 * The visual-review projects captured a second time in the "On" configuration
 * (design/ci/channels-pipeline/features.md, section 7.3), with VISUAL_REVIEW_STORY_QUERY=ON_CAPTURE_QUERY:
 * graphty-element's Storybook, the only one whose preview reads `?features=`. Like the On test shards, a full
 * run only, never a pull request, and only while graphty-element declares an experiment (with none, On equals
 * Off). ci.yml's features-on-visual job uploads it as features-on-visual-<project>, never visual-*, so pull request captures, the gate
 * and the baselines are unchanged.
 * @param run the run
 * @param run.pullRequest a pull request's own run
 * @param run.declared graphty-element declares an experiment (features-on.mjs FEATURES_DECLARED)
 * @returns visual-review project ids
 */
export function onCaptureProjects({ pullRequest, declared }) {
    return declared && !pullRequest ? ["graphty-element"] : [];
}

if (isMain && process.argv[2] === "--affected") {
    for (const p of affectedVisual(visualProjects(), JSON.parse(process.argv[3]))) console.log(p);
} else if (isMain) {
    const [all, affected] = process.argv.slice(2).map((a) => JSON.parse(a));
    const env = process.env;
    const on = env.SKIP_UNAFFECTED_CAPTURES === "true";
    const pullRequest = env.PULL_REQUEST === "true";
    const changed = on && pullRequest ? changedFiles(`origin/${env.BASE_REF}...HEAD`) : [];
    const skip = skippedProjects({
        on,
        pullRequest,
        labels: JSON.parse(env.LABELS || "[]") ?? [],
        visual: visualProjects(),
        all,
        affected,
        changed,
    });
    console.log(`visual-skip=${JSON.stringify(skip)}`);
    // imported here only: tools/visual-preview.sh runs --affected from a copy of this file alone
    const { FEATURES_DECLARED: declared } = await import("./features-on.mjs");
    console.log(`visual-on=${JSON.stringify(onCaptureProjects({ pullRequest, declared }))}`);
}
