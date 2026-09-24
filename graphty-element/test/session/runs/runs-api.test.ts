import { assert, describe, it } from "vitest";

import type { AlgorithmDescriptor, LayerId, RunId } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import {
    createRunsApi,
    RUN_ID_PATTERN,
    type RunExecutor,
    type RunsApiOptions,
    type SessionRunsApi,
} from "../../../src/session/runs";
import { CAVEATS, descriptor, ENGINE, FakeGraph, FakeQueue, settle, spyExecutor, stubResult } from "./harness";

const DEGREE = descriptor({
    options: [{ name: "weighted", plainName: "Weighted", type: "boolean", default: false }],
});

const KCORE = descriptor({
    key: "k-core",
    plainName: "Core",
    technicalName: "k_core",
    options: [{ name: "k", plainName: "K", type: "integer", default: 1, min: 1, max: 10 }],
});

interface Harness {
    runs: SessionRunsApi;
    queue: FakeQueue;
    graph: FakeGraph;
    calls: () => number;
}

function harness(
    execute?: RunExecutor,
    overrides: Partial<RunsApiOptions> = {},
    algorithms: readonly AlgorithmDescriptor[] = [DEGREE, KCORE],
): Harness {
    const graph = new FakeGraph(4);
    const queue = new FakeQueue();
    const spy = spyExecutor();
    const runs = createRunsApi({
        queue,
        catalog: { algorithms: () => algorithms },
        resolveScope: graph.resolve,
        execute: execute ?? spy.execute,
        engine: ENGINE,
        defaultCaveats: CAVEATS,
        ...overrides,
    });

    return { runs, queue, graph, calls: () => spy.calls.length };
}

function slowExecutor(ms: number): RunExecutor {
    return async (context) => {
        const start = Date.now();

        while (Date.now() - start < ms) {
            if (context.signal.aborted) {
                throw new DOMException("stopped", "AbortError");
            }

            await settle(1);
        }

        return { result: stubResult(context.runId) };
    };
}

describe("starting a run", () => {
    it("hands back an awaitable run with a selector-safe id", async () => {
        const { runs, queue } = harness();
        const run = runs.start("degree");

        assert.match(run.id, RUN_ID_PATTERN);
        assert.strictEqual(run.algorithm, "degree");
        assert.strictEqual(run.shape, "node-metric");
        assert.strictEqual(run.params.weighted, false, "the declared default is filled in");

        await queue.drain();
        const result = await run;

        assert.strictEqual(result.runId, run.id);
        assert.strictEqual(run.status, "succeeded");
    });

    it("puts the work in the queue it was given rather than running it itself", () => {
        const { runs, queue } = harness();
        runs.start("degree");

        assert.strictEqual(queue.size, 1);
        assert.deepStrictEqual(queue.descriptions.length, 1);
    });

    it("refuses an algorithm nothing registers, and says what is registered", () => {
        const { runs } = harness();

        try {
            runs.start("nonesuch");
            assert.fail("an unregistered algorithm must not start");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_UNKNOWN_ALGORITHM");
            assert.deepStrictEqual(isGraphtyError(error) ? error.details.available : [], ["degree", "k-core"]);
        }
    });

    it("refuses an option the algorithm does not declare", () => {
        const { runs } = harness();

        try {
            runs.start("degree", { nope: 1 });
            assert.fail("an undeclared option must not be accepted in silence");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_UNKNOWN_OPTION");
            assert.deepStrictEqual(isGraphtyError(error) ? error.details.available : [], ["weighted"]);
        }
    });

    it("refuses an option outside the range its descriptor declares", () => {
        const { runs } = harness();

        try {
            runs.start("k-core", { k: 99 });
            assert.fail("an out-of-range option must not be accepted");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_OPTION_RANGE");
        }
    });

    it("refuses a dry run rather than performing the work it was told not to perform", () => {
        const { runs } = harness();

        try {
            runs.start("degree", {}, { dryRun: true });
            assert.fail("a dry run must not execute");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_UNSUPPORTED");
        }
    });

    it("takes an author-assigned id and refuses one that does not match the pattern", () => {
        const { runs } = harness();

        assert.strictEqual(runs.start("degree", {}, { as: "my_degree" }).id, "my_degree");

        try {
            runs.start("k-core", {}, { as: "Not Valid" });
            assert.fail("a bad id must be refused at the call that offered it");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_BAD_COMMAND");
        }
    });
});

