// Tests for tools/pr-integrity.mjs: each rule and each exemption on a real temporary repository.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isolateGit } from "./isolated-git-env.mjs";

import {
    AGENT,
    DEPENDABOT,
    onlyDependabot,
    hasProof,
    isBreaking,
    masterBaselineCheck,
    ownerApproved,
    ownerLogins,
    patchId,
    prIntegrity,
} from "./pr-integrity.mjs";

// the code under test runs git itself, so the whole process gets the isolated config
isolateGit();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const TEST = `import { it, expect } from "vitest";\nit("a", () => { expect(1).toBe(1); });\nit("b", () => { expect(2).toBe(2); });\n`;

function repo() {
    const dir = mkdtempSync(join(tmpdir(), "pr-integrity-"));
    dirs.push(dir);
    const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
    git("init", "-q", "-b", "master");
    git("config", "user.name", "t");
    git("config", "user.email", "t@example.com");
    git("config", "commit.gpgsign", "false");
    const write = (files) => {
        for (const [f, text] of Object.entries(files)) {
            mkdirSync(dirname(join(dir, f)), { recursive: true });
            if (text === null) rmSync(join(dir, f));
            else writeFileSync(join(dir, f), text);
        }
    };
    const commit = (msg, files = {}) => {
        write(files);
        git("add", "-A");
        git("commit", "-q", "--allow-empty", "-m", msg);
        return git("rev-parse", "HEAD");
    };
    commit("init", { "src/a.mjs": "export const a = 1;\n", "src/a.test.mjs": TEST });
    return { dir, git, commit };
}

const pr = (r, over = {}) => ({
    base: "master",
    head: r.git("rev-parse", "HEAD"),
    title: "fix(tools): something",
    body: "Fixes #1\n\n## Proof\n\nnode --test: pass 3\n",
    author: "someone",
    reviews: [],
    owners: new Set(["owner"]),
    codeowners: "",
    baselineProblems: () => [],
    ...over,
});
const review = (login, state, commit_id, body = "") => ({ user: { login }, state, commit_id, body });

describe("pure rules", () => {
    it("isBreaking reads a ! subject and a BREAKING CHANGE footer", () => {
        assert.ok(isBreaking("feat!: x"));
        assert.ok(isBreaking("feat(graphty-element)!: x"));
        assert.ok(isBreaking("fix: x\n\nBREAKING CHANGE: y"));
        assert.ok(isBreaking("fix: x\n\nBREAKING-CHANGE: y"));
        assert.ok(!isBreaking("fix: x!"));
        assert.ok(!isBreaking('Revert "feat!: x"'));
    });
    it("hasProof wants a non-empty Proof section; comments do not count", () => {
        assert.ok(hasProof("## Proof\n\n$ node --test\npass 3\n"));
        assert.ok(hasProof("## What\nx\n## Proof\nran it\n## Notes\nn"));
        assert.ok(!hasProof("## Proof\n\n<!-- the command and its output -->\n\n## Notes\nx"));
        assert.ok(!hasProof("## Proof\n"));
        assert.ok(!hasProof("Proof: none"));
        assert.ok(!hasProof(undefined));
    });
    it("ownerLogins takes users, not teams or comments", () => {
        assert.deepEqual([...ownerLogins("# @nobody\n/a/ @apowers313 @org/team\n/b @x-y\n")], ["apowers313", "x-y"]);
    });
    it("ownerApproved needs the owner's latest deciding review to approve the head", () => {
        const owners = new Set(["owner"]);
        assert.ok(ownerApproved([review("owner", "APPROVED", "h")], owners, "h"));
        assert.ok(!ownerApproved([review("owner", "APPROVED", "old")], owners, "h"));
        assert.ok(!ownerApproved([review("agent", "APPROVED", "h")], owners, "h"));
        assert.ok(!ownerApproved([review("owner", "APPROVED", "h"), review("owner", "DISMISSED", "h")], owners, "h"));
        assert.ok(ownerApproved([review("owner", "APPROVED", "h"), review("owner", "COMMENTED", "h")], owners, "h"));
    });
});

