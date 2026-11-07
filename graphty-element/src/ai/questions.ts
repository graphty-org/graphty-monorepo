/**
 * @file Questions to the reader (`AiManagerConfig.questions`): the `ask_reader` tool the loop offers,
 * checking a call of it, and checking the reader's answer. Loaded with `import()` only when
 * questions are switched on or a saved question is answered, so `./ai` does not carry it otherwise.
 */

import { z } from "zod";

import type { AiQuestionRequest } from "../events";
import { comparable } from "./comparable";
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
 * The choice some text names: itself, else the one choice alike with case, punctuation and spacing
 * ignored, as a spoken answer is matched.
 * @param text - The text.
 * @param choices - The choices.
 * @returns The choice, or undefined when none is, or two are alike.
 */
function choiceNamed(text: string, choices: readonly string[]): string | undefined {
    if (choices.includes(text)) {
        return text;
    }

    const said = comparable(text);
    const alike = choices.filter((choice) => comparable(choice) === said);
    return said !== "" && alike.length === 1 ? alike[0] : undefined;
}

/**
 * The choices a comma list names, each the longest run of its pieces that is a choice, so a choice
 * with a comma in it stays one.
 * @param text - The list.
 * @param choices - The choices.
 * @returns The choices, or undefined when a piece names none.
 */
function choicesListed(text: string, choices: readonly string[]): string[] | undefined {
    const pieces = text.split(",");
    const picked: string[] = [];
    for (let start = 0; start < pieces.length;) {
        let end = pieces.length;
        let choice: string | undefined;
        for (; end > start && choice === undefined; end -= 1) {
            choice = choiceNamed(pieces.slice(start, end).join(","), choices);
        }

        if (choice === undefined) {
            return undefined;
        }

        picked.push(choice);
        start = end + 1;
    }

    return picked;
}

/**
 * What each part of an answer names.
 * @param request - The question.
 * @param request.choices - Its choices.
 * @param request.multiple - Whether it takes several.
 * @param answer - The answer.
 * @returns A choice or undefined per part, or undefined when a list names none.
 */
function namedChoices(
    { choices, multiple }: AiQuestionRequest,
    answer: string | readonly string[],
): readonly (string | undefined)[] | undefined {
    if (typeof answer !== "string") {
        return answer.map((value) => choiceNamed(value, choices));
    }

    return multiple ? choicesListed(answer, choices) : [choiceNamed(answer, choices)];
}

/**
 * The choices an answer picks, when they are among the question's: what a reader types or says
 * counts with case, punctuation and spacing ignored, and a question that takes several also takes
 * one text of its choices with commas between them.
 * @param request - The question.
 * @param answer - The answer: one choice, or several for a question that takes several.
 * @param typed - Whether a text outside the choices counts as the answer, as written.
 * @returns The choices as the question gave them, or undefined when the answer is not among them.
 */
export function pickedChoices(
    request: AiQuestionRequest,
    answer: string | readonly string[],
    typed = false,
): string[] | undefined {
    const named = namedChoices(request, answer);
    const values = named?.filter((value) => value !== undefined);
    const valid =
        values !== undefined &&
        values.length > 0 &&
        values.length === named?.length &&
        (request.multiple || values.length === 1) &&
        new Set(values).size === values.length;
    if (valid) {
        return values;
    }

    return typed && typeof answer === "string" && answer.trim() !== "" ? [answer] : undefined;
}
