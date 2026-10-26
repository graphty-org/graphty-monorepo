// Tests of tools/pr-review.sh: a throwaway origin and clone, and a fake `claude` and `gh` on PATH. The fake
// claude records its arguments and the prompt it was sent, and answers with FAKE_OUT.
// Run: node --test tools/pr-review.test.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, beforeEach, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

const script = fileURLToPath(new URL("./pr-review.sh", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "pr-review-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const bin = join(dir, "bin");
const argsLog = join(dir, "claude.args");
const promptLog = join(dir, "claude.prompt");
mkdirSync(bin);
writeFileSync(
    join(bin, "claude"),
    `#!/bin/bash
printf '%s\\n' "$@" > ${JSON.stringify(argsLog)}
cat > ${JSON.stringify(promptLog)}
printf '%s\\n' "$FAKE_OUT"
`,
);
const ISSUE = "Build the review script\n\nThe body of the issue.";
writeFileSync(join(dir, "issue.txt"), `${ISSUE}\n`);
writeFileSync(
    join(bin, "gh"),
    `#!/bin/bash\n[ "$1 $2 $3" = "issue view 1234" ] || exit 9\ncat ${JSON.stringify(join(dir, "issue.txt"))}\n`,
);
chmodSync(join(bin, "claude"), 0o755);
chmodSync(join(bin, "gh"), 0o755);

const env = isolatedGitEnv({ ...process.env, PATH: `${bin}:${process.env.PATH}`, PR_REVIEW_LOCAL: "1" });
const git = (cwd, ...args) => {
    const r = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout;
};
const proof = join(dir, "proof.md");
writeFileSync(proof, "node --test tools/x.test.mjs: 3 pass\n");

let work;
let n = 0;
beforeEach(() => {
    n += 1;
    for (const f of [argsLog, promptLog]) rmSync(f, { force: true });
    const origin = join(dir, `origin-${n}.git`);
    work = join(dir, `work-${n}`);
    git(dir, "init", "-q", "--bare", "-b", "master", origin);
    git(dir, "clone", "-q", origin, work);
    writeFileSync(join(work, "a.txt"), "one\ntwo\nthree\n");
    git(work, "add", ".");
    git(work, "commit", "-q", "-m", "base");
    git(work, "push", "-q", "origin", "master");
    git(work, "checkout", "-q", "-b", "fix/1234-thing");
    writeFileSync(join(work, "a.txt"), "one\nTWO\nthree\n");
    git(work, "commit", "-q", "-am", "fix(tools): a fix");
});

const run = (args = ["--proof", proof], out = "No findings.\n\nBlocking findings: 0") => {
    const r = spawnSync("bash", [script, ...args], { cwd: work, env: { ...env, FAKE_OUT: out }, encoding: "utf8" });
    return { code: r.status, stdout: r.stdout, out: r.stdout + r.stderr };
};
const patchId = () => {
    const mb = git(work, "merge-base", "origin/master", "HEAD").trim();
    const diff = git(work, "diff", "-U0", "--no-color", "--no-ext-diff", mb, "HEAD");
    return spawnSync("git", ["patch-id", "--stable"], { cwd: work, env, input: diff, encoding: "utf8" }).stdout.split(
        " ",
    )[0];
};
const reportPath = () => join(work, "tmp/pr-review/fix/1234-thing/report.md");

describe("pr-review.sh", () => {
    it("sends a fresh claude -p the issue, the Proof and the diff, and nothing else", () => {
        const r = run();
        assert.equal(r.code, 0, r.out);
        const argv = readFileSync(argsLog, "utf8").trim().split("\n");
        assert.ok(argv.includes("-p"));
        assert.ok(!argv.some((a) => /^--(continue|resume)$|^-[cr]$/.test(a)), "never a resumed conversation");
        const prompt = readFileSync(promptLog, "utf8");
        const sections = prompt.split(/^===== (.*) =====$/m);
        // [instructions, "ISSUE #1234", issue, "PROOF", proof, "DIFF (...)", diff]
        assert.equal(sections.length, 7, "exactly three input sections");
        assert.match(sections[0], /code-review.*medium/);
        assert.match(sections[0], /Report ONLY critical findings/);
        assert.match(sections[0], /"No critical findings\."/);
        assert.equal(sections[1], "ISSUE #1234");
        assert.equal(sections[2].trim(), ISSUE);
        assert.equal(sections[3], "PROOF");
        assert.equal(sections[4].trim(), readFileSync(proof, "utf8").trim());
        assert.equal(sections[5], "DIFF (git diff origin/master...HEAD)");
        assert.equal(sections[6].trim(), git(work, "diff", "origin/master...HEAD").trim());
        assert.ok(!sections[0].includes(work), "no path or state of the author's session in the instructions");
    });

    it("writes the report with the patch id PR Integrity recomputes on its first line, kept by a master merge", () => {
        const id = patchId();
        assert.match(id, /^[0-9a-f]{40}$/);
        let r = run();
        assert.equal(r.code, 0, r.out);
        assert.equal(r.stdout.trim(), reportPath());
        const report = readFileSync(reportPath(), "utf8");
        assert.equal(report.split("\n")[0], `<!-- fresh-review ${id} -->`);
        assert.match(report, /^Blocking findings: 0$/m);
        // master moves (an unrelated file) and is merged in: the branch's own change, and so the id, stay.
        git(work, "checkout", "-q", "master");
        writeFileSync(join(work, "m.txt"), "m\n");
        git(work, "add", "m.txt");
        git(work, "commit", "-q", "-m", "chore: master moved");
        git(work, "push", "-q", "origin", "master");
        git(work, "checkout", "-q", "fix/1234-thing");
        git(work, "merge", "-q", "--no-edit", "origin/master");
        r = run();
        assert.equal(r.code, 0, r.out);
        assert.equal(readFileSync(reportPath(), "utf8").split("\n")[0], `<!-- fresh-review ${id} -->`);
    });

    it("exits 3 on a blocking finding, and 1 when the review gives no verdict", () => {
        let r = run(undefined, "a.txt:2 -- wrong case\n\nBlocking findings: 2");
        assert.equal(r.code, 3, r.out);
        assert.match(r.out, /2 blocking finding/);
        assert.match(readFileSync(reportPath(), "utf8"), /^Blocking findings: 2$/m);
        r = run(["--proof", proof, "--again"], "looks fine");
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /without a 'Blocking findings: N' line/);
    });

    it("reviews a branch once: a fix reuses the report without calling claude; --again reviews it again", () => {
        assert.equal(run(undefined, "x\n\nBlocking findings: 1").code, 3);
        rmSync(argsLog);
        assert.equal(run(["--proof", proof, "--reuse"]).code, 3);
        assert.ok(!existsSync(argsLog), "claude was not called");
        writeFileSync(join(work, "a.txt"), "one\nTwo\nthree\n");
        git(work, "commit", "-q", "-am", "fix(tools): the finding");
        assert.equal(run().code, 3, "the first review still stands after a fix");
        assert.ok(!existsSync(argsLog), "claude was not called for the fix");
        assert.equal(run(["--proof", proof, "--again"]).code, 0);
        assert.ok(existsSync(argsLog), "--again reviewed the branch once more");
    });

    it("runs master's copy of itself when this branch's copy is older", () => {
        // master gets a different pr-review.sh; the branch's run must hand over to it
        git(work, "checkout", "-q", "master");
        mkdirSync(join(work, "tools"), { recursive: true });
        writeFileSync(join(work, "tools", "pr-review.sh"), "echo MASTER-COPY $PR_REVIEW_FROM_MASTER\n");
        git(work, "add", ".");
        git(work, "commit", "-q", "-m", "chore(tools): newer review");
        git(work, "push", "-q", "origin", "master");
        git(work, "checkout", "-q", "fix/1234-thing");
        const r = spawnSync("bash", [script, "--proof", proof], {
            cwd: work,
            env: { ...env, PR_REVIEW_LOCAL: "" },
            encoding: "utf8",
        });
        assert.match(r.stdout, /^MASTER-COPY 1$/m, r.stdout + r.stderr);
        assert.ok(!existsSync(argsLog), "the branch's own copy did not run the review");
    });

    it("names data files and summarizes a large diff, keeping the prompt small", () => {
        mkdirSync(join(work, "design/mockups"), { recursive: true });
        mkdirSync(join(work, "graphty/public/samples"), { recursive: true });
        const big = "x".repeat(100).concat("\n").repeat(120000); // 12 MB each, over claude -p's 10 MB stdin limit
        writeFileSync(join(work, "design/mockups/page.html"), big);
        writeFileSync(join(work, "graphty/public/samples/data.json"), big);
        writeFileSync(join(work, "pnpm-lock.yaml"), "lock: 1\n");
        writeFileSync(join(work, "src.ts"), "const line = 1;\n".repeat(30000)); // ~480 KB of code
        git(work, "add", ".");
        git(work, "commit", "-q", "-m", "feat(tools): a large change");
        const r = run();
        assert.equal(r.code, 0, r.out);
        const prompt = readFileSync(promptLog, "utf8");
        assert.ok(prompt.length < 100000, `prompt is ${prompt.length} bytes`);
        assert.match(prompt, /too large to include/);
        assert.match(prompt, /^ src\.ts +\| 30000 \+/m);
        assert.match(prompt, /^ a\.txt +\| +2 /m);
        for (const f of ["design/mockups/page.html", "graphty/public/samples/data.json", "pnpm-lock.yaml"]) {
            assert.match(prompt, new RegExp(`^${f.replace(/[.]/g, "\\.")}$`, "m"), `${f} named`);
        }
        assert.ok(!prompt.includes("x".repeat(100)), "no data file content inlined");
    });

    it("inlines a small diff but only names its data files", () => {
        mkdirSync(join(work, "design"), { recursive: true });
        writeFileSync(join(work, "design/note.html"), "<p>SECRET-MOCKUP</p>\n");
        git(work, "add", ".");
        git(work, "commit", "-q", "-m", "docs: a mockup");
        assert.equal(run().code, 0);
        const prompt = readFileSync(promptLog, "utf8");
        assert.match(prompt, /^\+TWO$/m);
        assert.match(prompt, /^design\/note\.html$/m);
        assert.ok(!prompt.includes("SECRET-MOCKUP"));
    });

    it("refuses without a Proof file, calling nothing", () => {
        for (const args of [[], ["--proof", join(dir, "missing.md")]]) {
            const r = run(args);
            assert.equal(r.code, 1, r.out);
            assert.match(r.out, /--proof <file> is required/);
            assert.ok(!existsSync(argsLog), "claude was not called");
        }
    });

    it("prints the prompt with --dry-run, calling claude for nothing and writing no report", () => {
        const r = run(["--proof", proof, "--dry-run"]);
        assert.equal(r.code, 0, r.out);
        assert.match(r.stdout, /^===== ISSUE #1234 =====$/m);
        assert.match(r.stdout, /^\+TWO$/m);
        assert.ok(!existsSync(argsLog), "claude was not called");
        assert.ok(!existsSync(reportPath()));
    });
});
