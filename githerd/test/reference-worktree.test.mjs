import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import {
    referenceAudit,
    referenceCommitlint,
    referenceDryRun,
    referenceGate,
    refreshReference,
    run,
} from "../lib/worktrees.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

/** The `Security audit` failure on master of 2026-10-02 00:18 (node-forge, no patched version). */
const AUDIT_10_02 = JSON.parse(readFileSync(new URL("replay/data/logs.json", import.meta.url), "utf8"))[
    "110646085746"
].errors.replace("##[error]Process completed with exit code 1.\n", "");

const NX_JSON = `${JSON.stringify({ release: { projects: ["*"] } }, null, 4)}\n`;

/** @type {{tmp: string, root: string, remote: string}} */
let repo;
/** @type {any[]} */
let entries;
const ledger = (/** @type {any} */ e) => entries.push(e);
/** @type {string} */
let green;
/** @type {string} */
let answers;
/** @type {Record<string, string>} */
let env;

/**
 * Sets what the fake `pnpm` answers to one subcommand.
 * @param {string} sub `audit`, `exec commitlint` or `exec nx`
 * @param {{code?: number, stdout?: string, stderr?: string}} answer its exit code and output
 */
function answer(sub, { code = 0, stdout = "", stderr = "" }) {
    writeFileSync(join(answers, `${sub.replace(" ", "-")}.json`), JSON.stringify({ code, stdout, stderr }));
}

/**
 * The fake `pnpm` calls so far, one per line: its arguments, then a tab and its standard input.
 * @returns {string[]} the calls
 */
function calls() {
    const f = join(answers, "calls.log");
    return existsSync(f) ? readFileSync(f, "utf8").trim().split("\n") : [];
}

beforeAll(() => isolateGit());
beforeEach(() => {
    repo = makeRepo();
    put(join(repo.root, "nx.json"), NX_JSON);
    // Stands in for the repository's tool: it rewrites nx.json, which the dry-run must put back.
    put(
        join(repo.root, "tools/release-hold.mjs"),
        "import { writeFileSync } from 'node:fs';\nwriteFileSync('nx.json', JSON.stringify({ release: { projects: ['*', '!held'] } }));\n",
    );
    put(join(repo.root, "tools/prepush.sh"), 'echo gate-ran >> "$GATE_LOG"\nexit 0\n');
    green = commitAll(repo.root, "chore: tools");
    git(repo.root, "push", "-q", "origin", "master");
    entries = [];
    answers = join(repo.tmp, "answers");
    put(
        join(answers, "bin", "pnpm"),
        `#!${process.execPath}
const fs = require("fs");
const dir = ${JSON.stringify(answers)};
const args = process.argv.slice(2);
const sub = args[0] === "exec" ? args.slice(0, 2).join("-") : args[0];
let input = "";
try { input = fs.readFileSync(0, "utf8"); } catch {}
fs.appendFileSync(dir + "/calls.log", args.join(" ") + "\\t" + JSON.stringify(input) + " " + process.env.NX_DAEMON + "\\n");
const a = JSON.parse(fs.readFileSync(dir + "/" + sub + ".json", "utf8"));
process.stdout.write(a.stdout);
process.stderr.write(a.stderr);
process.exit(a.code);
`,
    );
    chmodSync(join(answers, "bin", "pnpm"), 0o755);
    env = {
        ...process.env,
        PATH: `${join(answers, "bin")}:${process.env.PATH}`,
        GATE_LOG: join(answers, "gate.log"),
        NX_CACHE_DIRECTORY: "/nowhere",
    };
});
afterEach(() => rmSync(repo.tmp, { recursive: true, force: true }));

const refDir = () => join(repo.root, ".worktrees", "githerd-ref");

/**
 * Prepares the reference worktree at `green` with no setup.
 * @returns {Promise<any>} the state
 */
async function ready() {
    const state = {};
    expect(await refreshReference({ root: repo.root, state, sha: green, env, ledger })).toMatchObject({
        verdict: "ready",
    });
    return state;
}

