import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { PRODUCTION, visualStoryTest } from "../visual-review/capture/story-test.mjs";
import { ciReporters } from "../vitest.ci-junit.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Screenshots taken inside the story tests (visual-review's story-test harness), off unless
 * VISUAL_REVIEW_STORY_OUT names the directory this run's partial capture goes to: the stories then
 * run with production semantics, and every story and mode is shot at the end of its test and
 * compared with its baseline, as `visual-review capture` does with the built Storybook.
 */
const VISUAL = process.env.VISUAL_REVIEW_STORY_OUT
    ? visualStoryTest({ project: "cytoscape-extensions", out: path.resolve(process.env.VISUAL_REVIEW_STORY_OUT) })
    : null;

// Every story's play function run as a test (@storybook/addon-vitest), in a config of its own so the
// package's unit test shards and their coverage are unchanged: `vitest run --config vitest.storybook.config.ts`.
export default defineConfig({
    plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
    ...(VISUAL && PRODUCTION),
    test: {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions).
        globalSetup: ["../tools/test-slots.mjs"],
        name: "storybook",
        reporters: ["default", ...ciReporters(), ...(VISUAL ? [VISUAL.reporter] : [])],
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(VISUAL?.providerOptions),
            instances: [{ browser: "chromium" }],
            // The size the visual capture draws every story at.
            viewport: VISUAL?.viewport ?? { width: 1200, height: 900 },
            ...(VISUAL && { commands: VISUAL.commands }),
        },
        setupFiles: [...(VISUAL ? [".storybook/vitest.setup.visual.ts"] : []), ".storybook/vitest.setup.ts"],
        // One story file at a time, as graphty-element's and graphty's storybook projects.
        fileParallelism: false,
    },
});
