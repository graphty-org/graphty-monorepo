/**
 * @file `undo`: undo and redo the assistant's own steps, and list recent steps. It runs alone in
 * its batch with no transaction open, at most once per message, and never undoes the reader's
 * work: when the reader's steps sit above the assistant's newest, it refuses and names them.
 */

import { z } from "zod";

import type { HistoryStep } from "../../../session/types";
import { toJson } from "../shape";
import { type ActionSpec, type MessageState, type ToolDefinition, ToolRefusal } from "../types";
import { ok } from "./common";

/** The tool's name, which the pipeline runs outside a transaction. */
export const UNDO_TOOL = "undo";

/**
 * A step as the model reads it.
 * @param step - The step.
 * @returns Its fact and whether it is the assistant's.
 */
function stepFact(step: HistoryStep): { code: string; params: unknown; mine: boolean } {
    return { code: step.fact.code, params: step.fact.params, mine: step.provenance.via === "assistant" };
}

/**
 * Count an undo or redo against the message's one.
 * @param message - The message.
 */
function once(message: MessageState): void {
    if (message.undo.calls > 0) {
        throw new ToolRefusal("AI_UNDO_NOT_ALONE", { reason: "one undo or redo per message" });
    }

    message.undo.calls++;
}

/** The `undo` tool. */
export const undoTool: ToolDefinition = {
    name: UNDO_TOOL,
    plainName: "Undo",
    core: true,
    description: "Undoes or redoes your own last change, never the reader's. Call it alone, once per message.",
    example: { action: "undo" },
    actions: [
        {
            name: "undo",
            summary: "",
            fields: {},
            effect: "exempt",
            reaches: [
                { door: "GraphSession.undo" },
                { door: "GraphSession.canUndo" },
                { door: "SessionHistory.nextUndo" },
            ],
            run: async ({ session, message }) => {
                const next = session.history.nextUndo;
                if (!session.canUndo || next?.kind !== "undo") {
                    throw new ToolRefusal("AI_UNDO_NOTHING");
                }

                if (next.step.provenance.via !== "assistant") {
                    const { steps, position } = session.history;
                    const above: HistoryStep[] = [];
                    for (let index = position - 1; index >= 0 && steps[index].provenance.via !== "assistant"; index--) {
                        above.push(steps[index]);
                    }

                    throw new ToolRefusal("AI_UNDO_NOT_MINE", {
                        steps: above.slice(0, 5).map((step) => toJson(stepFact(step))),
                    });
                }

                if (next.step.provenance.message === message.id) {
                    throw new ToolRefusal("AI_UNDO_IN_MESSAGE", { steps: [toJson(stepFact(next.step))] });
                }

                once(message);
                const outcome = await session.undo();
                return ok(outcome.kind === "undone" ? outcome.steps.map(stepFact) : [], { outcome: outcome.kind });
            },
        },
        {
            name: "redo",
            summary: "",
            fields: {},
            effect: "exempt",
            reaches: [{ door: "GraphSession.redo" }, { door: "GraphSession.canRedo" }],
            run: async ({ session, message }) => {
                const { steps, position } = session.history;
                const next = steps.at(position);
                if (!session.canRedo || next === undefined) {
                    throw new ToolRefusal("AI_UNDO_NOTHING");
                }

                if (next.provenance.via !== "assistant") {
                    throw new ToolRefusal("AI_UNDO_NOT_MINE", { steps: [toJson(stepFact(next))] });
                }

                once(message);
                const outcome = await session.redo();
                return ok(outcome.kind === "redone" ? outcome.steps.map(stepFact) : [], { outcome: outcome.kind });
            },
        },
        {
            name: "recent",
            summary: "recent steps, yours marked",
            fields: { limit: z.number().int().min(1).max(20).optional().describe("Default 5.") },
            effect: "read",
            reaches: [{ door: "SessionHistory.steps" }, { door: "SessionHistory.position" }],
            run: ({ session }, args) => {
                const { steps, position } = session.history;
                const limit = (args.limit as number | undefined) ?? 5;
                const recent = steps
                    .slice(0, position)
                    .slice(-limit)
                    .reverse()
                    .map((step) => toJson(stepFact(step)));
                return Promise.resolve(ok(recent, { undoable: position, redoable: steps.length - position }));
            },
        },
    ] satisfies ActionSpec[],
};
