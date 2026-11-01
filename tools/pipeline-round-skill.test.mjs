// The pipeline-round and issue-round skills after golden's retirement (#3418): every change goes through its own pull request opened by tools/pr-open.sh, no skill names a land.mjs
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

// Where a step's heading starts, by its name: steps are renumbered whenever one is added.
const step = (name) => flat.search(new RegExp(`### \\d+\\. ${name}`));

describe("pipeline-round skill", () => {
    it("names no interim rule: the skill describes only the channels pipeline", () => {
        assert.doesNotMatch(flat, /\*\*Interim rules/);
        assert.doesNotMatch(flat, /\bgolden\b/);
    });

    it("sends every fix through its own pull request from origin/master", () => {
        const prompt = flat.slice(flat.indexOf("**Fix prompt**"), flat.indexOf("### 2."));
        assert.match(prompt, /worktree-new\.sh <branch> origin\/master/);
        assert.match(prompt, /tools\/pr-open\.sh --proof <file>/);
    });

    it("checks nightly every slot and every dashboard member's owner in every round, before step 1 (#5052)", () => {
        const nightly = flat.indexOf("### Nightly every slot");
        const owned = flat.indexOf("### Every dashboard member owned");
        const first = step("Red master");
        assert.ok(nightly >= 0 && owned >= 0 && nightly < first && owned < first);
        assert.match(flat, /node tools\/health-owner-sweep\.mjs/);
        assert.match(flat, /"The rows should age out" is not an owner/);
        assert.match(flat, /nightly-abandon\.yml/);
        assert.match(flat, /the round's last line leads with nightly's age/);
    });

    it("handles red master first, then red pull requests, then finished branches with no pull request", () => {
        const red = step("Red master");
        const prs = step("Red or conflicted agent pull requests");
        const branches = step("Finished branches with no pull request");
        assert.ok(red >= 0 && prs >= 0 && branches >= 0);
        assert.ok(red < prs);
        assert.ok(prs < branches);
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
        assert.match(issueRound, /tools\/pr-open\.sh --proof tmp\/<name>\/proof\.md/);
        assert.match(flatShared, /keep it in tmp\/<name>\/, because an untracked file in the worktree is refused/);
        assert.doesNotMatch(issueRound, /origin\/golden/);
    });

    it("never arms auto-merge on a breaking change or merges past a check", () => {
        assert.match(flatShared, /never merge a pull request past a check or with `--admin`/);
        assert.match(flatShared, /never arm auto-merge on a breaking \(`!`\) change without the owner's go/);
        assert.match(flatShared, /or on one opened by anyone but graphty-agent, dependabot or a master-guard revert/);
    });

    it("fixes only graphty-agent's red pull requests, never the owner's", () => {
        const prs = step("Red or conflicted agent pull requests");
        assert.ok(prs >= 0);
        const body = flat.slice(prs, step("Finished branches with no pull request"));
        assert.match(body, /opened by graphty-agent \(its `author`\)/);
        assert.match(body, /#1677/);
    });

    it("reopens a master-guard revert as graphty-agent before arming it, and keeps the main checkout on master", () => {
        assert.match(flat, /gh pr close <n> && gh pr reopen <n>/);
        // A merge, not only a fast-forward: tools/live.sh workspace puts a branch's change there first.
        assert.match(shared, /git merge -q --no-edit origin\/master/);
        assert.doesNotMatch(shared, /git merge -q --ff-only origin\/master/);
    });
});

describe("CLAUDE.md", () => {
    it("replaces the golden landing sections with Shipping a change", () => {
        assert.match(claude, /\n## Shipping a change\n/);
        assert.doesNotMatch(claude, /\n## Landing changes \(golden-local\)\n/);
        assert.doesNotMatch(claude, /\n### Verification after landing\n/);
        assert.match(claude, /tools\/pr-open\.sh --proof tmp\/<task>\/proof\.md/);
        assert.match(claude, /\*\*Rolling out a change to this flow\.\*\* /);
        assert.doesNotMatch(claude, /node tools\/land\.mjs land <branch>/, "no instruction to land on golden");
    });
});

// The channels pipeline (design/ci/channels-pipeline.md section 12) rewrites the skill to work in this
// order, and deletes the golden landing tools. `channelsProblems` lists what keeps a skill from that
// shape; the real skill must have none.
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

    it("the skill follows the channels order and names no deleted command", () => {
        assert.deepEqual(channelsProblems(skill), []);
    });

    it("names the full run's, flaky and budget tools the design names", () => {
        for (const name of ["bisect.yml", "base-check.yml", "ci-budgets.json", "[UNRELATED]", "[FLAKY-UNRELATED]"]) {
            assert.ok(skill.includes(name), name);
        }
    });
});

// Issue #3269: the dry run of the graphty app (graphty/acceptance/run.mjs) is run by the agent that owns a long-lived
// branch, before it opens the pull request -- never automatically. CLAUDE.md step 2 and the subagent rules both
// skills append to every prompt name the command and when to run it.
describe("the dry run before a long-lived branch's pull request", () => {
    const flatClaude = claude.replace(/\s*\n\s*/g, " ");
    const shipping = flatClaude.slice(flatClaude.indexOf("## Shipping a change"));
    const step2 = shipping.slice(shipping.indexOf(" 2. "), shipping.indexOf(" 3. "));
    const rules = flatShared.slice(flatShared.indexOf("## Subagent rules"));

    for (const [name, text] of [
        ["CLAUDE.md, Shipping a change, step 2", step2],
        ["shared.md, Subagent rules", rules],
    ]) {
        it(`${name} names check:quick --with-dry-run for a long-lived branch that reaches the app`, () => {
            assert.match(text, /pnpm run check:quick --with-dry-run/);
            assert.match(text, /long-lived/);
            assert.match(text, /graphty app/);
            assert.match(text, /node graphty\/acceptance\/run\.mjs/);
            assert.match(text, /shared component/);
        });
    }

    it("the issue-round prompt appends the shared subagent rules", () => {
        assert.match(issueRound.replace(/\s*\n\s*/g, " "), /"Subagent rules" paragraph from the shared file verbatim/);
    });
});
