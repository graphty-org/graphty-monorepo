/**
 * @file The setup of vitest.storybook.config.ts's storybook project: every story renders with the
 * project's own decorators and parameters (preview.tsx), as in the built Storybook.
 */

import { setProjectAnnotations } from "@storybook/react-vite";

import * as projectAnnotations from "./preview";

setProjectAnnotations([projectAnnotations]);
