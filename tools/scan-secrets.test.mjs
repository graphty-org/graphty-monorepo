// Tests of tools/scan-secrets.sh: a push is refused when any commit it sends adds a secret, even one a
// later commit removes (issue #6895), a staged secret is refused even when the working tree no longer
// holds it, and a clean branch or a path in .secretlintignore passes.
//
//   node --test tools/scan-secrets.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

const TMP = mkdtempSync(join(tmpdir(), "scan-secrets-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
const ROOT = new URL("..", import.meta.url).pathname;
const SCRIPT = join(ROOT, "tools/scan-secrets.sh");
const env = isolatedGitEnv();
// A made-up GitHub token, built at run time so this file holds nothing secretlint matches.
const TOKEN = ["ghp", "_", "a1B2c3D4e5F6g7H8i9J0".repeat(2)].join("").slice(0, 40);
let n = 0;

// A repository with the real secretlint config and one clean commit, the base of the branch.
function repo() {
    const dir = join(TMP, `r${n++}`);
    mkdirSync(dir);
    const git = (...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8" });
    git("init", "-q");
    for (const f of [".secretlintrc.json", ".secretlintignore"]) copyFileSync(join(ROOT, f), join(dir, f));
    const write = (p, content) => {
        mkdirSync(join(dir, dirname(p)), { recursive: true });
        writeFileSync(join(dir, p), content);
    };
    const commit = (p, content) => {
        write(p, content);
        git("add", ".");
        git("commit", "-qm", `edit ${p}`);
    };
    commit("README.md", "x\n");
    const base = git("rev-parse", "HEAD").trim();
    const scan = (...args) =>
        spawnSync(SCRIPT, args, { cwd: dir, env: { ...env, PREPUSH_ROOT: dir }, encoding: "utf8" });
    return { git, write, commit, scan: (...args) => scan(...(args.length ? args : [base, "HEAD"])) };
}

describe("scan-secrets", () => {
    it("refuses a push whose secret one commit adds and a later commit removes", () => {
        const r = repo();
        r.commit("src/deep/x.ts", `const t = "${TOKEN}";\n`);
        r.commit("src/deep/x.ts", "const t = 1;\n");
        const res = r.scan();
        assert.equal(res.status, 1, res.stdout + res.stderr);
        assert.match(res.stdout, /GITHUB_TOKEN/);
        assert.match(res.stderr, /even if the files no longer do/);
        assert.doesNotMatch(res.stdout + res.stderr, new RegExp(TOKEN), "the token is masked");
    });

    it("refuses a staged secret that the working tree no longer holds", () => {
        const r = repo();
        r.write("a.ts", `const t = "${TOKEN}";\n`);
        r.git("add", "a.ts");
        r.write("a.ts", "const t = 2;\n");
        assert.equal(r.scan("--cached").status, 1);
    });

    it("passes a clean branch and clean staged changes", () => {
        const r = repo();
        r.commit("src/a.ts", "const a = 1;\n");
        r.commit("src/a.ts", "const a = 2;\n");
        const res = r.scan();
        assert.equal(res.status, 0, res.stdout + res.stderr);
        r.write("b.ts", "const b = 1;\n");
        r.git("add", "b.ts");
        assert.equal(r.scan("--cached").status, 0);
    });

    it("skips a path .secretlintignore names, in every commit", () => {
        const r = repo();
        r.commit("graph-io/test/sources/sigv4.test.ts", `const t = "${TOKEN}";\n`);
        r.commit("graph-io/test/sources/sigv4.test.ts", "const t = 1;\n");
        const res = r.scan();
        assert.equal(res.status, 0, res.stdout + res.stderr);
    });
});
