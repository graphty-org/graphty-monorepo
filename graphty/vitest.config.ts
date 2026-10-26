import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

import { shardCacheDir, workerShare } from "../tools/test-slots.mjs";
import { PRODUCTION, visualStoryTest } from "../visual-review/capture/story-test.mjs";
import { ciReporters } from "../vitest.ci-junit.mjs";
import { mapTileCommands } from "../vitest.map-tiles.mjs";
import { aliases } from "./vite.aliases";
import { sampleDataPlugin } from "./vite.sample-data";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** The tests that mount the real graphty-element, unmocked. */
const REAL_ELEMENT_TESTS = "src/**/*.real-element.test.tsx";
/** Serves map tiles from a local fixture in every browser project (vitest.map-tiles.mjs). */
const MAP_TILES_SETUP = "../vitest.map-tiles-setup.ts";
const BASE_EXCLUDE = ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"];

/**
 * Answers the next file picker the page opens with one file, as the reader choosing it. Headless
 * Chromium cancels a file picker nobody answers, so a test calls this before the click that opens
 * the picker; the app's own input then gets the file and its change event.
 * @param ctx - the browser command context.
 * @param name - the file's name.
 * @param mimeType - the file's type.
 * @param text - the file's contents.
 */
const chooseNextFile: BrowserCommand<[name: string, mimeType: string, text: string]> = (ctx, name, mimeType, text) => {
    ctx.page.once("filechooser", (chooser) => {
        void chooser.setFiles({ name, mimeType, buffer: Buffer.from(text) });
    });
};

/**
 * Makes every request whose URL holds `fragment` fail with 404, as a code file does on a page
 * whose build was replaced under it; `false` lets them through again.
 * @param ctx - the browser command context.
 * @param fragment - a piece of the URL.
 * @param failing - whether they fail.
 */
const failRequests: BrowserCommand<[fragment: string, failing: boolean]> = async (ctx, fragment, failing) => {
    const glob = `**/*${fragment}*`;
    await (failing
        ? ctx.page.route(glob, (route) => route.fulfill({ status: 404, body: "gone" }))
        : ctx.page.unroute(glob));
};

/**
 * The two app modules the app's own tests replace, swapped by Vite as it serves them rather than by
 * `vi.mock` in the setup file. Every `vi.mock` makes Vitest add a Playwright route to the page's
 * context, and while a context has a route Playwright switches the browser's HTTP cache off and
 * holds every request until this process answers it. Registered in the setup file, those routes
 * covered every test file: each one fetched its whole module graph again, megabytes of dependency
 * bundles included, through the same Node process that carries every click and keystroke of the
 * other pages, and on a loaded core one file starting held a neighbour's `userEvent` call for 10 to
 * 15 seconds (issue #3350).
 *
 * - `src/elementLoader.ts` never loads `<graphty-element>`: a test that wants the real element
 *   imports "@graphty/graphty-element" itself (the real-element project), and every other test
 *   keeps the tag an empty box.
 * - `src/workspace/Workspace.tsx` waits for the project frame first. The app loads the frame on
 *   demand (`workspace/frameLoader.ts`); a test has it from the start, so a project it opens shows
 *   at once. Only a file that imports the workspace pays for it: the frame is most of the app's
 *   code, and loading it for every file took about 5 seconds a file on an idle machine and 15 to 20
 *   on a loaded core (issues #3347 and #3348). A file's own module mocks (Sentry's, most of all) are
 *   registered before its imports, so they are the ones the frame gets. A file that mocks a module
 *   the frame needs cannot load it, and goes on without it.
 * @returns the plugin.
 */
const testStandIns = (): Plugin => {
    const elementLoader = path.join(dirname, "src/elementLoader.ts");
    const workspace = path.join(dirname, "src/workspace/Workspace.tsx");
    return {
        name: "graphty-test-stand-ins",
        enforce: "pre",
        // Only the module itself: a test reading a source file's text (`?raw`) gets it unchanged.
        transform(code, id) {
            if (id === elementLoader) {
                return { code: "export const loadGraphtyElement = () => Promise.resolve();", map: { mappings: "" } };
            }
            if (id === workspace) {
                // On the first line, so every original line keeps its number (and its coverage).
                const preload =
                    'import { loadFrame as __loadFrame } from "./frameLoader"; await __loadFrame().catch(() => undefined); ';
                return { code: preload + code, map: null };
            }
            return null;
        },
    };
};

/**
 * Screenshots taken inside the story tests (@graphty/visual-review/vitest), off unless
 * VISUAL_REVIEW_STORY_OUT names the directory this run's partial capture goes to: the storybook
 * project then runs with production semantics, shoots every story and mode at the end of its test
 * and compares it with its baseline, as `visual-review capture` does with the built Storybook.
 * `visual-review merge-results` turns the partials into the capture the review page and the gate read.
 */
