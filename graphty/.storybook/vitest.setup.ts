/**
 * @file The `storybook` vitest project's setup: every story renders with the project's own
 * decorators and parameters (preview.tsx), and its play function runs as the test.
 */

import { setProjectAnnotations } from "@storybook/react-vite";

import * as projectAnnotations from "./preview";

setProjectAnnotations([projectAnnotations]);
