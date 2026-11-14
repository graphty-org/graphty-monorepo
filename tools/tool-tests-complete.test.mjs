// Every tools/**/*.test.mjs and design/ui/studio/tool/*.test.mjs is run by CI: listed in tools/tool-tests.txt
// (pnpm run test:ci-workflows), or named below with the CI step that runs it instead, which this test checks still
// does (#7267). Two tool tests once ran nowhere and nothing noticed, and the design studio's eleven did the same (#6914).
//
//   node --test tools/tool-tests-complete.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(root, p), "utf8");

// Tests a CI step runs in place of test:ci-workflows. `script`: a package.json script that runs
// `node <test>` and that ci.yml runs; `workflow`: a workflow that runs it from `dir` with node --test.
const ELSEWHERE = {
    "tools/api-report.test.mjs": { script: "check:api-report" },
    "tools/eslint-rules/no-test-timing.test.mjs": { script: "lint:eslint-root" },
    "tools/release-hold.test.mjs": { script: "check:release-hold" },
    "tools/release-approvals.test.mjs": { script: "check:release-hold" },
    "tools/release-not-breaking.test.mjs": { script: "check:release-hold" },
    // its own package with its own dependencies, tested when it or what it reads changes
    "tools/pipeline-health/mcp/server.test.mjs": { workflow: "pipeline-health.yml", dir: "tools/pipeline-health" },
    "tools/pipeline-health/local/collector.test.mjs": { workflow: "pipeline-health.yml", dir: "tools/pipeline-health" },
};

// Studio tests that launch Chromium, which the CI workflow tests job does not install; the design studio's own
// runs exercise them (design/ui/studio/tool/with-browser.sh gates their browsers).
const NEEDS_BROWSER = new Set([
    "design/ui/studio/tool/bar10.test.mjs",
    "design/ui/studio/tool/bar8-9.test.mjs",
    "design/ui/studio/tool/match.test.mjs",
]);

// Studio tests that brief from persona files the roster names by an absolute path into a local worktree
// (.worktrees/ux-storyboards-mocks-and-study), which no CI checkout has; the design studio's own runs exercise them.
const NEEDS_LOCAL_PERSONAS = new Set(["design/ui/studio/tool/tier3.test.mjs"]);

function testFiles(dir) {
    return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) return e.name === "node_modules" ? [] : testFiles(p);
        return e.name.endsWith(".test.mjs") ? [p] : [];
    });
}

const listed = new Set(
    read("tools/tool-tests.txt")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#")),
);

it("runs every tool test in CI", () => {
    const missing = testFiles("tools").filter((f) => !listed.has(f) && !ELSEWHERE[f]);
    assert.deepEqual(missing, [], "add these to tools/tool-tests.txt");
});

it("runs every browser-free design studio tool test in CI", () => {
    const studio = testFiles("design/ui/studio/tool");
    const missing = studio.filter((f) => !listed.has(f) && !NEEDS_BROWSER.has(f) && !NEEDS_LOCAL_PERSONAS.has(f));
    assert.deepEqual(missing, [], "add these to tools/tool-tests.txt");
    const launches = (f) => /chromium\.launch\(/.test(read(f));
    // a test named as needing a browser really launches one, and a listed one never does
    assert.deepEqual(
        [...NEEDS_BROWSER].filter((f) => !existsSync(join(root, f)) || !launches(f)),
        [],
    );
    assert.deepEqual(
        studio.filter((f) => listed.has(f) && launches(f)),
        [],
    );
    assert.deepEqual(
        [...NEEDS_LOCAL_PERSONAS].filter((f) => listed.has(f) || !existsSync(join(root, f))),
        [],
    );
});

it("lists only test files that exist, and none twice", () => {
    assert.deepEqual(
        [...listed].filter((f) => !existsSync(join(root, f))),
        [],
    );
    assert.deepEqual(
        Object.keys(ELSEWHERE).filter((f) => listed.has(f) || !existsSync(join(root, f))),
        [],
    );
});

it("still runs each test named in place of the list", () => {
    const scripts = JSON.parse(read("package.json")).scripts;
    const ci = read(".github/workflows/ci.yml");
    for (const [file, { script, workflow, dir }] of Object.entries(ELSEWHERE)) {
        if (script) {
            assert.ok(scripts[script]?.includes(`node ${file}`), `${script} runs ${file}`);
            assert.match(ci, new RegExp(`run: pnpm run ${script}\\s*$`, "m"), `ci.yml runs ${script}`);
        } else {
            const yml = read(`.github/workflows/${workflow}`);
            assert.ok(yml.includes(`working-directory: ${dir}`), `${workflow} works in ${dir}`);
            assert.match(yml, new RegExp(`node --test .*${relative(dir, file)}`), `${workflow} runs ${file}`);
        }
    }
});