const VISUAL = process.env.VISUAL_REVIEW_STORY_OUT
    ? visualStoryTest({ project: "graphty", out: path.resolve(process.env.VISUAL_REVIEW_STORY_OUT) })
    : null;

/**
 * A fresh headless Chromium config per project: vitest writes each instance's name into the
 * object it is handed, so two projects must not share one.
 * @returns the browser config.
 */
const chromium = () => ({
    enabled: true,
    headless: true,
    // The clipboard, so Paste reads what a test wrote, as a reader's browser lets it after asking.
    provider: playwright({ contextOptions: { permissions: ["clipboard-read", "clipboard-write"] } }),
    instances: [{ browser: "chromium" as const }],
    commands: { chooseNextFile, failRequests, ...mapTileCommands },
});

export default defineConfig({
    plugins: [react(), sampleDataPlugin()],
    // The same aliases as the dev server, so tests run graphty-element from source rather
    // than a prebundled copy of its dist that Vite's dependency cache never refreshes.
    resolve: { alias: aliases },
    // Each pre-push gate shard bundles into its own cache (tools/test-slots.mjs shardCacheDir()):
    // with `optimizeDeps.force` below, the graphty-1 to -5 parts side by side each rebundle when
    // their browser project starts, and in one shared directory that swapped the chunks out from
    // under a part already running (a dynamic import answered 404 and the test timed out).
    // Vitest puts each project's bundle under <cacheDir>/vitest/<project hash>.
    cacheDir: shardCacheDir(),
    optimizeDeps: {
        // react-dom/client and eruda are imported only by src/main.tsx, which no test imports, so
        // the scan never finds them. A request the dev server answers with its index.html fallback
        // (siteConfig.real-element.test.tsx fetches /no-site-here/site.json) makes Vite
        // pre-transform main.tsx, which finds both mid-run: Vite re-bundled, reloaded the test
        // page, and the shard hung until the job's timeout (CI run 40235438577, graphty-2).
        include: ["@mantine/hooks", "react-dom/client", "eruda"],
        // Re-scan and re-bundle the dependencies at the start of every run. Vite keeps a cached
        // bundle under node_modules/.vite and trusts it while the lockfile and this config are
        // unchanged -- it does not notice a SOURCE change that imports a dependency the cache
        // lacks (lodash/get.js after the per-function lodash imports). That dependency is then
        // found mid-run, Vite re-bundles and reloads the test page, and the files it was running
        // report "(0 test)" and fail or hang (issue #885). The scan over the test files finds
        // every dependency up front; it costs about 5 seconds a run.
        force: true,
    },
    test: {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions).
        globalSetup: ["../tools/test-slots.mjs"],
        // At most this run's share of the cores for the Node projects (tools/test-slots.mjs); browser
        // projects keep their own maxWorkers or fileParallelism.
        maxWorkers: workerShare(),
        reporters: ["default", ...ciReporters(), ...(VISUAL ? [VISUAL.reporter] : [])],
        globals: true,
        exclude: BASE_EXCLUDE,
        // The tests that mount the real graphty-element get a project of their own, run after
        // the others finish (sequence.groupOrder). Browser test files share the renderer's main
        // thread, and a real element loading and laying out a sample holds it for seconds at a
        // time: run beside the rest, a neighbouring file's import of the element bundle
        // (src/types/__tests__/ai.test.ts) outran its 15 second test timeout.
        projects: [
            {
                extends: true,
                plugins: [testStandIns()],
                test: {
                    name: "browser",
                    include: ["src/**/*.test.{ts,tsx}"],
                    exclude: [...BASE_EXCLUDE, REAL_ELEMENT_TESTS],
                    // Three pages at a time, as on a 4-core CI runner. Vitest's browser mode opens
                    // min(12, cores - 1) pages by default, and a --maxWorkers flag does not reach a
                    // browser project: only the project's own maxWorkers does.
                    maxWorkers: 3,
                    // Vitest refuses two projects with different maxWorkers in one group order.
                    sequence: { groupOrder: 2 },
                    browser: chromium(),
                    // Map tiles from a local fixture, never a tile server (vitest.map-tiles.mjs).
                    setupFiles: [MAP_TILES_SETUP, "./src/test/setup.ts"],
                },
            },
            {
                extends: true,
                plugins: [testStandIns()],
                test: {
                    name: "real-element",
                    include: [REAL_ELEMENT_TESTS],
                    sequence: { groupOrder: 1 },
                    browser: chromium(),
                    // First: frees earlier files' pages, which v8 coverage keeps alive (issue #2247).
                    setupFiles: ["../vitest.browser-coverage-setup.ts", MAP_TILES_SETUP, "./src/test/setup.ts"],
                    // One file at a time. Every file mounts a real element, and the files share
                    // the renderer's main thread: in parallel, nine files took 158 s and single
                    // tests up to 29 s (past the 15 s test timeout), against 90 s and at most
                    // 4.5 s one after another.
                    fileParallelism: false,
                },
            },
            {
                // Every story's play function, run as a test: a story that shows an interaction
                // drives it, and a play that throws or asserts wrongly fails here rather than
                // only inside the visual capture. Its own shard (tools/ci-test-matrix.mjs).
                extends: true,
                plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
                ...(VISUAL && PRODUCTION),
                // Pre-bundled up front, with the rest of the app's dependencies. Storybook's renderer
                // imports react-dom/client only when the first story mounts, so on a cold cache (CI)
                // Vite found it mid-run, re-bundled and reloaded the page, and the re-bundle deleted
                // the Babylon shader chunks running stories were importing: their shaders never
                // compiled and every story waiting on a drawn frame hit the test timeout (as #885).
                optimizeDeps: { include: ["@mantine/hooks", "react-dom/client"] },
                test: {
                    name: "storybook",
                    // The size the visual capture draws every story at (visual-review captures a
                    // 1200 x 900 viewport): the shell lays out differently in a narrow frame, and
                    // the plays are written against the layout the reader and the capture see.
                    browser: VISUAL
                        ? {
                              ...chromium(),
                              provider: playwright(VISUAL.providerOptions),
                              viewport: VISUAL.viewport,
                              commands: { chooseNextFile, ...mapTileCommands, ...VISUAL.commands },
                          }
                        : { ...chromium(), viewport: { width: 1200, height: 900 } },
                    setupFiles: [
                        MAP_TILES_SETUP,
                        ...(VISUAL ? [".storybook/vitest.setup.visual.ts"] : []),
                        ".storybook/vitest.setup.ts",
                    ],
                    // As graphty-element's storybook project: a story that loads the real element
                    // takes under a second alone, and 7 to 15 seconds while the pre-push gate runs
                    // its other browser shards beside it, which crossed the 15-second default.
                    testTimeout: 30000,
                    // With screenshots on, a story's afterEach renders it again for each further mode
                    // (light, then dark) and once more when a shot differs from its baseline, and a
                    // story taller than the viewport is shot at up to 16,000 device px: about 3 s a
                    // shot and 5 s a render here, so 4 renders and shots outgrow the 30 s that fits a
                    // play. It bounds that work; it is no wait.
                    ...(VISUAL && { hookTimeout: 90000 }),
                    // One story file at a time, as graphty-element's storybook project: in parallel
                    // every file mounts a real element at once, and on a machine already busy with
                    // other test runs the stories' own waits ran out.
                    fileParallelism: false,
                },
            },
            {
                // The app's own lint rules. Their tests build a TypeScript program, which needs Node.
                extends: true,
                test: {
                    name: "eslint-rules",
                    environment: "node",
                    include: ["eslint-rules/**/*.test.ts"],
                    // One TypeScript program over the element's published .d.ts files is built per run.
                    testTimeout: 60000,
                },
            },
            {
                // Tests of the app's tooling (its lint rules), which need Node APIs.
                extends: true,
                test: {
                    name: "node",
                    include: ["test/**/*.test.ts"],
                    environment: "node",
                },
            },
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            // Each part of the graphty shard writes its own (tools/ci-test-matrix.mjs).
            reportsDirectory: process.env.COVERAGE_DIR ?? "coverage",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: [
                "node_modules/",
                "src/test/",
                "**/*.d.ts",
                "**/*.config.*",
                "**/.eslintrc.*",
                "dist/",
                "**/*.test.ts",
                "**/*.test.tsx",
                "**/*.stories.ts",
                "**/*.stories.tsx",
                "**/demo/**",
                // Entry points and barrel files (not unit-testable)
                "src/main.tsx",
                "**/index.ts",
                // Stubs for external libraries
                "**/stubs/**",
                // Pure type definition files (no runtime code)
                "src/types/error-boundary.ts",
                "src/types/selection.ts",
                "src/types/style-layer.ts",
                // The shell's type-only modules. constants.ts is NOT here: it is
                // covered by shell/__tests__/constants.test.ts.
                "src/components/shell/types.ts",
                // DEVIATION from PLAN item 6, which names only types.ts. This module
                // declares interfaces and nothing else -- `grep -nE
                // "^(export )?(function|const|let|class)"` over it returns no match --
                // so it emits no runtime code to cover, and its own JSDoc says its
                // declarations belong in types.ts once someone folds them in. Until
                // then it is exempted on the same ground as types.ts and no other.
                "src/components/shell/statusbar/statusBarModel.ts",
                // Pure constants (like colors.ts, layout.ts)
                "src/constants/spacing.ts",
            ],
        },
    },
});