describe("refreshReference", () => {
    it("creates a locked worktree detached at the green commit, runs the setup once per commit", async () => {
        const state = {};
        const setup = [
            process.execPath,
            "-e",
            "require('fs').appendFileSync('setup-ran', process.env.NX_CACHE_DIRECTORY + ' ' + process.env.NX_DAEMON + '\\n')",
        ];
        const r = await refreshReference({ root: repo.root, state, sha: green, setup, env, ledger });
        expect(r).toEqual({ verdict: "ready", dir: refDir(), sha: green });
        const list = git(repo.root, "worktree", "list", "--porcelain");
        expect(list).toContain(`worktree ${refDir()}\nHEAD ${green}\ndetached\nlocked githerd reference worktree`);
        expect(readFileSync(join(refDir(), "setup-ran"), "utf8")).toBe("undefined false\n");
        expect(state.reference).toMatchObject({ sha: green, ready: true });

        await refreshReference({ root: repo.root, state, sha: green, setup, env, ledger });
        expect(readFileSync(join(refDir(), "setup-ran"), "utf8")).toBe("undefined false\n");
        expect(entries.map((e) => e.kind)).toEqual(["reference-refreshed"]);
    });

    it("follows the green commit when it moves, fetching it when the checkout has not", async () => {
        const state = await ready();
        const other = join(repo.tmp, "other");
        git(repo.tmp, "clone", "-q", repo.remote, other);
        put(join(other, "next.txt"), "next\n");
        git(other, "add", "-A");
        git(other, "-c", "user.name=T", "-c", "user.email=t@example.com", "commit", "-q", "-m", "feat: next");
        git(other, "push", "-q", "origin", "master");
        const next = git(other, "rev-parse", "HEAD");
        const r = await refreshReference({ root: repo.root, state, sha: next, env, ledger });
        expect(r).toMatchObject({ verdict: "ready", sha: next });
        expect(git(refDir(), "rev-parse", "HEAD")).toBe(next);
        expect(git(refDir(), "status", "--porcelain")).toBe("");
    });

    it("is a platform fault when the setup fails, leaves no dist, or the commit cannot be had", async () => {
        const state = {};
        const fails = [process.execPath, "-e", "process.exit(3)"];
        expect(await refreshReference({ root: repo.root, state, sha: green, setup: fails, env, ledger })).toMatchObject(
            {
                verdict: "fault",
                check: "setup",
                class: "outside",
                reason: expect.stringContaining("setup exited 3"),
            },
        );
        expect(state.reference.ready).toBe(false);
        expect(await referenceAudit({ root: repo.root, state, env, ledger })).toMatchObject({
            verdict: "fault",
            reason: "the reference worktree is not prepared",
        });

        put(join(repo.root, "pkg", "package.json"), JSON.stringify({ scripts: { build: "tsc" } }));
        const withPkg = commitAll(repo.root, "feat: pkg");
        const noop = [process.execPath, "-e", ""];
        expect(
            await refreshReference({ root: repo.root, state, sha: withPkg, setup: noop, env, ledger }),
        ).toMatchObject({
            verdict: "fault",
            reason: "setup left no dist in pkg",
        });

        const missing = "0123456789abcdef0123456789abcdef01234567";
        expect(await refreshReference({ root: repo.root, state, sha: missing, env, ledger })).toMatchObject({
            verdict: "fault",
            check: "fetch",
        });
        expect(entries.filter((e) => e.kind === "reference-fault")).toHaveLength(4);
    });

    it("does not move a worktree with local changes", async () => {
        const state = await ready();
        writeFileSync(join(refDir(), "nx.json"), "{}\n");
        put(join(repo.root, "nx.json"), '{"changed": true}\n');
        const moved = commitAll(repo.root, "chore: nx");
        expect(await refreshReference({ root: repo.root, state, sha: moved, env, ledger })).toMatchObject({
            verdict: "fault",
            check: "switch",
        });
        expect(readFileSync(join(refDir(), "nx.json"), "utf8")).toBe("{}\n");
    });
});

