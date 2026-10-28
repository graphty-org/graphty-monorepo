/**
 * @file `run_code` end to end in Chromium, on the real QuickJS sandbox: a model (scripted) writes a
 * program that reads the graph through `tools.query` and computes its mean degree; the program's
 * value reaches the next turn and equals what the session itself counts.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { AiController } from "../../../src/ai/AiController";
import { CommandRegistry } from "../../../src/ai/commands";
import { FakeEngine } from "../../../src/ai/engine/FakeEngine";
import { ENGINE_OVERRIDE } from "../../../src/ai/engine/load";
import { installAssistantTools } from "../../../src/ai/tools/install";

const mounted: Graphty[] = [];
const NODES = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
const EDGES = [
    ["a", "b"],
    ["a", "c"],
    ["b", "c"],
    ["c", "d"],
    ["d", "e"],
    ["e", "f"],
    ["f", "a"],
].map(([source, target]) => ({ source, target }));

/** The program the model writes: the mean degree from the query tool's counts. */
const MEAN_DEGREE = `
const seen: { data: { nodes: number; edges: number } } = await tools.query({ action: "overview" });
console.log("counted", seen.data.nodes, seen.data.edges);
return (2 * seen.data.edges) / seen.data.nodes;
`;

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

describe("run_code in the page", () => {
    it("computes the mean degree through tools.query, equal to the session's own counts", async () => {
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        mounted.push(element);
        await element.waitForSettled();
        await element.session.data.addNodes(NODES);
        await element.session.data.addEdges(EDGES);

        const engine = new FakeEngine();
        engine.push(
            [
                { type: "tool-call", id: "code", name: "run_code", arguments: { code: MEAN_DEGREE } },
                { type: "finish", reason: "tool-calls" },
            ],
            [
                { type: "text", delta: "Done." },
                { type: "finish", reason: "stop" },
            ],
        );
        const registry = new CommandRegistry();
        installAssistantTools(registry, element.session);
        const controller = new AiController({
            provider: { name: "scripted" } as never,
            commandRegistry: registry,
            graph: { getSession: () => element.session } as never,
            tools: { inPageCode: true },
            [ENGINE_OVERRIDE]: engine,
        } as never);
        assert.strictEqual(controller.getCapabilities().tools["in-page-code"], "available");

        const result = await controller.execute("use code to compute the average degree");
        controller.dispose();

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        const part = engine.requests
            .at(-1)
            ?.messages.flatMap((message) => message.parts)
            .find((one) => one.type === "tool-result" && one.callId === "code");
        assert.exists(part);
        assert.strictEqual(part.type === "tool-result" ? part.code : undefined, "AI_COMPLETED", JSON.stringify(part));
        const { data } = JSON.parse(part.type === "tool-result" ? part.content : "{}") as {
            data: { value: number; logs: string[] };
        };
        // The oracle: the session's own counts, not a constant.
        const { nodes, edges } = element.session.status.counts;
        // Results carry six significant digits.
        assert.closeTo(data.value, (2 * edges) / nodes, 1e-5);
        assert.strictEqual(nodes, NODES.length);
        assert.match(data.logs.join("\n"), /counted 6 7/);
    });
});
