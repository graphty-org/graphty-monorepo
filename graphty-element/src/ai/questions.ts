/**
 * @file Questions to the reader (`AiManagerConfig.questions`): the `ask_reader` tool the loop offers,
 * checking a call of it, and checking the reader's answer. Loaded with `import()` only when
 * questions are switched on or a saved question is answered, so `./ai` does not carry it otherwise.
 */

import { z } from "zod";

import type { AiQuestionRequest } from "../events";
import { compactSchema, toolJsonSchema } from "./engine/jsonSchema";
import type { JsonSchema, ToolSpec } from "./engine/types";
import { ASK_READER, type AskedQuestion } from "./runConversation";
import type { ToolCallRequest } from "./ToolExecutor";

const askReaderSchema = z.strictObject({
    question: z.string().min(1),
    // Each choice is its own answer, by value: two alike could not be told apart.
    choices: z
        .array(z.string().min(1))
        .min(2)
        .max(10)
        .refine((choices) => new Set(choices).size === choices.length, "choices must differ"),
    multiple: z.boolean().optional(),
});

// Compact, as the generated tools' are, and open: every tool turn declares it, within the standard
// profile's 5,000 tokens. The strict check still refuses an unknown field.
const { additionalProperties: _open, ...askReaderJson } = compactSchema(toolJsonSchema(askReaderSchema)) as JsonSchema;

/** `ask_reader` as a tool the model may call. Its description is for the model only. */
export const ASK_READER_TOOL: ToolSpec = {
    name: ASK_READER,
    description: "Ask me to pick from 2-10 choices when my request is unclear. Call it last.",
    schema: askReaderSchema,
    jsonSchema: askReaderJson,
};

/**
 * A call of `ask_reader`, checked.
 * @param call - The call.
 * @returns The question, or undefined when its arguments do not fit.
 */
export function askedQuestion(call: ToolCallRequest): AskedQuestion | undefined {
    const parsed = askReaderSchema.safeParse(call.arguments);
    return parsed.success && call.invalidArguments !== true
        ? {
              call,
              question: parsed.data.question,
              choices: parsed.data.choices,
              multiple: parsed.data.multiple ?? false,
          }
        : undefined;
}

/**
 * The choices an answer picks, when they are among the question's.
 * @param request - The question.
 * @param answer - The answer: one choice, or several for a question that takes several.
 * @returns The choices, or undefined when the answer is not one of them.
 */
export function pickedChoices(request: AiQuestionRequest, answer: string | readonly string[]): string[] | undefined {
    const values = typeof answer === "string" ? [answer] : [...answer];
    const valid =
        values.length > 0 &&
        (request.multiple || values.length === 1) &&
        new Set(values).size === values.length &&
        values.every((value) => request.choices.includes(value));
    return valid ? values : undefined;
}
