/**
 * @file `estimate` and `plan` at their less common corners: the command guard, a run whose scope
 * names no set, a run whose weight column is missing, sampled and seeded runs, steps with none on,
 * the costlier layout engines, layout options that name an engine or an iteration cap, the grouping
 * layouts' own raw options, and the location map's options and detected columns.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, isAlgorithmRunCommand } from "../../src/session";

/**
 * A session over a ring of `n` nodes with a weight and a city on each.
 * @param n - How many nodes.
 * @returns The session.
 */
async function ring(n: number): Promise<GraphSession> {
    const session = createGraphSession();
    const ids = Array.from({ length: n }, (_, at) => `n${String(at)}`);
    await session.data.addNodes(ids.map((id, at) => ({ id, team: at % 2 === 0 ? "red" : "blue" })));
    await session.data.addEdges(ids.map((id, at) => ({ src: id, dst: ids[(at + 1) % n], weight: at + 1 })));
    return session;
}

describe("isAlgorithmRunCommand", () => {
    it("is true only for an object whose op is algo.run", () => {
        assert.isTrue(isAlgorithmRunCommand({ op: "algo.run", algorithm: "degree" }));
        assert.isFalse(isAlgorithmRunCommand({ op: "layout.set", id: "force" }));
        assert.isFalse(isAlgorithmRunCommand(null));
        assert.isFalse(isAlgorithmRunCommand("algo.run"));
        assert.isFalse(isAlgorithmRunCommand({}));
    });
});

describe("estimating and planning a run", () => {
    it("refuses a run over a set the session does not hold, coding the scope error", async () => {
        const session = await ring(6);
        const estimate = session.estimate({ op: "algo.run", algorithm: "degree", scope: { set: "nope" } });
        assert.isFalse(estimate.available);
        assert.strictEqual(estimate.refusal?.code, "estimate.scope-unresolved");
        assert.isString(estimate.refusal?.params.error);

        const plan = await session.plan({ op: "algo.run", algorithm: "degree", scope: { set: "nope" } });
        assert.isFalse(plan.ok);
        assert.strictEqual(plan.blocked?.code, "E_UNSUPPORTED");
        assert.deepEqual(plan.effect, { kind: "none" });
        session.dispose();
    });

    it("refuses a run whose weight option is malformed, before costing it", async () => {
        const session = await ring(6);
        const plan = await session.plan({
            op: "algo.run",
            algorithm: "pagerank",
            params: { weight: { attribute: "weight", meaning: "height" } },
        });
        assert.isFalse(plan.ok);
        assert.strictEqual(plan.blocked?.code, "E_OPTION_RANGE");
        assert.deepEqual(plan.effect, { kind: "none" });
        assert.isTrue(plan.cost.available, "the cost is still answered");
        session.dispose();
    });

    it("keeps the seed an exact run is asked for, and names the method", async () => {
        const session = await ring(6);
        const plan = await session.plan({ op: "algo.run", algorithm: "degree", seed: 7, exact: true });
        assert.isTrue(plan.ok);
        assert.strictEqual(plan.caveats.seed, 7);
        assert.strictEqual(plan.caveats.method, "degree");
        assert.strictEqual(plan.effect.kind, "write");
        session.dispose();
    });

    it("refuses a run asked to be both exact and sampled", async () => {
        const session = await ring(6);
        const plan = await session.plan({ op: "algo.run", algorithm: "degree", sample: 3, exact: true });
        assert.isFalse(plan.ok);
        assert.strictEqual(plan.blocked?.code, "E_BAD_COMMAND");
        assert.strictEqual(session.estimate({ op: "algo.run", algorithm: "degree", sample: 3 }).basisFacts.sample, 3);
        session.dispose();
    });

    it("plans an algorithm the catalog does not hold as writing nothing", async () => {
        const session = await ring(4);
        const plan = await session.plan({ op: "algo.run", algorithm: "no-such-algorithm" });
        assert.deepEqual(plan.effect, { kind: "none" });
        session.dispose();
    });
});

describe("planning a command that is not a run", () => {
    it("allows a view change and costs it as not costed", async () => {
        const session = await ring(4);
        const plan = await session.plan({ op: "view.set", mode: "2d" } as never);
        assert.isTrue(plan.ok);
        assert.deepEqual(plan.effect, { kind: "none" });
        assert.strictEqual(plan.cost.refusal?.code, "estimate.not-costed");
        session.dispose();
    });

    it("plans steps with none on as leaving the whole graph", async () => {
        const session = await ring(5);
        const plan = await session.plan({ op: "visibility.steps", steps: [] } as never);
        assert.isTrue(plan.ok);
        assert.deepInclude(plan.effect, { kind: "match", nodes: 5, edges: 5 });
        session.dispose();
    });

    it("allows a layout that can run, with no block", async () => {
        const session = await ring(5);
        const plan = await session.plan({ op: "layout.set", id: "force" });
        assert.isTrue(plan.ok);
        assert.isUndefined(plan.blocked);
        session.dispose();
    });
});

