/**
 * @file A catalog entry's options as a strict zod object, for validating `options` before a call
 * runs and for `catalog describe` to hand the model as JSON Schema. The descriptor is the only
 * source: an option a plugin declares reaches the assistant with no further code.
 */

import { z } from "zod";

import type { OptionDescriptor } from "../../catalog/types";
import type { TransactionScope } from "../../session/types";
import { toolJsonSchema } from "../engine/jsonSchema";
import { idsOf, MAX_ITEMS, MAX_SELECTOR, MAX_STRING, resolveNode, settleTarget, text } from "./fields";
import { isOfferedOption } from "./optionTypes";
import { suggest } from "./search";
import { type JsonObject, ToolRefusal } from "./types";

/**
 * One option's schema.
 * @param option - The option's descriptor.
 * @returns Its schema, or undefined for an option the assistant cannot be offered (type `unknown`).
 */
export function optionField(option: OptionDescriptor): z.ZodType | undefined {
    if (!isOfferedOption(option)) {
        return undefined;
    }

    let field: z.ZodType;
    switch (option.type) {
        case "number":
        case "integer": {
            let number = option.type === "integer" ? z.number().int() : z.number();
            if (typeof option.min === "number") {
                number = number.min(option.min);
            }

            if (typeof option.max === "number") {
                number = number.max(option.max);
            }

            field = number;
            break;
        }

        case "seed":
            field = z.number().int();
            break;
        case "boolean":
            field = z.boolean();
            break;
        case "enum":
        case "ordering": {
            const values = (option.values ?? []).map((choice) => choice.value);
            field = values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string().max(MAX_STRING);
            break;
        }

        case "string":
        case "attribute":
        case "partition":
            field = z.string().max(MAX_STRING);
            break;
        case "node-id":
            field = z.union([z.string().max(MAX_STRING), z.number()]);
            break;
        case "node-set":
            field = z.union([z.array(z.string().max(MAX_STRING)).max(MAX_ITEMS), z.string().max(MAX_SELECTOR)]);
            break;
        default:
            return undefined;
    }

    // A null default means "none chosen", which the model may also say.
    const nullable = option.default === null ? field.nullable() : field;
    return nullable.optional().describe(describeOption(option));
}

/**
 * What the model reads about one option.
 * @param option - The option.
 * @returns The description.
 */
function describeOption(option: OptionDescriptor): string {
    const parts = [option.description ?? option.plainName];
    if (option.type === "node-id") {
        parts.push("A node id or unique label.");
    } else if (option.type === "node-set") {
        parts.push("Node ids or unique labels, or a selector.");
    } else if (option.type === "attribute" || option.type === "partition") {
        parts.push(`An ${option.on ?? "node"} attribute name.`);
    }

    if (option.advanced === true) {
        parts.push("(advanced)");
    }

    return parts.join(" ");
}

/** The options a call may pass, and the ones it may not be offered. */
export interface OptionsSchema {
    readonly schema: z.ZodObject;
    /** Options whose type converts to nothing: a coverage failure for a built-in. */
    readonly unoffered: readonly OptionDescriptor[];
}

/**
 * An entry's options as a strict object: internal ones left out, advanced ones last.
 * @param options - The descriptor's options.
 * @returns The schema and what it could not offer.
 */
export function optionsSchema(options: readonly OptionDescriptor[]): OptionsSchema {
    const shape: Record<string, z.ZodType> = {};
    const unoffered: OptionDescriptor[] = [];
    const ordered = [...options].sort((a, b) => Number(a.advanced === true) - Number(b.advanced === true));
    for (const option of ordered) {
        if (option.internal === true) {
            continue;
        }

        const field = optionField(option);
        if (field === undefined) {
            unoffered.push(option);
        } else {
            shape[option.name] = field;
        }
    }

    return { schema: z.strictObject(shape), unoffered };
}

/**
 * An entry's options as JSON Schema with their defaults, for `catalog describe`.
 * @param options - The descriptor's options.
 * @returns The JSON Schema.
 */
export function optionsJsonSchema(options: readonly OptionDescriptor[]): JsonObject {
    const schema = toolJsonSchema(optionsSchema(options).schema) as JsonObject;
    const properties = (schema.properties ?? {}) as Record<string, JsonObject>;
    for (const option of options) {
        const property = properties[option.name] as JsonObject | undefined;
        if (property !== undefined && option.default !== undefined && option.default !== null) {
            property.default = option.default as JsonObject[string];
        }
    }

    delete schema.$schema;
    return schema;
}

/**
 * Check a call's options against an entry's: unknown names, types and bounds refused naming the
 * option, and every option that names nodes settled to node ids -- a label to its node, a
 * selector to the nodes it matches -- as the entry's own code reads them.
 * @param tx - Where labels and selectors are resolved.
 * @param options - The entry's options.
 * @param given - The options the call passed.
 * @param path - Where the options sit in the call, for a refusal (`options`).
 * @returns The options, parsed, node options as ids.
 * @throws {ToolRefusal} `AI_ARG_INVALID` or `AI_ARG_OUT_OF_RANGE` naming the option and the options allowed.
 */
export function checkOptions(
    tx: TransactionScope,
    options: readonly OptionDescriptor[],
    given: Readonly<Record<string, unknown>>,
    path = "options",
): Record<string, unknown> {
    const { schema } = optionsSchema(options);
    const allowed = Object.keys(schema.shape);
    const parsed = schema.safeParse(given);
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        if (issue.code === "unrecognized_keys") {
            throw new ToolRefusal("AI_ARG_INVALID", {
                path: `${path}.${issue.keys[0]}`,
                expected: "a known option",
                allowed,
                didYouMean: suggest(issue.keys[0], allowed),
            });
        }

        const code = issue.code === "too_big" || issue.code === "too_small" ? "AI_ARG_OUT_OF_RANGE" : "AI_ARG_INVALID";
        throw new ToolRefusal(code, { path: `${path}.${issue.path.join(".")}`, expected: issue.message, allowed });
    }

    const out: Record<string, unknown> = { ...parsed.data };
    for (const option of options) {
        const value = out[option.name];
        if (value === undefined || value === null) {
            continue;
        }

        if (option.type === "node-id") {
            out[option.name] = resolveNode(tx, text(value));
        } else if (option.type === "node-set") {
            out[option.name] = nodeSet(tx, value, `${path}.${option.name}`);
        }
    }

    return out;
}

/**
 * A node-set option's nodes: each id or label of a list resolved, or a selector's matches.
 * @param tx - The session.
 * @param value - The list, or the selector.
 * @param path - The option, for a refusal.
 * @returns The node ids.
 * @throws {ToolRefusal} `AI_ARG_OUT_OF_RANGE` when a selector matches more nodes than one call carries.
 */
function nodeSet(tx: TransactionScope, value: unknown, path: string): string[] {
    if (Array.isArray(value)) {
        return value.map((each) => resolveNode(tx, text(each)));
    }

    const { target } = settleTarget(tx, { where: value }, "node", true);
    const { ids, total } = idsOf(tx, target ?? { kind: "all" }, "node", MAX_ITEMS);
    if (total > MAX_ITEMS) {
        throw new ToolRefusal("AI_ARG_OUT_OF_RANGE", { path, max: MAX_ITEMS, matched: total });
    }

    return ids;
}
