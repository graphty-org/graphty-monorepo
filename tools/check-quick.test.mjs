// Tests of tools/check-quick.sh (pnpm run check:quick): it runs every step, strips the old gate's
// settings, gives the tests no developer git config, and runs the NVIDIA step only when nx says
// webgpu-graph-algorithms is affected, with GRAPHTY_GPU_REQUIRE=nvidia and the libEGL tree.
//
//   node --test tools/check-quick.test.mjs   (part of pnpm run test:ci-workflows)
//
// The sandbox is a git repository holding the real script beside stubs of the tools it calls, and a
// `pnpm` on PATH that logs its arguments; each stub writes its own environment to a file.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

const SCRIPT = new URL("./check-quick.sh", import.meta.url).pathname;

// A stub tool: records its environment, arguments and directory, exits with $<rcVar> (default 0).
const envDump = (file, rcVar) =>
    `import { writeFileSync } from "node:fs";\n` +
    `writeFileSync(${JSON.stringify(file)}, JSON.stringify({ env: process.env, argv: process.argv.slice(2), cwd: process.cwd() }));\n` +
    `process.exit(Number(process.env.${rcVar} ?? 0));\n`;

function sandbox({ affected = "graph-format", env = {}, args = [] } = {}) {
    const dir = mkdtempSync(join(tmpdir(), "check-quick-"));
    const repo = join(dir, "repo");
    const out = (n) => join(dir, n);
    mkdirSync(join(repo, "tools"), { recursive: true });
    mkdirSync(join(repo, "webgpu-graph-algorithms"));
    mkdirSync(join(dir, "bin"));
    copyFileSync(SCRIPT, join(repo, "tools/check-quick.sh"));
    writeFileSync(join(repo, "tools/test-changed.mjs"), envDump(out("tests.json"), "STUB_RC_TESTS"));
    writeFileSync(join(repo, "tools/sonar-gate.mjs"), envDump(out("sonar.json"), "STUB_RC_SONAR"));
    writeFileSync(join(repo, "tools/test-slots.mjs"), envDump(out("gpu.json"), "STUB_RC_GPU"));
    writeFileSync(join(repo, "tools/pr-integrity.mjs"), envDump(out("integrity.json"), "STUB_RC_INTEGRITY"));
    writeFileSync(join(repo, "tools/ci-budgets.mjs"), envDump(out("budgets.json"), "STUB_RC_BUDGETS"));
    writeFileSync(join(repo, "tools/check-links.sh"), `#!/bin/sh\necho "$*" > ${out("links")}\n`, { mode: 0o755 });
    mkdirSync(join(repo, "graph-format"));
    writeFileSync(join(repo, "graph-format/package.json"), "{}");
    mkdirSync(join(repo, "graphty/acceptance"), { recursive: true });
    writeFileSync(join(repo, "graphty/acceptance/run.mjs"), envDump(out("dryrun.json"), "STUB_RC_DRYRUN"));
    copyFileSync(new URL("./docs-affected.sh", import.meta.url).pathname, join(repo, "tools/docs-affected.sh"));
    writeFileSync(join(repo, "tools/copy-docs-content.js"), "");
    writeFileSync(join(repo, "package.json"), JSON.stringify({ scripts: { "docs:api:graph-io": "x" } }));
    writeFileSync(
        join(dir, "bin/pnpm"),
        `#!/bin/sh\necho "$*" >> ${out("pnpm")}\n` +
            `case "$*" in "exec nx show projects"*) printf "%s\\n" ${affected}; exit \${STUB_RC_SHOW:-0} ;; "exec nx affected"*) exit \${STUB_RC_NX:-0} ;; "exec nx run graphty:build") exit \${STUB_RC_APP:-0} ;; esac\n`,
        { mode: 0o755 },
    );
    const git = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8", env: isolatedGitEnv() });
    git("init", "-q", "-b", "main");
    git("add", ".");
    git("commit", "-q", "-m", "a");
    writeFileSync(join(repo, "changed.ts"), "x\n");
    const r = spawnSync("bash", [join(repo, "tools/check-quick.sh"), "--base", "main", ...args], {
        cwd: repo,
        encoding: "utf8",
        env: {
            ...isolatedGitEnv(),
            PATH: `${join(dir, "bin")}:${process.env.PATH}`,
            PREPUSH_LIGHT: "1",
            PREPUSH_ROOT: "/elsewhere",
            TEST_SLOT_GATE: "123",
            TEST_LEDGER_RUN: "r",
            GRAPHTY_TEST_QUARANTINE: "0",
            GRAPHTY_TEST_SLOTS: "3",
            GRAPHTY_EGL_LIB_DIR: "/egl",
            ...env,
        },
    });
    const read = (n) => {
        try {
            return JSON.parse(readFileSync(out(n), "utf8"));
        } catch {
            return undefined;
        }
    };
    const result = {
        r,
        pnpm: readFileSync(out("pnpm"), "utf8"),
        tests: read("tests.json"),
        sonar: read("sonar.json"),
        gpu: read("gpu.json"),
        integrity: read("integrity.json"),
        dryRun: read("dryrun.json"),
        budgets: read("budgets.json"),
        links: (() => {
            try {
                return readFileSync(out("links"), "utf8");
            } catch {
                return undefined;
            }
        })(),
    };
    rmSync(dir, { recursive: true, force: true });
    return result;
}

