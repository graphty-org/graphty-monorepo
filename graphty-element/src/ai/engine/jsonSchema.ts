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
