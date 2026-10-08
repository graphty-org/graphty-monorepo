/**
 * @file Every run reads the weight the graph was loaded with, unless its `weight` option says
 * otherwise, and only as the meaning the algorithm reads: a strength reader reads a strength (or a
 * weight nobody gave a meaning), a distance reader only a distance, and a weight of another
 * meaning is left unread with a code that names the column.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { RunResult } from "../../src/session/results";
import type { Caveats, WeightMeaning } from "../../src/session/runs";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

/** Who emailed whom, and how often: a strength (more emails, closer). */
const MESSAGES = [
    "from,to,emails",
    "p01,p02,14",
    "p01,p03,9",
    "p02,p03,11",
    "p03,p12,4",
    "p01,p12,6",
    "p04,p05,18",
    "p04,p12,7",
    "p05,p10,3",
    "p06,p07,12",
    "p06,p08,8",
    "p07,p08,10",
    "p06,p12,5",
    "p08,p01,2",
    "p09,p10,15",
    "p09,p11,13",
    "p10,p11,9",
    "p11,p12,3",
    "p09,p04,4",
    "p02,p07,3",
    "p05,p09,2",
    "p03,p06,2",
    "p10,p12,5",
    "p11,p13,6",
].join("\n");

const EMAILS_AS_DISTANCE: WeightMeaning = { attribute: "emails", meaning: "distance" };

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * An element holding messages.csv, its weight `emails`.
 * @param weightMeaning - The meaning chosen at load, or undefined for none.
 * @returns the element
 */
async function loaded(weightMeaning?: WeightMeaning["meaning"]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;

    const draft = await element.session.data.prepare({ config: { file: new File([MESSAGES], "messages.csv") } });
    await draft.load({
        mapping: {
            source: "from",
            target: "to",
            weight: "emails",
            ...(weightMeaning === undefined ? {} : { weightMeaning }),
        },
    });

    return element;
}

/**
 * Run an algorithm to the end.
 * @param element - The element.
 * @param key - The algorithm.
 * @param params - Its parameters.
 * @returns The finished run's caveats and result, as a plain object (a run itself is thenable, so
 *   an async function returning it would hand back its result instead).
 */
async function run(
    element: Graphty,
    key: string,
    params: Record<string, unknown> = {},
): Promise<{ caveats: Caveats; result: RunResult | undefined }> {
    const started = element.session.runs.start(key, params, { as: `${key}_${String(Math.random()).slice(2, 8)}` });
    await started;
    assert.strictEqual(started.status, "succeeded", `${key} finished`);
    return { caveats: started.caveats, result: started.result };
}

describe("every run reads the loaded weight", () => {
    it(
        "a strength reader reads the loaded weight with no option; a distance reader counts hops and says why",
        async () => {
            const element = await loaded();

            for (const key of ["pagerank", "louvain"]) {
                const done = await run(element, key);
                assert.deepStrictEqual(done.caveats.weight, { attribute: "emails", meaning: "strength" }, key);
                assert.isUndefined(done.caveats.weightSkipped, key);
            }

            const path = await run(element, "shortest-path", { source: "p01", target: "p12" });
            assert.isNull(path.caveats.weight ?? null);
            assert.deepStrictEqual(path.caveats.weightSkipped, {
                code: "weight.meaning-mismatch",
                params: { attribute: "emails", meaning: null, reads: "distance" },
            });
            // p01 - p12 is one edge: one hop, cost 1, whatever its 6 emails.
            assert.strictEqual(path.result?.graph.cost, 1);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "reads a weight as a distance when told so, at load or for one run",
        async () => {
            const forOneRun = await run(await loaded(), "shortest-path", {
                source: "p01",
                target: "p12",
                weight: EMAILS_AS_DISTANCE,
            });
            assert.deepStrictEqual(forOneRun.caveats.weight, EMAILS_AS_DISTANCE);
            // The cheapest route by emails: p01-p03 (9) then p03-p12 (4) is 13, p01-p12 alone is 6.
            assert.strictEqual(forOneRun.result?.graph.cost, 6);

            const element = await loaded("distance");
            const atLoad = await run(element, "shortest-path", { source: "p01", target: "p03" });
            assert.deepStrictEqual(atLoad.caveats.weight, EMAILS_AS_DISTANCE);
            // The direct edge (9) beats p01-p12-p03 (6 + 4) and p01-p08-p06-p03 (2 + 8 + 2).
            assert.strictEqual(atLoad.result?.graph.cost, 9);

            // A distance is no strength: PageRank leaves it unread and says so.
            const rank = await run(element, "pagerank");
            assert.isNull(rank.caveats.weight ?? null);
            assert.deepStrictEqual(rank.caveats.weightSkipped?.params, {
                attribute: "emails",
                meaning: "distance",
                reads: "strength",
            });
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "weight null reads none, and an algorithm with no weighted form reads none",
        async () => {
            const element = await loaded();

            const unweighted = await run(element, "pagerank", { weight: null });
            assert.isNull(unweighted.caveats.weight);

            const degree = await run(element, "degree");
            assert.isNull(degree.caveats.weight);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "plan() says before a run which weight it would read, as the run then does",
        async () => {
            const element = await loaded();
            const params = { source: "p01", target: "p12" };

            const unread = await element.session.plan({ op: "algo.run", algorithm: "shortest-path", params });
            const ran = await run(element, "shortest-path", params);
            assert.deepStrictEqual(unread.caveats.weightSkipped, {
                code: "weight.meaning-mismatch",
                params: { attribute: "emails", meaning: null, reads: "distance" },
            });
            assert.deepStrictEqual(unread.caveats.weightSkipped, ran.caveats.weightSkipped);
            assert.isNull(unread.caveats.weight ?? null);

            const read = await (
                await loaded("distance")
            ).session.plan({ op: "algo.run", algorithm: "shortest-path", params });
            assert.deepStrictEqual(read.caveats.weight, EMAILS_AS_DISTANCE);
            assert.isUndefined(read.caveats.weightSkipped);
        },
        TEST_TIMEOUT_MS,
    );

    it("the catalog says which meaning each algorithm reads", async () => {
        const element = await loaded();
        const algorithms = element.session.catalog.algorithms();
        const meanings = Object.fromEntries(algorithms.map((each) => [each.key, each.weightMeaning]));

        for (const each of algorithms) {
            assert.notStrictEqual(each.weightMeaning, undefined, `${each.key} states a meaning`);
            assert.strictEqual(
                each.options.some((option) => option.name === "weight"),
                each.weightMeaning !== null,
                `${each.key} takes the weight option exactly when it reads a weight`,
            );
        }
        assert.strictEqual(meanings.pagerank, "strength");
        assert.strictEqual(meanings.louvain, "strength");
        assert.strictEqual(meanings["shortest-path"], "distance");
        assert.strictEqual(meanings["max-flow"], "capacity");
        assert.isNull(meanings.degree);
    });
});
