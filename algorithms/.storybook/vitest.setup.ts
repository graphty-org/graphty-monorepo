/**
 * @file The `storybook` vitest project's setup (vitest.storybook.config.ts): every story renders
 * with the project's own decorators and parameters (preview.ts), as in the built Storybook.
 */

import { setProjectAnnotations } from "@storybook/html-vite";

import * as projectAnnotations from "./preview.js";

setProjectAnnotations([projectAnnotations]);
