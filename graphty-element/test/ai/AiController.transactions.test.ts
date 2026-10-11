/**
 * @file An assistant message holds nothing while the model thinks.
 *
 * Each batch of tool calls the model returns runs in its own short transaction, committed before
 * the model is asked again, so the person's own edits go through meanwhile. The batches still make
 * one undo step, and cancelling the message, or undoing it while it is going, takes back what it
 * did. The model here answers each ask from a script, and an ask can wait on a gate the test opens.
 */

import { assert, beforeEach, describe, it } from "vitest";
import { z } from "zod";

import { createGraphSession, type GraphSession } from "../../session";
import { AiController } from "../../src/ai/AiController";
import { CommandRegistry } from "../../src/ai/commands";
import type { CommandContext } from "../../src/ai/commands/types";
import type { LlmProvider, LlmResponse } from "../../src/ai/providers/types";

/** One ask's answer, and the gate it waits on first, if any. */
interface Turn {
    readonly response: LlmResponse;
    readonly gate?: Promise<void>;
}

/** A gate the test opens. */
interface Gate {
    readonly promise: Promise<void>;
    open(): void;
}

/**
 * A closed gate.
 * @returns The gate.
 */
function gate(): Gate {
    let open: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
        open = resolve;
    });
    return { promise, open };
}

/**
 * A model that answers its asks from a script, waiting on each turn's gate, and stops waiting
 * when the message is cancelled.
 * @param turns - The answers, in order; past the end it answers in text.
 * @returns The provider, and `asked(n)`, which settles once the nth ask has begun.
 */
function scriptedModel(turns: readonly Turn[]): LlmProvider & { asked(count: number): Promise<void> } {
    let asks = 0;
    const waiting = new Map<number, Gate>();
    const askGate = (count: number): Gate => {
        const existing = waiting.get(count) ?? gate();
        waiting.set(count, existing);
        return existing;
    };

    return {
        name: "scripted",
        supportsStreaming: false,
        supportsTools: true,
        configure: () => undefined,
        asked: (count) => askGate(count).promise,
        generate: async (_messages, _tools, options) => {
            const turn = turns.at(asks++);
            askGate(asks).open();
            if (turn?.gate !== undefined) {
                const { signal } = options ?? {};
                await Promise.race([
                    turn.gate,
                    new Promise<never>((_, reject) => {
                        signal?.addEventListener("abort", () => {
                            reject(signal.reason as Error);
                        });
                    }),
                ]);
            }

            return turn?.response ?? { text: "done", toolCalls: [] };
        },
        generateStream: () => Promise.reject(new Error("not used")),
        validateApiKey: () => Promise.resolve(true),
    };
}

/**
 * A turn that calls one tool.
 * @param name - The tool.
 * @param args - Its arguments.
 * @param waitOn - A gate the ask waits on first.
 * @returns The turn.
 */
function call(name: string, args: Record<string, unknown> = {}, waitOn?: Gate): Turn {
    return { response: { text: "", toolCalls: [{ id: name, name, arguments: args }] }, gate: waitOn?.promise };
}