describe("tools/check-quick.sh", () => {
    it("runs formatting, lint, the selected tests and SonarQube from the base, without the old gate's settings", () => {
        const { r, pnpm, tests, sonar, gpu } = sandbox();
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(pnpm, /^exec prettier --check --ignore-unknown changed\.ts$/m, "the changed file only");
        assert.match(pnpm, /^exec nx affected -t build lint typecheck --base=main$/m);
        assert.deepEqual(tests.argv, ["--base", "main"]);
        for (const name of [
            "PREPUSH_LIGHT",
            "PREPUSH_ROOT",
            "TEST_SLOT_GATE",
            "TEST_LEDGER_RUN",
            "GRAPHTY_TEST_QUARANTINE",
        ]) {
            assert.equal(tests.env[name], undefined, `${name} is unset`);
        }
        assert.equal(tests.env.GRAPHTY_TEST_SLOTS, "3", "the slot count stays");
        assert.equal(tests.env.GIT_CONFIG_GLOBAL, "/dev/null", "tests read no developer git config");
        assert.equal(sonar.env.PUSH_BASE_REF, "main", "SonarQube measures from the same base");
        assert.equal(gpu, undefined, "no GPU run when webgpu-graph-algorithms is not affected");
        assert.doesNotMatch(pnpm, /docs:build|check:bundle-size|run size/, "no docs or bundle step when unaffected");
        assert.match(r.stdout, /\[PASS\] quick check/);
    });

    it("runs the NVIDIA tests with GRAPHTY_GPU_REQUIRE=nvidia and the libEGL tree when webgpu is affected", () => {
        const { r, gpu } = sandbox({ affected: "graph-format webgpu-graph-algorithms" });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.ok(gpu, "the GPU step ran");
        assert.deepEqual(gpu.argv, ["--gpu", "npm", "run", "test:run"]);
        assert.match(gpu.cwd, /webgpu-graph-algorithms$/);
        assert.equal(gpu.env.GRAPHTY_GPU_REQUIRE, "nvidia");
        assert.equal(gpu.env.GRAPHTY_EGL_LIB_DIR, "/egl");
        assert.match(gpu.env.LD_LIBRARY_PATH, /^\/egl(:|$)/);
        assert.equal(gpu.env.GIT_CONFIG_GLOBAL, "/dev/null");
    });

    it("runs PR Integrity on HEAD, and the docs build and bundle sizes when their packages are affected", () => {
        const { r, pnpm, integrity } = sandbox({ affected: "graph-io graphty-element cytoscape-extensions" });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.deepEqual(integrity.argv, ["--local", "--base", "main"]);
        assert.match(pnpm, /^run docs:build$/m);
        assert.match(pnpm, /^run check:bundle-size$/m);
        assert.match(pnpm, /^--filter @graphty\/cytoscape-extensions run size$/m);
    });

    it("names a failed PR Integrity in the summary", () => {
        const { r } = sandbox({ env: { STUB_RC_INTEGRITY: "1" } });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /\[FAIL\] quick check: PR Integrity \(local\)/);
    });

    it("runs every step after a failure and names each failed one", () => {
        const { r, tests, sonar } = sandbox({ env: { STUB_RC_NX: "1", STUB_RC_TESTS: "1" } });
        assert.equal(r.status, 1);
        assert.ok(tests && sonar, "the steps after the failures still ran");
        assert.match(
            r.stdout,
            /\[FAIL\] quick check: Build, lint and type-check \(affected\)\n\[FAIL\] quick check: Selected tests/,
        );
    });

    it("fails, rather than skipping the GPU step silently, when nx cannot list the affected projects", () => {
        const { r } = sandbox({ env: { STUB_RC_SHOW: "1" } });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /\[FAIL\] quick check: Affected projects \(nx show projects\)/);
    });

    it("never runs the dry run unless asked", () => {
        const { r, pnpm, dryRun } = sandbox({ affected: "graphty graphty-element" });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(dryRun, undefined, "no dry run without --with-dry-run");
        assert.doesNotMatch(pnpm, /nx run graphty:build/);
    });

    it("with --with-dry-run, builds the app and walks every route of the dry run", () => {
        const { r, pnpm, dryRun } = sandbox({ args: ["--with-dry-run"] });
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.match(pnpm, /^exec nx run graphty:build$/m);
        assert.ok(dryRun, "the dry run ran");
        assert.deepEqual(dryRun.argv, []);
        assert.match(r.stdout, /\[PASS\] Dry run of the graphty app/);
    });

    it("names a failed dry run, and never walks a stale build when the app build fails", () => {
        const failed = sandbox({ args: ["--with-dry-run"], env: { STUB_RC_DRYRUN: "1" } });
        assert.equal(failed.r.status, 1);
        assert.match(failed.r.stdout, /\[FAIL\] quick check: Dry run of the graphty app/);
        const unbuilt = sandbox({ args: ["--with-dry-run"], env: { STUB_RC_APP: "1" } });
        assert.equal(unbuilt.r.status, 1);
        assert.equal(unbuilt.dryRun, undefined, "no walk of an old build");
    });

    it("runs ci.yml's Checks job steps, the package-only ones only for an affected package", () => {
        const { r, pnpm, budgets, links } = sandbox();
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.deepEqual(budgets.argv, ["lint"]);
        assert.equal(links, "--offline\n");
        assert.match(r.stdout, /\[PASS\] No signing bypass in tools\/ and \.husky\//);
        for (const script of [
            "test:ci-workflows",
            "lint:knip",
            "lint:knip:prod",
            "check:published-deps graph-format",
            "lint:eslint-root",
            "check:features",
            "check:declared-tools",
            "check:dry-run-checks",
            "check:release-hold",
            "check:migration-counts",
            "check:legacy-use",
            "check:committed-images",
            "check:figma-lock",
        ]) {
            assert.match(pnpm, new RegExp(`^run ${script}$`, "m"), script);
        }
        assert.doesNotMatch(pnpm, /check:api-report|check:data-source-migration|format:check/);
        const element = sandbox({ affected: "graphty-element" });
        assert.match(element.pnpm, /^run check:api-report$/m);
        assert.match(element.pnpm, /^run check:data-source-migration$/m);
        assert.doesNotMatch(element.pnpm, /check:published-deps/, "no package directory, nothing to pack");
    });

    it("runs every `pnpm run` script of ci.yml's Checks job, so the two cannot drift", () => {
        const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
        const job = ci.split(/^ {4}checks:$/m)[1].split(/^ {4}[a-z][\w-]*:$/m)[0];
        const scripts = [...new Set([...job.matchAll(/pnpm run ([\w:-]+)/g)].map((m) => m[1]))];
        assert.ok(scripts.length > 10, `found the Checks job's scripts: ${scripts}`);
        const quick = readFileSync(SCRIPT, "utf8");
        for (const script of scripts) assert.match(quick, new RegExp(`pnpm run ${script}\\b`), script);
    });

    it("refuses an unknown argument", () => {
        const r = spawnSync("bash", [SCRIPT, "--nope"], { encoding: "utf8" });
        assert.equal(r.status, 2);
        assert.match(r.stderr, /usage: tools\/check-quick\.sh \[--base <ref>\] \[--with-dry-run\]/);
    });
});
