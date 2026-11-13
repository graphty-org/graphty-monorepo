/**
 * @file The free replay of the behavior suite: each task's reference calls, played through a
 * scripted engine over the same data, must pass the task's own check and the checks every task
 * gets. A task whose right answer fails its own check is a defect in the task (or in a tool), found
 * here without a paid model run.
 */

import { assert, describe, it } from "vitest";

import { ScriptedAssistant } from "../../helpers/assistant";
import { STAND_IN_RENDERER } from "../../helpers/llm-regression-harness";
import { type Driver, resultsOf, runTask, taskSession } from "./kit";
import { TASKS } from "./tasks";

describe("assistant tasks, replayed", () => {
    it("has unique ids", () => {
        assert.strictEqual(new Set(TASKS.map((task) => task.id)).size, TASKS.length);
    });

    it("minimum-spanning-tree takes the tree shown by a filter as shown", async () => {
        // A real model's answer (#7699): show only the tree's roads instead of painting them.
        const task = TASKS.find((each) => each.id === "minimum-spanning-tree")!;
        const session = await taskSession(task.dataset);
        const assistant = new ScriptedAssistant(session, { graph: STAND_IN_RENDERER });
        const calls = [
            { tool: "run_algorithm", args: { name: "kruskal", options: { weight: "data.weight" } } },
            { tool: "filter", args: { action: "show_only", on: "edge", where: "results.kruskal.in == true" } },
        ];
        const driver: Driver = async (prompt) => {
            const { result } = await assistant.say(prompt, ...calls.map((call) => [call]));
            return {
                prompt,
                calls,
                results: [],
                text: "",
                code: result.code ?? "",
                inputTokens: 0,
                outputTokens: 0,
                turns: calls.length + 1,
            };
        };
        const metrics = await runTask(task, driver, session);
        assert.isTrue(metrics.success, metrics.failure);
        assert.strictEqual(metrics.wrongTools, 0, metrics.calls.join(", "));
    });

    for (const task of TASKS) {
        it(task.id, async () => {
            const session = await taskSession(task.dataset);
            // The approval gate is the reader's: the replay plays what a right answer calls.
            const assistant = new ScriptedAssistant(session, { graph: STAND_IN_RENDERER });
            const driver: Driver = async (prompt, reference) => {
                const batches = reference.map((batch) =>
                    batch.map((call) => ({ tool: call.tool, args: call.resolve?.(session) ?? call.args })),
                );
                const { result } = await assistant.say(prompt, ...batches);
                const request = assistant.engine.requests.at(-1);
                const results = request === undefined ? [] : resultsOf(request.messages);
                return {
                    prompt,
                    calls: batches.flat(),
                    results,
                    // A scripted engine has no words of its own: its answer is what its calls read,
                    // so an answer check passes only when the reference calls fetch the right value.
                    text: results.map((result) => JSON.stringify(result.body)).join("\n"),
                    code: result.code ?? "",
                    inputTokens: 0,
                    outputTokens: 0,
                    turns: reference.length + 1,
                };
            };
            const metrics = await runTask(task, driver, session);
            if (process.env.TASK_DEBUG) {
                console.log(JSON.stringify(metrics));
            }

            assert.isTrue(metrics.success, `${metrics.failure ?? ""} (refused: ${metrics.refusals.join(", ")})`);
            assert.strictEqual(
                metrics.wrongTools,
                0,
                `the reference calls a tool outside the task's list: ${metrics.calls.join(", ")}`,
            );
        });
    }
});
