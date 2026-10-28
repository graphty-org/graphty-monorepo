#!/usr/bin/env node
// `pnpm run test:ci-workflows`: runs every test file listed in tools/tool-tests.txt (one path per line,
// sorted; `merge=union` in .gitattributes, so two branches that each add a line never conflict) with node,
// several at once (one per core, CI_WORKFLOW_TESTS_JOBS overrides; each file's output is printed whole when it
// ends, in list order), prints the ones that failed and exits 1 if any did. Add a tool's test by adding its path.
// Each test file must be safe beside the others: its own temporary directories and port 0, never a fixed path.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
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
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [file], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
        const out = [];
        child.stdout.on("data", (d) => out.push(d));
        child.stderr.on("data", (d) => out.push(d));
        child.on("close", (status, signal) => resolve({ file, status, signal, out: Buffer.concat(out) }));
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
    process.exit(1);
}
