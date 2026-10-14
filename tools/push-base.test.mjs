// Tests of tools/push-base.mjs, the branch a push merges into (#2546): each case builds a throwaway
// repository with a parent branch carrying a finding-shaped change and a branch stacked on it, and a
// fake gh on PATH that counts its calls.
//
//   node --test tools/push-base.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { pushBase, pushBaseRef } from "./push-base.mjs";

const TOOLS = dirname(fileURLToPath(import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), "push-base-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

// A function SonarQube's cognitive complexity rule would refuse: the parent branch's change.
const COMPLEX = `export function tangled(a, b, c) {
${Array.from({ length: 12 }, (_, i) => `    if (a > ${i}) { if (b) { for (const x of c) { if (x) return ${i}; } } }`).join("\n")}
    return -1;
}
`;

// gh's answer for `gh pr view`: { out } prints and exits 0, { err } prints to stderr and exits 1.
function fakeGh(dir, answer) {
    const bin = join(dir, "bin");
    mkdirSync(bin, { recursive: true });
    const calls = join(dir, "gh-calls");
    const body = answer.out !== undefined ? `echo '${answer.out}'` : `echo '${answer.err}' >&2; exit 1`;
    writeFileSync(join(bin, "gh"), `#!/bin/sh\necho "$*" >> '${calls}'\n${body}\n`);
    chmodSync(join(bin, "gh"), 0o755);
    return {
        path: `${bin}:${process.env.PATH}`,
        calls: () => (existsSync(calls) ? readFileSync(calls, "utf8").split("\n").filter(Boolean) : []),
    };
}

// master -> feat/parent (adds src/parent.ts with COMPLEX) -> child (changes src/child.ts and README.md).
function repo(gh = { err: 'no pull requests found for branch "child"' }) {
    const dir = mkdtempSync(join(scratch, "repo-"));
    const env = isolatedGitEnv();
    const git = (...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8" }).trim();
    const commit = (files, msg) => {
        for (const [p, text] of Object.entries(files)) {
            mkdirSync(dirname(join(dir, p)), { recursive: true });
            writeFileSync(join(dir, p), text);
        }
        git("add", ".");
        git("commit", "-q", "-m", msg);
        return git("rev-parse", "HEAD");
    };
    git("init", "-q", "-b", "master");
    git("remote", "add", "origin", "https://github.com/example/repo.git");
    const master = commit({ "src/child.ts": "export const a = 1;\n", "README.md": "# r\n" }, "base");
    git("update-ref", "refs/remotes/origin/master", "HEAD");
    git("switch", "-q", "-c", "feat/parent");
    const parent = commit({ "src/parent.ts": COMPLEX }, "parent");
    git("update-ref", "refs/remotes/origin/feat/parent", "HEAD");
    git("switch", "-q", "-c", "child");
    commit({ "src/child.ts": "export const a = 2;\n", "README.md": "# r\n\nmore\n" }, "stacked");
    const fake = fakeGh(dir, gh);
    return { dir, git, master, parent, gh: fake, env: { ...env, PATH: fake.path } };
}

const resolve = (r, extra = {}) => {
    const logs = [];
    const base = pushBase({ cwd: r.dir, env: { ...r.env, ...extra }, log: (m) => logs.push(m) });
    return { base, logs };
};

describe("push-base", () => {
    it("a branch whose pull request targets another branch is measured from that branch's tip", () => {
        const r = repo({ out: "feat/parent" });
        const { base, logs } = resolve(r);
        assert.equal(base, r.parent);
        assert.deepEqual(r.git("diff", "--name-only", base, "HEAD").split("\n"), ["README.md", "src/child.ts"]);
        assert.doesNotMatch(r.git("diff", "-U0", base, "HEAD"), /tangled/);
        assert.deepEqual(r.gh.calls(), ["pr view child --json baseRefName -q .baseRefName"]);
        assert.match(logs.join("\n"), /origin\/feat\/parent \(its pull request's base\)/);
    });

    it("the CLI prints the base ref, and PUSH_BASE_REF answers without asking gh again", () => {
        const r = repo({ out: "feat/parent" });
        const cli = spawnSync(process.execPath, [join(TOOLS, "push-base.mjs")], {
            cwd: r.dir,
            env: r.env,
            encoding: "utf8",
        });
        assert.equal(cli.stdout.trim(), "origin/feat/parent");
        assert.equal(resolve(r, { PUSH_BASE_REF: cli.stdout.trim() }).base, r.parent);
        assert.equal(r.gh.calls().length, 1);
    });

    it("the local record (branch.<name>.prBase) needs no gh call", () => {
        const r = repo({ err: "should not be called" });
        r.git("config", "branch.child.prBase", "feat/parent");
        assert.equal(resolve(r).base, r.parent);
        assert.equal(r.gh.calls().length, 0);
    });

    it("an upstream that is another branch counts as the base", () => {
        const r = repo({ err: "should not be called" });
        r.git("branch", "--set-upstream-to=origin/feat/parent", "child");
        assert.equal(resolve(r).base, r.parent);
        assert.equal(r.gh.calls().length, 0);
    });

    it("no pull request: origin/master, silently", () => {
        const r = repo();
        const { base, logs } = resolve(r);
        assert.equal(base, r.master);
        assert.deepEqual(logs, []);
    });

    it("gh failing: origin/master, and the log says why", () => {
        const r = repo({ err: "HTTP 403: API rate limit exceeded" });
        const { base, logs } = resolve(r);
        assert.equal(base, r.master);
        assert.match(logs.join("\n"), /origin\/master \(gh could not say .*HTTP 403/);
    });

    it("a parent already merged into origin/master: origin/master", () => {
        const r = repo({ out: "feat/parent" });
        r.git("update-ref", "refs/remotes/origin/master", r.parent);
        assert.equal(resolve(r).base, r.parent); // the merge base with master is now the parent's tip anyway
        assert.equal(pushBaseRef({ cwd: r.dir, env: r.env, log: () => {} }), "origin/master");
    });

    it("the SonarQube gate judges only the stacked commit's files", () => {
        const gate = (r) =>
            spawnSync(process.execPath, [join(TOOLS, "sonar-gate.mjs")], {
                cwd: r.dir,
                env: { ...r.env, SONAR_HOST_URL: "", SONAR_TOKEN: "" },
                encoding: "utf8",
            });
        // Stacked on feat/parent, the push changes src/child.ts and README.md only; drop the .ts change
        // so the stacked commit has no analyzable file at all, and the parent's src/parent.ts is not "this push".
        const stacked = repo({ out: "feat/parent" });
        stacked.git("checkout", "-q", "feat/parent", "--", "src/child.ts");
        stacked.git("commit", "-q", "-m", "docs only", "--", "src/child.ts");
        const s = gate(stacked);
        assert.equal(s.status, 0, s.stdout + s.stderr);
        assert.match(s.stdout, /No analyzable file changed/);
        // Measured from master instead (no pull request), the parent's file is in the push.
        const flat = repo();
        flat.git("checkout", "-q", "feat/parent", "--", "src/child.ts");
        flat.git("commit", "-q", "-m", "docs only", "--", "src/child.ts");
        assert.doesNotMatch(gate(flat).stdout, /No analyzable file changed/);
    });
});
