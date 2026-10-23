import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

import { workerShare } from "../tools/test-slots.mjs";
import { withTestGuards } from "../tools/test-wait-guard.mjs";
import { ciReporters } from "../vitest.ci-junit.mjs";

/**
 * The Figma study (design/ui/figma), found by walking up from this package so it resolves from
 * the main checkout and from a worktree beneath it; FIGMA_STUDY_DIR overrides. Null when absent
 * (the study is not in every checkout), and the Figma-comparing tests skip.
 * @returns the study directory, or null
 */
function figmaStudyDir(): string | null {
    if (process.env.FIGMA_STUDY_DIR) {
        return process.env.FIGMA_STUDY_DIR;
    }
    for (let dir = __dirname; dir !== dirname(dir); dir = dirname(dir)) {
        const candidate = join(dir, "design/ui/figma");
        if (existsSync(join(candidate, "components.md"))) {
            return candidate;
        }
    }
    return null;
}

/** The folder abbreviations design/figma-spec.md cites captures by. */
const FIGMA_FOLDERS: Record<string, string> = {
    bc: "buttons-and-controls",
    dt: "dark-theme",
    ii: "index-and-inventory",
    cr: "contradictions-resolved",
    rs: "right-sidebar-selection",
    ls: "left-sidebar",
    pm: "popovers-and-menus",
    bt: "bottom-toolbar",
    hm: "header-and-modes",
    ma: "measurement-audit",
    ac: "accessibility",
};

/** Whether the Figma study is present. */
const figmaAvailable: BrowserCommand<[]> = () => figmaStudyDir() !== null;

/** Read one capture's styles.json (`bc/btn-primary-md-enabled--default`, with or without the suffix). */
const readFigmaCapture: BrowserCommand<[path: string]> = (_ctx, path) => {
    const root = figmaStudyDir();
    if (!root) {
        throw new Error("the Figma study (design/ui/figma) is not in this checkout; set FIGMA_STUDY_DIR");
    }
    const [head, ...rest] = path.split("/");
    const relative = [FIGMA_FOLDERS[head] ?? head, ...rest].join("/").replace(/\.styles\.json$/, "");
    const file = resolve(root, `${relative}.styles.json`);
    if (!file.startsWith(root)) {
        throw new Error(`${path} is outside the Figma study`);
    }
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
};

/** Hold the primary mouse button down where the pointer is (the harness's pressed state). */
const mouseDown: BrowserCommand<[]> = async (ctx) => {
    await ctx.page.mouse.down();
};

/**
 * Park the pointer in the page's far corner. The pointer position survives from one test (and one
 * test file) to the next, so without this a component rendered under the last hover position
 * starts in its hover state.
 */
const mouseAway: BrowserCommand<[]> = async (ctx) => {
    const size = ctx.page.viewportSize() ?? { width: 1280, height: 720 };
    await ctx.page.mouse.move(size.width - 1, size.height - 1);
};

/**
 * Emulate the reader's reduced-motion preference, or clear it.
 * @param ctx - the browser command context
 * @param reduce - true for `prefers-reduced-motion: reduce`, false for no preference
 */
const emulateReducedMotion: BrowserCommand<[reduce: boolean]> = async (ctx, reduce) => {
    await ctx.page.emulateMedia({ reducedMotion: reduce ? "reduce" : "no-preference" });
};

/**
 * Drag a finger from the middle of the element `selector` names, `dx` pixels across, as a touch
 * screen sends it (CDP touch events, so the browser's touch target adjustment runs as it does for
 * a real finger).
 * @param ctx - the browser command context
 * @param selector - CSS selector of the element to press, inside the test frame
 * @param dx - horizontal distance to drag, in pixels
 */
const touchDrag: BrowserCommand<[selector: string, dx: number]> = async (ctx, selector, dx) => {
    const box = await (await ctx.frame()).locator(selector).first().boundingBox();
    if (!box) {
        throw new Error(`${selector} is not on screen`);
    }
    // No Emulation.setTouchEmulationEnabled: once it has been on, Chromium answers `(hover: none)`
    // for the rest of the run, and nothing over CDP turns that back, so every later test of a
    // hover-only control read a touch screen. A dispatched touch arrives as a touch without it.
    const cdp = await ctx.page.context().newCDPSession(ctx.page);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    const STEPS = 8;
    for (let i = 1; i <= STEPS; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x + (dx * i) / STEPS, y }],
        });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
};

/**
 * A touch tap at the center of the first element matching `selector`: a finger down and up with no
 * move between, as a touch screen sends it (Chromium makes the click from the two).
 * @param ctx - the browser command context
 * @param selector - where to tap
 */
const touchTap: BrowserCommand<[selector: string]> = async (ctx, selector) => {
    const box = await (await ctx.frame()).locator(selector).first().boundingBox();
    if (!box) {
        throw new Error(`${selector} is not on screen`);
    }
    // No touch emulation, as in touchDrag: it would leave `(hover: none)` on for the run.
    const cdp = await ctx.page.context().newCDPSession(ctx.page);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
};

/**
 * What the browser's accessibility tree says about the nodes with this accessible name, in every
 * frame: the role, the name and the value a screen reader reads (CDP `getFullAXTree`).
 * @param ctx - the browser command context
 * @param name - the accessible name to look for
 * @returns one entry per node with that name
 */