describe("patchId", () => {
    it("is pr-review.sh's id for a non-UTF-8 file too, so its marker matches", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("test: a Latin-1 fixture", { "test/latin1.csv": Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a]) });
        const mb = r.git("merge-base", "master", "HEAD");
        const shell = execFileSync(
            "bash",
            [
                "-c",
                `git diff -U0 --binary --no-color --no-ext-diff --no-renames --diff-algorithm=myers ${mb} HEAD | git patch-id --stable | cut -d' ' -f1`,
            ],
            { cwd: r.dir, encoding: "utf8" },
        ).trim();
        assert.ok(shell);
        assert.equal(patchId(r.dir, mb, "HEAD"), shell);
    });
});

describe("prIntegrity", () => {
    it("an agent pull request needs a Proof and a fresh review of its own diff", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("fix: change a", { "src/a.mjs": "export const a = 2;\n" });
        const bare = prIntegrity(r.dir, pr(r, { author: AGENT, body: "Fixes #1" }));
        assert.equal(bare.problems.length, 2);
        assert.match(bare.problems[0], /^Proof:/);
        assert.match(bare.problems[1], /^Fresh review:/);

        const mb = r.git("merge-base", "master", "HEAD");
        const id = patchId(r.dir, mb, "HEAD");
        const marker = `findings\n<!-- fresh-review ${id} -->`;
        // another account's review carrying the marker does not count
        const outsider = [review("stranger", "COMMENTED", "x", marker)];
        assert.match(
            prIntegrity(r.dir, pr(r, { author: AGENT, reviews: outsider })).problems.join("\n"),
            /Fresh review/,
        );
        const reviews = [review(AGENT, "COMMENTED", "x", marker)];
        assert.deepEqual(prIntegrity(r.dir, pr(r, { author: AGENT, reviews })).problems, []);

        // one review per pull request: a merge of master and a fix push both keep it
        r.git("switch", "-q", "master");
        r.commit("chore: other", { "src/other.mjs": "export const o = 1;\n" });
        r.git("switch", "-q", "b");
        r.git("merge", "-q", "--no-edit", "master");
        assert.deepEqual(prIntegrity(r.dir, pr(r, { author: AGENT, reviews })).problems, []);
        r.commit("fix: again", { "src/a.mjs": "export const a = 3;\n" });
        assert.deepEqual(prIntegrity(r.dir, pr(r, { author: AGENT, reviews })).problems, []);
    });

    it("does not ask a non-agent author for Proof or review", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("fix: change a", { "src/a.mjs": "export const a = 2;\n" });
        assert.deepEqual(prIntegrity(r.dir, pr(r, { body: "" })).problems, []);
    });

    it("fails a breaking title or commit unless a code owner approved the head", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("fix: change a", { "src/a.mjs": "export const a = 2;\n" });
        assert.match(prIntegrity(r.dir, pr(r, { title: "feat!: drop a" })).problems.join(), /Breaking change/);
        r.commit("fix: more\n\nBREAKING CHANGE: a is gone", { "src/a.mjs": "export const b = 2;\n" });
        assert.match(prIntegrity(r.dir, pr(r)).problems.join(), /Breaking change/);
        const head = r.git("rev-parse", "HEAD");
        assert.deepEqual(prIntegrity(r.dir, pr(r, { reviews: [review("owner", "APPROVED", head)] })).problems, []);
    });

    it("fails a weakened test, which a code owner's approval clears and Dependabot does not skip", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("test: drop one", { "src/a.test.mjs": TEST.split("\n").slice(0, 2).join("\n") + "\n" });
        assert.match(prIntegrity(r.dir, pr(r)).problems.join(), /^Test integrity:/);
        assert.match(prIntegrity(r.dir, pr(r, { author: DEPENDABOT })).problems.join(), /^Test integrity:/);
        const head = r.git("rev-parse", "HEAD");
        assert.deepEqual(prIntegrity(r.dir, pr(r, { reviews: [review("owner", "APPROVED", head)] })).problems, []);
    });

    it("Dependabot skips Proof and review", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("chore(deps): bump", { "package.json": "{}\n" });
        const { kind, problems } = prIntegrity(r.dir, pr(r, { author: DEPENDABOT, body: "" }));
        assert.ok(kind.dependabot);
        assert.deepEqual(problems, []);
    });

    it("treats a Dependabot pull request with a commit someone else pushed as the agent's", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("chore(deps): bump", { "package.json": "{}\n" });
        const { kind, problems } = prIntegrity(r.dir, pr(r, { author: DEPENDABOT, body: "", byDependabot: false }));
        assert.ok(!kind.dependabot);
        assert.ok(kind.agent);
        assert.match(problems.join("\n"), /Proof/);
    });

    it("counts only commits Dependabot made through GitHub as Dependabot's", () => {
        const own = {
            author: { login: DEPENDABOT },
            committer: { login: "web-flow" },
            commit: { verification: { verified: true } },
        };
        assert.equal(onlyDependabot([own, own]), true);
        assert.equal(onlyDependabot([own, { ...own, author: { login: "graphty-agent" } }]), false);
        assert.equal(onlyDependabot([{ ...own, committer: { login: "graphty-agent" } }]), false);
        assert.equal(onlyDependabot([{ ...own, commit: { verification: { verified: false } } }]), false);
    });

    it("exempts a mechanical revert of a first-parent merge of master, and only that", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "feature");
        r.commit("feat: more tests", { "src/b.test.mjs": TEST, "src/a.mjs": "export const a = 5;\n" });
        r.git("switch", "-q", "master");
        r.git("merge", "-q", "--no-ff", "--no-edit", "feature");
        const m = r.git("rev-parse", "HEAD");
        r.git("switch", "-q", "-c", "revert");
        r.git("revert", "--no-edit", "-m", "1", m);
        const ok = prIntegrity(r.dir, pr(r, { author: AGENT, body: "Refs #2" }));
        assert.equal(ok.kind.revert, m);
        assert.deepEqual(ok.problems, []);

        // the same message with any other change is no longer the revert
        r.commit("fix: and something else", { "src/a.mjs": "export const a = 9;\n" });
        const bad = prIntegrity(r.dir, pr(r, { author: AGENT, body: "Refs #2" }));
        assert.equal(bad.kind.revert, null);
        assert.match(bad.problems.join("\n"), /Test integrity/);
    });

    it("checks the baselines signature, and exempts an accept-only pull request from the rest", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("test: new picture", { "visual-baselines/app/s.png": "png" });
        const unsigned = () => ["no approval"];
        assert.deepEqual(prIntegrity(r.dir, pr(r, { author: AGENT, body: "", baselineProblems: unsigned })).problems, [
            "Baselines signed: no approval",
        ]);
        const accept = prIntegrity(r.dir, pr(r, { author: AGENT, body: "" }));
        assert.ok(accept.kind.acceptOnly);
        assert.deepEqual(accept.problems, []);
        // review records alone are not a baseline change
        r.git("switch", "-q", "master");
        r.git("switch", "-q", "-c", "c");
        r.commit("chore: record", { "visual-baselines/reviews/1.json": "{}" });
        assert.deepEqual(prIntegrity(r.dir, pr(r, { baselineProblems: unsigned })).problems, []);
    });

    it("names an unowned file an owned file imports", () => {
        const r = repo();
        r.git("switch", "-q", "-c", "b");
        r.commit("ci: owned tool", {
            "tools/owned.mjs": 'import "./helper.mjs";\n',
            "tools/helper.mjs": "export {};\n",
        });
        const codeowners = "/tools/owned.mjs @owner\n";
        assert.match(prIntegrity(r.dir, pr(r, { codeowners })).problems.join(), /Owned closure: tools\/helper\.mjs/);
        assert.deepEqual(
            prIntegrity(r.dir, pr(r, { codeowners: `${codeowners}/tools/helper.mjs @owner\n` })).problems,
            [],
        );
    });
});

