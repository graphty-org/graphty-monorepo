/**
 * @file What a model passed a tool, read against the tool's own parameter schema: each argument's
 * kind and default name, so an application words what was asked for with one formatter per kind,
 * for any tool -- a registered algorithm's, layout's or format's included -- with no code of its own.
 * Also the `intent` every generated tool takes: the model's few words for the reader.
 */

import { z } from "zod";

import type { AiCallInput, AiEffect, AiInputKind, AiRule } from "../../catalog/ai";
import { ruleParts } from "../../session/styles/predicate";
import type { CommandRegistry } from "../commands/CommandRegistry";
import type { AiConversationSnapshot } from "../conversation/snapshot";

/** The field every generated tool takes for the model's own few words about the call. */
export const INTENT_FIELD = "intent";

/** The longest intent kept. */
const INTENT_MAX = 200;

/**
 * The intent field as the provider is sent it: undescribed, since every tool takes it and the
 * instructions say once what it is for (`INTENT_HELP`).
 */
export const intentField = z.string().max(INTENT_MAX).optional();

/** What the instructions say the intent field is for. */
export const INTENT_HELP =
    'Every call takes intent: what you are doing, in a few words, for the reader ("Coloring the busiest nodes"). ' +
    'Intent only labels the step: a layer you add still takes its own name, in the reader\'s words (name: "East Coast schools").';

/** What a field holds, beside its schema. */
interface InputMeta {
    readonly kind: AiInputKind;
    readonly plainName?: string;
}

/** The kinds fields declare. A registry of its own, so a provider's schema never carries them. */
const INPUT_META = z.registry<InputMeta>();

/**
 * Declare what kind of value a field holds.
 * @param schema - The field.
 * @param kind - Its kind.
 * @param plainName - Its default name, when its key does not say it.
 * @returns The field.
 */
export function inputKind<T extends z.ZodType>(schema: T, kind: AiInputKind, plainName?: string): T {
    INPUT_META.add(schema, plainName === undefined ? { kind } : { kind, plainName });
    return schema;
}

/**
 * A field's declared kind, through the wrappers a tool adds (optional, described, defaulted).
 * @param schema - The field.
 * @returns Its declared kind, or undefined.
 */
function declared(schema: z.ZodType): InputMeta | undefined {
    let node: z.ZodType | undefined = schema;
    while (node !== undefined) {
        const meta = INPUT_META.get(node);
        if (meta !== undefined) {
            return meta;
        }

        const { def } = node as unknown as { def: { type: string; innerType?: z.ZodType } };
        node = def.innerType;
    }

    return undefined;
}

/**
 * A field's kind from its type, for a field that declares none.
 * @param schema - The field.
 * @returns The kind.
 */
function typeKind(schema: z.ZodType): AiInputKind {
    let node: z.ZodType = schema;
    for (;;) {
        const { def } = node as unknown as { def: { type: string; innerType?: z.ZodType } };
        if (def.innerType === undefined) {
            break;
        }

        node = def.innerType;
    }

    const kinds: Readonly<Record<string, AiInputKind>> = {
        number: "number",
        int: "number",
        boolean: "yes-no",
        enum: "choice",
        string: "text",
    };
    return kinds[(node as unknown as { def: { type: string } }).def.type] ?? "other";
}

/**
 * A field's key as a default name: "relativeTo" is "Relative to".
 * @param key - The key.
 * @returns The name.
 */
