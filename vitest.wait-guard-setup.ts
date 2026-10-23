/**
 * @file Every wait in a test gets the monorepo's one hang guard as its deadline instead of
 * vitest's 1000 ms (tools/test-wait-guard.mjs). A `setupFiles` entry of every project.
 */

import { vi } from "vitest";

import { guardViWaits } from "./tools/test-wait-guard.mjs";

guardViWaits(vi);