describe("the same work started twice", () => {
    it("returns the run that already exists", () => {
        const { runs } = harness();

        assert.strictEqual(runs.start("degree"), runs.start("degree"));
        assert.strictEqual(runs.list().length, 1);
    });

    it("does not care what order the parameters were written in", () => {
        const { runs } = harness(undefined, {}, [
            descriptor({
                options: [
                    { name: "a", plainName: "A", type: "integer", default: 1 },
                    { name: "b", plainName: "B", type: "integer", default: 2 },
                ],
            }),
        ]);

        assert.strictEqual(runs.start("degree", { a: 5, b: 6 }), runs.start("degree", { b: 6, a: 5 }));
    });

    it("does not care whether a defaulted value was spelled out", () => {
        const { runs } = harness();

        assert.strictEqual(runs.start("degree"), runs.start("degree", { weighted: false }));
    });

    it("leaves a finished run alone when nothing moved under it", async () => {
        const { runs, queue, calls } = harness();
        const first = runs.start("degree");
        await queue.drain();
        await first;

        const second = runs.start("degree");
        await queue.drain();

        assert.strictEqual(second, first);
        assert.strictEqual(calls(), 1);
    });

    it("re-executes it in place when the data moved under it", async () => {
        const { runs, queue, graph, calls } = harness();
        const first = runs.start("degree");
        await queue.drain();
        await first;

        graph.addNode("n99");
        const second = runs.start("degree");
        await queue.drain();
        await second;

        assert.strictEqual(second, first, "a re-run keeps the id, so a bound layer never dangles");
        assert.strictEqual(calls(), 2);
        assert.strictEqual(runs.list().length, 1);
    });

    it("re-executes a run that failed, because it never published an answer", async () => {
        let attempts = 0;
        const { runs, queue } = harness((context) => {
            attempts += 1;

            if (attempts === 1) {
                throw new Error("first attempt failed");
            }

            return Promise.resolve({ result: stubResult(context.runId) });
        });

        const first = runs.start("degree");
        await queue.drain();
        await first.then(
            () => undefined,
            () => undefined,
        );

        const second = runs.start("degree");
        await queue.drain();
        await second;

        assert.strictEqual(attempts, 2);
        assert.strictEqual(second.status, "succeeded");
    });

    it("refuses to let one author-assigned id name two different computations", () => {
        const { runs } = harness();
        runs.start("degree", {}, { as: "mine" });

        try {
            runs.start("degree", { weighted: true }, { as: "mine" });
            assert.fail("an id must not quietly change what it names");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_DUPLICATE_ID");
        }
    });

    it("says which ids it minted, so a saved document can refuse to reference one", () => {
        const { runs } = harness();
        const derived = runs.start("degree");
        const named = runs.start("k-core", { k: 4 }, { as: "my_core" });

        assert.isTrue(runs.isDerivedId(derived.id));
        assert.isFalse(runs.isDerivedId(named.id));
        assert.isFalse(runs.isDerivedId("never-started"));
    });

    it("makes different parameters different runs", () => {
        const { runs } = harness();
        const one = runs.start("k-core", { k: 2 });
        const two = runs.start("k-core", { k: 3 });

        assert.notStrictEqual(one.id, two.id);
        assert.strictEqual(runs.list().length, 2);
    });
});