describe("referenceAudit", () => {
    it("runs the audit exactly as ci.yml does and passes on exit 0", async () => {
        const state = await ready();
        answer("audit", { stdout: "No known vulnerabilities found\n" });
        expect(await referenceAudit({ root: repo.root, state, env, ledger })).toEqual({ verdict: "pass", sha: green });
        expect(calls()).toEqual(['audit --audit-level=high\t"" false']);
    });

    it("fails on the 2026-10-02 node-forge advisory and names it", async () => {
        const state = await ready();
        answer("audit", { code: 1, stdout: AUDIT_10_02 });
        expect(await referenceAudit({ root: repo.root, state, env, ledger })).toEqual({
            verdict: "fail",
            sha: green,
            advisories: ["GHSA-86w9-cpqp-85rv"],
            summary: "2 vulnerabilities found; Severity: 1 low | 1 high",
        });
    });

    it("is a fault when the audit could not ask the registry, and a credential on E401", async () => {
        const state = await ready();
        answer("audit", {
            code: 1,
            stderr: "request to https://registry.npmjs.org/-/npm/v1/security/audits failed, reason: connect ETIMEDOUT\n",
        });
        expect(await referenceAudit({ root: repo.root, state, env, ledger })).toMatchObject({
            verdict: "fault",
            check: "audit",
            class: "outside",
        });
        answer("audit", { code: 1, stderr: "npm ERR! code E401\n" });
        expect(await referenceAudit({ root: repo.root, state, env, ledger })).toMatchObject({ class: "credential" });
    });
});

describe("referenceCommitlint", () => {
    it("pipes the title to commitlint and passes on exit 0", async () => {
        const state = await ready();
        answer("exec commitlint", {});
        expect(await referenceCommitlint({ root: repo.root, state, title: "fix(githerd): x", env, ledger })).toEqual({
            verdict: "pass",
        });
        expect(calls()).toEqual(['exec commitlint\t"fix(githerd): x\\n" false']);
    });

    it("lists the rules a title breaks, and is a fault when commitlint did not lint", async () => {
        const state = await ready();
        const out = [
            "⧗   input: Fix: bad title",
            "✖   type must be lower-case [type-case]",
            "✖   type must be one of [build, chore, fix] [type-enum]",
            "",
            "✖   found 2 problems, 0 warnings",
            "",
        ].join("\n");
        answer("exec commitlint", { code: 1, stdout: out });
        expect(await referenceCommitlint({ root: repo.root, state, title: "Fix: bad title", env, ledger })).toEqual({
            verdict: "fail",
            problems: ["type must be lower-case [type-case]", "type must be one of [build, chore, fix] [type-enum]"],
        });
        answer("exec commitlint", { code: 1, stderr: "Error: Cannot find module '@commitlint/config-conventional'\n" });
        expect(await referenceCommitlint({ root: repo.root, state, title: "x", env, ledger })).toMatchObject({
            verdict: "fault",
            check: "commitlint",
        });
    });
});

