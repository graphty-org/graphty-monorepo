/*
 * This package must keep "vitest" in its own devDependencies, even though no source file
 * imports it by name. Deleting it brings back a hang that costs days to diagnose.
 *
 * What went wrong: every browser-mode project below -- browser, interactions and storybook --
 * printed the "RUN v3.2.7" banner and then produced no further output, forever. No test names,
 * no failures, no exit. The Node-only projects, default and llm-regression, were unaffected.
 *
 * Why: @vitest/browser injects `resolve: { dedupe: ["vitest"] }` into the Vite server it
 * starts, so the page in Chromium loads whichever copy of the "vitest" package Vite resolves
 * starting from this directory. The Node side, meanwhile, is whichever `vitest` executable the
 * shell found first on PATH. Those are two independent lookups. pnpm's store can legitimately
 * hold more than one instance of the same vitest version -- they differ only in how a
 * transitive peer resolved -- and this package declared no vitest at all, so the executable
 * came from a stray hoisted shim in node_modules/.bin that belonged to a different instance
 * than the package Vite deduped to. Two copies of vitest in one page never complete the
 * tester-to-orchestrator handshake, and a run that never gets an answer never prints and never
 * exits.
 *
 * The fix: declaring vitest here makes pnpm create both node_modules/vitest and
 * node_modules/.bin/vitest from the same instance, so the executable and the deduped package
 * cannot drift apart. Every other package in this monorepo that runs vitest already declares
 * it; this one invoked it from 27 scripts and relied on hoisting.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { defineConfig } from "vitest/config";

const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * The Chromium flag sets that expose WebGPU to the `browser` project.
 *
 * Copied from `webgpu-graph-algorithms/vitest.config.ts`, where they are the measured answer to
 * "which switches make headless Chromium hand back an adapter": `nvidia` reaches the card through
 * ANGLE's Vulkan backend, `swiftshader` names the software adapter explicitly because the two
 * ANGLE switches alone left `requestAdapter()` null on one host.
 *
 * With GRAPHTY_BROWSER_GPU unset the project launches with NO flags, which is what the five CI
 * shards do and why they see no WebGPU at all: the element's browser tests run against the fake
 * accelerator, and only `test/browser/webgpu-layout.test.ts` asks for a real one.
 */
const BROWSER_GPU_FLAGS: Readonly<Record<string, readonly string[]>> = {
    nvidia: ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=vulkan", "--disable-vulkan-surface"],
    swiftshader: [
        "--enable-unsafe-webgpu",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--use-webgpu-adapter=swiftshader",
    ],
};

/** Which flag set was asked for, or "" for none -- also what the test file reads to skip itself. */
const browserGpu = process.env.GRAPHTY_BROWSER_GPU ?? "";

/**
 * The environment of the Chromium child.
 *
 * On a workstation whose NVIDIA userspace is not where Chromium looks, headless Chromium finds
 * the card only with an extracted libEGL tree ahead of it on LD_LIBRARY_PATH.
 * GRAPHTY_EGL_LIB_DIR names that tree; unset, Playwright inherits the environment untouched.
 * @returns The environment map for `launch.env`, or undefined to inherit.
 */
function browserLaunchEnv(): Record<string, string> | undefined {
    const eglDir = process.env.GRAPHTY_EGL_LIB_DIR;
    if (eglDir === undefined || eglDir === "") {
        return undefined;
    }

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
            env[key] = value;
        }
    }

    env.LD_LIBRARY_PATH = [eglDir, process.env.LD_LIBRARY_PATH]
        .filter((value) => value !== undefined && value !== "")
        .join(":");

    return env;
}

/**
 * The `browser` project's Chromium instance, with the requested flag set when there is one.
 * @returns The single instance entry.
 */
