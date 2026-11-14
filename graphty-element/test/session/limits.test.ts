/**
 * @file The ceilings and caps the element publishes when nothing has measured this machine.
 *
 * The point of publishing them is that no consumer has to invent one, so what is tested here is
 * mostly what the document does NOT carry: the two field names that mean one thing on `Limits`
 * and a different thing on `CostGateLimits` are absent, because a number published under an
 * ambiguous name teaches a consumer the wrong unit.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";
import { DEFAULT_COST_GATE_LIMITS } from "../../src/session/cost";
import {
    DEFAULT_LIMITS,
    GRAPH_MEMORY_BUDGET_CAP_BYTES,
    graphMemoryBudgetFor,
    RenderLimits,
} from "../../src/session/limits";
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
        // 180,000 (issue #405) while every edge was two meshes and a material. It is neither now:
        // an edge's line and caps are thin instances of shared meshes, so an edge adds no scene
        // object at all, and the pair below -- the worst case the two ceilings allow together --
        // measured 1,994 MB of a 4,096 MB heap and 3.3 GB of renderer memory, loading in 27 s with
        // the page still answering. The size above it, 150,000 / 1,500,000, survives as well but
        // at 75 % of the heap, which leaves a layout and a run nothing, so it is the wall rather
        // than the ceiling. On master the same renderer is dead at 30,000 / 300,000. Both figures
        // are for the DEFAULT edge style: a patterned line gives every dot and dash a
        // ShaderMaterial of its own (PatternedLineRenderer), so under one the heap runs out
        // earlier than these say.
        assert.strictEqual(DEFAULT_LIMITS.renderCeiling, 100_000);
        assert.strictEqual(DEFAULT_LIMITS.edgesDrawn, 1_000_000);
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

    it("states a memory budget for one graph, derived from the measured ceiling and the device", () => {
        // The ceiling pair held about 2 GB of heap, so that is the most any loadable graph needs.
        assert.strictEqual(GRAPH_MEMORY_BUDGET_CAP_BYTES, 2 * 1024 ** 3);
        assert.isAtMost(DEFAULT_LIMITS.graphMemoryBudgetBytes, GRAPH_MEMORY_BUDGET_CAP_BYTES);
        assert.strictEqual(graphMemoryBudgetFor(undefined), GRAPH_MEMORY_BUDGET_CAP_BYTES, "nothing reported");
        assert.strictEqual(graphMemoryBudgetFor(8), GRAPH_MEMORY_BUDGET_CAP_BYTES, "a quarter of 8 GB is the cap");
        assert.strictEqual(graphMemoryBudgetFor(2), 512 * 1024 ** 2, "a quarter of a small device");
        assert.strictEqual(graphMemoryBudgetFor(0.25), 64 * 1024 ** 2);
        assert.strictEqual(graphMemoryBudgetFor(Number.NaN), GRAPH_MEMORY_BUDGET_CAP_BYTES);
    });
});

describe("the limits a session is given", () => {
    it("reports the shipped limits when given none", () => {
        const session = createGraphSession();
        assert.deepStrictEqual(session.capabilities.limits, DEFAULT_LIMITS);
        session.dispose();
    });

    it("holds a session that draws nothing to the ceilings it was given", async () => {
        const session = createGraphSession({ limits: { renderCeiling: 2 } });
        assert.strictEqual(session.capabilities.limits.renderCeiling, 2);
        assert.strictEqual(session.capabilities.limits.edgesDrawn, DEFAULT_LIMITS.edgesDrawn);

        const error = await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]).then(
            () => null,
            (reason: unknown) => reason as { code?: string; details?: unknown },
        );
        assert.strictEqual(error?.code, "E_TOO_LARGE");
        assert.deepStrictEqual(error?.details, { limit: 2, count: 3, of: "nodes", graph: { nodes: 0, edges: 0 } });
        session.dispose();
    });

    it("refuses a ceiling that is not a whole number of at least 1", () => {
        for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
            assert.throws(() => createGraphSession({ limits: { edgesDrawn: bad } }), /limits\.edgesDrawn/);
        }
    });
});

describe("RenderLimits", () => {
    it("puts the asked-for ceilings in force only while honored, and says each change once", () => {
        const limits = new RenderLimits(false);
        let changes = 0;
        limits.onChange(() => changes++);

        limits.request({ renderCeiling: 500_000 });
        assert.strictEqual(limits.effective, DEFAULT_LIMITS);
        assert.isTrue(limits.ignored);
        assert.strictEqual(changes, 0);

        limits.honor(true);
        assert.strictEqual(limits.effective.renderCeiling, 500_000);
        assert.isFalse(limits.ignored);
        limits.honor(true);
        assert.strictEqual(changes, 1);

        limits.honor(false);
        assert.strictEqual(limits.effective, DEFAULT_LIMITS);
        assert.strictEqual(changes, 2);
        assert.deepStrictEqual(limits.requested, { renderCeiling: 500_000 });
    });

    it("is not ignoring anything when nothing was asked for", () => {
        assert.isFalse(new RenderLimits(false).ignored);
    });
});
