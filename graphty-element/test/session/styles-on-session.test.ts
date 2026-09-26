import { assert, describe, it } from "vitest";

import type { ChannelValue, LayerSpec, RunId } from "../../src/catalog/types";
import { defaultEdgeStyle, defaultNodeStyle } from "../../src/config";
import { isGraphtyError } from "../../src/errors";
import { createRunResult } from "../../src/session/results";
import { createLocalRunQueue, type RunExecutionContext, type RunOutcome, type RunQueue } from "../../src/session/runs";
import type { StyleChange } from "../../src/session/styles";
import type { SessionRunsOptions } from "../../src/session/types";
import { edgeBetween, type Harness, makeSession } from "./helpers";

/**
 * Three hosts and two services, wired in a line.
 * @param runs - How the session runs algorithms, when the test cares.
 * @returns The harness.
 */
function harnessOf(runs?: SessionRunsOptions): Harness {
    const harness = makeSession(runs === undefined ? {} : { runs });
    harness.add(
        [
            { id: "a", type: "host" },
            { id: "b", type: "host" },
            { id: "c", type: "host" },
            { id: "d", type: "service" },
            { id: "e", type: "service" },
        ],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "d", dst: "e" },
        ],
    );

    return harness;
}

/** A layer a consumer writes, with nothing said about where it came from. */
function hostLayer(): LayerSpec {
    return {
        name: "Hosts in orange",
        target: "node",
        selector: { match: "expression", where: 'data.type == `"host"`' },
        set: { "node.color": "#ff9900" },
    };
}

/**
 * One of the element's own defaults, when it is a value a channel can carry.
 * @param value - Whatever sits at the channel's style path.
 * @returns The value, or undefined when it is a composite a base layer does not write.
 */
function literal(value: unknown): ChannelValue | undefined {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : undefined;
}

/**
 * The code an asynchronous call refused with.
 * @param call - The call.
 * @returns The code, or null when it did not refuse.
 */
async function codeOf(call: () => PromiseLike<unknown>): Promise<string | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

/**
 * The code a synchronous call refused with.
 * @param call - The call.
 * @returns The code, or null when it did not refuse.
 */
function syncCodeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

/**
 * A queue that records every description handed to it, so a test can see what shared it.
 * @returns The queue and the descriptions it has been given.
 */
function recordingQueue(): { queue: RunQueue; descriptions: string[] } {
    const inner = createLocalRunQueue();
    const descriptions: string[] = [];

    return {
        descriptions,
        queue: {
            queueOperation: (category, execute, options): string => {
                descriptions.push(options?.description ?? "");

                return inner.queueOperation(category, execute, options);
            },
            cancelOperation: (operationId: string): boolean => inner.cancelOperation(operationId),
            settled: (): Promise<void> => inner.settled(),
        },
    };
}

/** An executor a test can hold, plus the store it measures once the harness exists. */
interface Runner {
    /** The executor to hand the session. */
    execute: (context: RunExecutionContext) => Promise<RunOutcome>;
    /** The store to measure. Assigned once the harness the executor belongs to exists. */
    store: Harness["store"] | null;
}

/**
 * An executor that publishes one number per node, which is something to encode.
 * @returns The runner.
 */
function degreeRunner(): Runner {
    const runner: Runner = {
        store: null,
        execute: async (context: RunExecutionContext): Promise<RunOutcome> => {
            await Promise.resolve();
            const { store } = runner;

            if (store === null) {
                throw new Error("the runner was never pointed at a store");
            }

            const snapshot = store.getSnapshot();
            const degrees = snapshot.degree();
            const nodes = [];

            for (let index = 0; index < snapshot.nodeCount; index++) {
                nodes.push({ id: snapshot.ids.idOf(index), values: { value: degrees[index] } });
            }

            return {
                result: createRunResult({
                    runId: context.runId,
                    shape: "node-metric",
                    fields: [
                        {
                            name: "value",
                            plainName: "Connections",
                            technicalName: "degree",
                            kind: "node",
                            type: "number",
                            path: `results.${context.runId}.value`,
                        },
                    ],
                    measured: { nodes: snapshot.nodeCount, edges: snapshot.edgeCount },
                    graph: { normalization: "none" },
                    nodes,
                    caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", notes: [] },
                    durationMs: 1,
                }),
            };
        },
    };

    return runner;
}

