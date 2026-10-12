/**
 * @file A router's plan (`AiPlan`), run by the loop step by step as `delegate` calls of graphty's
 * own: a step's helpers at once (read-only) or one after another, each step told what the steps
 * before it answered, at most `MAX_ASSISTANT_TOOL_TURNS` steps. Loaded with `import()` only when
 * `agents` is set.
 */

import type { AiAgentRole, AiPlan } from "../agents";
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
 * A plan as the loop runs it.
 * @param plan - The plan, its helpers all roles.
 * @param input - The reader's request, every helper's task.
 * @returns Its steps, cut to `MAX_ASSISTANT_TOOL_TURNS`.
 */
export function planSteps(plan: AiPlan, input: string): PlanSteps {
    const steps = plan.steps.filter((step) => step.agents.length > 0).slice(0, MAX_ASSISTANT_TOOL_TURNS);
    /** The helper each of the plan's calls went to, by call id. */
    const issued = new Map<string, string>();
    let at = 0;
    let sequence = false;
    return {
        get sequence(): boolean {
            return sequence;
        },
        next(conversation, newId): PlannedStep | undefined {
            const step = steps.at(at);
            at++;
            sequence = step?.order === "sequence";
            if (step === undefined) {
                return undefined;
            }

            const answers = conversation.messages
                .flatMap((message) => message.parts)
                .flatMap((part) =>
                    part.type === "tool-result" && issued.has(part.callId)
                        ? [`${String(issued.get(part.callId))}: ${part.content}`]
                        : [],
                );
            const task = withAnswers(input, answers);
            // One id per call: `newId` makes a message's, which repeats until a message is added.
            const base = newId();
            const calls = step.agents.map((agent, index) => {
                const id = `${base}-${String(index)}`;
                issued.set(id, agent);
                return { id, name: DELEGATE, arguments: { agent, task } };
            });
            return { calls, sequence };
        },
    };
}