describe("masterBaselineCheck", () => {
    it("runs master's own gate: an unsigned baseline fails, a pull request's edited gate is not used", async () => {
        const r = repo();
        for (const f of ["gate.mjs", "lib/approval.mjs", "lib/config.mjs", "lib/results.mjs"]) {
            mkdirSync(dirname(join(r.dir, "visual-review/trusted", f)), { recursive: true });
            cpSync(join(ROOT, "visual-review/trusted", f), join(r.dir, "visual-review/trusted", f));
        }
        r.commit("chore: gate", { "visual-baselines/app/a.png": "a" });
        r.git("switch", "-q", "-c", "b");
        r.commit("test: new picture", {
            "visual-baselines/app/s.png": "png",
            // a pull request that guts its own copy of the gate changes nothing
            "visual-review/trusted/gate.mjs":
                "export const approvalKeys = () => ({ keys: null, problems: [] }); export const treeApprovalProblems = () => [];\n",
        });
        const head = r.git("rev-parse", "HEAD");
        const check = await masterBaselineCheck(r.dir, "master", head);
        const problems = check(r.git("merge-base", "master", head));
        assert.equal(problems.length, 1);
        assert.match(problems[0], /no visual-review-approvals\/[0-9a-f]+\.json approves it/);
    });
});

