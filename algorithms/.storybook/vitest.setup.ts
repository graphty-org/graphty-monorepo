/**
 * @file The `storybook` vitest project's setup: every story renders with this Storybook's own
 * parameters (preview.ts) and its play function runs as the test. Each story's console errors and
 * accessibility violations are recorded too (tools/storybook-story-checks.mjs); an
 * unexpected console error fails the story: none of this package's stories prints one.
 */

import { setProjectAnnotations } from "@storybook/html-vite";
import { afterEach, beforeEach } from "vitest";
import { commands } from "vitest/browser";

import { installStoryChecks } from "../../tools/storybook-story-checks.mjs";
import * as projectAnnotations from "./preview";

/** Console errors every story of this package prints, which no story causes or can avoid. */
const KNOWN_CONSOLE_ERRORS: string[] = [];

setProjectAnnotations([projectAnnotations]);

installStoryChecks(
    { beforeEach, afterEach },
    { known: KNOWN_CONSOLE_ERRORS, mode: "fail", writeFile: (path, text) => commands.writeFile(path, text) },
);