function keyName(key: string): string {
    const words = key
        .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
        .replaceAll("_", " ")
        .toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The parts of a rule or a run's value an input holds.
 * @param kind - Its kind.
 * @param value - Its value.
 * @returns The parts, or undefined.
 */
function partsOf(kind: AiInputKind, value: unknown): AiRule | undefined {
    if (kind === "rule" && typeof value === "string" && value !== "all") {
        return ruleParts(value);
    }

    const result = value as { run?: unknown; field?: unknown; op?: unknown; value?: unknown } | null;
    if (kind !== "result" || typeof result?.run !== "string" || typeof result.field !== "string") {
        return undefined;
    }

    const op = result.op === "=" ? "==" : result.op;
    if (op !== "==" && op !== "!=" && op !== "<" && op !== "<=" && op !== ">" && op !== ">=" && op !== "in") {
        return undefined;
    }

    const values = (Array.isArray(result.value) ? result.value : [result.value]).filter(
        (each): each is string | number | boolean | null =>
            each === null || ["string", "number", "boolean"].includes(typeof each),
    );
    const column = `results.${result.run}.${result.field}`;
    return { join: "all", terms: [{ column, op: op === "in" ? "==" : op, values }] };
}

/**
 * Effects with the rule their call named elements by, in parts: each effect's own rule target,
 * else the call's `where` or `result`. An effect that states a rule already keeps it.
 * @param effects - The call's effects.
 * @param args - The call's arguments.
 * @returns The effects.
 */
export function ruledEffects(
    effects: readonly AiEffect[],
    args: Readonly<Record<string, unknown>>,
): readonly AiEffect[] {
    const passed = partsOf("rule", args.where) ?? partsOf("result", args.result);
    return effects.map((effect) => {
        const own =
            effect.target !== undefined && "where" in effect.target ? partsOf("rule", effect.target.where) : undefined;
        const searched = effect.code === "AI_EFFECT_EMPTY" ? partsOf("rule", effect.params.searched) : undefined;
        const rule = effect.rule ?? own ?? searched ?? passed;
        return rule === undefined ? effect : { ...effect, rule };
    });
}

/** A tool as `callInputs` reads it: its flat parameters. */
type Described = { readonly parameters?: z.ZodType };

/**
 * What a model passed a tool, each argument with its kind and default name, in the order the
 * model gave them. `action` and `intent` are left out: they are the step itself. A call through
 * `call` is read as the call of the tool it names.
 * @param registry - Where the tools are, or undefined to read kinds from nothing but the values.
 * @param command - The tool, as the model named it.
 * @param args - Its arguments.
 * @returns The inputs.
 */
export function callInputs(
    registry: Pick<CommandRegistry, "get"> | undefined,
    command: string,
    args: Readonly<Record<string, unknown>>,
): AiCallInput[] {
    if (command === "call" && typeof args.tool === "string") {
        let inner: unknown = args.args ?? {};
        if (typeof inner === "string") {
            try {
                inner = JSON.parse(inner);
            } catch {
                inner = {};
            }
        }

        return typeof inner === "object" && inner !== null && !Array.isArray(inner)
            ? callInputs(registry, args.tool, inner as Record<string, unknown>)
            : [];
    }

    const parameters = (registry?.get(command) as Described | undefined)?.parameters;
    const shape = parameters instanceof z.ZodObject ? (parameters.shape as Record<string, z.ZodType>) : {};
    return Object.entries(args).flatMap(([name, value]): AiCallInput[] => {
        if (name === "action" || name === INTENT_FIELD || value === null || value === "") {
            return [];
        }

        const field = shape[name] as z.ZodType | undefined;
        const meta = field === undefined ? undefined : declared(field);
        const kind = meta?.kind ?? (field === undefined ? "other" : typeKind(field));
        const rule = partsOf(kind, value);
        return [
            {
                name,
                plainName: meta?.plainName ?? keyName(name),
                kind,
                value,
                ...(rule === undefined ? {} : { rule }),
            },
        ];
    });
}

/**
 * The model's few words for a call, when it gave them: from its own arguments, or from inside a
 * `call`'s.
 * @param args - The call's arguments.
 * @returns The words, or undefined.
 */
export function callIntent(args: Readonly<Record<string, unknown>>): string | undefined {
    const own = args[INTENT_FIELD];
    if (typeof own === "string" && own.trim() !== "") {
        return own.trim().slice(0, INTENT_MAX);
    }

    const inner = args.args;
    return typeof inner === "object" && inner !== null && !Array.isArray(inner)
        ? callIntent({ [INTENT_FIELD]: (inner as Record<string, unknown>)[INTENT_FIELD] })
        : undefined;
}

/**
 * A conversation with what each call passed, read against the tools as they are now.
 * @param snapshot - The conversation.
 * @param registry - Where the tools are.
 * @returns The conversation, each call with its `inputs`.
 */
export function withInputs(
    snapshot: AiConversationSnapshot,
    registry: Pick<CommandRegistry, "get">,
): AiConversationSnapshot {
    const messages = snapshot.messages.map((message) => {
        if (message.role !== "assistant" || message.calls.length === 0) {
            return message;
        }

        const calls = message.calls.map((call) => {
            const inputs = callInputs(registry, call.command, call.arguments);
            return inputs.length === 0 ? call : { ...call, inputs };
        });
        return { ...message, calls };
    });
    return { ...snapshot, messages };
}