describe("estimating a layout", () => {
    it("classes Kamada-Kawai and spectral as cubic and ARF as heavy", async () => {
        const session = await ring(8);
        assert.strictEqual(session.estimate({ op: "layout.set", id: "kamada-kawai" }).costClass, "cubic");
        assert.strictEqual(session.estimate({ op: "layout.set", id: "spectral" }).costClass, "cubic");
        assert.strictEqual(session.estimate({ op: "layout.set", id: "arf" }).costClass, "heavy");
        session.dispose();
    });

    it("reads a declared iteration cap, and assumes one when the cap is not a positive number", async () => {
        const session = await ring(8);
        const capped = session.estimate({ op: "layout.set", id: "force", options: { maxIter: 50 } });
        assert.strictEqual(capped.basisFacts.iterations, 50);
        assert.isFalse(capped.basisFacts.iterationsAssumed);
        const negative = session.estimate({ op: "layout.set", id: "force", options: { iterations: -1 } });
        assert.isTrue(negative.basisFacts.iterationsAssumed);
        session.dispose();
    });

    it("costs the engine a command names over the layout's default one", async () => {
        const session = await ring(8);
        const estimate = session.estimate({ op: "layout.set", id: "force", engine: "forceatlas2" } as never);
        assert.isTrue(estimate.available);
        assert.deepEqual(estimate.basisFacts.provenance, {
            code: "cost.layout",
            params: { layout: "force", engine: "forceatlas2" },
        });
        session.dispose();
    });

    it("refuses the accelerator-only engine when no accelerator is attached, and blocks its plan", async () => {
        const session = await ring(8);
        const command = { op: "layout.set", id: "force", engine: "spring-electrical" } as never;
        const estimate = session.estimate(command);
        assert.isFalse(estimate.available);
        assert.deepEqual(estimate.refusal, {
            code: "layout.needs-accelerator",
            params: { layout: "force", engine: "spring-electrical" },
        });
        const plan = await session.plan(command);
        assert.isFalse(plan.ok);
        assert.strictEqual(plan.blocked?.code, "E_OPTION_RANGE");
        session.dispose();
    });

    it("accepts a grouping layout's own raw option in place of groupBy, and refuses a null one", async () => {
        const session = await ring(6);
        const raw = session.estimate({ op: "layout.set", id: "shell", options: { nlist: [["n0"], ["n1"]] } });
        assert.isTrue(raw.available);
        const nulled = session.estimate({ op: "layout.set", id: "shell", options: { nlist: null } });
        assert.strictEqual(nulled.refusal?.code, "layout.needs-grouping");
        session.dispose();
    });
});

describe("the location map's columns", () => {
    it("refuses the location map on a graph with no location, whatever its options", async () => {
        const session = await ring(4);
        const refusal = (options: Record<string, unknown>): string | undefined =>
            session.estimate({ op: "layout.set", id: "location-map", options }).refusal?.code;
        assert.strictEqual(refusal({}), "layout.needs-location");
        assert.strictEqual(refusal({ location: "", gazetteer: false }), "layout.needs-location");
        assert.strictEqual(
            refusal({ latitude: "lat", gazetteer: "https://example.invalid/g" }),
            "layout.needs-location",
        );
        assert.deepInclude(session.layout.locationColumns(), { from: "none", location: null, role: null });
        session.dispose();
    });

    it("detects a column of place names by its name", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", city: "Paris" },
            { id: "b", city: "London" },
        ]);
        const columns = session.layout.locationColumns();
        assert.strictEqual(columns.from, "detected");
        assert.strictEqual(columns.location, "city");
        assert.notStrictEqual(columns.role, "coords");
        session.dispose();
    });

    it("reads a column of coordinate strings as whole locations", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", place: "40.7,-74" },
            { id: "b", place: "51.5,-0.1" },
        ]);
        assert.deepInclude(session.layout.locationColumns(), {
            from: "detected",
            location: "place",
            latitude: null,
            role: "coords",
        });
        session.dispose();
    });

    it("finds a latitude and longitude pair and a column of coordinates", async () => {
        const pair = createGraphSession();
        await pair.data.addNodes([
            { id: "a", latitude: 40.7, longitude: -74 },
            { id: "b", latitude: 51.5, longitude: -0.1 },
        ]);
        const columns = pair.layout.locationColumns();
        assert.strictEqual(columns.from, "detected");
        assert.strictEqual(columns.role, "coords");
        assert.strictEqual(columns.latitude, "latitude");
        assert.strictEqual(columns.longitude, "longitude");
        assert.isTrue(pair.estimate({ op: "layout.set", id: "location-map" }).available);
        pair.dispose();
    });
});
