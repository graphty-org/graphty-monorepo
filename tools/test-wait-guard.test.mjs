// node --test tools/test-wait-guard.test.mjs
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { Linter } from "eslint";

import rule from "./eslint-rules/no-test-timing.mjs";
import { guardViWaits, TEST_GUARD_MS, WAIT_GUARD_MS, withTestGuards } from "./test-wait-guard.mjs";

const ROOT = join(import.meta.dirname, "..");
const SETUP = "../vitest.wait-guard-setup.ts";

test("the guards end only a hang: a wait's is below the test's, and both are minutes", () => {
    assert.ok(WAIT_GUARD_MS >= 60_000);
    assert.ok(WAIT_GUARD_MS < TEST_GUARD_MS);
});

test("withTestGuards sets the global guard on the root and every inline project, over local values", () => {
    const config = withTestGuards({
        plugins: ["p"],
        test: {
            testTimeout: 5,
            setupFiles: ["./a.ts"],
            projects: [
                "packages/*",
                {
                    test: {
                        name: "x",
                        hookTimeout: 1,
                        expect: { poll: { interval: 1, timeout: 2 }, requireAssertions: true },
                    },
                },
                { test: { name: "y", setupFiles: "./b.ts" } },
            ],
        },
    });
    const guards = { testTimeout: TEST_GUARD_MS, hookTimeout: TEST_GUARD_MS, teardownTimeout: TEST_GUARD_MS };
    assert.deepEqual(config.plugins, ["p"]);
    assert.deepEqual(config.test.setupFiles, ["./a.ts", SETUP]);
    assert.equal(config.test.projects[0], "packages/*");
    const [, x, y] = config.test.projects;
    for (const t of [config.test, x.test, y.test]) {
        assert.deepEqual(
            { testTimeout: t.testTimeout, hookTimeout: t.hookTimeout, teardownTimeout: t.teardownTimeout },
            guards,
        );
        assert.deepEqual(t.expect.poll, { timeout: WAIT_GUARD_MS });
    }
    assert.equal(x.test.expect.requireAssertions, true);
    assert.deepEqual(x.test.setupFiles, [SETUP]);
    assert.deepEqual(y.test.setupFiles, ["./b.ts", SETUP]);
    assert.deepEqual(withTestGuards(config).test.setupFiles, ["./a.ts", SETUP]);
});

test("a bench project is a measurement: no time limit and no guard", () => {
    const config = withTestGuards({
        test: { projects: [{ test: { name: "bench-browser", setupFiles: ["./a.ts"], testTimeout: 5 } }] },
    });
    const [bench] = config.test.projects;
    assert.equal(bench.test.testTimeout, 0);
    assert.equal(bench.test.hookTimeout, 0);
    assert.deepEqual(bench.test.setupFiles, ["./a.ts"]);
});

test("vi.waitFor and vi.waitUntil always wait until the guard, whatever a call names", () => {
    const seen = [];
    const vi = { waitFor: (_cb, o) => seen.push(o), waitUntil: (_cb, o) => seen.push(o) };
    guardViWaits(vi);
    guardViWaits(vi);
    vi.waitFor(() => {});
    vi.waitUntil(() => {});
    vi.waitFor(() => {});
    vi.waitUntil(() => {});
    assert.deepEqual(seen, Array(4).fill({ timeout: WAIT_GUARD_MS }));
});

test("every vitest config in the repository is wrapped in withTestGuards", () => {
    const configs = readdirSync(ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules")
        .flatMap((d) =>
            readdirSync(join(ROOT, d.name))
                .filter((f) => /^vitest(\.[\w-]+)?\.config\.(ts|mts|mjs|js)$/.test(f))
                .map((f) => join(d.name, f)),
        );
    assert.ok(configs.length >= 10, `found only ${configs.length} configs`);
    for (const file of configs) {
        assert.match(readFileSync(join(ROOT, file), "utf8"), /export default withTestGuards\(/, file);
    }
});

test("the lint rule rejects every local deadline and accepts the guard's own constants", () => {
    const linter = new Linter({ configType: "flat" });
    const config = [
        {
            languageOptions: { ecmaVersion: 2024, sourceType: "module" },
            plugins: { local: { rules: { "no-test-timing": rule } } },
            rules: { "local/no-test-timing": "error" },
        },
    ];
    const errors = (code) => linter.verify(code, config).map((m) => m.message.split(".")[0]);
    const local = [
        "await vi.waitFor(() => done(), { timeout: 5000 });",
        "await expect.poll(() => x(), { interval: 10 }).toBe(1);",
        "await el.waitForStableFrame({ timeoutMs: 1 });",
        "it('x', async () => {}, 60_000);",
        "vi.setConfig({ testTimeout: 1000 });",
        "export default defineConfig({ test: { projects: [{ test: { testTimeout: 0 } }] } });",
        "configure({ asyncUtilTimeout: 5000 });",
        "async function until(check, timeoutMs = 5000) { await check(); }",
        "const end = Date.now() + 5000; while (Date.now() < end) { await step(); }",
    ];
    for (const code of local) {
        assert.equal(errors(code).length, 1, code);
    }
    assert.deepEqual(errors("configure({ asyncUtilTimeout: WAIT_GUARD_MS });"), []);
});
