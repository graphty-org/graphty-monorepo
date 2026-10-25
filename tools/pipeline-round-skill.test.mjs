// The pipeline-round and issue-round skills after golden's retirement (#3418): the interim rules sit above every
// step, every change goes through its own pull request opened by tools/pr-open.sh, no skill names a land.mjs
// command that now refuses, and the subagent rules end every job with pr-open.sh.
//
//   node --test tools/pipeline-round-skill.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const skill = read(".claude/skills/pipeline-round/SKILL.md");
const flat = skill.replace(/\s*\n\s*>?\s*/g, " ");
const shared = read(".claude/skills/pipeline-round/shared.md");
const flatShared = shared.replace(/\s*\n\s*>?\s*/g, " ");
const issueRound = read(".claude/skills/issue-round/SKILL.md");
const claude = read("CLAUDE.md");

// The land.mjs commands that refuse since golden was retired (tools/land.mjs RETIRED).
const RETIRED = /land\.mjs (?:land|cut|cut-fix|ship|auto-ship|sync)\b/;

describe("pipeline-round skill", () => {
    it("puts the interim rules above every step", () => {
        assert.ok(flat.indexOf("**Interim rules") < flat.indexOf("### 1."));
        assert.match(flat, /\*\*Production is frozen\.\*\*/);
        assert.match(flat, /\*\*Screenshots still gate pull requests\.\*\*/);
        assert.match(flat, /changes a screenshot\*\* gets its own immediate `ACTION NEEDED` line/);
    });

    it("sends every fix through its own pull request from origin/master", () => {
        const prompt = flat.slice(flat.indexOf("**Fix prompt**"), flat.indexOf("### 2."));
        assert.match(prompt, /worktree-new\.sh <branch> origin\/master/);
        assert.match(prompt, /tools\/pr-open\.sh --proof <file>/);
    });

    it("handles red master first, then red pull requests, then finished branches with no pull request", () => {
        const at = (s) => flat.indexOf(s);
        assert.ok(at("### 1. Red master") < at("### 3. Red pull requests"));
        assert.ok(at("### 3. Red pull requests") < at("### 5. Finished branches with no pull request"));
        assert.match(flat, /at most 10 open at once/);
        assert.match(flat, /While master's build is red:\*\* no other pull request is opened/);
    });

    it("names no retired land.mjs command, in either skill or the shared rules", () => {
        for (const [name, text] of [
            ["pipeline-round", skill],
            ["shared", shared],
            ["issue-round", issueRound],
        ]) {
            assert.doesNotMatch(
                text.replace(/`land\.mjs land`, `cut`, `cut-fix`, `ship`, `auto-ship` and `sync` refuse/, ""),
                RETIRED,
                name,
            );
        }
        assert.doesNotMatch(skill, /golden-verified|golden-cut|verify\.mjs/);
    });

    it("ends every subagent with pr-open.sh and merges origin/master, never golden", () => {
        assert.match(flatShared, /open its pull request with `tools\/pr-open\.sh --proof <file>`/);
        assert.match(flatShared, /`git merge origin\/master` \(never rebase\)/);
        assert.doesNotMatch(shared, /origin\/golden/);
        assert.match(issueRound, /tools\/pr-open\.sh --proof <file>/);
        assert.doesNotMatch(issueRound, /origin\/golden/);
    });

    it("never arms auto-merge on a breaking change or merges past a check", () => {
        assert.match(flatShared, /never merge a pull request past a check or with `--admin`/);
        assert.match(flatShared, /never arm auto-merge on a breaking \(`!`\) change without the owner's go/);
    });
});

describe("CLAUDE.md", () => {
    it("replaces the golden landing sections with Shipping a change", () => {
        assert.match(claude, /\n## Shipping a change\n/);
        assert.doesNotMatch(claude, /\n## Landing changes \(golden-local\)\n/);
        assert.doesNotMatch(claude, /\n### Verification after landing\n/);
        assert.match(claude, /tools\/pr-open\.sh --proof <file>/);
        assert.doesNotMatch(claude, /node tools\/land\.mjs land <branch>/, "no instruction to land on golden");
    });
});
