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

    describe("conference-breakdown judges the answer's words", () => {
        // A real model's answer (#7721), its first 300 characters as logged, then a plausible end:
        // the independents grouped as one line, not named one by one.
        const ANSWER = [
            "There are 11 conferences plus 8 independent teams:",
            "",
            "- **Mid-American**: 13",
            "- **Big Twelve**: 12",
            "- **Southeastern**: 12",
            "- **Big Ten**: 11",
            "- **Pacific Ten**: 10",
            "- **Atlantic Coast**: 9",
            "- **Conference USA**: 9",
            "- **Western Athletic**: 9",
            "- **Mountain West**: 8",
            "- **Big East**: 8",
            "- **Big West**: 6",
            "- **Independent**: 8",
        ].join("\n");
        const judge = async (text: string): Promise<{ success: boolean; failure?: string }> => {
            const task = TASKS.find((each) => each.id === "conference-breakdown")!;
            const session = await taskSession(task.dataset);
            const driver: Driver = (prompt) =>
                Promise.resolve({
                    prompt,
                    calls: [],
                    results: [],
                    text,
                    code: "",
                    inputTokens: 0,
                    outputTokens: 0,
                    turns: 1,
                });
            return runTask(task, driver, session);
        };

        it("accepts the independents grouped with their number", async () => {
            const metrics = await judge(ANSWER);
            assert.isTrue(metrics.success, metrics.failure);
        });

        it("accepts the independents named one by one", async () => {
            const named = ANSWER.replace(
                "- **Independent**: 8",
                "Independents: Central Florida, Connecticut, Louisiana Lafayette, Louisiana Monroe, Louisiana Tech, Middle Tennessee State, Navy, Notre Dame",
            );
            const metrics = await judge(named);
            assert.isTrue(metrics.success, metrics.failure);
        });

        it("rejects a wrong number of independents", async () => {
            const metrics = await judge(
                ANSWER.replace("plus 8 independent", "plus 7 independent").replace(
                    "**Independent**: 8",
                    "**Independent**: 7",
                ),
            );
            assert.isFalse(metrics.success);
        });

        it("rejects a missing conference", async () => {
            const metrics = await judge(ANSWER.replace("- **Big West**: 6\n", ""));
            assert.isFalse(metrics.success);
            assert.include(metrics.failure, "Big West");
        });

        it("rejects a wrong largest count", async () => {
            const metrics = await judge(ANSWER.replace("Mid-American**: 13", "Mid-American**: 14"));
            assert.isFalse(metrics.success);
        });
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
