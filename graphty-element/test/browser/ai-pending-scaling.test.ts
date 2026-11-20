/**
 * @file Counted-work scaling of the answers a reader gives the assistant: `resolveAiApproval` and
 * `answerAiQuestion` on the `<graphty-element>` element and on `Graph`, and the `AiManager` and
 * `AiController` methods both reach, run on a graph of n and of 4n nodes. The elements each answer
 * visits (Map, Set and Array iterator steps and array scans, see `visitsDuring`) may grow no faster
 * than the graph. Counted, never timed (issue #1643).
 *
 * The model is a scripted mock: the message it answers is held for the reader (a style call held
 * for approval, or a question with two choices), and the counted answer continues it to a style
 * layer that paints every node, so the count is the element's own work: continuing the message,
 * running the tool and repainting the graph. No network call is made.
 *
 * The render loop is stopped and strict state is off, as it is for a consumer (see
 * `ai-command-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import type { ExecutionResult } from "../../src/ai/AiController";
import type { LlmResponse } from "../../src/ai/providers/types";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { QueuedProvider } from "../helpers/queued-provider";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

/** The model's call that paints every node red through a new style layer. */
const STYLE: LlmResponse = {
    text: "",
    toolCalls: [
        {
            id: "style",
            name: "style",
            arguments: { action: "add", where: "data.type == 'server'", values: { "node.color": "red" } },
        },
    ],
};

/** The model's question, with the choice the reader gives. */
const ASK: LlmResponse = {
    text: "",
    toolCalls: [{ id: "ask", name: "ask_reader", arguments: { question: "Which color?", choices: ["red", "blue"] } }],
};

/** The model's closing answer. */
const DONE: LlmResponse = { text: "Done.", toolCalls: [] };

/** A mounted element, its scripted model, and the request the last message left open. */
interface Mounted {
    readonly element: Graphty;
    readonly provider: QueuedProvider;
    /** The id of the approval or question the last message asked, once asked. */
    request: string;
}

/**
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped, a static layout
 * and the generated assistant on a scripted model, which may ask the reader questions and, when
 * `held`, asks before a style call runs.
 * @param size - The node count.
 * @param held - Whether a style call waits for the reader's approval.
 * @returns The element, its model and the open request.
 */
async function mount(size: number, held: boolean): Promise<Mounted> {
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
    await graph.addNodes(ids.map((id) => ({ id, type: "server" })));
    await graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    const provider = new QueuedProvider();
    await element.enableAiControl({
        toolset: "generated",
        provider: "mock",
        providerInstance: provider,
        approvals: held ? { ask: ["style"] } : "none",
        questions: true,
    });
    const mounted: Mounted = { element, provider, request: "" };
    graph.on("ai-approval-requested", ({ request }) => {
        mounted.request = request.id;
    });
    graph.on("ai-question-asked", ({ request }) => {
        mounted.request = request.id;
    });
    await settled(element);
    return mounted;
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
 * Send a message the model holds for the reader: a style call held for approval.
 * @param mounted - The mounted element.
 */
async function holdForApproval(mounted: Mounted): Promise<void> {
    mounted.provider.queue.push(STYLE, DONE);
    const held = await mounted.element.aiCommand("color the servers");
    assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(held));
    assert.isNotEmpty(mounted.request, "an approval was requested");
    await settled(mounted.element);
}

/**
 * Send a message the model answers with a question; the answer continues it to the style call.
 * @param mounted - The mounted element.
 */
async function askQuestion(mounted: Mounted): Promise<void> {
    mounted.provider.queue.push(ASK, STYLE, DONE);
    const asked = await mounted.element.aiCommand("color the servers");
    assert.strictEqual(asked.code, "AI_QUESTION_ASKED", JSON.stringify(asked));
    assert.isNotEmpty(mounted.request, "a question was asked");
    await settled(mounted.element);
}

/** One answer under test. */
interface Case {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) the call covers. */
    readonly methods: readonly string[];
    /** Whether the case answers an approval (a style call waits for one) rather than a question. */
    readonly held: boolean;
    /** Leave a request open for the answer. */
    readonly open: (mounted: Mounted) => Promise<void>;
    /** The answer. */
    readonly answer: (mounted: Mounted) => Promise<ExecutionResult>;
}

const CASES: readonly Case[] = [
    {
        methods: ["Graph.resolveAiApproval", "AiManager.resolveAiApproval", "AiController.resolveAiApproval"],
        held: true,
        open: holdForApproval,
        answer: ({ element, request }) => element.graph.resolveAiApproval(request, { approve: true }),
    },
    {
        methods: ["Graphty.resolveAiApproval"],
        held: true,
        open: holdForApproval,
        answer: ({ element, request }) => element.resolveAiApproval(request, { approve: true }),
    },
    {
        methods: ["Graph.answerAiQuestion", "AiManager.answerQuestion", "AiController.answerQuestion"],
        held: false,
        open: askQuestion,
        answer: ({ element, request }) => element.graph.answerAiQuestion(request, "red"),
    },
    {
        methods: ["Graphty.answerAiQuestion"],
        held: false,
        open: askQuestion,
        answer: ({ element, request }) => element.answerAiQuestion(request, "red"),
    },
];

describe("the reader's answers to the assistant do work in proportion to the graph", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, held, open, answer } of CASES) {
        it(`${methods.join(", ")}: no more than linear in the graph`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const mounted = await mount(size, held);
                    try {
                        await open(mounted);
                        const layers = mounted.element.graph.getSession().styles.list().length;
                        let result: ExecutionResult | undefined;
                        const visits = await visitsDuring(async () => {
                            result = await answer(mounted);
                            await settled(mounted.element);
                        });
                        // A count of work that never happened cannot pass: the answer added the layer.
                        assert.strictEqual(result?.code, "AI_COMPLETED", JSON.stringify(result));
                        assert.strictEqual(mounted.element.graph.getSession().styles.list().length, layers + 1);
                        return visits;
                    } finally {
                        mounted.element.remove();
                    }
                },
                { sizes: SIZES, growth: "linear", counter: `elements visited by ${methods.join(", ")}` },
            );
        });
    }
});
