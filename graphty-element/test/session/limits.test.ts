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

    it("publishes the render ceilings the renderer was measured to reach, not the design table's", () => {
        // The design table said 200,000 nodes and 500,000 edges; the renderer died at 18,000 /
        // 180,000 (issue #405). These are the enforced figures, measured for the DEFAULT edge style:
        // a patterned line style gives every dot and dash a ShaderMaterial of its own
        // (PatternedLineRenderer), so under one the heap runs out earlier than these say.
        assert.strictEqual(DEFAULT_LIMITS.renderCeiling, 50_000);
        assert.strictEqual(DEFAULT_LIMITS.edgesDrawn, 100_000);
    });

    it("states the selection cap the selection itself enforces, rather than a second copy of it", () => {
        assert.strictEqual(DEFAULT_LIMITS.selectionCap, DEFAULT_SELECTION_CAP);
    });

    it("shares no field name with the cost gate, so no name can carry two units", () => {
        // THE DEFECT THIS REPLACES. `exactComputationCap` was a node count here and SECONDS on
        // the gate; `memoryBudgetBytes` was a whole graph's memory here and one run's published
        // columns there. A consumer reading either name on one type and applying it to the other
        // would have been off by the difference between 2,000 nodes and 30 seconds. Both now
        // carry their unit, so the names cannot be confused -- and this asserts the property
        // rather than the two former offenders, so a THIRD colliding name fails here too.
        const shared = Object.keys(DEFAULT_LIMITS).filter((key) => key in DEFAULT_COST_GATE_LIMITS);

        assert.deepStrictEqual(shared, [], "a name on both types is a unit a reader has to guess");
    });

    it("says in each name what it measures", () => {
        // A node count and a duration are the two that used to collide, so they are the two worth
        // pinning: each is reachable under a name that states which it is.
        assert.isAbove(DEFAULT_LIMITS.approximateAboveNodes, 0);
        assert.isAbove(DEFAULT_COST_GATE_LIMITS.exactComputationSeconds, 0);
        assert.isAbove(DEFAULT_COST_GATE_LIMITS.runColumnBudgetBytes, 0);
    });

    it("still withholds the one budget the design names no figure for", () => {
        // Not a naming problem any more -- graphMemoryBudgetBytes is unambiguous. There is simply
        // nothing measured or designed to publish, and inventing a number here is what this
        // module exists to stop a consumer doing.
        assert.notProperty(DEFAULT_LIMITS, "graphMemoryBudgetBytes");
    });
});
