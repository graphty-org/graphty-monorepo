/// <reference types="@vitest/browser/providers/playwright" />
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import react from "@vitejs/plugin-react";
import type { BrowserCommand } from "vitest/node";
import { defineConfig } from "vitest/config";

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

/** Release the primary mouse button. */
const mouseUp: BrowserCommand<[]> = async (ctx) => {
    await ctx.page.mouse.up();
};

export default defineConfig({
    plugins: [react()],
    test: {
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
                        // Browser tests run in separate project
                        "tests/**/*.browser.test.{ts,tsx}",
                        // Standard excludes
                        "**/node_modules/**",
                        "**/dist/**",
                    ],
                },
            },
            // Browser project - runs in real Chromium via Playwright
            {
                test: {
                    name: "browser",
                    globals: true,
                    setupFiles: ["./tests/setup.browser.ts"],
                    include: ["tests/**/*.browser.test.{ts,tsx}"],
                    exclude: [
                        "**/node_modules/**",
                        "**/dist/**",
                    ],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                        // Disable file parallelism to prevent race conditions
                        fileParallelism: false,
                        // Node-side helpers for the measurement harness (tests/harness).
                        commands: { figmaAvailable, readFigmaCapture, mouseAway, mouseDown, mouseUp, emulateReducedMotion },
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
