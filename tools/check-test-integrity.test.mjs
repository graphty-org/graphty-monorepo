// Tests of tools/check-test-integrity.mjs: each rule fires on the change that weakens a test and stays
// quiet on the change that only moves or rewrites one, in a throwaway repository per case.
//
//   node --test tools/check-test-integrity.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { check } from "./check-test-integrity.mjs";
import { isolatedGitEnv } from "./isolated-git-env.mjs";

const TMP = mkdtempSync(join(tmpdir(), "check-test-integrity-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
const SCRIPT = new URL("./check-test-integrity.mjs", import.meta.url).pathname;
const env = isolatedGitEnv();
let n = 0;

// A repository holding `files` on branch `base`; `change(files)` commits them on `work` and returns
// the check's findings for base...work. A null content deletes the file.
function repo(files) {
    const dir = join(TMP, `r${n++}`);
    mkdirSync(dir);
    const git = (...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8" });
    const write = (map) => {
        for (const [p, content] of Object.entries(map)) {
            if (content === null) rmSync(join(dir, p));
            else {
                mkdirSync(join(dir, dirname(p)), { recursive: true });
                writeFileSync(join(dir, p), content);
            }
        }
        git("add", "-A");
        git("commit", "-qm", "c", "--allow-empty");
    };
    git("init", "-q", "-b", "base");
    write(files);
    git("checkout", "-qb", "work");
    const change = (map) => {
        write(map);
        return check({ base: "base", head: "work", cwd: dir });
    };
    return { dir, change, git };
}

const TWO = `describe("x", () => {
    it("one", () => {
        expect(1).toBe(1);
    });
    it("two", async () => {
        await vi.waitFor(() => expect(2).toBe(2), { timeout: 1000 });
    });
});
`;
const ONE = TWO.replace(/ {4}it\("two"[\s\S]*?\n {4}\}\);\n/, "");

// Spelled in pieces so this file does not itself read as a focused test or a retry.
const FOCUSED = ["it", "only"].join(".");
const RETRY_3 = ["retry", " 3"].join(":");
const TIMEOUT_30S = ["timeout", " 30000"].join(":");

const has = (found, text) =>
    assert.ok(
        found.some((f) => f.includes(text)),
        `expected "${text}" in ${JSON.stringify(found)}`,
    );

describe("check-test-integrity: tests and assertions", () => {
    it("reports a deleted test and its assertions", () => {
        const found = repo({ "a.test.ts": TWO }).change({ "a.test.ts": ONE });
        has(found, "tests -1 net: a.test.ts -1");
        has(found, "assertions -1 net");
    });

    it("reports a deleted test file", () => {
        has(repo({ "a.test.ts": TWO, "README.md": "x" }).change({ "a.test.ts": null }), "a.test.ts -2 (deleted)");
    });

    it("passes a test moved to another file, and a renamed test file", () => {
        assert.deepEqual(
            repo({ "a.test.ts": TWO }).change({
                "a.test.ts": ONE,
                "b.test.ts": TWO.replace(/ {4}it\("one"[\s\S]*?\n {4}\}\);\n/, ""),
            }),
            [],
        );
        assert.deepEqual(repo({ "a.test.ts": TWO }).change({ "a.test.ts": null, "renamed.test.ts": TWO }), []);
    });

    it("passes a commented-out test removed, and counts a regex's .test( as no test", () => {
        const before = `${ONE}// it("old", () => {});\nconst ok = /x/.test(s);\n`;
        assert.deepEqual(repo({ "a.test.ts": before }).change({ "a.test.ts": ONE }), []);
    });

    it("reports tests commented out with a block comment, and an assertion after a URL removed", () => {
        has(
            repo({ "a.test.ts": TWO }).change({
                "a.test.ts": TWO.replace('    it("two"', '    /*\n    it("two"').replace("\n});\n", "\n    */\n});\n"),
            }),
            "tests -1 net",
        );
        const url = `${ONE}it("u", () => { const u = "http://x"; expect(u).toBe(u); });\n`;
        has(
            repo({ "a.test.ts": url }).change({ "a.test.ts": url.replace("expect(u).toBe(u); ", "") }),
            "assertions -1",
        );
    });

    it("passes a comment opener inside a string or a regex", () => {
        const glob = `${ONE}const g = ["src/**/*.test.ts"]; const r = /\\/\\//;\n`;
        assert.deepEqual(repo({ "a.test.ts": ONE }).change({ "a.test.ts": glob }), []);
    });

    it("reports a story export removed", () => {
        const stories = "export default { title: 'X' };\nexport const A = {};\nexport const B = {};\n";
        has(
            repo({ "x.stories.ts": stories }).change({ "x.stories.ts": stories.replace("export const B = {};\n", "") }),
            "tests -1",
        );
    });
});

describe("check-test-integrity: skips, timeouts, retries", () => {
    it("reports a test made .skip or .fails, and a new file's .only", () => {
        has(
            repo({ "a.test.ts": TWO }).change({ "a.test.ts": TWO.replace('it("two"', 'it.skip("two"') }),
            "skip/only/todo +1",
        );
        has(
            repo({ "a.test.ts": TWO }).change({ "a.test.ts": TWO.replace('it("two"', 'it.fails("two"') }),
            "skip/only/todo +1",
        );
        has(repo({ "a.test.ts": TWO }).change({ "b.test.ts": `${FOCUSED}("x", () => {});\n` }), "skip/only/todo +1");
    });

    it("passes a new file's conditional tests", () => {
        assert.deepEqual(
            repo({ "a.test.ts": TWO }).change({
                "b.test.ts": 'describe.skipIf(!MAC)("x", () => { it("y", () => {}); });\n',
            }),
            [],
        );
    });

    it("reports a grown wait timeout and passes an unchanged one", () => {
        has(
            repo({ "a.test.ts": TWO }).change({ "a.test.ts": TWO.replace("timeout: 1000", "timeout: 30_000") }),
            "timeout timeout 1000 -> 30000",
        );
        assert.deepEqual(
            repo({ "a.test.ts": TWO }).change({ "a.test.ts": TWO.replace("expect(2)", "expect(2 )") }),
            [],
        );
    });

    it("reports a timeout added to a wait in an existing test file, and passes one in a new file", () => {
        has(
            repo({ "a.test.ts": ONE }).change({
                "a.test.ts": ONE.replace(
                    "expect(1).toBe(1);",
                    `await vi.waitFor(() => expect(1).toBe(1), { ${TIMEOUT_30S} });`,
                ),
            }),
            "timeout timeout added",
        );
        assert.deepEqual(repo({ "a.test.ts": ONE }).change({ "b.test.ts": TWO }), []);
    });

    it("reports a retry added to a test, but not the code under test's retries option", () => {
        has(
            repo({ "a.test.ts": TWO }).change({
                "a.test.ts": TWO.replace('it("one", ()', `it("one", { ${RETRY_3} }, ()`),
            }),
            "retry retry added",
        );
        assert.deepEqual(repo({ "a.test.ts": TWO }).change({ "a.test.ts": `${TWO}const o = { retries: 2 };\n` }), []);
    });

    // #4102: a lint rule's test file holds the code the rule judges as strings; their timeouts and assertions
    // are fixtures, not the test's own.
    it("ignores timeouts and assertions inside string and template literals (a lint rule's fixtures)", () => {
        const rule = (ms, extra) => `${ONE}it("rule", () => {
    tester.run("no-test-timing", rule, {
        invalid: [{ code: "await vi.waitFor(f, { timeout: ${ms} });" }, { code: 'expect(a).toBe(1); assert(b);' }],
        valid: [\`${extra}\`],
    });
});
`;
        const before = rule(5000, "x");
        const after = rule(60000, "export default { test: { testTimeout: 1000, hookTimeout: 1000 } };");
        assert.deepEqual(repo({ "r.test.mjs": before }).change({ "r.test.mjs": after }), []);
        // the fixture's assertions removed are not assertions removed
        assert.deepEqual(
            repo({ "r.test.mjs": before }).change({
                "r.test.mjs": before.replace("expect(a).toBe(1); assert(b);", "f()"),
            }),
            [],
        );
    });

    it("still reports a real timeout grown next to a string, on the right line", () => {
        const file = `${TWO}const s = "timeout: 1";\n`;
        has(
            repo({ "a.test.ts": file }).change({ "a.test.ts": file.replace("timeout: 1000", "timeout: 9000") }),
            "timeout timeout 1000 -> 9000",
        );
    });
});

const CONFIG = `export default defineConfig({
    test: {
        include: ["test/**/*.test.ts"],
        exclude: ["**/node_modules/**"],
        testTimeout: 5000,
        coverage: { thresholds: { lines: 80, branches: 75 } },
    },
});
`;

describe("check-test-integrity: vitest configs", () => {
    it("reports a raised testTimeout and a lowered threshold", () => {
        const found = repo({ "vitest.config.ts": CONFIG }).change({
            "vitest.config.ts": CONFIG.replace("testTimeout: 5000", "testTimeout: 60000").replace(
                "lines: 80",
                "lines: 70",
            ),
        });
        has(found, "timeout testTimeout 5000 -> 60000");
        has(found, "coverage threshold lines 80 -> 70");
    });

    it("reports an exclude added and an include dropped", () => {
        has(
            repo({ "vitest.config.ts": CONFIG }).change({
                "vitest.config.ts": CONFIG.replace('"**/node_modules/**"', '"test/slow/**"'),
            }),
            "loosened: test/slow/**",
        );
        has(
            repo({ "vitest.config.ts": CONFIG }).change({
                "vitest.config.ts": CONFIG.replace('"test/**/*.test.ts"', '"test/a/*.test.ts"'),
            }),
            "loosened: test/**/*.test.ts",
        );
    });

    it("passes tests moved to a new config that includes them", () => {
        const found = repo({ "vitest.config.ts": CONFIG }).change({
            "vitest.config.ts": CONFIG.replace('"**/node_modules/**"', '"test/browser/**"'),
            "vitest.browser.config.ts": 'export default { test: { include: ["test/browser/**/*.test.ts"] } };\n',
        });
        assert.deepEqual(found, []);
    });

    it("reports a deleted vitest config", () => {
        has(
            repo({ "vitest.config.ts": CONFIG, "x.md": "x" }).change({ "vitest.config.ts": null }),
            "vitest config deleted",
        );
    });
});

describe("check-test-integrity: odd paths and lines", () => {
    it("judges a file whose path git quotes", () => {
        const name = 'src/we"ird.test.mjs';
        has(
            repo({ [name]: TWO }).change({ [name]: TWO.split("\n").slice(0, 2).join("\n") + "\n" }),
            `tests -1 net: ${name}`,
        );
    });

    it("counts a removed line that starts with -- as content, not a header", () => {
        const before = `${TWO}-- a line of text\n`;
        assert.deepEqual(repo({ "src/a.test.mjs": before }).change({ "src/a.test.mjs": TWO }), []);
    });
});

describe("check-test-integrity: the tool test list", () => {
    const LIST = "tools/tool-tests.txt";
    const files = { [LIST]: "tools/a.test.mjs\ntools/b.test.mjs\n", "tools/a.test.mjs": "x", "tools/b.test.mjs": "y" };

    it("reports a line removed while its test file still exists", () => {
        has(
            repo(files).change({ [LIST]: "tools/a.test.mjs\n" }),
            "tools/b.test.mjs removed while the file still exists",
        );
        has(repo(files).change({ [LIST]: null }), "tools/a.test.mjs removed while the file still exists");
    });

    it("passes a line added, or removed with its file", () => {
        assert.deepEqual(
            repo(files).change({
                [LIST]: "tools/a.test.mjs\ntools/b.test.mjs\ntools/c.test.mjs\n",
                "tools/c.test.mjs": "z",
            }),
            [],
        );
        assert.deepEqual(repo(files).change({ [LIST]: "tools/a.test.mjs\n", "tools/b.test.mjs": null }), []);
    });
});

describe("check-test-integrity: package.json and capture settings", () => {
    const pkg = (scripts, pnpm) => JSON.stringify({ name: "p", scripts, ...(pnpm ? { pnpm } : {}) }, null, 2);

    it("reports a script changed, removed or a lifecycle script added, and passes a new script", () => {
        const r = () => repo({ "package.json": pkg({ test: "vitest run", lint: "eslint" }) });
        has(
            r().change({ "package.json": pkg({ test: "vitest run --bail 1", lint: "eslint" }) }),
            "scripts.test changed",
        );
        has(r().change({ "package.json": pkg({ test: "vitest run" }) }), "scripts.lint removed");
        has(
            r().change({ "package.json": pkg({ test: "vitest run", lint: "eslint", pretest: "true" }) }),
            "scripts.pretest added",
        );
        assert.deepEqual(
            r().change({ "package.json": pkg({ test: "vitest run", lint: "eslint", "docs:dev": "vitepress" }) }),
            [],
        );
        has(
            r().change({ "package.json": pkg({ test: "vitest run", lint: "eslint", postinstall: "x" }) }),
            "scripts.postinstall added",
        );
        has(
            r().change({ "package.json": pkg({ test: "vitest run", lint: "eslint", prelint: "x" }) }),
            "scripts.prelint added",
        );
    });

    it("passes a new script whose name only starts with pre or post", () => {
        const scripts = { test: "vitest run", preview: "vite preview", "prettier:fix": "p", "postcss:build": "c" };
        assert.deepEqual(
            repo({ "package.json": pkg({ test: "vitest run" }) }).change({ "package.json": pkg(scripts) }),
            [],
        );
    });

    it("reports the root pnpm field changed", () => {
        const before = pkg({ test: "x" }, { auditConfig: { ignoreGhsas: [] } });
        has(
            repo({ "package.json": before }).change({
                "package.json": pkg({ test: "x" }, { auditConfig: { ignoreGhsas: ["GHSA-1"] } }),
            }),
            "pnpm field changed",
        );
    });

    it("reports parameters.chromatic added to a story, and passes an untouched one", () => {
        const story = "export default { title: 'X' };\nexport const A = { parameters: { layout: 'centered' } };\n";
        has(
            repo({ "x.stories.ts": story }).change({
                "x.stories.ts": story.replace(
                    "layout: 'centered'",
                    "layout: 'centered', chromatic: { diffThreshold: 0.5 }",
                ),
            }),
            "parameters.chromatic added or changed",
        );
        assert.deepEqual(
            repo({ "x.stories.ts": story }).change({ "x.stories.ts": `${story}export const B = {};\n` }),
            [],
        );
    });
});

describe("check-test-integrity: command line", () => {
    it("exits 1 naming the findings, and 0 when nothing is weakened", () => {
        const r = repo({ "a.test.ts": TWO });
        r.change({ "a.test.ts": ONE });
        const bad = spawnSync("node", [SCRIPT, "--base", "base", "--head", "work"], {
            cwd: r.dir,
            env,
            encoding: "utf8",
        });
        assert.equal(bad.status, 1);
        assert.match(bad.stdout, /tests -1 net/);
        const good = spawnSync("node", [SCRIPT, "--base", "base", "--head", "base"], {
            cwd: r.dir,
            env,
            encoding: "utf8",
        });
        assert.equal(good.status, 0, good.stderr);
        assert.match(good.stdout, /no tests weakened/);
    });
});
