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
 *   everything on its next run
 * - every changed file is inside an nx project's directory: a root file (workflows, lockfile,
 *   visual-baselines/, visual-fonts/, root configs, docs) counts as affecting every project
 * - nx does not call the project affected
 *
 * Usage: node tools/visual-capture-plan.mjs <all-projects-json> <affected-projects-json>
 *   env SKIP_UNAFFECTED_CAPTURES ("true" turns it on), PULL_REQUEST ("true" on a pull request's
 *   own run), LABELS (JSON array of the pull request's label names), BASE_REF (the base branch)
 * Prints one GITHUB_OUTPUT line: visual-skip=<JSON array of visual-review project ids>
 */

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// nx names remote-logger "@graphty/remote-logger"; every project's directory is its unscoped name.
const dirName = (project) => project.replace(/^@graphty\//, "");

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
    if (changed.some((f) => !dirs.has(f.split("/")[0]))) {
        return [];
    }
    const hit = new Set(affected.map(dirName));
    return visual.filter((p) => !hit.has(p));
}

const isMain = (() => {
    try {
        return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
    } catch {
        return false;
    }
})();

if (isMain) {
    const [all, affected] = process.argv.slice(2).map((a) => JSON.parse(a));
    const env = process.env;
    const on = env.SKIP_UNAFFECTED_CAPTURES === "true";
    const pullRequest = env.PULL_REQUEST === "true";
    const config = JSON.parse(readFileSync(new URL("../visual-review.config.json", import.meta.url), "utf8"));
    // The diff nx affected uses: from the merge base with the base branch to the checkout.
    const changed =
        on && pullRequest
            ? execFileSync("git", ["diff", "--name-only", "-z", `origin/${env.BASE_REF}...HEAD`], { encoding: "utf8" })
                  .split("\0")
                  .filter(Boolean)
            : [];
    const skip = skippedProjects({
        on,
        pullRequest,
        labels: JSON.parse(env.LABELS || "[]") ?? [],
        visual: Object.keys(config.projects),
        all,
        affected,
        changed,
    });
    console.log(`visual-skip=${JSON.stringify(skip)}`);
}
