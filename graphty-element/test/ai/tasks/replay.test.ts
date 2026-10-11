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
                return {
                    prompt,
                    calls: batches.flat(),
                    results: request === undefined ? [] : resultsOf(request.messages),
                    text: "",
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
