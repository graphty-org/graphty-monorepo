/**
 * @file Loaded only when VISUAL_REVIEW_STORY_OUT is set (vitest.config.ts): shoots each story at the
 * end of its test and compares it with its baseline, as visual-review's capture of the built
 * Storybook does.
 */

import { afterEach, beforeEach } from "vitest";
import { commands } from "vitest/browser";

import { installVisualStoryTest } from "../../visual-review/capture/story-test-setup.mjs";

installVisualStoryTest({ afterEach, beforeEach, commands });
