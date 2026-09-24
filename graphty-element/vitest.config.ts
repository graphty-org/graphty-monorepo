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

/**
 * Babylon modules the element imports only for their side effects (see
 * test/packaging/babylon-side-effects.test.ts). Pre-bundled in every browser project: a
 * dependency Vite discovers mid-run makes it reload the page under the test that is running.
 */
const BABYLON_SIDE_EFFECTS = [
    "@babylonjs/core/Meshes/instancedMesh",
    "@babylonjs/core/Culling/ray",
    "@babylonjs/core/Animations/animatable",
];

/** The browser tests that exercise WebXR: the "xr" project runs them and "browser" does not. */
const XR_BROWSER_TESTS = [
    "test/browser/xr-session.test.ts",
    "test/browser/XRUIManager.test.ts",
    "test/browser/NodeBehavior-xr-compatibility.test.ts",
];

const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * Where a failing browser test's screenshot goes.
 *
 * Vitest saves a PNG for every browser-mode failure, and its default place for one is a
 * `__screenshots__` directory beside the test file. That put roughly fifteen of them under
 * `test/`, which this package's CLAUDE.md forbids: a directory under `test/` is for files
 * meant to be committed, and these are not -- they are failure diagnostics, looked at once
 * and thrown away, and the root .gitignore has had to ignore every `__screenshots__` directory
 * in the repository to keep them out of a commit.
 *
 * So they go to `tmp/` instead, which is where this repository keeps every other scratch
 * artifact and which .gitignore already covers. Absolute, because vitest resolves a relative
 * screenshot directory against the PROCESS working directory, and that is this package under
 * `npx vitest` but the repository root under an Nx run.
 */
