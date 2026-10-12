/**
 * @file A router's plan (`AiPlan`), run by the loop step by step as `delegate` calls of graphty's
 * own: a step's helpers at once (read-only) or one after another, each step told what the steps
 * before it answered, at most `MAX_ASSISTANT_TOOL_TURNS` steps. Loaded with `import()` only when
 * `agents` is set.
 */

import type { AiAgentRole, AiPlan } from "../agents";
import type { SavedMessage } from "../engine/types";
import { DELEGATE, MAX_ASSISTANT_TOOL_TURNS, type PlannedStep, type PlanSteps } from "../runConversation";
import { withAnswers } from "./delegate";

/**
 * The first helper a plan names that is not a role.
 * @param plan - The plan.
 * @param roles - The roles.
 * @returns Its name, or undefined when every helper is a role.
 */
export function unknownAgent(plan: AiPlan, roles: readonly AiAgentRole[]): string | undefined {
    const names = new Set(roles.map((role) => role.name));
    return plan.steps.flatMap((step) => step.agents).find((agent) => !names.has(agent));
}

/**
 * What the plan's hand-offs of the message answered so far: the results of graphty's own
 * `delegate` calls since the reader's request, as `name: result`.
 * @param messages - The conversation.
 * @returns The lines.
 */
function planAnswers(messages: readonly SavedMessage[]): string[] {
    const asked =
        messages.length -
        1 -
        [...messages]
            .reverse()
            .findIndex((message) => message.role === "user" && message.parts.some((part) => part.origin === "reader"));
    const since = messages.slice(asked + 1).flatMap((message) => message.parts);
    const issued = new Map(
        since.flatMap((part) =>
            part.type === "tool-call" && part.origin === "graphty" && part.command === DELEGATE
                ? [[part.callId, String(part.arguments.agent)]]
                : [],
        ),
    );
    return since.flatMap((part) =>
        part.type === "tool-result" && issued.has(part.callId)
            ? [`${String(issued.get(part.callId))}: ${part.content}`]
            : [],
    );
}

/**
 * A plan as the loop runs it.
 * @param plan - The plan, its helpers all roles.
 * @param input - The reader's request, every helper's task.
 * @param start - The step to run first: past zero for a plan a reload reopened.
 * @returns Its steps, cut to `MAX_ASSISTANT_TOOL_TURNS`.
 */
export function planSteps(plan: AiPlan, input: string, start = 0): PlanSteps {
    const steps = plan.steps.filter((step) => step.agents.length > 0).slice(0, MAX_ASSISTANT_TOOL_TURNS);
    let at = start;
    // The step before `start` held the message: its hand-offs run as it said.
    let sequence = steps.at(start - 1)?.order === "sequence" && start > 0;
    return {
        get sequence(): boolean {
            return sequence;
        },
        saved: () => ({ plan: { steps }, next: at }),
        next(conversation, newId): PlannedStep | undefined {
            const step = steps.at(at);
            at++;
            sequence = step?.order === "sequence";
            if (step === undefined) {
                return undefined;
            }

            const task = withAnswers(input, planAnswers(conversation.messages));
            // One id per call: `newId` makes a message's, which repeats until a message is added.
            const base = newId();
            const calls = step.agents.map((agent, index) => ({
                id: `${base}-${String(index)}`,
                name: DELEGATE,
                arguments: { agent, task },
            }));
            return { calls, sequence };
        },
    };
}
