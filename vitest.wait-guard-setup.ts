/**
 * @file The monorepo's one hang guard (tools/test-wait-guard.mjs), for every project: every vitest
 * config adds this file through `withTestGuards`. `vi.waitFor` and `vi.waitUntil` wait until the
 * guard instead of vitest's 1000 ms, and graphty-element's `waitForStableFrame()` waits until it
 * instead of its 30 s default.
 */

import { vi } from "vitest";

import { guardViWaits, WAIT_GUARD_MS } from "./tools/test-wait-guard.mjs";

guardViWaits(vi);
(globalThis as { __GRAPHTY_WAIT_GUARD_MS__?: number }).__GRAPHTY_WAIT_GUARD_MS__ = WAIT_GUARD_MS;
