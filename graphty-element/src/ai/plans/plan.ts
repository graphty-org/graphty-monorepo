/**
 * @file A router's plan (`AiPlan`), run by the loop step by step as `delegate` calls of graphty's
 * own: a step's helpers at once (read-only) or one after another, each step told what the steps
 * before it answered, at most `MAX_ASSISTANT_TOOL_TURNS` steps of at most `MAX_HELPERS_PER_TURN`
 * helpers each. Loaded with `import()` only when `agents` is set.
 */

import type { AiAgentRole, AiPlan } from "../agents";
import { DELEGATE, MAX_ASSISTANT_TOOL_TURNS, type PlannedStep, type PlanSteps } from "../runConversation";

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
        next(newId): PlannedStep | undefined {
            const step = steps.at(at);
            at++;
            sequence = step?.order === "sequence";
            if (step === undefined) {
                return undefined;
            }

            // The reader's request is every helper's task; what earlier steps answered goes to each
            // helper beside it, as data (`delegation.run`).
            // One id per call: `newId` makes a message's, which repeats until a message is added.
            const base = newId();
            const calls = step.agents.map((agent, index) => ({
                id: `${base}-${String(index)}`,
                name: DELEGATE,
                arguments: { agent, task: input },
            }));
            return { calls, sequence };
        },
    };
}
