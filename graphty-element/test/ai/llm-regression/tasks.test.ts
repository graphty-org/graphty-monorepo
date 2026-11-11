/**
 * Assistant task suite, with a real model
 * @module test/ai/llm-regression/tasks
 *
 * The behavior suite (test/ai/tasks/): each task's prompts go to the provider the regression
 * project selects, and the task passes when the session's state afterwards is right, read through
 * the public session API. The reference calls the free replay plays are never sent. Each task's
 * metrics -- success, tool calls, turns, tokens, wrong-tool and refused-call counts -- are printed
 * as one line and appended to the JSONL file `LLM_REGRESSION_TASK_METRICS` names; a summary per
 * tier is printed at the end.
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

describe.skipIf(skipIfNoApiKey())("Assistant tasks", () => {
    const all: TaskMetrics[] = [];
    const profile = process.env.LLM_REGRESSION_TOOL_PROFILE === "small" ? "small" : "standard";
    const provider = `${getLlmRegressionProvider()}/${getLlmRegressionModel()}/${profile}`;

    afterAll(() => {
        if (all.length > 0) {
            console.log(`[llm-regression] tasks on ${provider}\n${summarize(all).join("\n")}`);
        }
    });

    for (const task of TASKS.filter((each) => SELECTED.size === 0 || SELECTED.has(each.id))) {
        it(`${task.id} (${task.tier.join(", ")})`, async () => {
            const session = await taskSession(task.dataset);
            const harness = await LlmRegressionTestHarness.create({ session });
            try {
                const driver: Driver = async (prompt) => {
                    const result = await harness.testPrompt(prompt);
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
                    `${metrics.failure ?? ""}\ncalls: ${metrics.calls.join(", ") || "none"}\nrefused: ${metrics.refusals.join(", ") || "none"}`,
                );
            } finally {
                harness.dispose();
            }
        });
    }
});
