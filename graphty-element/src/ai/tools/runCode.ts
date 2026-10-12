/**
 * @file In-page code (`AiToolOptions.inPageCode`): the `run_code` tool the loop offers, and running
 * one call of it. The program runs in the page's sandbox (`loadProgramRunner()`), whatever model
 * wrote it, and may call only the actions of the turn's tools that read and hand the host nothing:
 * each of its calls goes through the tool executor with `readOnly: "in-page-code"`, so a write is
 * refused there, as no approval can be asked from inside a program. Loaded with `import()` only
 * when in-page code is on, so `./ai` does not carry it otherwise.
 */

import { z } from "zod";

import type { GraphCommand } from "../commands/types";
import { compactSchema, toolJsonSchema } from "../engine/jsonSchema";
import { loadProgramRunner } from "../engine/load";
import type { JsonSchema, ProgramBindings, ProgramLimits, SavedPart, ToolSpec } from "../engine/types";
import { RUN_CODE } from "../runConversation";
import { type BatchOutcome, modelView, type ToolCallRequest } from "../ToolExecutor";
import { resultText, toJson } from "./shape";
import { type AssistantTool, isAssistantTool } from "./toolset";
import type { ActionSpec } from "./types";

/** How far one program may go. */
export const PROGRAM_LIMITS: ProgramLimits = Object.freeze({
    timeoutMs: 5000,
    maxCalls: 64,
    maxLogChars: 4000,
    memoryMb: 16,
});

/**
 * The actions that only read but hand the host something (a picture, a video, a file): never bound
 * into a program, which would otherwise deliver them with no approval. `test/ai/tools/
 * program-effects.test.ts` fails on a bound action that emits to the host and is not listed here.
 */
const HANDS_HOST_SOMETHING: ReadonlySet<string> = new Set([
    "capture.screenshot",
    "capture.animation",
    "export_graph.export",
]);

const runCodeSchema = z.strictObject({ code: z.string() });

// Compact and open, as `ask_reader`'s: every tool turn declares it, within the tool budget.
const { additionalProperties: _open, ...runCodeJson } = compactSchema(toolJsonSchema(runCodeSchema)) as JsonSchema;

/** `run_code` as a tool the model may call. Its description is for the model only. */
export const RUN_CODE_TOOL: ToolSpec = {
    name: RUN_CODE,
    description: "JS/TS: await tools.<name>(args) calls your read tools; return a value.",
    schema: runCodeSchema,
    jsonSchema: runCodeJson,
};

/** One action a program may call. */
export interface BoundAction {
    readonly tool: string;
    readonly action: ActionSpec;
}

/**
 * Whether a program may call an action: it only reads and hands the host nothing.
 * @param tool - The tool's name.
 * @param action - The action.
 * @returns True when it may.
 */
function bindable(tool: string, action: ActionSpec): boolean {
    return action.effect === "read" && !HANDS_HOST_SOMETHING.has(`${tool}.${action.name}`);
}

/**
 * The actions of a turn's tools a program may call.
 * @param offered - The tools the turn offers.
 * @returns Them, by tool.
 */
export function boundActions(offered: readonly GraphCommand[]): BoundAction[] {
    return offered
        .filter((command): command is AssistantTool => isAssistantTool(command))
        .flatMap((tool) =>
            tool.definition.actions
                .filter((action) => bindable(tool.name, action))
                .map((action) => ({ tool: tool.name, action })),
        );
}

/**
 * Whether a binding's call may reach the executor: anything but an action that hands the host
 * something. A write goes on, and the executor refuses it.
 * @param tool - The tool.
 * @param args - The program's arguments.
 * @returns False for an action never bound.
 */
function mayCall(tool: AssistantTool, args: Readonly<Record<string, unknown>>): boolean {
    try {
        const checked = tool.check(args);
        return checked.action.effect !== "read" || bindable(checked.tool.name, checked.action);
    } catch {
        // The executor reports what is wrong with the call.
        return true;
    }
}

/** Runs one of a program's calls as a batch of its own, read-only. */
export type ReadOnlyCall = (request: ToolCallRequest) => Promise<BatchOutcome>;

/**
 * A program's bindings: `tools.<name>` for each tool of the turn with an action it may call.
 * @param call - The `run_code` call, whose id each binding call's id extends.
 * @param offered - The tools the turn offers.
 * @param callTool - Runs one binding call.
 * @returns The bindings.
 */
function bindingsFor(call: ToolCallRequest, offered: readonly GraphCommand[], callTool: ReadOnlyCall): ProgramBindings {
    const tools = new Set(boundActions(offered).map((bound) => bound.tool));
    const bindings: Record<string, (input: unknown) => Promise<unknown>> = {};
    let calls = 0;
    for (const tool of offered.filter((command): command is AssistantTool => tools.has(command.name))) {
        bindings[tool.name] = async (input) => {
            const args =
                input !== null && typeof input === "object" && !Array.isArray(input)
                    ? (input as Record<string, unknown>)
                    : {};
            if (!mayCall(tool, args)) {
                return { code: "AI_TOOL_DENIED_BY_POLICY", params: { tool: tool.name, reason: "in-page-code" } };
            }

            calls += 1;
            const request = { id: `${call.id}.${String(calls)}`, name: tool.name, arguments: args };
            const batch = await callTool(request);
            return modelView(batch.results[0], tool.name);
        };
    }

    return bindings;
}

/**
 * Run one `run_code` call: its program in the page's sandbox, and what it returned and logged as
 * the call's result, capped like any other.
 * @param call - The call.
 * @param offered - The tools the turn offers, whose reading actions the program may call.
 * @param callTool - Runs one of the program's calls, read-only.
 * @param signal - Cancels the program.
 * @param cap - The most characters the result may take.
 * @returns The call's result.
 */
export async function runCode(
    call: ToolCallRequest,
    offered: readonly GraphCommand[],
    callTool: ReadOnlyCall,
    signal: AbortSignal,
    cap: number,
): Promise<SavedPart> {
    const parsed = runCodeSchema.safeParse(call.arguments);
    if (!parsed.success || call.invalidArguments === true) {
        const params = { tool: RUN_CODE };
        return {
            type: "tool-result",
            origin: "graph-data",
            callId: call.id,
            code: "AI_TOOL_INVALID_ARGUMENTS",
            params,
            content: resultText({ code: "AI_TOOL_INVALID_ARGUMENTS", params }, cap),
        };
    }

    const { runProgram } = await loadProgramRunner();
    const result = await runProgram(parsed.data.code, bindingsFor(call, offered, callTool), PROGRAM_LIMITS, signal);
    const data = toJson({ ...(result.value === undefined ? {} : { value: result.value }), logs: [...result.logs] });
    return {
        type: "tool-result",
        origin: "graph-data",
        callId: call.id,
        code: result.code,
        params: result.params,
        content: resultText({ code: result.code, params: toJson(result.params) as never, data }, cap),
    };
}