function browserInstance(): Record<string, unknown> {
    if (browserGpu === "") {
        return { browser: "chromium" };
    }

    const args = BROWSER_GPU_FLAGS[browserGpu];
    if (args === undefined) {
        // A typo would otherwise launch Chromium with no flags while the test file still believes
        // it is on a GPU lane, and the suite would die on "an accelerator to attach" naming
        // nothing. Say which value was not understood instead.
        throw new Error(
            `GRAPHTY_BROWSER_GPU="${browserGpu}" names no flag set; use ${Object.keys(BROWSER_GPU_FLAGS).join(" or ")}, or leave it unset to run without WebGPU`,
        );
    }

    const env = browserLaunchEnv();

    return { browser: "chromium", launch: env === undefined ? { args: [...args] } : { args: [...args], env } };
}

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    // Timing benchmarks, kept out of the coverage-collecting "default" project
                    // because instrumentation makes a stopwatch measure the instrumentation. Run
                    // with: npx vitest run --project=bench
                    name: "bench",
                    setupFiles: ["./test/setup.ts"],
                    include: ["test/**/*.bench.test.ts"],
                    coverage: { enabled: false },
                },
            },
            {
                test: {
                    name: "default",
                    setupFiles: ["./test/setup.ts"],
                    include: ["test/**/*.test.ts", "test/unit/**/*.test.ts", "test/integration/**/*.test.ts"],
                    exclude: [
                        // Timing benchmarks, which run as their own project -- see "bench" above.
                        // CI runs this project with --coverage, and v8 coverage instruments this
                        // package's own source while leaving node_modules alone. That breaks a
                        // benchmark in both directions at once: absolute milliseconds stop meaning
                        // milliseconds, and a ratio against a reference living in node_modules
                        // flatters the reference, because only the measured side is instrumented.
                        // There is no runtime signal a test could branch on -- the v8 provider sets
                        // no environment variable and no global -- so the split is structural.
                        "test/**/*.bench.test.ts",
                        // These tests require DOM APIs and should run in browser environment
                        "test/managers/DataManager.test.ts",
                        "test/managers/LayoutManager.test.ts",
                        "test/managers/LifecycleManager.test.ts",
                        "test/managers/UpdateManager.test.ts",
                        "test/managers/SelectionManager.test.ts",
                        "test/mesh-testing/real-mesh-simple.test.ts",
                        // Edge tests require browser (hammerjs dependency)
                        "test/Edge.bezier.test.ts",
                        "test/edge-cases/**/*.test.ts",
                        "test/integration/Edge.integration.test.ts",
                        // Browser-only tests
                        "test/browser/**/*.test.ts",
                        // Interaction tests require browser environment
                        "test/interactions/**/*.test.ts",
                        // Performance tests need DOM and should run in browser
                        "test/performance/**/*.test.ts",
                        // Examples that need browser environment
                        "test/examples/**/*.test.ts",
                        // LLM regression tests run via dedicated project
                        "test/ai/llm-regression/**/*.test.ts",
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                },
            },
            {
                // The one env var that crosses into the page: which flag set the run asked for.
                // Naming it as a prefix is what puts it on `import.meta.env` in the browser --
                // Vite copies every matching variable out of the process environment -- and
                // test/browser/webgpu-layout.test.ts skips itself when it is absent, so the five
                // CI shards never try to use a WebGPU that is not there.
                envPrefix: ["VITE_", "GRAPHTY_BROWSER_GPU"],
                resolve: {
                    alias: {
                        // Mock @mlc-ai/web-llm in browser tests - the package is CDN-only
                        "@mlc-ai/web-llm": path.resolve(dirname, "test/helpers/webllm-mock.ts"),
                    },
                },
                test: {
                    name: "browser",
                    setupFiles: ["./test/setup.ts"],
                    include: [
                        "test/browser/**/*.test.ts",
                        "test/managers/DataManager.test.ts",
                        "test/managers/LayoutManager.test.ts",
                        "test/managers/LifecycleManager.test.ts",
                        "test/managers/UpdateManager.test.ts",
                        "test/managers/SelectionManager.test.ts",
                        "test/mesh-testing/real-mesh-simple.test.ts",
                        "test/performance/**/*.test.ts",
                        "test/examples/**/*.test.ts",
                        // Edge tests require browser (hammerjs dependency)
                        "test/Edge.bezier.test.ts",
                        "test/edge-cases/**/*.test.ts",
                        "test/integration/Edge.integration.test.ts",
                        // Interaction tests moved to dedicated 'interactions' project
                    ],
                    exclude: [
                        // Interaction tests have their own project
                        "test/interactions/**/*.test.ts",
                        // Tests using Node.js-only libraries (pngjs)
                        "test/browser/dash-spacing-measurement.test.ts",
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: "playwright",
                        instances: [browserInstance()],
                        // Disable file parallelism to prevent route.fulfill errors
                        // when browser contexts are garbage collected during parallel execution
                        fileParallelism: false,
                    },
                },
            },
            {
                test: {
                    name: "interactions",
                    setupFiles: ["./test/setup.ts"],
                    include: ["test/interactions/**/*.test.ts"],
                    exclude: [
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                        // Disable file parallelism to prevent race conditions and flaky tests
                        fileParallelism: false,
                    },
                    // Interaction tests load complex scenes and may need longer timeout
                    testTimeout: 30000,
                },
            },
            {
                extends: "vite.config.ts",
                plugins: [
                    // The plugin will run tests for the stories defined in your Storybook config
                    // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
                    storybookTest({
                        configDir: path.join(dirname, ".storybook"),
                        // Use STORYBOOK_URL env var or default to Storybook's default port (6006)
                        storybookUrl: process.env.STORYBOOK_URL ?? "https://localhost:6006",
                    }),
                ],
                resolve: {
                    alias: {
                        // Mock @mlc-ai/web-llm in storybook tests - the package is CDN-only
                        "@mlc-ai/web-llm": path.resolve(dirname, "test/helpers/webllm-mock.ts"),
                    },
                },
                test: {
                    name: "storybook",
                    exclude: [
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                        // Disable file parallelism to prevent route.fulfill errors
                        // when browser contexts are garbage collected during parallel execution
                        fileParallelism: false,
                    },
                    setupFiles: [".storybook/vitest.setup.ts"],
                    // Storybook tests load complex 3D scenes and need longer timeout
                    testTimeout: 30000,
                },
            },
            // LLM Regression Tests - Tests real LLM API calls for tool calling verification
            {
                test: {
                    name: "llm-regression",
                    include: ["test/ai/llm-regression/**/*.test.ts"],
                    exclude: [
                        // Exclude experimental/temporary folders ending with ~
                        "**/*~/**",
                        "**/*~",
                        // Standard vitest excludes
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/cypress/**",
                        "**/.{idea,git,cache,output,temp}/**",
                        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
                    ],
                    // LLM calls are slow - 60s timeout per test
                    testTimeout: 60000,
                    hookTimeout: 30000,
                    // Run tests sequentially to avoid rate limits
                    pool: "forks",
                    poolOptions: {
                        forks: {
                            singleFork: true,
                        },
                    },
                },
            },
        ],
        coverage: {
            all: true,
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            // Allow override via COVERAGE_DIR env var for sharded coverage runs
            reportsDirectory: process.env.COVERAGE_DIR || "coverage",
            include: ["src/**/*.ts"],
            exclude: [
                "**/*.d.ts",
                "**/*.test.ts",
                "**/*.spec.ts",
                "**/types/**",
                // Test doubles, not product code: measuring them against the package's thresholds
                // would demand coverage of branches only a future test is meant to reach.
                "src/testing/**",
            ],
        },
        // dangerouslyIgnoreUnhandledErrors: true,
        slowTestThreshold: 60000,
    },
});
