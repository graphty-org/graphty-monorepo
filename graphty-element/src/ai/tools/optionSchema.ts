/**
 * @file A catalog entry's options as a strict zod object, for validating `options` before a call
 * runs and for `catalog describe` to hand the model as JSON Schema. The descriptor is the only
 * source: an option a plugin declares reaches the assistant with no further code.
 */

import { z } from "zod";

import type { OptionDescriptor } from "../../catalog/types";
import { toolJsonSchema } from "../engine/jsonSchema";
import { MAX_ITEMS, MAX_SELECTOR, MAX_STRING } from "./fields";
import { isOfferedOption } from "./optionTypes";
import type { JsonObject } from "./types";

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
