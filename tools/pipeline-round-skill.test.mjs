// The pipeline-round skill's routing rules that cost hours when they were missing: a fix for a red
// master, a failed deploy or a train hold goes alone through cut-fix from the cut (never land, verify,
// cut, and never into a cut in the owner's review), and a passed verification starts a cut.
//
//   node --test tools/pipeline-round-skill.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const skill = readFileSync(new URL("../.claude/skills/pipeline-round/SKILL.md", import.meta.url), "utf8");
const flat = skill.replace(/\s*\n\s*>?\s*/g, " ");

describe("pipeline-round skill", () => {
    it("sends a deploy, release or red-master fix alone through cut-fix from the cut", () => {
        assert.match(flat, /fast route: a fix for a red master build, a failed graphty\.app deploy or a train hold/);
        assert.match(flat, /node tools\/land\.mjs cut-fix --priority <branch>/);
        assert.match(flat, /never add it to a cut that is in the owner's review/);
        assert.match(flat, /Leave out a fast-route branch/);
    });

    it("gives the fix prompt a worktree from origin/golden-cut", () => {
        const prompt = flat.slice(flat.indexOf("**Fix prompt**"), flat.indexOf("### 2."));
        assert.match(prompt, /worktree-new\.sh <branch> origin\/golden-cut/);
    });

    it("routes a train hold's fix by the fast route", () => {
        assert.match(flat, /Train hold:.*fix subagent by the fast route/);
    });

    it("cuts when a verification passed on a commit golden-cut lacks", () => {
        assert.match(flat, /verify\.json` says `last\.status` is `passed`/);
        assert.match(flat, /not on `origin\/golden-cut`/);
    });
});
