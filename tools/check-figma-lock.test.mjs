// Tests of tools/check-figma-lock.mjs: a push that changes compact-mantine's Figma spec, its Figma tests
// or its token values fails unless the commit that makes the change carries `Figma-Approved: <reason>`,
// also through a landing's --no-ff merge; untouched files pass; the study digest is stable.
//
//   node --test tools/check-figma-lock.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

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
});
