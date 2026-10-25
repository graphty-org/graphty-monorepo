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

function sandbox({ affected = "graph-format", env = {} } = {}) {
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
    writeFileSync(
        join(dir, "bin/pnpm"),
        `#!/bin/sh\necho "$*" >> ${out("pnpm")}\n` +
            `case "$*" in "exec nx show projects"*) printf "%s\\n" ${affected}; exit \${STUB_RC_SHOW:-0} ;; "exec nx affected"*) exit \${STUB_RC_NX:-0} ;; esac\n`,
        { mode: 0o755 },
    );
    const git = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8", env: isolatedGitEnv() });
    git("init", "-q", "-b", "main");
    git("add", ".");
    git("commit", "-q", "-m", "a");
    writeFileSync(join(repo, "changed.ts"), "x\n");
    const r = spawnSync("bash", [join(repo, "tools/check-quick.sh"), "--base", "main"], {
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

    it("refuses an unknown argument", () => {
        const r = spawnSync("bash", [SCRIPT, "--nope"], { encoding: "utf8" });
        assert.equal(r.status, 2);
        assert.match(r.stderr, /usage: tools\/check-quick\.sh \[--base <ref>\]/);
    });
});
