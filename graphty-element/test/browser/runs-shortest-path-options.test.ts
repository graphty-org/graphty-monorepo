/**
 * @file The shortest route's options: which way it follows a directed edge, a strength weight
 * crossed at 1 / weight, a time order its edges must keep, and how many routes tie for cheapest.
 * A run that sets none of them finds the same route as before they existed.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { RunResult } from "../../src/session/results";
import type { Caveats } from "../../src/session/runs";

/*
 * a reaches d three ways: a-b-d and a-c-d cost 2 by `cost`, the direct a-d costs 10. By `bond`
 * (a strength) a-c-d is strongest. By `time`, a-b-d goes back in time (5 then 3), a-c-d keeps it
 * (1 then 2). Only e points at a, so a cannot reach e following edge direction.
 */
const ROUTES = [
    "from,to,cost,bond,time",
    "a,b,1,1,5",
    "b,d,1,1,3",
    "a,c,1,4,1",
    "c,d,1,4,2",
    "a,d,10,1,9",
    "e,a,1,1,0",
].join("\n");

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * An element holding the routes graph, directed.
 * @param weight - The column loaded as the weight, if any.
 * @returns the element
 */
async function loaded(weight?: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;

    await element.session.config.set({ data: { directed: true } });
    const draft = await element.session.data.prepare({ config: { file: new File([ROUTES], "routes.csv") } });
    await draft.load({ mapping: { source: "from", target: "to", ...(weight === undefined ? {} : { weight }) } });

    return element;
}

/**
 * Run the shortest route to the end.
 * @param element - The element.
 * @param params - Its parameters.
 * @returns The route's nodes in order, its graph fields and its caveats.
 */
async function route(
    element: Graphty,
    params: Record<string, unknown>,
): Promise<{ nodes: string[]; graph: Readonly<Record<string, unknown>>; caveats: Caveats }> {
    const started = element.session.runs.start("shortest-path", params, {
        as: `route_${String(Math.random()).slice(2, 8)}`,
    });
    await started;
    assert.strictEqual(started.status, "succeeded", "the route finished");
    const result = started.result as RunResult;
    const nodes = ["a", "b", "c", "d", "e"]
        .filter((id) => result.node(id)?.onPath === true)
        .sort((x, y) => Number(result.node(x)?.order) - Number(result.node(y)?.order));
    return { nodes, graph: result.graph, caveats: started.caveats };
}

describe("shortest route options", () => {
    it("by default counts hops, reads edges either way, and counts the one route", async () => {
        const element = await loaded();
        const plain = await route(element, { source: "a", target: "d" });
        assert.deepStrictEqual(plain.nodes, ["a", "d"]);
        assert.strictEqual(plain.graph.tiedRoutes, 1);
        assert.strictEqual(plain.caveats.direction, "undirected");

        const back = await route(element, { source: "a", target: "e" });
        assert.deepStrictEqual(back.nodes, ["a", "e"]);
    });

    it("counts the routes that tie for cheapest", async () => {
        const element = await loaded();
        const tied = await route(element, {
            source: "a",
            target: "d",
            weight: { attribute: "cost", meaning: "distance" },
        });
        assert.strictEqual(tied.graph.cost, 2);
        assert.strictEqual(tied.graph.tiedRoutes, 2);
    });

    it("follows edge direction when asked", async () => {
        const element = await loaded();
        const out = await route(element, { source: "a", target: "e", direction: "out" });
        assert.deepStrictEqual(out.nodes, []);
        assert.strictEqual(out.graph.tiedRoutes, 0);
        assert.strictEqual(out.caveats.direction, "directed");

        const against = await route(element, { source: "a", target: "e", direction: "in" });
        assert.deepStrictEqual(against.nodes, ["a", "e"]);
    });

    it("reads a strength as 1 / weight only when asked, and leaves it unread otherwise", async () => {
        const element = await loaded();
        const bond = { attribute: "bond", meaning: "strength" };
        const unread = await route(element, { source: "a", target: "d", weight: bond });
        assert.deepStrictEqual(unread.nodes, ["a", "d"]);
        assert.strictEqual(unread.caveats.weightSkipped?.code, "weight.meaning-mismatch");

        const strong = await route(element, { source: "a", target: "d", weight: bond, invertStrength: true });
        assert.deepStrictEqual(strong.nodes, ["a", "c", "d"]);
        assert.strictEqual(strong.graph.cost, 0.5);
        assert.deepStrictEqual(strong.caveats.weight, bond);

        // The same column loaded as the graph's weight is read the same way.
        const asLoaded = await route(await loaded("bond"), {
            source: "a",
            target: "d",
            weight: bond,
            invertStrength: true,
        });
        assert.deepStrictEqual(asLoaded.nodes, ["a", "c", "d"]);
        assert.strictEqual(asLoaded.graph.cost, 0.5);
    });

    it("keeps its edges in time order", async () => {
        const element = await loaded();
        const cost = { attribute: "cost", meaning: "distance" };
        const timed = await route(element, { source: "a", target: "d", weight: cost, timeOrder: "time" });
        assert.deepStrictEqual(timed.nodes, ["a", "c", "d"]);
        assert.strictEqual(timed.graph.cost, 2);
        assert.isUndefined(timed.graph.tiedRoutes, "ties are not counted in time order");

        // a-b-d would be cheapest if b-d could come after a-b; read directed, only a-c-d keeps time.
        const directed = await route(element, {
            source: "a",
            target: "d",
            weight: cost,
            timeOrder: "time",
            direction: "out",
        });
        assert.deepStrictEqual(directed.nodes, ["a", "c", "d"]);
    });
});