const FAILURE_SCREENSHOT_DIR = path.resolve(dirname, "tmp/vitest-screenshots");

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
                    // The shared config's figure. Tests that import a whole entry point take several
                    // seconds on a CI runner or under the pre-push gate, past vitest's default five.
                    testTimeout: 30000,
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
                        // The mesh lane runs as the "mesh" project below, not here, because it needs a
                        // document and this project has no DOM. RichTextLabel measures text through
                        // document.createElement("canvas"), so a mesh test that drives the real classes
                        // dies here with `ReferenceError: document is not defined` at
                        // RichTextLabel._calculateDimensions (reproduced 2026-09-21: 43 of the 59 cases in
                        // real-mesh-simple.test.ts, which is why that one file used to be the only
                        // exclusion). The rest of test/mesh-testing/ passed here only because it drove
                        // mocks that never imported src/meshes at all; as those are re-pointed at the real
                        // classes they need a document too, so the whole directory moves together.
                        "test/mesh-testing/**/*.test.ts",
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
                // The mesh lane: Babylon's NullEngine in Node, driving the real NodeMesh, EdgeMesh,
                // MeshCache and RichTextLabel. It is a project of its own for two reasons.
                //
                // It needs a canvas and a document, which the "default" project has not got, and it must
                // load test/mesh-testing/test-setup.ts INSTEAD OF ./test/setup.ts rather than as well as:
                // test/setup.ts's global afterEach calls document.querySelectorAll("canvas") behind a
                // `typeof document !== "undefined"` guard, and the minimal document this setup installs
                // defines no querySelectorAll, so loading both fails every test in the project with
                // `document.querySelectorAll is not a function`.
                //
                // It replaces test/mesh-testing/vitest-mesh.config.ts, a second config nothing in CI,
                // tools/, nx.json or project.json referenced. Under it these 601 cases ran only when
                // somebody typed `npm run test:mesh` by hand; the 542 that drove mocks also ran inside
                // "default", in an environment with no document, which is the split that made the one
                // file driving real classes the one file no gate ran. One home now: --project=mesh, the
                // pre-push gate (tools/prepush.sh), and CI's graphty-element-default shard.
                //
                // test/mesh-testing/real-mesh-simple.test.ts deliberately ALSO runs in the "browser"
                // project. Here its canvas is the polyfill, whose measureText is text.length * 8; there it
                // is a real Chromium canvas. Neither reading replaces the other.
                define: {
                    // Carried over verbatim from the config this replaces, and load-bearing rather than
                    // decorative: `global` -> `globalThis` is what lets the setup file install its
                    // polyfills, and `window` -> `globalThis` is what makes that file's
                    // `typeof window === "undefined"` guard false so it does not install a second, thinner
                    // window over the real global.
                    global: "globalThis",
                    window: "globalThis",
                },
                test: {
                    name: "mesh",
                    environment: "node",
                    setupFiles: ["./test/mesh-testing/test-setup.ts"],
                    include: ["test/mesh-testing/**/*.test.ts"],
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
                    // Mesh construction under NullEngine is fast; these are the limits the standalone
                    // config used and no case comes close to them.
                    testTimeout: 10000,
                    hookTimeout: 5000,
                },
            },
            {
                resolve: {
                    alias: {
                        // Mock @mlc-ai/web-llm in browser tests - the package is CDN-only
                        "@mlc-ai/web-llm": path.resolve(dirname, "test/helpers/webllm-mock.ts"),
                    },
                },
                optimizeDeps: { include: BABYLON_SIDE_EFFECTS },
                test: {
                    // The contract lane: the handful of browser tests that read what the element actually
                    // PAINTED -- pixels in the frame buffer, the order style layers landed in, whether a
                    // story's setup was applied at all. They are the tests that would have caught the
                    // labels and the layered styles going missing, and they are named one by one here
                    // rather than matched by a glob because membership is a deliberate decision: this is
                    // the only browser lane the pre-push gate runs, and it is worth about 25 seconds.
                    //
                    // Every file below is ALSO matched by the "browser" project's globs, so CI keeps
                    // running them inside its five browser shards and nothing needs adding there. The
                    // duplication is only visible to a bare `vitest run`, which runs every project.
                    //
                    // Adding a file here costs little -- roughly half of the 25 seconds is the fixed price
                    // of starting a browser project at all -- but a file that needs a settled physics
                    // layout or a video encode does not belong in a gate a person waits on.
                    name: "contract",
                    setupFiles: ["./test/setup.ts"],
                    include: [
                        "test/browser/label-paint.test.ts",
                        "test/browser/style-layer-ordering.test.ts",
                        "test/browser/first-paint-after-load.test.ts",
                        "test/browser/story-contract.test.ts",
                        // Proves a channel the table calls renderable really changes the picture,
                        // which the table-reads-the-table check in
                        // test/session/styles/channels.test.ts cannot: that one asserts the table
                        // said what it said, and is how two tooltip channels came to be published
                        // as drawable and sold in the styling guide while nothing drew them.
                        "test/browser/channel-paints.test.ts",
                        // Reads the shading on a node's surface, which nothing else in the
                        // package can see: the style model, the instance buffer and the mesh all
                        // report the right colour while the lit half of the node is drawn flat.
                        // It is also the only thing that notices if a Babylon upgrade moves the
                        // line of the stock shader that src/meshes/InstanceColorShading.ts
                        // rewrites -- the rewrite then matches nothing, silently.
                        "test/browser/lit-node-is-shaded-not-flooded.test.ts",
                    ],
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
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                        // Disable file parallelism to prevent route.fulfill errors
                        // when browser contexts are garbage collected during parallel execution
                        fileParallelism: false,
                    },
                },
            },
            {
                resolve: {
                    alias: {
                        // Mock @mlc-ai/web-llm in browser tests - the package is CDN-only
                        "@mlc-ai/web-llm": path.resolve(dirname, "test/helpers/webllm-mock.ts"),
                    },
                },
                // WebXR, in its own project so the pre-push gate can run it without the rest of the
                // browser lane. It starts real immersive VR and AR sessions on an emulated headset
                // (IWER) and checks the element's XR buttons and UI. About a second of tests plus
                // the fixed cost of starting a browser project. These files are excluded from
                // "browser" below, so CI runs them once, through this project, in its browser shards.
                optimizeDeps: { include: ["iwer", ...BABYLON_SIDE_EFFECTS] },
                test: {
                    name: "xr",
                    setupFiles: ["./test/setup.ts"],
                    include: XR_BROWSER_TESTS,
                    browser: {
                        enabled: true,
                        headless: true,
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                        fileParallelism: false,
                    },
                },
            },
            {
                // Pre-bundle IWER up front: discovered mid-run, Vite re-optimizes and reloads the
                // page under the running test (test/browser/xr-session.test.ts imports it).
                optimizeDeps: { include: ["iwer", ...BABYLON_SIDE_EFFECTS] },
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
                        // So do the WebXR tests: see the "xr" project
                        ...XR_BROWSER_TESTS,
                        // Tests using Node.js-only libraries (pngjs).
                        //
                        // This file therefore runs in NO project: "default" excludes all of
                        // test/browser/**, "browser" excludes it by name here, and it is not in
                        // "contract". It is not a gap somebody should close by adding it somewhere --
                        // it drives its own Playwright Chromium against STORYBOOK_URL, which defaults
                        // to https://localhost:6006, so it needs a Storybook dev server that neither
                        // this gate nor CI runs. It is a script wearing a test's file extension.
                        // Either it gets a home that starts that server, or it should be deleted.
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
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                        // Disable file parallelism to prevent route.fulfill errors
                        // when browser contexts are garbage collected during parallel execution
                        fileParallelism: false,
                    },
                },
            },
            {
                optimizeDeps: { include: ["iwer", ...BABYLON_SIDE_EFFECTS] },
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
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
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
                        screenshotDirectory: FAILURE_SCREENSHOT_DIR,
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
            // LLM Regression Tests - Tests real LLM API calls for tool calling verification.
            //
            // This project runs in no gate and in no CI job -- `grep -n llm .github/workflows/*.yml`
            // finds nothing -- and that is deliberate rather than an oversight: every case makes a
            // paid API call, and its seven real test files sit inside describe.skipIf(skipIfNoApiKey()),
            // so without keys even `npm run test:llm-regression` collects harness.test.ts and nothing
            // else. Run it by hand, with keys, when the tool-calling surface changes.
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
            ],
        },
        // dangerouslyIgnoreUnhandledErrors: true,
        slowTestThreshold: 60000,
    },
});
