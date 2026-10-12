/**
 * @file The `"classifier"` router: one short turn before the message, offering only a `route`
 * tool, picks the helpers the reader's request needs. No pick leaves the message to the main
 * model alone. An ordinary turn on any engine: no structured-output support is needed. Loaded with
 * `import()` only when `agents` is set.
 */

import { z } from "zod";

import type { AiAgentRole, AiPlan } from "../agents";
import { compactSchema, toolJsonSchema } from "../engine/jsonSchema";
import { providerFailure } from "../engine/LlmProviderEngine";
import type { AiEngine, JsonSchema, TurnRequest } from "../engine/types";
import { type TokenUsage, TurnFailed } from "../runConversation";

/** The classifier's one tool. */
export const ROUTE = "route";

/**
 * The classifier's turn for a request.
 * @param input - The reader's request.
 * @param roles - The helpers it may pick.
 * @returns The request, and the schema its `route` call is checked with.
 */
function routeRequest(
    input: string,
    roles: readonly AiAgentRole[],
): { request: TurnRequest; schema: z.ZodType<{ agents: string[]; order?: "parallel" | "sequence" }> } {
    const schema = z.strictObject({
        agents: z.array(z.enum(roles.map((role) => role.name) as [string, ...string[]])).min(1),
        order: z.enum(["parallel", "sequence"]).optional(),
    });
    const { additionalProperties: _open, ...jsonSchema } = compactSchema(toolJsonSchema(schema)) as JsonSchema;
    const helpers = roles.map((role) => `- ${role.name}: ${role.purpose}`).join("\n");
    return {
        schema,
        request: {
            system: `You hand a request to the helpers that can do it. The helpers:
${helpers}
Call route with every helper the request needs, in the order they should work; order "sequence" when a later helper needs what an earlier one finds, "parallel" otherwise. When no helper fits the request, call nothing and answer "none".`,
            messages: [{ id: "route", role: "user", parts: [{ type: "text", origin: "reader", text: input }] }],
            tools: [
                {
                    name: ROUTE,
                    description: "Hands the request to these helpers.",
                    schema,
                    jsonSchema,
                },
            ],
            toolMode: "auto",
        },
    };
}

/**
 * Ask the model which helpers a request needs.
 * @param input - The reader's request.
 * @param roles - The helpers it may pick.
 * @param engine - The engine the turn runs on.
 * @param signal - Ends the turn when the message is cancelled.
 * @param onUsage - Told the tokens the turn used, which are the message's.
 * @returns A one-step plan of the helpers picked, or undefined when the model picked none.
 * @throws {TurnFailed} When the turn failed or was cancelled.
 */
export async function classify(
    input: string,
    roles: readonly AiAgentRole[],
    engine: AiEngine,
    signal: AbortSignal,
    onUsage: (usage: TokenUsage) => void = () => undefined,
): Promise<AiPlan | undefined> {
    const { request, schema } = routeRequest(input, roles);
    let pick: { agents: string[]; order?: "parallel" | "sequence" } | undefined;
    for await (const event of engine.turn(request, signal)) {
        if (event.type === "tool-call" && event.name === ROUTE && pick === undefined) {
            const parsed = schema.safeParse(event.arguments);
            pick = parsed.success ? parsed.data : undefined;
        } else if (event.type === "usage") {
            onUsage({ inputTokens: event.inputTokens, outputTokens: event.outputTokens });
        } else if (event.type === "error") {
            throw new TurnFailed(event);
        } else if (event.type === "finish") {
            break;
        }
    }

    if (signal.aborted) {
        throw new TurnFailed(providerFailure(signal.reason, engine.providerName, signal));
    }

    return pick === undefined
        ? undefined
        : { steps: [{ agents: [...new Set(pick.agents)], order: pick.order ?? "parallel" }] };
}