describe("the element's own layers", () => {
    it("sit at the bottom of every stack, one for nodes and one for edges", () => {
        const harness = harnessOf();

        const stack = harness.session.styles.list();

        assert.strictEqual(stack.length, 2, "a layer paints nodes or edges, never both");
        assert.deepStrictEqual(
            stack.map((layer) => layer.target),
            ["node", "edge"],
        );
        assert.isTrue(stack.every((layer) => layer.kind === "base"));
        harness.session.dispose();
    });

    it("are marked as the element's, which is what a consumer tests instead of the name", () => {
        const harness = harnessOf();

        const stack = harness.session.styles.list();

        for (const layer of stack) {
            assert.deepStrictEqual(layer.source, { by: "element", reason: "default" });
            assert.isTrue(layer.locked, "an element-owned layer is locked by construction");
        }

        harness.session.dispose();
    });

    it("paint the element's own defaults rather than a second copy of them", () => {
        const harness = harnessOf();

        const [nodes, edges] = harness.session.styles.list();

        assert.strictEqual(nodes?.set?.["node.color"], literal(defaultNodeStyle.texture?.color));
        assert.strictEqual(nodes?.set?.["node.size"], literal(defaultNodeStyle.shape?.size));
        assert.strictEqual(nodes?.set?.["node.shape"], literal(defaultNodeStyle.shape?.type));
        assert.strictEqual(edges?.set?.["edge.color"], literal(defaultEdgeStyle.line?.color));
        assert.strictEqual(edges?.set?.["edge.width"], literal(defaultEdgeStyle.line?.width));
        assert.strictEqual(edges?.set?.["edge.style"], literal(defaultEdgeStyle.line?.type));
        harness.session.dispose();
    });

    it("write no channel the element draws nothing for", () => {
        const harness = harnessOf();

        const [nodes] = harness.session.styles.list();

        assert.notProperty(nodes?.set ?? {}, "node.marker");
        harness.session.dispose();
    });

    it("cannot be removed, edited or moved by a consumer", async () => {
        const harness = harnessOf();
        const [base] = harness.session.styles.list();
        assert.isDefined(base);

        assert.strictEqual(await codeOf(() => harness.session.styles.remove(base.id)), "E_PROTECTED");
        assert.strictEqual(
            await codeOf(() => harness.session.styles.update(base.id, { name: "Mine now" })),
            "E_PROTECTED",
        );
        assert.strictEqual(await codeOf(() => harness.session.styles.move(base.id, null)), "E_PROTECTED");
        assert.strictEqual(harness.session.styles.list().length, 2, "a refusal changes nothing");
        harness.session.dispose();
    });

    it("cannot be counterfeited: only the element mints an element-owned layer", async () => {
        const harness = harnessOf();

        const code = await codeOf(() =>
            harness.session.styles.add({ ...hostLayer(), source: { by: "element", reason: "default" } }),
        );

        assert.strictEqual(code, "E_PROTECTED");
        harness.session.dispose();
    });
});

