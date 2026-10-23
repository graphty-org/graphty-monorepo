// node --test tools/test-wait-guard.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";

import { guardViWaits, TEST_GUARD_MS, WAIT_GUARD_MS } from "./test-wait-guard.mjs";

test("vi.waitFor and vi.waitUntil get the wait guard unless a call names its own", () => {
    const seen = [];
    const vi = { waitFor: (_cb, o) => seen.push(o), waitUntil: (_cb, o) => seen.push(o) };
    guardViWaits(vi);
    guardViWaits(vi);
    vi.waitFor(() => {});
    vi.waitUntil(() => {});
    vi.waitFor(() => {});
    assert.deepEqual(seen, [{ timeout: WAIT_GUARD_MS }, { timeout: WAIT_GUARD_MS, interval: 5 }, { timeout: 10 }]);
    assert.ok(WAIT_GUARD_MS < TEST_GUARD_MS);
});
