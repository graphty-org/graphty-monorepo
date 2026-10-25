#!/usr/bin/env node
// `pnpm run test:ci-workflows`: runs every test file listed in tools/tool-tests.txt (one path per line,
// sorted; `merge=union` in .gitattributes, so two branches that each add a line never conflict), one after
// another with node, prints the ones that failed and exits 1 if any did. Add a tool's test by adding its path.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

const failed = [];
for (const file of files) {
    const { status, signal } = spawnSync(process.execPath, [file], { cwd: root, stdio: "inherit" });
    if (status !== 0) failed.push(`${file} (${signal ?? "exit " + status})`);
}
console.log(`\ntest:ci-workflows: ${files.length - failed.length} of ${files.length} test files passed`);
if (failed.length) {
    console.log(`failed:\n${failed.map((f) => "  " + f).join("\n")}`);
    process.exit(1);
}
