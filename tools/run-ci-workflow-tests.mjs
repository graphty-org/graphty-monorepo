#!/usr/bin/env node
// `pnpm run test:ci-workflows`: runs every test file listed in tools/tool-tests.txt (one path per line,
// sorted; `merge=union` in .gitattributes, so two branches that each add a line never conflict) with node,
// several at once (one per core, CI_WORKFLOW_TESTS_JOBS overrides; each file's output is printed whole when it
// ends, in list order), prints the ones that failed and exits 1 if any did. Add a tool's test by adding its path.
// Each test file must be safe beside the others: its own temporary directories and port 0, never a fixed path.
// Each runs fenced off from the real world (#3392): no GitHub or results-store credentials or CI variables, a `gh`
// on PATH that refuses, and tools/tool-test-guard.mjs, which refuses fetch beyond loopback and writes to what the main
// checkout's tmp/ held when the run started. A refusal fails the test file, even when the tool under test swallowed the error.
import { execFileSync, spawn } from "node:child_process";
import {
    chmodSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
function mainCheckout() {
    try {
        const git = ["rev-parse", "--path-format=absolute", "--git-common-dir"];
        return dirname(execFileSync("git", git, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim());
    } catch {
        return root; // not a git checkout: its own tmp/ is the shared one
    }
}
const main = mainCheckout();
// what the shared tmp/ holds before any test runs: the state no test may touch
const shared = JSON.stringify(existsSync(join(main, "tmp")) ? readdirSync(join(main, "tmp")) : []);
const GUARD = pathToFileURL(fileURLToPath(new URL("tool-test-guard.mjs", import.meta.url))).href;
// what would let a test act on the real repository, the results store or the job running it
const STRIPPED = [
    "GITHUB_ACTIONS",
    "GITHUB_TOKEN",
    "GH_TOKEN",
    "GH_ENTERPRISE_TOKEN",
    "GITHUB_OUTPUT",
    "GITHUB_ENV",
    "GITHUB_PATH",
    "GITHUB_STEP_SUMMARY",
    "ACTIONS_ID_TOKEN_REQUEST_URL",
    "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
    "RESULTS_URL",
    "GRAPHTY_RESULTS_TOKEN",
    "HEALTH_API_URL",
];

/**
 * The fenced environment for one test file, and its refusal log.
 * @param dir the file's own temporary directory
 * @param [base] the environment to fence
 * @returns `{ env, log }`
 */
function fencedEnv(dir, base = process.env) {
    const bin = join(dir, "bin");
    const log = join(dir, "refused.log");
    mkdirSync(bin, { recursive: true });
    writeFileSync(
        join(bin, "gh"),
        `#!/bin/sh\necho "tool-test-guard: refused a real gh call: gh $*; stub it in the test" | tee -a '${log}' >&2\nexit 1\n`,
    );
    chmodSync(join(bin, "gh"), 0o755);
    const env = { ...base };
    for (const k of STRIPPED) delete env[k];
    env.PATH = `${bin}${delimiter}${base.PATH ?? ""}`;
    env.NODE_OPTIONS = `${base.NODE_OPTIONS ?? ""} --import=${GUARD}`.trim();
    env.TOOL_TEST_GUARD_LOG = log;
    env.TOOL_TEST_GUARD_PROTECT = join(main, "tmp");
    env.TOOL_TEST_GUARD_SHARED = shared;
    // a checkout other than the main one (a live.sh copy under tmp/live/) owns its own tree, wherever it sits (#5432)
    if (resolve(root) !== resolve(main)) env.TOOL_TEST_GUARD_OWN = resolve(root);
    env.GRAPHTY_TEST_SLOTS = "0"; // the machine's slots live in the main checkout's tmp/
    return { env, log };
}
const list = readFileSync(new URL("tool-tests.txt", import.meta.url), "utf8");
// a union merge can leave a line twice
const files = [
    ...new Set(
        list
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith("#")),
    ),
];
const jobs = Math.max(1, Number(process.env.CI_WORKFLOW_TESTS_JOBS) || availableParallelism());

function run(file) {
    const dir = mkdtempSync(join(tmpdir(), "tool-test-"));
    const { env, log } = fencedEnv(dir);
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [file], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
        const out = [];
        child.stdout.on("data", (d) => out.push(d));
        child.stderr.on("data", (d) => out.push(d));
        child.on("close", (code, signal) => {
            let status = code;
            if (existsSync(log)) {
                out.push(Buffer.from(`\n${file}: reached the real world:\n${readFileSync(log, "utf8")}`));
                status = status || 1;
            }
            rmSync(dir, { recursive: true, force: true });
            resolve({ file, status, signal, out: Buffer.concat(out) });
        });
    });
}

// Start up to `jobs` files; print results in list order as soon as every earlier one has been printed.
const results = new Array(files.length);
let next = 0;
let printed = 0;
const failed = [];
function flush() {
    while (printed < files.length && results[printed]) {
        const { file, status, signal, out } = results[printed++];
        process.stdout.write(out);
        if (status !== 0) failed.push(`${file} (${signal ?? "exit " + status})`);
    }
}
async function worker() {
    while (next < files.length) {
        const i = next++;
        results[i] = await run(files[i]);
        flush();
    }
}
await Promise.all(Array.from({ length: Math.min(jobs, files.length) }, worker));
console.log(`\ntest:ci-workflows: ${files.length - failed.length} of ${files.length} test files passed`);
if (failed.length) {
    console.log(`failed:\n${failed.map((f) => "  " + f).join("\n")}`);
    // never process.exit(): it drops whatever stdout has not handed to a pipe yet, which was the summary (#4187)
    process.exitCode = 1;
}
