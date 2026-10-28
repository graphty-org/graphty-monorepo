/**
 * @file Counted-work scaling of the natural-language commands: `aiCommand` and
 * `retryLastAiCommand` on the `<graphty-element>` element and on `Graph`, and the `AiManager` and
 * `AiController` methods both reach, run on a graph of n and of 4n nodes, and the elements they
 * visit (Map, Set and Array iterator steps and array scans, see `visitsDuring`) may grow no faster
 * than the graph. Counted, never timed (issue #1643).
 *
 * The model is the mock provider, answering every message with one fixed tool call that paints
 * every node through a style layer, so the count is the element's own work: building the prompt,
 * running the tool and repainting the graph. No network call is made.
 *
 * The render loop is stopped, so no frame runs while a call is counted, and strict state is off,
 * as it is for a consumer (see `data-path-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { ExecutionResult } from "../../src/ai/AiController";
import type { MockLlmProvider } from "../../src/ai/providers/MockLlmProvider";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

/** The command every case sends; the mock answers it with the same tool call whatever it says. */
const COMMAND = "make every node red";

/**
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped, a static layout
 * and AI control on the mock provider, which paints every node red whatever it is asked.
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
    await element.enableAiControl({ provider: "mock" });
    const provider = graph.getAiManager()?.getProvider() as MockLlmProvider;
    provider.setDefaultResponse({
        text: "",
        toolCalls: [
            {
                id: "1",
                name: "findAndStyleNodes",
                arguments: { selector: "", style: { color: "#ff0000" }, layerName: "red" },
            },
        ],
    });
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

/** One call under test. */
interface Case {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) the call covers. */
    readonly methods: readonly string[];
    /**
     * Build the state the call needs and return the call.
     * @param element - A mounted element with AI control on.
     * @returns The call to count.
     */
    prepare(element: Graphty): Promise<() => Promise<ExecutionResult>>;
}

/**
 * Send the command once, so there is a last command to retry.
 * @param element - The element.
 */
async function sendOnce(element: Graphty): Promise<void> {
    assert.isTrue((await element.aiCommand(COMMAND)).success);
    await settled(element);
}

const CASES: readonly Case[] = [
    {
        methods: ["Graph.aiCommand", "AiManager.execute", "AiController.execute"],
        prepare: (element) => Promise.resolve(() => element.graph.aiCommand(COMMAND)),
    },
    {
        methods: ["Graphty.aiCommand"],
        prepare: (element) => Promise.resolve(() => element.aiCommand(COMMAND)),
    },
    {
        methods: ["Graph.retryLastAiCommand", "AiManager.retry"],
        prepare: async (element) => {
            await sendOnce(element);
            return () => element.graph.retryLastAiCommand();
        },
    },
    {
        methods: ["Graphty.retryLastAiCommand"],
        prepare: async (element) => {
            await sendOnce(element);
            return () => element.retryLastAiCommand();
        },
    },
];

describe("the AI commands do work in proportion to the graph", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, prepare } of CASES) {
        it(`${methods.join(", ")}: no more than linear in the graph`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        const call = await prepare(element);
                        let result: ExecutionResult | undefined;
                        const visits = await visitsDuring(async () => {
                            result = await call();
                            await settled(element);
                        });
                        // A count of work that never happened cannot pass: the layer was added.
                        assert.isTrue(result?.success, result?.message);
                        const layers = element.graph.getSession().styles.list();
                        assert.isTrue(layers.some((layer) => layer.source.by === "plugin"));
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
