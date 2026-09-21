/**
 * @file The ceilings and caps the element publishes when nothing has measured this machine.
 *
 * The point of publishing them is that no consumer has to invent one, so what is tested here is
 * mostly what the document does NOT carry: the two field names that mean one thing on `Limits`
 * and a different thing on `CostGateLimits` are absent, because a number published under an
 * ambiguous name teaches a consumer the wrong unit.
 */

import { assert, describe, it } from "vitest";

import { DEFAULT_COST_GATE_LIMITS } from "../../src/session/cost";
import { DEFAULT_LIMITS } from "../../src/session/limits";
import { DEFAULT_SELECTION_CAP } from "../../src/session/selection";

describe("the limits the element ships with", () => {
    it("states a whole number for every ceiling it publishes", () => {
        for (const [name, value] of Object.entries(DEFAULT_LIMITS)) {
            assert.isTrue(Number.isInteger(value), `${name} is a whole count`);
            assert.isAbove(value, 0, `${name} is a usable ceiling`);
        }
    });

    it("is frozen, because a consumer holding it must not be able to change what another reads", () => {
        assert.isTrue(Object.isFrozen(DEFAULT_LIMITS));
    });

    it("keeps the large-graph threshold below the render ceiling, which is what makes them two numbers", () => {
        // One decides how much visual detail to draw, the other how much can be drawn at all. A
        // threshold at or above the ceiling would mean the element never drew in full detail.
        assert.isBelow(DEFAULT_LIMITS.largeGraphThreshold, DEFAULT_LIMITS.renderCeiling);
    });

    it("states the selection cap the selection itself enforces, rather than a second copy of it", () => {
        assert.strictEqual(DEFAULT_LIMITS.selectionCap, DEFAULT_SELECTION_CAP);
    });

    it("publishes no field whose name means something else on the cost gate", () => {
        // `exactComputationCap` is a NODE COUNT on Limits and SECONDS on CostGateLimits;
        // `memoryBudgetBytes` is a whole graph's memory on one and one run's published columns on
        // the other. Publishing either here would hand a consumer the wrong unit under a name
        // they would reasonably read as the same number.
        assert.notProperty(DEFAULT_LIMITS, "exactComputationCap");
        assert.notProperty(DEFAULT_LIMITS, "memoryBudgetBytes");

        // Both quantities the cost gate means are still reachable, under the gate's own name.
        assert.isAbove(DEFAULT_COST_GATE_LIMITS.exactComputationCap, 0);
        assert.isAbove(DEFAULT_COST_GATE_LIMITS.memoryBudgetBytes, 0);
    });
});