describe("the queue a consumer shows", () => {
    it("says where each waiting run sits and how many are waiting", async () => {
        const { runs, queue } = harness();
        queue.paused = true;

        const first = runs.start("k-core", { k: 1 });
        const second = runs.start("k-core", { k: 2 });
        const third = runs.start("k-core", { k: 3 });

        assert.deepStrictEqual(
            runs.queue.map((entry) => ({ runId: entry.runId, index: entry.index, of: entry.of })),
            [
                { runId: first.id, index: 0, of: 3 },
                { runId: second.id, index: 1, of: 3 },
                { runId: third.id, index: 2, of: 3 },
            ],
        );
        assert.strictEqual(second.queuePosition, 1, "a UI renders this as \"Queued (2 of 3)\"");

        await queue.drain();
        assert.deepStrictEqual(runs.queue, []);
    });

    it("drops a cancelled run out of the queue and rejects it", async () => {
        const { runs, queue } = harness();
        queue.paused = true;

        const first = runs.start("k-core", { k: 1 });
        const second = runs.start("k-core", { k: 2 });
        second.cancel();

        assert.strictEqual(runs.queue.length, 1);
        assert.strictEqual(runs.queue[0].runId, first.id);
        assert.strictEqual(second.status, "canceled");

        try {
            await second;
            assert.fail("a cancelled run must not resolve");
        } catch (error) {
            assert.strictEqual((error as DOMException).name, "AbortError");
        }

        await queue.drain();
    });

    it("cancels the runs it replaces under the \"replace\" policy", async () => {
        const { runs, queue } = harness(slowExecutor(50));
        queue.paused = true;

        const first = runs.start("k-core", { k: 1 });
        const second = runs.start("k-core", { k: 2 }, { queue: "replace" });

        assert.strictEqual(first.status, "canceled");
        assert.strictEqual(second.status, "queued");

        try {
            await first;
            assert.fail("a replaced run must not resolve");
        } catch (error) {
            assert.strictEqual((error as DOMException).name, "AbortError");
        }

        await queue.drain();
    });

    it("runs beside the queue under the \"now\" policy", async () => {
        const { runs, queue } = harness();
        queue.paused = true;

        const run = runs.start("degree", {}, { queue: "now" });

        assert.strictEqual(queue.size, 0, "nothing was put in the queue");
        await run;
        assert.strictEqual(run.status, "succeeded");
    });
});

describe("labels", () => {
    it("is the algorithm's plain name while it is the only run of that algorithm", () => {
        const { runs } = harness();

        assert.strictEqual(runs.start("degree").label, "Connections");
    });

    it("gains the parameter that differs the moment a sibling exists", () => {
        const { runs } = harness();
        const two = runs.start("k-core", { k: 2 });

        assert.strictEqual(two.label, "Core");

        const three = runs.start("k-core", { k: 3 });

        assert.strictEqual(two.label, "Core (k 2)");
        assert.strictEqual(three.label, "Core (k 3)");
    });

    it("falls back to the scope when the parameters agree", () => {
        const { runs } = harness();
        runs.start("degree");
        const other = runs.start("degree", {}, { scope: "largest-component" });

        assert.strictEqual(other.label, "Connections (largest component)");
    });
});

describe("removing a run", () => {
    it("reports the layers that went with it, so a consumer can say so before confirming", async () => {
        const removed: LayerId[][] = [];
        const { runs, queue } = harness(undefined, {
            layers: {
                bindings: (runId: RunId) => (runId === "mine" ? ["layer-1", "layer-2"] : []),
                remove: (layerIds) => removed.push([...layerIds]),
            },
        });

        const run = runs.start("degree", {}, { as: "mine" });
        await queue.drain();
        await run;

        assert.deepStrictEqual(runs.bindings("mine"), ["layer-1", "layer-2"]);

        const removal = runs.remove("mine");

        assert.strictEqual(removal.removedLayers, 2);
        assert.deepStrictEqual(removal.layerIds, ["layer-1", "layer-2"]);
        assert.deepStrictEqual(removed, [["layer-1", "layer-2"]]);
        assert.strictEqual(runs.get("mine"), undefined);
        assert.strictEqual(runs.list().length, 0);
    });

    it("cancels a run that was still going", async () => {
        const { runs, queue } = harness(slowExecutor(200));
        const run = runs.start("degree", {}, { as: "mine" });
        await settle(5);

        runs.remove("mine");

        assert.strictEqual(run.status, "canceled");
        await queue.drain();
    });

    it("says honestly that nothing went with a run it does not hold", () => {
        const { runs } = harness();

        assert.deepStrictEqual(runs.remove("absent"), { removedLayers: 0, layerIds: [] });
    });

    it("reports no bindings while the style layers still select on the old path", () => {
        const { runs } = harness();
        const run = runs.start("degree");

        assert.deepStrictEqual(runs.bindings(run.id), []);
    });
});

