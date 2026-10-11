/**
 * @file A command's parameter schema as JSON Schema, the way a model is told about a tool.
 */

import { z } from "zod";

import type { JsonSchema } from "./types";

/** One node of a JSON Schema, while it is being edited. */
type SchemaNode = Record<string, unknown>;

/**
 * Closes every object: `additionalProperties: false` unless it already has a schema for them,
 * through properties and array items, as the AI SDK 5 does, so the model is told the same thing.
 * @param schema - A JSON Schema node, changed in place.
 * @returns The same node.
 */
function closeObjects(schema: SchemaNode): SchemaNode {
    if (schema.type === "object") {
        const extra = schema.additionalProperties;
        schema.additionalProperties =
            extra !== null && typeof extra === "object" ? closeObjects(extra as SchemaNode) : false;
        const properties = (schema.properties ?? {}) as Record<string, SchemaNode>;
        for (const key of Object.keys(properties)) {
            properties[key] = closeObjects(properties[key]);
        }
    }

    const { items } = schema;
    if (schema.type === "array" && items !== null && typeof items === "object") {
        schema.items = Array.isArray(items)
            ? (items as SchemaNode[]).map(closeObjects)
            : closeObjects(items as SchemaNode);
    }

    return schema;
}

/**
 * The JSON Schema of a tool's parameters: draft 7, the input side of every transform, every
 * reused schema inlined, every object closed.
 * @param schema - The command's zod schema.
 * @returns Its JSON Schema.
 */
export function toolJsonSchema(schema: z.ZodType): JsonSchema {
    return closeObjects(z.toJSONSchema(schema, { target: "draft-7", io: "input", reused: "inline" }));
}

/** Keys a provider schema leaves out: graphty checks every bound itself, before a call runs. */
const PROVIDER_OMITS = new Set(["$schema", "minLength", "maxLength", "minItems", "maxItems"]);

/** A numeric bound at least this far from zero is a sanity cap, enforced but not worth sending. */
const SANITY_BOUND = 1e6;

/**
 * A JSON Schema as a provider is sent it: bounds on lengths and counts, and sanity caps on
 * numbers, left out (the strict check enforces them), a tuple's items as one schema, and empty
 * descriptions dropped.
 * @param node - The schema.
 * @returns The compact schema.
 */
export function compactSchema(node: unknown): unknown {
    if (Array.isArray(node)) {
        return node.map(compactSchema);
    }

    if (node === null || typeof node !== "object") {
        return node;
    }

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
        if (key === "items" && Array.isArray(value)) {
            // A tuple (draft 7's array of item schemas), which providers refuse: one schema for
            // every item, the strict check holding each position to its own.
            const kinds = [...new Set(value.map((item) => JSON.stringify(compactSchema(item))))];
            out.items =
                kinds.length === 1
                    ? (JSON.parse(kinds[0]) as unknown)
                    : { anyOf: kinds.map((kind) => JSON.parse(kind) as unknown) };
            continue;
        }

        const compact =
            key === "properties"
                ? Object.fromEntries(
                      Object.entries(value as object).map(([name, child]) => [name, compactSchema(child)]),
                  )
                : compactSchema(value);
        if (
            PROVIDER_OMITS.has(key) ||
            (key === "description" && value === "") ||
            ((key === "maximum" || key === "minimum") &&
                typeof value === "number" &&
                Math.abs(value) >= SANITY_BOUND) ||
            (key === "propertyNames" && JSON.stringify(compact) === '{"type":"string"}') ||
            (key === "additionalProperties" && JSON.stringify(compact) === "{}")
        ) {
            continue;
        }

        out[key] = compact;
    }

    return out;
}
