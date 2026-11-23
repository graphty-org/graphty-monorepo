/**
 * @file The per-run `weight` and `directed` options of the centrality algorithms that gained them:
 * closeness reads a weight as a distance and HITS as a strength, only when the run names one;
 * PageRank reads a directed graph as undirected under `directed: false`. A run that sets neither
 * computes exactly as before, and every run's caveats state what it read.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { RunResult } from "../../src/session/results";
import type { Caveats, WeightMeaning } from "../../src/session/runs";

/** Who wrote to whom, and how many messages: a strength, or read as a distance for one run. */
const MESSAGES = ["from,to,messages", "a,b,1", "b,c,1", "c,d,1", "a,e,9", "e,d,9", "d,f,2", "f,a,5", "b,f,7"].join(
    "\n",
);

const NODES = ["a", "b", "c", "d", "e", "f"];
const AS_DISTANCE: WeightMeaning = { attribute: "messages", meaning: "distance" };
const AS_STRENGTH: WeightMeaning = { attribute: "messages", meaning: "strength" };

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * An element holding the messages graph, directed, with `messages` as its loaded weight.
 * @param weighted - Whether the load maps `messages` as the weight.
 * @returns the element
 */
async function loaded(weighted = true): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;

    await element.session.config.set({ data: { directed: true } });
    const draft = await element.session.data.prepare({ config: { file: new File([MESSAGES], "messages.csv") } });
    await draft.load({ mapping: { source: "from", target: "to", ...(weighted ? { weight: "messages" } : {}) } });

    return element;
}

/**
 * Run an algorithm to the end.
 * @param element - The element.
 * @param key - The algorithm.
 * @param params - Its parameters.
 * @returns The finished run's caveats and its value per node.
 */
async function run(
    element: Graphty,
    key: string,
    params: Record<string, unknown> = {},
): Promise<{ caveats: Caveats; values: number[] }> {
    const started = element.session.runs.start(key, params, { as: `${key}_${String(Math.random()).slice(2, 8)}` });
    await started;
    assert.strictEqual(started.status, "succeeded", `${key} finished`);
    const result = started.result as RunResult;
    return { caveats: started.caveats, values: NODES.map((id) => Number(result.node(id)?.value)) };
}

describe("weight and direction options", () => {
    it("closeness and HITS read no weight unless the run names one, as before the option existed", async () => {
        const weightedLoad = await loaded();
        const plainLoad = await loaded(false);

        for (const key of ["closeness", "hits"]) {
            const absent = await run(weightedLoad, key);
            const unweighted = await run(plainLoad, key);
            assert.isNull(absent.caveats.weight, key);
            assert.isUndefined(absent.caveats.weightSkipped, key);
            assert.deepStrictEqual(absent.values, unweighted.values, `${key}: the loaded weight changes nothing`);
        }
    });

    it("weighted closeness measures distance by the weight, and says so", async () => {
        const element = await loaded();
        const hops = await run(element, "closeness");
        const weighted = await run(element, "closeness", { weight: AS_DISTANCE });

        assert.deepStrictEqual(weighted.caveats.weight, AS_DISTANCE);
        assert.strictEqual(weighted.caveats.method, "closeness-dijkstra");
        assert.strictEqual(hops.caveats.method, "closeness-bfs");
        assert.notDeepEqual(weighted.values, hops.values);
        // From e, d is 9 away by messages but one hop away by edges: e is farther weighted.
        const e = NODES.indexOf("e");
        assert.isBelow(weighted.values[e], hops.values[e]);

        // Named alone, a column is read as the meaning the algorithm reads.
        const named = await run(element, "closeness", { weight: "messages" });
        assert.deepStrictEqual(named.caveats.weight, AS_DISTANCE);
        assert.deepStrictEqual(named.values, weighted.values);
    });

    it("weighted HITS reads the weight as a strength, and says so", async () => {
        const element = await loaded();
        const counted = await run(element, "hits");
        const weighted = await run(element, "hits", { weight: AS_STRENGTH });

        assert.deepStrictEqual(weighted.caveats.weight, AS_STRENGTH);
        assert.strictEqual(weighted.caveats.direction, "directed");
        assert.notDeepEqual(weighted.values, counted.values);
    });

    it("PageRank with directed: false ranks a directed graph as undirected, and says so", async () => {
        const element = await loaded(false);
        const asLoaded = await run(element, "pagerank");
        const explicit = await run(element, "pagerank", { directed: true });
        const undirected = await run(element, "pagerank", { directed: false });

        assert.strictEqual(asLoaded.caveats.direction, "directed");
        assert.deepStrictEqual(explicit.values, asLoaded.values, "directed: true is the default");
        assert.strictEqual(undirected.caveats.direction, "undirected");
        assert.notDeepEqual(undirected.values, asLoaded.values);
    });

    it("the catalogue declares the options a consumer renders controls from", async () => {
        const element = await loaded(false);
        const option = (key: string, name: string): Record<string, unknown> | undefined =>
            element.session.catalog
                .algorithms()
                .find((descriptor) => descriptor.key === key)
                ?.options.find((entry) => entry.name === name) as Record<string, unknown> | undefined;

        assert.strictEqual(option("closeness", "weight")?.type, "attribute");
        assert.strictEqual(option("closeness", "weight")?.on, "edge");
        assert.isNull(option("closeness", "weight")?.default);
        assert.isNull(option("hits", "weight")?.default);
        // An algorithm that always read the loaded weight declares no default: absent reads it.
        assert.isUndefined(option("pagerank", "weight")?.default);
        assert.strictEqual(option("pagerank", "directed")?.type, "boolean");
        assert.strictEqual(option("pagerank", "directed")?.default, true);
    });
});
