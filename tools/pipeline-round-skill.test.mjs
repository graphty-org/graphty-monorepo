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

// The channels pipeline (design/ci/channels-pipeline.md section 12) rewrites the skill to work in this
// order, and deletes the golden landing tools. `channelsProblems` lists what keeps a skill from that
// shape. Until the rewrite (#3446) lands, the real skill's check is a todo: it runs and reports what is
// missing without failing the run; the rewrite removes the `todo` option, and the golden-era tests above
// go with it.
const ROUND_ORDER = [
    ["red master build and its reverts", /red master/i],
    ["red full run", /full run/i],
    ["flaky tests and base checks", /flaky|base check/i],
    ["budget alarms", /budget/i],
    ["held release or failed publish", /held release|failed publish/i],
    ["owner items", /owner/i],
    ["red or conflicted agent pull requests", /pull request/i],
    ["finished worktrees", /finished worktree/i],
];

const DELETED_COMMANDS =
    /\b(?:land|verify|branch-sync|queued-push-guard|prepush-tests|prepush-inputs|shard-verdict|push-base|wait-log|ship-risks|test-ledger|test-quarantine)\.mjs\b|\b(?:push-queue|prepush|prepush-source-checks|gate-snapshot|visual-preview)\.sh\b|live\.sh (?:gate|land)\b/g;

function channelsProblems(text) {
    const headings = text.split("\n").flatMap((line) => line.match(/^#{2,4}\s+(.*)/)?.slice(1) ?? []);
    const problems = [];
    let at = 0;
    for (const [name, pattern] of ROUND_ORDER) {
        const found = headings.findIndex((heading, i) => i >= at && pattern.test(heading));
        if (found === -1) {
            problems.push(`no section for "${name}" after the previous one`);
        } else {
            at = found + 1;
        }
    }
    for (const command of new Set(text.match(DELETED_COMMANDS) ?? [])) {
        problems.push(`names deleted command ${command}`);
    }
    return problems;
}

describe("pipeline-round skill in the channels order", () => {
    const ordered = ROUND_ORDER.map(([name], i) => `### ${i + 1}. ${name}\n\nBody.\n`).join("\n");

    it("accepts a skill with every section in order", () => {
        assert.deepEqual(channelsProblems(`# Round\n\n${ordered}`), []);
    });

    it("rejects a section out of order", () => {
        const swapped = ordered
            .replace("red full run", "x")
            .replace("budget alarms", "budget alarms\n\n### red full run");
        assert.deepEqual(channelsProblems(swapped), [
            'no section for "flaky tests and base checks" after the previous one',
            'no section for "budget alarms" after the previous one',
        ]);
    });

    it("rejects a deleted command, once per command", () => {
        const text = `${ordered}\nRun \`node tools/land.mjs land x\`, then land.mjs status and tools/push-queue.sh.\n`;
        assert.deepEqual(channelsProblems(text), [
            "names deleted command land.mjs",
            "names deleted command push-queue.sh",
        ]);
    });

    it("keeps the local tools that stay", () => {
        assert.deepEqual(
            channelsProblems(`${ordered}\ntools/live.sh visual-review b, worktree-cleanup.mjs, branch-note.mjs\n`),
            [],
        );
    });

    it(
        "the skill follows the channels order and names no deleted command",
        { todo: "until #3446 rewrites the skill" },
        () => {
            assert.deepEqual(channelsProblems(skill), []);
        },
    );
});
