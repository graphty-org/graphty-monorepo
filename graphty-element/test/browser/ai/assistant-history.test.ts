/**
 * @file An assistant message is one undoable step.
 *
 * Every tool the message calls writes through `ctx.tx`, the message's transaction: one undo takes
 * back everything the message did, a tool that throws rolls back everything the message had done
 * so far, and an undo while the message is still going ends it -- no further tool runs, and the
 * running tool sees `ctx.abortSignal` fire. See design/undo/undo-design.md section 5.3.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { z } from "zod";

import type { AiManager } from "../../../src/ai/AiManager";
import type { CommandContext } from "../../../src/ai/commands/types";
import type { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import type { Graph } from "../../../src/Graph";
import { cleanupE2EGraph, createE2EGraph, DEFAULT_TEST_EDGES, DEFAULT_TEST_NODES } from "../../helpers/e2e-graph-setup";

/** The three tools a message calls: a layout, an algorithm and a style. */
const THREE_TOOLS = [
    { id: "1", name: "setLayout", arguments: { type: "circular" } },
    { id: "2", name: "runAlgorithm", arguments: { namespace: "graphty", type: "degree" } },
    {
        id: "3",
        name: "findAndStyleNodes",
        arguments: { selector: "", style: { color: "#ff0000" }, layerName: "red-nodes" },
    },
];

describe("an assistant message under undo", () => {
    let graph: Graph;

    beforeEach(async () => {
        ({ graph } = await createE2EGraph({ nodes: DEFAULT_TEST_NODES, edges: DEFAULT_TEST_EDGES, enableAi: true }));
        await graph.waitForSettled();
    });

    afterEach(() => {
        cleanupE2EGraph();
    });

    /**
     * The graph's assistant.
     * @returns The AI manager.
     */
    function assistant(): AiManager {
        const manager = graph.getAiManager();
        assert.exists(manager);
        return manager;
    }

    /**
     * The mock model behind the assistant.
     * @returns The provider.
     */
    function model(): MockLlmProvider {
        return assistant().getProvider() as MockLlmProvider;
    }

    /**
     * Whether the stack holds the layer the message adds.
     * @returns True when it does.
     */
    function hasRedLayer(): boolean {
        return graph
            .getSession()
            .styles.list()
            .some((layer) => layer.name === "red-nodes");
    }

    it("that sets a layout, runs an algorithm and adds a style is one step, and one undo takes it back", async () => {
        const session = graph.getSession();
        const steps = session.history.steps.length;
        const { engine } = session.layout;
        model().setResponse("do three things", { text: "", toolCalls: THREE_TOOLS });

        const result = await graph.aiCommand("do three things");

        assert.isTrue(result.success, result.message);
        assert.lengthOf(session.history.steps, steps + 1, "one step");
        const step = session.history.steps.at(-1);
        assert.strictEqual(step?.provenance.via, "assistant");
        assert.strictEqual(step?.label, "do three things");
        assert.includeMembers([...(step?.ops ?? [])], ["layout.set", "algo.run", "style.patch"]);
        assert.strictEqual(session.layout.engine, "circular");
        assert.isTrue(hasRedLayer());

        await session.undo();
        assert.strictEqual(session.layout.engine, engine, "the layout is back");
        assert.isFalse(hasRedLayer(), "the style is gone");
        assert.lengthOf(session.history.steps.slice(0, session.history.position), steps);
    });

    it("that throws after all three rolls all three back", async () => {
        const session = graph.getSession();
        const steps = session.history.steps.length;
        const { engine } = session.layout;
        assistant().registerCommand({
            name: "explode",
            description: "Fails",
            parameters: z.object({}),
            examples: [],
            execute: () => Promise.reject(new Error("the tool failed on purpose")),
        });
        model().setResponse("then fail", {
            text: "",
            toolCalls: [...THREE_TOOLS, { id: "4", name: "explode", arguments: {} }],
        });

        const result = await graph.aiCommand("then fail");

        assert.isFalse(result.success);
        assert.lengthOf(session.history.steps, steps, "nothing was recorded");
        assert.strictEqual(session.layout.engine, engine, "the layout was rolled back");
        assert.isFalse(hasRedLayer(), "and the style");
    });

    it("undone while still going stops further tools and fires the running tool's abort signal", async () => {
        const session = graph.getSession();
        const steps = session.history.steps.length;
        const { engine } = session.layout;
        let running: CommandContext | undefined;
        let release: () => void = () => undefined;
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        let laterRan = false;
        assistant().registerCommand({
            name: "slow",
            description: "Waits",
            parameters: z.object({}),
            examples: [],
            execute: async (_graph, _params, context) => {
                running = context;
                await held;
                return { success: true, message: "done waiting" };
            },
        });
        assistant().registerCommand({
            name: "later",
            description: "Runs after the slow one",
            parameters: z.object({}),
            examples: [],
            execute: () => {
                laterRan = true;
                return Promise.resolve({ success: true, message: "ran" });
            },
        });
        model().setResponse("slow message", {
            text: "",
            toolCalls: [
                THREE_TOOLS[0],
                { id: "2", name: "slow", arguments: {} },
                { id: "3", name: "later", arguments: {} },
            ],
        });

        const message = graph.aiCommand("slow message");
        for (let wait = 0; wait < 500 && running === undefined; wait++) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        assert.exists(running, "the slow tool started");
        assert.strictEqual(session.layout.engine, "circular", "the first tool has written");

        const outcome = await session.undo();
        assert.strictEqual(outcome.kind, "cancelled", "undo ended the open message");
        assert.isTrue(running?.abortSignal.aborted, "the running tool saw its abort signal fire");

        release();
        const result = await message;
        assert.isFalse(result.success);
        assert.isFalse(laterRan, "no further tool ran");
        assert.strictEqual(session.layout.engine, engine, "the message's layout was rolled back");
        assert.lengthOf(session.history.steps, steps, "and nothing was recorded");
    });
});
