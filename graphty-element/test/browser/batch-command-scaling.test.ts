/**
 * @file Counted-work scaling of the batch and command doors of a mounted element:
 * `batchOperations` on the `<graphty-element>` element and on `Graph`, and an AI command's own
 * `GraphCommand.execute`, run on a graph of n and of 4n nodes. The elements they visit (Map, Set
 * and Array iterator steps and array scans, see `visitsDuring`) may grow no faster than the graph.
 * Counted, never timed (issue #1643).
 *
 * Every call adds one style layer that paints every node, so each touches the whole graph once.
 * The render loop is stopped, so no frame runs while a call is counted, and strict state is off,
 * as it is for a consumer (see `data-path-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { findAndStyleNodes } from "../../src/ai/commands";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { TransactionScope } from "../../src/session/types";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

/**
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped and a static layout.
 * @param size - The node count.
 * @returns The element.
 */
async function mount(size: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    const { graph } = element;
    graph.engine.stopRenderLoop();
    await graph.setLayout("random");
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    await settled(element);
    return element;
}

/**
 * Wait until every queued operation has run and the pass that derives it has drawn it.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
}

/**
 * The batch every case runs: one layer painting every node red.
 * @param tx - The batch's session.
 */
async function paintEveryNode(tx: TransactionScope): Promise<void> {
    await tx.styles.add({ name: "Red", selector: { match: "everything" }, set: { "node.color": "#ff0000" } });
}

/** One call under test. */
interface Case {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) the call covers. */
    readonly methods: readonly string[];
    /**
     * The call to count.
     * @param element - A mounted element.
     * @returns Settles once the call has.
     */
    call(element: Graphty): Promise<unknown>;
}

const CASES: readonly Case[] = [
    {
        methods: ["Graph.batchOperations"],
        call: (element) => element.graph.batchOperations(paintEveryNode, "Paint"),
    },
    {
        methods: ["Graphty.batchOperations"],
        call: (element) => element.batchOperations(paintEveryNode, "Paint"),
    },
    {
        methods: ["GraphCommand.execute"],
        call: async (element) => {
            const result = await findAndStyleNodes.execute(element.graph, {
                selector: "",
                style: { color: "#ff0000" },
                layerName: "Red",
            });
            assert.isTrue(result.success, result.message);
        },
    },
];

describe("the batch and command doors do work in proportion to the graph", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, call } of CASES) {
        it(`${methods.join(", ")}: no more than linear in the graph`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        const session = element.graph.getSession();
                        const layers = session.styles.list().length;
                        const steps = session.history.steps.length;
                        const visits = await visitsDuring(async () => {
                            await call(element);
                            await settled(element);
                        });
                        // A count of work that never happened cannot pass: the layer was added, as one step.
                        assert.lengthOf(session.styles.list(), layers + 1);
                        assert.lengthOf(session.history.steps, steps + 1);
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                { sizes: SIZES, growth: "linear", counter: `elements visited by ${methods.join(", ")}` },
            );
        });
    }
});
