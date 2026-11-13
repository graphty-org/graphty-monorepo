/**
 * Assistant task suite, with a real model
 * @module test/ai/llm-regression/tasks-suite
 *
 * The behavior suite (test/ai/tasks/): each task's prompts go to the provider the regression
 * project selects, and the task passes when the session's state afterwards is right, read through
 * the public session API. The reference calls the free replay plays are never sent. Each task's
 * metrics -- success, tool calls, turns, tokens, wrong-tool and refused-call counts -- are printed
 * as one line and appended to the JSONL file `LLM_REGRESSION_TASK_METRICS` names; a summary per
 * tier is printed at the end.
 *
 * The tasks are dealt into the `tasks-<part>.test.ts` files, one slice each, so the project's
 * workers run the slices side by side instead of one file sending every task in turn.
 */

import { afterAll, assert, describe, it } from "vitest";

import { getLlmRegressionModel, getLlmRegressionProvider, skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { type Driver, recordMetrics, resultsOf, runTask, summarize, type TaskMetrics, taskSession } from "../tasks/kit";
import { TASKS } from "../tasks/tasks";

/** Which tasks to run: a comma-separated list of ids in `LLM_REGRESSION_TASKS`, or all. */
const SELECTED = new Set(
    (process.env.LLM_REGRESSION_TASKS ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id !== ""),
);

/**
 * Declare one slice of the task suite: every `parts`-th task, starting at `part` (1-based).
 * @param part - Which slice, 1 to `parts`.
 * @param parts - How many slices the suite is dealt into.
 */
export function describeTasks(part: number, parts: number): void {
    describe.skipIf(skipIfNoApiKey())(`Assistant tasks ${part}/${parts}`, () => {
        const all: TaskMetrics[] = [];
        const profile = process.env.LLM_REGRESSION_TOOL_PROFILE === "small" ? "small" : "standard";
        const provider = `${getLlmRegressionProvider()}/${getLlmRegressionModel()}/${profile}`;

        afterAll(() => {
            if (all.length > 0) {
                console.log(`[llm-regression] tasks on ${provider}\n${summarize(all).join("\n")}`);
            }
        });

        const slice = TASKS.filter((_, index) => index % parts === part - 1);
        for (const task of slice.filter((each) => SELECTED.size === 0 || SELECTED.has(each.id))) {
            it(`${task.id} (${task.tier.join(", ")})`, async () => {
                const session = await taskSession(task.dataset);
                const harness = await LlmRegressionTestHarness.create({ session });
                // Every call with its arguments, for the failure message: the names alone cannot say
                // whether the model or the check was wrong.
                const sent: string[] = [];
                try {
                    const driver: Driver = async (prompt) => {
                        const result = await harness.testPrompt(prompt);
                        sent.push(...result.toolCalls.map((call) => `${call.name} ${JSON.stringify(call.arguments)}`));
                        return {
                            prompt,
                            calls: result.toolCalls.map((call) => ({ tool: call.name, args: call.arguments })),
                            results: result.lastRequest ? resultsOf(result.lastRequest.messages) : [],
                            text: result.llmText ?? "",
                            code: result.code ?? "",
                            inputTokens: result.tokenUsage?.prompt ?? 0,
                            outputTokens: result.tokenUsage?.completion ?? 0,
                            turns: result.turns ?? 0,
                        };
                    };
                    const metrics = await runTask(task, driver, session);
                    all.push(metrics);
                    recordMetrics(metrics, provider);
                    console.log(`[llm-regression] task ${JSON.stringify(metrics)}`);
                    assert.isTrue(
                        metrics.success,
                        `${metrics.failure ?? ""}\ncalls:\n${sent.join("\n") || "none"}\nrefused: ${metrics.refusals.join(", ") || "none"}`,
                    );
                } finally {
                    harness.dispose();
                }
            });
        }
    });
}
