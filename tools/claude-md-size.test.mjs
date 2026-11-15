// The CLAUDE.md size budget (#3304): every session loads the root CLAUDE.md, and an agent working in a package loads
// that package's, so each stays small. Reference goes to tools/README.md, .github/workflows/README.md or design/.
//
//   node --test tools/claude-md-size.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
export const ROOT_BUDGET = 30 * 1024;
export const PACKAGE_BUDGET = 20 * 1024;

const files = execFileSync("git", ["ls-files", "CLAUDE.md", "*/CLAUDE.md"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);

it("finds the root CLAUDE.md", () => assert.ok(files.includes("CLAUDE.md")));

for (const file of files) {
    const budget = file === "CLAUDE.md" ? ROOT_BUDGET : PACKAGE_BUDGET;
    it(`${file} is at most ${budget} bytes`, () => {
        const size = statSync(`${root}${file}`).size;
        assert.ok(
            size <= budget,
            `${file} is ${size} bytes, over its ${budget}: move reference out to a file it points at`,
        );
    });
}
