/**
 * @file The setup of graph-io's vitest.storybook.config.ts: every story renders with the project's
 * own loaders and parameters (preview.ts), as in the built Storybook.
 */

import { setProjectAnnotations } from "@storybook/web-components-vite";

import * as projectAnnotations from "./preview.js";

setProjectAnnotations([projectAnnotations]);
