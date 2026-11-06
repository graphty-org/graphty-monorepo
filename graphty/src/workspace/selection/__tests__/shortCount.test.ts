/**
 * A sidebar row's count, written short past 10,000 so "Which edges 200k of 200k" keeps its label
 * whole (ws-polish 2).
 */

import { assert, describe, it } from "vitest";

import { shortCount } from "../words";

describe("shortCount", () => {
    it("writes a count under 10,000 in full and a larger one short", () => {
        assert.strictEqual(shortCount(5016), "5,016");
        assert.strictEqual(shortCount(50_000), "50k");
        assert.strictEqual(shortCount(200_000), "200k");
        assert.strictEqual(shortCount(1_250_000), "1.3m");
    });
});