describe("batches", () => {
    it("runs every member and reports how each turned out", async () => {
        const seen: number[] = [];
        const { runs } = harness();
        const batch = runs.batch(
            [
                { algorithm: "k-core", params: { k: 1 } },
                { algorithm: "k-core", params: { k: 2 } },
                { algorithm: "degree" },
            ],
            { label: "Node rankings", onProgress: (update) => seen.push(update.completed) },
        );

        const result = await batch;

        assert.strictEqual(result.label, "Node rankings");
        assert.strictEqual(result.total, 3);
        assert.strictEqual(result.completed, 3);
        assert.strictEqual(result.partial, false);
        assert.deepStrictEqual(
            result.steps.map((step) => step.ok),
            [true, true, true],
        );
        assert.strictEqual(runs.list().length, 3);
        assert.isAbove(seen.length, 0, "a batch publishes one progress stream");
    });

    it("keeps a member that failed from taking the batch down", async () => {
        const { runs } = harness((context) => {
            if (context.params.k === 2) {
                throw new Error("this member failed");
            }

            return Promise.resolve({ result: stubResult(context.runId) });
        });

        const result = await runs.batch([
            { algorithm: "k-core", params: { k: 1 } },
            { algorithm: "k-core", params: { k: 2 } },
            { algorithm: "k-core", params: { k: 3 } },
        ]);

        assert.strictEqual(result.completed, 2);
        assert.strictEqual(result.partial, true);
        assert.strictEqual(result.steps[1].ok, false);
        assert.strictEqual(result.steps[1].reason, "this member failed");
    });

    it("keeps the members that finished when it is cancelled", async () => {
        const { runs } = harness(slowExecutor(30));
        const batch = runs.batch([
            { algorithm: "k-core", params: { k: 1 } },
            { algorithm: "k-core", params: { k: 2 } },
            { algorithm: "k-core", params: { k: 3 } },
        ]);

        await settle(45);
        batch.cancel("the reader pressed Cancel");

        const result = await batch;

        assert.strictEqual(result.partial, true);
        assert.isAtLeast(result.completed, 1, "work somebody paid for is not thrown away");
        assert.isBelow(result.completed, 3);
        assert.strictEqual(batch.status, "canceled");

        const finished = runs.list().filter((run) => run.status === "succeeded");
        assert.strictEqual(finished.length, result.completed);
        assert.isDefined(finished[0].result);
    });

    it("is not one of the algorithm runs a consumer lists", async () => {
        const { runs } = harness();
        await runs.batch([{ algorithm: "degree" }]);

        assert.deepStrictEqual(
            runs.list().map((run) => run.algorithm),
            ["degree"],
        );
    });
});

describe("disposal", () => {
    it("cancels what is still going and refuses new work", async () => {
        const { runs, queue } = harness(slowExecutor(200));
        const run = runs.start("degree");
        await settle(5);

        runs.dispose();

        assert.strictEqual(run.status, "canceled");
        assert.deepStrictEqual(runs.list(), []);

        try {
            runs.start("degree");
            assert.fail("a disposed session must not accept work");
        } catch (error) {
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_DISPOSED");
        }

        await queue.drain();
    });
});