const axNodes: BrowserCommand<[name: string]> = async (ctx, name) => {
    const cdp = await ctx.page.context().newCDPSession(ctx.page);
    const { frameTree } = (await cdp.send("Page.getFrameTree")) as {
        frameTree: { frame: { id: string }; childFrames?: unknown[] };
    };
    type Tree = { frame: { id: string }; childFrames?: Tree[] };
    const ids: string[] = [];
    const walk = (tree: Tree): void => {
        ids.push(tree.frame.id);
        tree.childFrames?.forEach(walk);
    };
    walk(frameTree as Tree);
    const found: { role: string; name: string; value: string | undefined }[] = [];
    for (const frameId of ids) {
        const { nodes } = (await cdp.send("Accessibility.getFullAXTree", { frameId })) as {
            nodes: { role?: { value?: string }; name?: { value?: string }; value?: { value?: unknown } }[];
        };
        for (const node of nodes) {
            if (node.name?.value === name) {
                const value = node.value?.value;
                found.push({
                    role: String(node.role?.value),
                    name,
                    value: value === undefined ? undefined : String(value),
                });
            }
        }
    }
    await cdp.detach();
    return found;
};

/** Release the primary mouse button. */
const mouseUp: BrowserCommand<[]> = async (ctx) => {
    await ctx.page.mouse.up();
};

/** One node of Chromium's accessibility tree, reduced to what a screen reader announces. */
interface AxNode {
    /** The computed role. */
    role: string;
    /** The computed accessible name. */
    name: string;
    /** The computed accessible description. */
    description: string;
}

/**
 * Chromium's own accessibility tree of the test frame, read over the DevTools protocol: the role,
 * name and description a screen reader is given, computed by the browser rather than by a
 * JavaScript reimplementation of the accessible-name algorithm. Ignored nodes are left out.
 * @param ctx - the browser command context
 * @returns every node the browser exposes in the test frame
 */
const accessibilityTree: BrowserCommand<[]> = async (ctx): Promise<AxNode[]> => {
    const frame = await ctx.frame();
    const cdp = await ctx.page.context().newCDPSession(ctx.page);
    try {
        type FrameTree = { frame: { id: string; url: string }; childFrames?: FrameTree[] };
        const find = (tree: FrameTree): string | undefined =>
            tree.frame.url === frame.url()
                ? tree.frame.id
                : (tree.childFrames ?? []).map(find).find((id) => id !== undefined);
        const { frameTree } = (await cdp.send("Page.getFrameTree")) as { frameTree: FrameTree };
        const { nodes } = await cdp.send("Accessibility.getFullAXTree", { frameId: find(frameTree) });
        return nodes
            .filter((node) => !node.ignored)
            .map((node) => ({
                role: String(node.role?.value ?? ""),
                name: String(node.name?.value ?? ""),
                description: String(node.description?.value ?? ""),
            }));
    } finally {
        await cdp.detach();
    }
};

/**
 * Node-side helpers for the measurement harness (tests/harness) and tests/setup.browser.ts. Both
 * browser projects load that setup file, so both register the same commands.
 */
const browserCommands = {
    figmaAvailable,
    readFigmaCapture,
    mouseAway,
    mouseDown,
    mouseUp,
    touchDrag,
    touchTap,
    emulateReducedMotion,
    axNodes,
    accessibilityTree,
};

const config = defineConfig({
    plugins: [react()],
    test: {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions).
        globalSetup: ["../tools/test-slots.mjs"],
        // At most this run's share of the cores for the Node projects (tools/test-slots.mjs); browser
        // projects keep their own maxWorkers or fileParallelism.
        maxWorkers: workerShare(),
        reporters: ["default", ...ciReporters()],
        projects: [
            // Default project - runs in JSDOM
            {
                test: {
                    name: "default",
                    globals: true,
                    environment: "jsdom",
                    setupFiles: ["./tests/setup.ts"],
                    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
                    exclude: [
                        // Browser tests run in separate projects
                        "tests/**/*.browser.test.{ts,tsx}",
                        "tests/**/*.storybook.test.{ts,tsx}",
                        // Standard excludes
                        "**/node_modules/**",
                        "**/dist/**",
                    ],
                },
            },
            // Browser project - runs in real Chromium via Playwright
            {
                // Bundled before the run starts. Discovered mid-run (the stories render through
                // react/jsx-dev-runtime), Vite re-optimizes and reloads, and every story rendered
                // after that comes out empty.
                optimizeDeps: { include: ["react/jsx-dev-runtime"] },
                test: {
                    name: "browser",
                    globals: true,
                    // First: frees earlier files' pages, which v8 coverage keeps alive (issue #2247).
                    setupFiles: ["../vitest.browser-coverage-setup.ts", "./tests/setup.browser.ts"],
                    include: ["tests/**/*.browser.test.{ts,tsx}"],
                    exclude: ["**/node_modules/**", "**/dist/**"],
                    // Disable file parallelism to prevent race conditions
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                        // Disable file parallelism to prevent race conditions
                        fileParallelism: false,
                        commands: browserCommands,
                    },
                },
            },
            // Storybook project - every story rendered and its play function run, in Chromium
            {
                optimizeDeps: { include: ["react/jsx-dev-runtime"] },
                test: {
                    name: "storybook",
                    // First: frees earlier files' pages, which v8 coverage keeps alive (issue #2247).
                    setupFiles: ["../vitest.browser-coverage-setup.ts", "./tests/setup.browser.ts"],
                    include: ["tests/**/*.storybook.test.{ts,tsx}"],
                    fileParallelism: false,
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright(),
                        instances: [{ browser: "chromium" }],
                        commands: browserCommands,
                        // addon-vitest's default story viewport (DEFAULT_VIEWPORT_DIMENSIONS).
                        viewport: { width: 1200, height: 900 },
                    },
                },
            },
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: ["**/*.stories.tsx", "**/*.stories.ts", "**/*.test.ts", "**/*.test.tsx"],
            thresholds: {
                lines: 80,
                functions: 80,
                statements: 80,
                branches: 75,
            },
        },
    },
});

// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(config);
