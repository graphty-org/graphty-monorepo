// Tests of tools/check-figma-lock.mjs: a push that changes compact-mantine's Figma spec, its Figma tests
// or its token values fails unless the commit that makes the change carries `Figma-Approved: <reason>`,
// also through a landing's --no-ff merge, or when a later approved commit of the push names it in
// `Figma-Approves: <sha>`; untouched files pass; the study digest is stable.
//
//   node --test tools/check-figma-lock.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { buildFixture, checkFixture, serialize } from "../compact-mantine/tests/figma/figma-fixture.mjs";
import { isLocked, studyDigest, unapprovedChanges } from "./check-figma-lock.mjs";
import { isolatedGitEnv } from "./isolated-git-env.mjs";

const TMP = mkdtempSync(join(tmpdir(), "check-figma-lock-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
const env = isolatedGitEnv();
let n = 0;

const TOKENS = "compact-mantine/src/theme/tokens.ts";
const FIGMA_TEST = "compact-mantine/tests/figma/buttons.browser.test.tsx";

// A repository whose `base` branch holds the locked files, checked out on `work`.
function repo() {
    const dir = join(TMP, `r${n++}`);
    mkdirSync(dir);
    const git = (...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8" });
    const write = (p, content) => {
        mkdirSync(join(dir, dirname(p)), { recursive: true });
        writeFileSync(join(dir, p), content);
        git("add", p);
    };
    git("init", "-q", "-b", "base");
    for (const p of [TOKENS, FIGMA_TEST, "compact-mantine/src/Button.tsx"]) write(p, "v1\n");
    git("commit", "-qm", "init");
    const base = git("rev-parse", "base").trim();
    git("checkout", "-qb", "work");
    const commit = (msg) => git("commit", "-qm", msg);
    return {
        dir,
        git,
        write,
        commit,
        check: () => unapprovedChanges({ cwd: dir, base, approvedBase: "0000000", env }),
    };
}

describe("check-figma-lock", () => {
    it("locks the spec, the Figma tests, the harness and the token files, nothing else", () => {
        for (const f of [
            "compact-mantine/design/figma-spec.md",
            FIGMA_TEST,
            "compact-mantine/tests/figma/figma-study.sha256",
            "compact-mantine/tests/figma/figma-fixture.json",
            "compact-mantine/tests/harness/measure.ts",
            TOKENS,
            "compact-mantine/src/theme/colors.ts",
            "compact-mantine/src/theme/styles/size-scale.ts",
        ])
            assert.ok(isLocked(f), f);
        for (const f of ["compact-mantine/src/Button.tsx", "compact-mantine/design/other.md", "x/tokens.ts"])
            assert.ok(!isLocked(f), f);
    });

    it("fails a token change without the trailer, naming the commit and the file", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: brighter accent");
        const bad = r.check();
        assert.equal(bad.length, 1);
        assert.equal(bad[0].subject, "fix: brighter accent");
        assert.deepEqual(bad[0].files, [TOKENS]);
    });

    it("fails an edit to a Figma test's expected value without the trailer", () => {
        const r = repo();
        r.write(FIGMA_TEST, "v2\n");
        r.commit("test: loosen");
        assert.equal(r.check().length, 1);
    });

    it("passes the change when its own commit carries Figma-Approved", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent\n\nFigma-Approved: owner, new Figma accent");
        assert.deepEqual(r.check(), []);
    });

    it("reads a Figma-Approved trailer folded onto a second line, as a 100-column commit message needs", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent\n\nFigma-Approved: owner, a long reason\n that goes on here");
        assert.deepEqual(r.check(), []);
    });

    it("keeps the approval through a --no-ff merge, which itself carries no trailer", () => {
        const r = repo();
        r.git("checkout", "-qb", "topic");
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent\n\nFigma-Approved: owner, new Figma accent");
        r.git("checkout", "-q", "work");
        r.git("merge", "-q", "--no-ff", "-m", "land: topic", "topic");
        assert.deepEqual(r.check(), []);
    });

    it("an approved commit does not cover an unapproved one touching the same file", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent\n\nFigma-Approved: owner, new Figma accent");
        r.write(TOKENS, "v3\n");
        r.commit("fix: tweak");
        assert.deepEqual(
            r.check().map((b) => b.subject),
            ["fix: tweak"],
        );
    });

    it("does not judge a locked file the push leaves exactly as the base has it", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent");
        r.write(TOKENS, "v1\n");
        r.commit("fix: put the accent back");
        assert.deepEqual(r.check(), []);
    });

    it("does not judge an old unapproved edit that a merge of the base's approved commit replaced", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent");
        r.git("checkout", "-q", "base");
        r.write(TOKENS, "v3\n");
        r.commit("fix: Figma accent\n\nFigma-Approved: owner");
        const base = r.git("rev-parse", "HEAD").trim();
        r.git("checkout", "-q", "work");
        try {
            r.git("merge", "-q", "base");
        } catch {
            r.write(TOKENS, "v3\n"); // the conflict, resolved to the base's approved content
            r.git("commit", "-qm", "merge base");
        }
        assert.deepEqual(unapprovedChanges({ cwd: r.dir, base, approvedBase: "0000000", env }), []);
    });

    it("still judges a locked file the push deletes", () => {
        const r = repo();
        r.git("rm", "-q", TOKENS);
        r.commit("chore: drop tokens");
        assert.deepEqual(
            r.check().map((b) => b.files),
            [[TOKENS]],
        );
    });

    it("still judges every commit of a locked file the push does change", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent");
        r.write(TOKENS, "v3\n");
        r.commit("fix: tweak");
        assert.deepEqual(
            r.check().map((b) => b.subject),
            ["fix: tweak", "fix: accent"],
        );
    });

    it("approves an earlier commit of the push named by Figma-Approves on an approved commit", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent");
        const sha = r.git("rev-parse", "HEAD").trim();
        r.git("commit", "-q", "--allow-empty", "-m", `test: approve\n\nFigma-Approved: owner\nFigma-Approves: ${sha}`);
        assert.deepEqual(r.check(), []);
    });

    it("Figma-Approves does nothing for a commit outside the push, or from a commit outside it", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent");
        const sha = r.git("rev-parse", "HEAD").trim();
        r.git("checkout", "-qb", "elsewhere");
        r.git("commit", "-q", "--allow-empty", "-m", `test: approve\n\nFigma-Approved: owner\nFigma-Approves: ${sha}`);
        const outside = r.git("rev-parse", "HEAD").trim();
        r.git("checkout", "-q", "work");
        assert.equal(r.check().length, 1);
        r.git(
            "commit",
            "-q",
            "--allow-empty",
            "-m",
            `test: approve\n\nFigma-Approved: owner\nFigma-Approves: ${outside}`,
        );
        assert.deepEqual(
            r.check().map((b) => b.subject),
            ["fix: accent"],
        );
    });

    it("Figma-Approves without Figma-Approved approves nothing", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: accent");
        const sha = r.git("rev-parse", "HEAD").trim();
        r.git("commit", "-q", "--allow-empty", "-m", `test: approve\n\nFigma-Approves: ${sha}`);
        assert.equal(r.check().length, 1);
    });

    it("fails a merge whose resolution edits a locked file", () => {
        const r = repo();
        r.git("checkout", "-qb", "topic");
        r.write("compact-mantine/src/Button.tsx", "topic\n");
        r.commit("feat: button");
        r.git("checkout", "-q", "work");
        r.git("merge", "-q", "--no-ff", "--no-commit", "topic");
        r.write(TOKENS, "sneaked\n");
        r.commit("land: topic");
        assert.deepEqual(
            r.check().map((b) => b.subject),
            ["land: topic"],
        );
    });

    // `base` and `work` each change a different line of the Figma test; work's change is approved.
    function bothSidesEdit() {
        const r = repo();
        r.git("checkout", "-q", "base");
        r.write(FIGMA_TEST, "a\nb\nc\nd\ne\n");
        r.commit("test: lines");
        r.git("checkout", "-q", "work");
        r.git("merge", "-q", "base");
        r.write(FIGMA_TEST, "a\nb\nc\nd\nwork\n");
        r.commit("test: work's line\n\nFigma-Approved: owner");
        r.git("checkout", "-q", "base");
        r.write(FIGMA_TEST, "base\nb\nc\nd\ne\n");
        r.commit("test: base's line\n\nFigma-Approved: owner");
        r.git("checkout", "-q", "work");
        return r;
    }

    it("passes a merge whose locked file is git's own conflict-free merge of its parents", () => {
        const r = bothSidesEdit();
        r.git("merge", "-q", "--no-ff", "-m", "Merge base into work", "base");
        assert.equal(r.git("show", `HEAD:${FIGMA_TEST}`), "base\nb\nc\nd\nwork\n");
        // judged from before base's approved commit, as a branch that merged master is judged
        const from = r.git("rev-parse", "HEAD^2^").trim();
        assert.deepEqual(unapprovedChanges({ cwd: r.dir, base: from, approvedBase: "0000000", env }), []);
    });

    it("fails a merge that changes a locked file beyond git's own merge of its parents", () => {
        const r = bothSidesEdit();
        r.git("merge", "-q", "--no-ff", "--no-commit", "base");
        r.write(FIGMA_TEST, "base\nb\nsneaked\nd\nwork\n");
        r.commit("Merge base into work");
        const from = r.git("rev-parse", "HEAD^2^").trim();
        assert.deepEqual(
            unapprovedChanges({ cwd: r.dir, base: from, approvedBase: "0000000", env }).map((b) => b.subject),
            ["Merge base into work"],
        );
    });

    it("judges a conflict resolution that matches neither parent, and passes one that takes a parent's side", () => {
        const r = repo();
        r.git("checkout", "-q", "base");
        r.write(TOKENS, "base\n");
        r.commit("fix: base accent\n\nFigma-Approved: owner");
        r.git("checkout", "-q", "work");
        r.write(TOKENS, "work\n");
        r.commit("fix: work accent\n\nFigma-Approved: owner");
        const tip = r.git("rev-parse", "HEAD").trim();
        const from = r.git("rev-parse", "base^").trim();
        const check = () => unapprovedChanges({ cwd: r.dir, base: from, approvedBase: "0000000", env });
        assert.throws(() => r.git("merge", "-q", "base"));
        r.write(TOKENS, "both\n");
        r.commit("Merge base into work");
        assert.deepEqual(
            check().map((b) => b.subject),
            ["Merge base into work"],
        );
        r.git("checkout", "-q", "-b", "theirs", tip);
        assert.throws(() => r.git("merge", "-q", "base"));
        r.write(TOKENS, "base\n");
        r.commit("Merge base into theirs");
        assert.deepEqual(check(), []);
    });

    it("passes a push that touches no locked file", () => {
        const r = repo();
        r.write("compact-mantine/src/Button.tsx", "v2\n");
        r.commit("feat: button");
        assert.deepEqual(r.check(), []);
    });

    it("does not judge commits reachable from the approved design", () => {
        const r = repo();
        r.write(TOKENS, "v2\n");
        r.commit("fix: the approved drift fix");
        const approved = r.git("rev-parse", "HEAD").trim();
        r.write("compact-mantine/src/Button.tsx", "v2\n");
        r.commit("feat: button");
        const base = r.git("rev-parse", "base").trim();
        assert.deepEqual(unapprovedChanges({ cwd: r.dir, base, approvedBase: approved, env }), []);
    });

    it("hashes the study's captures by path and content, ignoring other files", () => {
        const dir = join(TMP, "study");
        mkdirSync(join(dir, "bc"), { recursive: true });
        writeFileSync(join(dir, "bc/a.styles.json"), "{}");
        writeFileSync(join(dir, "bc/a.png"), "png");
        const before = studyDigest(dir);
        writeFileSync(join(dir, "bc/a.png"), "other");
        assert.equal(studyDigest(dir), before);
        writeFileSync(join(dir, "bc/a.styles.json"), '{"x":1}');
        assert.notEqual(studyDigest(dir), before);
    });

    it("keeps in the Figma fixture only the fields read, and flags a fixture value the study no longer has", () => {
        const dir = join(TMP, "fixture-study");
        mkdirSync(join(dir, "bc"), { recursive: true });
        const el = (tag, color) => ({ tag, cls: "x", text: "", box: [1, 2, 3, 4], style: { color, height: "8px" } });
        const capture = (color) => ({
            url: "u",
            viewport: [10, 10],
            rect: null,
            elements: [el("div", "red"), el("button", color)],
        });
        writeFileSync(join(dir, "bc/a.styles.json"), JSON.stringify(capture("blue")));
        const fixture = buildFixture(dir, [
            "bc/a\t0\ttag",
            "bc/a\t1\ttag",
            "bc/a\t1\tstyle.color",
            "bc/a\t-\trect",
            "",
        ]);
        assert.deepEqual(fixture, {
            "bc/a": {
                rect: null,
                count: 2,
                elements: { 0: { tag: "div" }, 1: { tag: "button", style: { color: "blue" } } },
            },
        });
        const file = join(dir, "fixture.json");
        writeFileSync(file, serialize(fixture));
        assert.deepEqual(JSON.parse(serialize(fixture)), fixture);
        assert.deepEqual(checkFixture(dir, file), []);
        writeFileSync(join(dir, "bc/a.styles.json"), JSON.stringify(capture("green")));
        assert.deepEqual(checkFixture(dir, file), ["bc/a #1 color: blue, the study has green"]);
    });
});