describe("the workflows", () => {
    const read = (f) => readFileSync(join(ROOT, ".github/workflows", f), "utf8").replace(/^\s*#.*$/gm, "");
    it("PR Integrity runs on pull request and review events, never on comments", () => {
        const wf = read("pr-integrity.yml");
        assert.match(wf, /pull_request:\n\s+types: \[opened, synchronize, edited, reopened\]/);
        assert.match(wf, /pull_request_review:\n\s+types: \[submitted, dismissed\]/);
        assert.doesNotMatch(wf, /issue_comment|pull_request_review_comment|pull_request_target/);
        assert.match(wf, /name: PR Integrity\n/);
        assert.match(wf, /node tools\/pr-integrity\.mjs --base origin\/master/);
    });
    it("Dependabot auto-merge never checks out the pull request and leaves Actions updates alone", () => {
        const wf = read("dependabot-automerge.yml");
        assert.doesNotMatch(wf, /actions\/checkout/);
        assert.match(
            wf,
            /if: github\.event\.pull_request\.user\.login == 'dependabot\[bot\]' && github\.actor == 'dependabot\[bot\]'/,
        );
        assert.match(wf, /environment: dependabot-automerge/);
        assert.match(
            wf,
            /if: steps\.meta\.outputs\.package-ecosystem != 'github_actions'\n[\s\S]*gh pr merge --auto --merge/,
        );
    });
});

describe("--local (tools/check-quick.sh)", () => {
    it("checks HEAD from the base with no pull request and no GitHub call", () => {
        const r = repo();
        for (const f of ["gate.mjs", "lib/approval.mjs", "lib/config.mjs", "lib/results.mjs"]) {
            mkdirSync(dirname(join(r.dir, "visual-review/trusted", f)), { recursive: true });
            cpSync(join(ROOT, "visual-review/trusted", f), join(r.dir, "visual-review/trusted", f));
        }
        r.commit("chore: gate");
        r.git("switch", "-q", "-c", "b");
        r.commit("feat(tools)!: drop a flag", { "src/a.mjs": "export const a = 2;\n" });
        // a `gh` that fails: --local must not ask GitHub anything
        const bin = join(r.dir, ".bin");
        mkdirSync(bin);
        writeFileSync(join(bin, "gh"), "#!/bin/sh\nexit 99\n", { mode: 0o755 });
        const run = () => {
            try {
                return {
                    status: 0,
                    out: execFileSync(
                        process.execPath,
                        [join(ROOT, "tools/pr-integrity.mjs"), "--local", "--base", "master"],
                        {
                            cwd: r.dir,
                            encoding: "utf8",
                            env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_EVENT_PATH: "" },
                        },
                    ),
                };
            } catch (e) {
                return { status: e.status, out: e.stdout };
            }
        };
        const res = run();
        assert.equal(res.status, 1, res.out);
        assert.match(res.out, /an ordinary pull request/);
        assert.match(res.out, /Breaking change:/);
        assert.doesNotMatch(res.out, /Proof|fresh review/i);
    });
});
