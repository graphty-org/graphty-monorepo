// The pipeline-round skill's routing rules that cost hours when they were missing: a fix for a red
// master, a failed deploy or a train hold goes alone through cut-fix from the cut (never land, verify,
// cut, and never into a cut in the owner's review), a passed verification starts a cut unless one awaits
// the owner, red deploy and release runs raise an alarm, and branches behind golden and live tool copies
// ahead of it are warned about.
//
//   node --test tools/pipeline-round-skill.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (name) => readFileSync(new URL(`../.claude/skills/pipeline-round/${name}`, import.meta.url), "utf8");
const skill = read("SKILL.md");
const flat = skill.replace(/\s*\n\s*>?\s*/g, " ");
const shared = read("shared.md");

describe("pipeline-round skill", () => {
    it("puts the flush's interim rules above every step", () => {
        assert.ok(flat.indexOf("**Interim rules") < flat.indexOf("### 1."));
        assert.match(flat, /no `land`, no `sync`; only `revert` and `cut-fix`/);
        assert.match(flat, /rollout branches of #3418 open pull requests into master/);
        assert.match(flat, /changes a screenshot\*\* gets its own immediate `ACTION NEEDED` line/);
    });

    it("sends a deploy, release or red-master fix alone through cut-fix from the cut", () => {
        assert.match(flat, /fast route: a fix for a red master build, a failed graphty\.app deploy or a train hold/);
        assert.match(flat, /node tools\/land\.mjs cut-fix --priority <branch> --reason <alarm>/);
        assert.match(flat, /never add it to a cut that awaits the owner/);
        assert.match(shared, /cut-fix <branch> --reason <issue>\|run:<id>/);
        assert.match(flat, /Leave out a fast-route branch/);
    });

    it("gives the fix prompt a worktree from origin/golden-cut", () => {
        const prompt = flat.slice(flat.indexOf("**Fix prompt**"), flat.indexOf("### 2."));
        assert.match(prompt, /worktree-new\.sh <branch> origin\/golden-cut/);
    });

    it("routes a train hold's fix by the fast route", () => {
        assert.match(flat, /Train hold:.*fix subagent by the fast route/);
    });

    it("cuts only when no cut awaits the owner", () => {
        assert.match(flat, /\*\*Make a cut\*\* when verification passed on a commit `golden-cut` lacks/);
        assert.match(flat, /`last\.status` is `passed`/);
        assert.match(
            flat,
            /git merge-base --is-ancestor <last\.commit> origin\/golden-cut` fails\), no cut awaits the owner/,
        );
        assert.match(flat, /Never cut while a cut awaits the owner/);
        assert.match(flat, /`cut` and `cut-fix` both refuse then/);
    });

    it("reads the newest deploy-pages and release runs every round and alarms when red", () => {
        assert.match(shared, /for wf in deploy-pages\.yml release\.yml; do gh run list/);
        assert.match(shared, /cut: pullRequests\(headRefName: "golden-cut"/);
        assert.match(flat, /\*\*Red deploy or release run:\*\*/);
    });

    it("warns on branches with no golden merge for 3 days", () => {
        assert.match(flat, /\*\*Behind golden:\*\*/);
        assert.match(skill, /259200/);
    });

    it("warns when a live copy holds commits golden lacks", () => {
        assert.match(flat, /\*\*Live copies ahead of golden:\*\*/);
        assert.match(skill, /for w in gate-live land-live/);
    });
});