describe("an assistant message's transactions", () => {
    let session: GraphSession;
    let registry: CommandRegistry;
    let ran: string[];
    let baseline: number;

    beforeEach(async () => {
        session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        baseline = session.history.position;
        ran = [];
        registry = new CommandRegistry();
        registry.register({
            name: "addNode",
            description: "Adds a node",
            parameters: z.object({ id: z.string() }),
            examples: [],
            execute: async (_graph, params, context) => {
                const id = String(params.id);
                ran.push(id);
                await context?.tx.data.addNodes([{ id }]);
                return { success: true, message: `added ${id}` };
            },
        });
        registry.register({
            name: "explode",
            description: "Fails",
            parameters: z.object({}),
            examples: [],
            execute: () => Promise.reject(new Error("the tool failed on purpose")),
        });
    });

    /**
     * An assistant over the session.
     * @param model - Its model.
     * @returns The controller.
     */
    function assistant(model: LlmProvider): AiController {
        const graph = { getSession: () => session } as unknown as CommandContext["graph"];
        return new AiController({ provider: model, commandRegistry: registry, graph });
    }

    /**
     * The steps recorded since the test began and still applied.
     * @returns Them, oldest first.
     */
    function newSteps(): GraphSession["history"]["steps"] {
        return session.history.steps.slice(baseline, session.history.position);
    }

    it("lets the person edit what the message changed while it waits on the model", async () => {
        const thinking = gate();
        const model = scriptedModel([
            call("addNode", { id: "x" }),
            { response: { text: "ok", toolCalls: [] }, gate: thinking.promise },
        ]);
        const message = assistant(model).execute("add x");
        await model.asked(2);

        // Held by one open transaction for the whole message, this failed with E_HELD_BY_TRANSACTION.
        await session.data.updateNodes([{ id: "x", values: { team: "red" } }]);
        assert.strictEqual(session.data.node("x")?.team, "red");

        thinking.open();
        const result = await message;
        assert.isTrue(result.success, result.message);
        assert.deepEqual(
            newSteps().map((step) => step.provenance.via ?? "person"),
            ["assistant", "person"],
        );
    });

    it("makes every batch of one message one undo step", async () => {
        const model = scriptedModel([call("addNode", { id: "x" }), call("addNode", { id: "y" })]);

        const result = await assistant(model).execute("add x and y");

        assert.isTrue(result.success, result.message);
        assert.deepEqual(ran, ["x", "y"]);
        const steps = newSteps();
        assert.lengthOf(steps, 1);
        assert.strictEqual(steps[0].provenance.via, "assistant");
        assert.strictEqual(steps[0].label, "add x and y");
        assert.deepEqual([...steps[0].ops], ["data.apply", "data.apply"]);

        await session.undo();
        assert.notExists(session.data.node("x"));
        assert.notExists(session.data.node("y"));
        assert.exists(session.data.node("a"));
    });

    it("records the batches after a person's edit as their own step, marked as continuing the message", async () => {
        const thinking = gate();
        const model = scriptedModel([call("addNode", { id: "x" }), call("addNode", { id: "y" }, thinking)]);
        const message = assistant(model).execute("add x and y");
        await model.asked(2);
        await session.data.updateNodes([{ id: "a", values: { team: "blue" } }]);

        thinking.open();
        const result = await message;

        assert.isTrue(result.success, result.message);
        const [first, person, later] = newSteps();
        assert.strictEqual(first.provenance.via, "assistant");
        assert.isUndefined(person.provenance.via);
        assert.strictEqual(later.provenance.via, "assistant");
        assert.strictEqual(later.provenance.after, first.id);
        assert.strictEqual(later.provenance.message, first.provenance.message);
    });

    it("takes back every batch when the message is cancelled while the model thinks", async () => {
        const thinking = gate();
        const model = scriptedModel([
            call("addNode", { id: "x" }),
            call("addNode", { id: "y" }),
            { response: { text: "never", toolCalls: [] }, gate: thinking.promise },
        ]);
        const controller = assistant(model);
        const message = controller.execute("add x and y");
        await model.asked(3);
        assert.exists(session.data.node("y"), "both batches are in before the cancel");

        controller.cancel();
        const result = await message;

        assert.isFalse(result.success);
        assert.notExists(session.data.node("x"));
        assert.notExists(session.data.node("y"));
        assert.lengthOf(newSteps(), 0);
    });

    it("ends the message, running no further tool, when the person undoes it while the model thinks", async () => {
        const thinking = gate();
        const model = scriptedModel([call("addNode", { id: "x" }), call("addNode", { id: "y" }, thinking)]);
        const message = assistant(model).execute("add x and y");
        await model.asked(2);

        const outcome = await session.undo();
        assert.strictEqual(outcome.kind, "undone");
        thinking.open();
        const result = await message;

        assert.isFalse(result.success);
        assert.deepEqual(ran, ["x"], "the second batch never ran");
        assert.notExists(session.data.node("x"));
        assert.lengthOf(newSteps(), 0);
    });

    it("keeps a person's later edit when the message is cancelled, and the message's step under it", async () => {
        const thinking = gate();
        const model = scriptedModel([call("addNode", { id: "x" }), call("addNode", { id: "y" }, thinking)]);
        const controller = assistant(model);
        const message = controller.execute("add x and y");
        await model.asked(2);
        await session.data.updateNodes([{ id: "a", values: { team: "blue" } }]);

        controller.cancel();
        const result = await message;

        assert.isFalse(result.success);
        assert.strictEqual(session.data.node("a")?.team, "blue", "the person's edit stays");
        assert.exists(session.data.node("x"), "the message's step under it is not reverted out of order");
        assert.lengthOf(newSteps(), 2);
    });

    it("takes back the earlier batches when a tool in a later batch throws", async () => {
        const model = scriptedModel([call("addNode", { id: "x" }), call("explode")]);

        const result = await assistant(model).execute("add x then fail");

        assert.isFalse(result.success);
        assert.notExists(session.data.node("x"));
        assert.lengthOf(newSteps(), 0);
    });
});