describe("referenceDryRun", () => {
    const NEW = "NX   New version 1.3.1 written to manifest: graph-format/package.json\n";

    it("applies the release hold, reads the bumps and puts nx.json back", async () => {
        const state = await ready();
        answer("exec nx", { stdout: `\u001b[1m${NEW}\u001b[0m${NEW}` });
        expect(await referenceDryRun({ root: repo.root, state, env, ledger })).toEqual({
            verdict: "answer",
            sha: green,
            head: null,
            bumps: [{ dir: "graph-format", version: "1.3.1" }],
        });
        expect(calls()).toEqual(['exec nx release --dry-run\t"" false']);
        expect(readFileSync(join(refDir(), "nx.json"), "utf8")).toBe(NX_JSON);
        expect(git(refDir(), "status", "--porcelain")).toBe("");
    });

    it("merges a pull request head locally, signed, and returns to the green commit", async () => {
        const state = await ready();
        const other = join(repo.tmp, "other");
        git(repo.tmp, "clone", "-q", repo.remote, other);
        git(other, "switch", "-q", "-c", "feature");
        put(join(other, "graph-format", "x.ts"), "x\n");
        git(other, "add", "-A");
        git(other, "-c", "user.name=T", "-c", "user.email=t@example.com", "commit", "-q", "-m", "fix(graph-format): x");
        git(other, "push", "-q", "origin", "feature");
        const head = git(other, "rev-parse", "HEAD");
        expect(() => git(repo.root, "cat-file", "-e", head)).toThrow();

        answer("exec nx", { stdout: NEW });
        const r = await referenceDryRun({
            root: repo.root,
            state,
            env,
            ledger,
            merge: { sha: head, ref: "refs/heads/feature" },
        });
        expect(r).toEqual({ verdict: "answer", sha: green, head, bumps: [{ dir: "graph-format", version: "1.3.1" }] });
        expect(git(refDir(), "rev-parse", "HEAD")).toBe(green);
        expect(git(refDir(), "log", "-1", "--format=%G? %P", "HEAD@{1}")).toBe(`G ${green} ${head}`);
        expect(git(repo.remote, "rev-list", "--merges", "--all")).toBe("");
    });

    it("reports a merge conflict with its files and leaves the tree at the green commit", async () => {
        const state = await ready();
        git(repo.root, "switch", "-q", "-c", "clash", `${green}~1`);
        put(join(repo.root, "nx.json"), '{"clash": true}\n');
        const head = commitAll(repo.root, "fix: clash");
        git(repo.root, "switch", "-q", "master");
        const r = await referenceDryRun({ root: repo.root, state, env, ledger, merge: { sha: head } });
        expect(r).toEqual({ verdict: "conflict", head, files: ["nx.json"] });
        expect(git(refDir(), "rev-parse", "HEAD")).toBe(green);
        expect(git(refDir(), "status", "--porcelain")).toBe("");
        expect(calls()).toEqual([]);
    });

    it("is a fault when nx says neither bumps nor no changes, or the hold fails", async () => {
        const state = await ready();
        answer("exec nx", { stdout: "something else\n" });
        expect(await referenceDryRun({ root: repo.root, state, env, ledger })).toMatchObject({
            verdict: "fault",
            check: "release dry-run",
        });
        writeFileSync(join(refDir(), "tools", "release-hold.mjs"), "process.exit(1);\n");
        expect(await referenceDryRun({ root: repo.root, state, env, ledger })).toMatchObject({
            verdict: "fault",
            check: "release hold",
        });
        expect(readFileSync(join(refDir(), "nx.json"), "utf8")).toBe(NX_JSON);
    });
});

describe("referenceGate", () => {
    it("runs the whole gate once per green commit", async () => {
        const state = await ready();
        expect(await referenceGate({ root: repo.root, state, env, ledger })).toEqual({ verdict: "pass", sha: green });
        expect(await referenceGate({ root: repo.root, state, env, ledger })).toEqual({ verdict: "pass", sha: green });
        expect(readFileSync(join(answers, "gate.log"), "utf8")).toBe("gate-ran\n");
    });

    it("names the failed steps, and is a fault when the gate did not finish", async () => {
        const state = await ready();
        writeFileSync(
            join(refDir(), "tools", "prepush.sh"),
            "[ \"$PREPUSH_ALL\" = 1 ] || exit 9\nprintf '\\033[0;31m[FAIL] graphty tests failed\\033[0m\\nPre-push validation failed\\n'\nexit 1\n",
        );
        expect(await referenceGate({ root: repo.root, state, env, ledger })).toEqual({
            verdict: "fail",
            sha: green,
            steps: ["graphty tests failed"],
        });
        state.reference.gate = null;
        writeFileSync(join(refDir(), "tools", "prepush.sh"), "echo node_modules is out of date >&2\nexit 1\n");
        expect(await referenceGate({ root: repo.root, state, env, ledger })).toMatchObject({
            verdict: "fault",
            check: "gate",
            reason: expect.stringContaining("node_modules is out of date"),
        });
    });
});

describe("run", () => {
    it("kills the command's whole process group on timeout", async () => {
        const pidFile = join(repo.tmp, "child.pid");
        const r = await run("sh", ["-c", `sleep 30 & echo $! > ${pidFile}; wait`], { cwd: repo.tmp, timeoutMs: 300 });
        expect(r.timedOut).toBe(true);
        const pid = Number(readFileSync(pidFile, "utf8"));
        let alive = true;
        for (let i = 0; i < 50 && alive; i++) {
            try {
                process.kill(pid, 0);
                await new Promise((res) => setTimeout(res, 20));
            } catch {
                alive = false;
            }
        }
        expect(alive).toBe(false);
    });
});