describe("session.styles", () => {
    it("puts a consumer's layer above the element's, and addresses it by id", async () => {
        const harness = harnessOf();

        const added = await harness.session.styles.add(hostLayer());

        const stack = harness.session.styles.list();
        assert.strictEqual(stack.length, 3);
        assert.strictEqual(stack[2]?.id, added.id, "list() is BOTTOM first, so the newest is last");
        assert.strictEqual(harness.session.styles.get(added.id)?.name, "Hosts in orange");
        assert.deepStrictEqual(added.source, { by: "user" });
        assert.isFalse(added.locked);
        harness.session.dispose();
    });

    it("takes its turn in the queue the session runs on, beside the algorithm runs", async () => {
        const recorder = recordingQueue();
        const harness = harnessOf({ queue: recorder.queue });

        await harness.session.styles.add(hostLayer());
        const run = harness.session.runs.start("degree");
        await run.then(
            () => undefined,
            () => undefined,
        );

        assert.include(recorder.descriptions, 'Add layer "Hosts in orange"');
        assert.strictEqual(recorder.descriptions.length, 2, "one queue carried both, not two carrying one each");
        harness.session.dispose();
    });

    it("publishes every edit, with what it touched and how much it repainted", async () => {
        const harness = harnessOf();
        const seen: StyleChange[] = [];
        const stop = harness.session.on("style:changed", (change) => {
            seen.push(change);
        });

        const added = await harness.session.styles.add(hostLayer());
        await harness.session.styles.remove(added.id);
        stop();

        assert.deepStrictEqual(
            seen.map((change) => change.reason),
            ["add", "remove"],
        );
        assert.deepStrictEqual(seen[0]?.layers, [added.id]);
        assert.isNotNull(seen[0]?.painted, "the session resolves what every element shows");
        harness.session.dispose();
    });

    it("compiles a selector against the session's own columns", async () => {
        const harness = harnessOf();
        const seen: StyleChange[] = [];
        const stop = harness.session.on("style:changed", (change) => {
            seen.push(change);
        });

        await harness.session.styles.add(hostLayer());
        stop();

        // Three hosts out of five nodes, read from the record bags the session was handed. A
        // selector that matched nothing -- or everything -- would show up here as 0 or 5.
        assert.strictEqual(seen[0]?.painted?.nodes, 3);
        assert.strictEqual(seen[0]?.painted?.edges, 0, "a node layer paints no edges");
        harness.session.dispose();
    });

    it("reports a path nothing in this session answers, without refusing the layer", () => {
        const harness = harnessOf();

        const known = harness.session.styles.validate({
            name: "By type",
            target: "node",
            selector: { match: "has", path: "data.type" },
            set: { "node.color": "#123456" },
        });
        const unknown = harness.session.styles.validate({
            name: "By nothing",
            target: "node",
            selector: { match: "has", path: "data.nonesuch" },
            set: { "node.color": "#123456" },
        });

        assert.isTrue(known.ok);
        assert.deepStrictEqual(known.unresolvedPaths, []);
        assert.isTrue(unknown.ok, "a path the session cannot answer yet is not a malformed layer");
        assert.deepStrictEqual(unknown.unresolvedPaths, ["data.nonesuch"]);
        harness.session.dispose();
    });

    it("resolves an element id, and refuses one the graph does not hold", () => {
        const harness = harnessOf();

        assert.isNull(syncCodeOf(() => harness.session.styles.explain({ node: "a" })));
        assert.strictEqual(syncCodeOf(() => harness.session.styles.explain({ node: "zz" })), "E_BAD_COMMAND");
        assert.isNull(syncCodeOf(() => harness.session.styles.explain({ edge: edgeBetween(harness, "a", "b") })));
        harness.session.dispose();
    });

    it("refuses an encoding of a run this session never held", async () => {
        const harness = harnessOf();

        const code = await codeOf(() =>
            harness.session.styles.encode({ run: "nosuchrun" as RunId, channel: "node.color" }),
        );

        assert.strictEqual(code, "E_UNKNOWN_RUN");
        harness.session.dispose();
    });

    it("paints the top n of a real run whole tie groups at a time", async () => {
        // The line a-b-c-d-e: b, c and d have two links each, a and e one. A top of three is the
        // three-way tie; a top of two cannot take any of it and paints nothing.
        const runner = degreeRunner();
        const harness = harnessOf({ execute: runner.execute });
        runner.store = harness.store;
        await harness.session.runs.start("degree", {}, { style: false, as: "degree" });
        const seen: StyleChange[] = [];
        const stop = harness.session.on("style:changed", (change) => {
            seen.push(change);
        });
        const topLayer = (n: number): LayerSpec => ({
            name: `Top ${String(n)}`,
            target: "node",
            selector: { match: "top", path: "results.degree.value", n },
            set: { "node.color": "#ff9900" },
        });

        await harness.session.styles.add(topLayer(3));
        await harness.session.styles.add(topLayer(2));
        stop();

        assert.strictEqual(seen[0]?.painted?.nodes, 3);
        assert.strictEqual(seen[1]?.painted?.nodes, 0, "three tie at 2, and three do not fit in two");
        harness.session.dispose();
    });

    it("takes the top again from a re-run's new values", async () => {
        // The line a-b-c-d-e has b, c and d tied at two links, so a top of three paints them.
        // Closing it into a ring puts all five at two links, and five do not fit in three. The
        // cut is read from the run as it stands at each repaint, never captured when the layer
        // was added, so the repaint after the re-run takes it again.
        const runner = degreeRunner();
        const harness = harnessOf({ execute: runner.execute });
        runner.store = harness.store;
        await harness.session.runs.start("degree", {}, { style: false, as: "degree" });
        const seen: StyleChange[] = [];
        const stop = harness.session.on("style:changed", (change) => {
            seen.push(change);
        });

        const layer = await harness.session.styles.add({
            name: "Top 3",
            target: "node",
            selector: { match: "top", path: "results.degree.value", n: 3 },
            set: { "node.color": "#ff9900" },
        });
        assert.strictEqual(seen.at(-1)?.painted?.nodes, 3);

        harness.add([], [{ src: "e", dst: "a" }]);
        await harness.session.runs.start("degree", {}, { style: false, as: "degree" });
        await harness.session.styles.update(layer.id, { set: { "node.color": "#0099ff" } });
        stop();

        assert.strictEqual(seen.at(-1)?.painted?.nodes, 0, "the ring ties all five, and five do not fit in three");
        harness.session.dispose();
    });

    it("encodes a real run, scoped to the elements that run measured", async () => {
        const runner = degreeRunner();
        const harness = harnessOf({ execute: runner.execute });
        runner.store = harness.store;
        const run = harness.session.runs.start("degree", {}, { as: "degree" });
        await run;

        const layer = await harness.session.styles.encode({ run: run.id, channel: "node.color" });

        assert.deepStrictEqual(layer.selector, { match: "has", path: "results.degree.value" });
        assert.deepStrictEqual(layer.source, {
            by: "run",
            runId: "degree",
            algorithm: "degree",
            params: run.params,
        });
        assert.strictEqual(layer.kind, "encoding");
        assert.strictEqual(harness.session.styles.list().length, 3);
        harness.session.dispose();
    });
});
