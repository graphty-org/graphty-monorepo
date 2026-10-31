/**
 * Folds JSON values into one inferred schema: types, number ranges, string formats, and which
 * object properties are required or optional.
 *
 * A port of the inference in `@jsonhero/schema-infer` 0.1.5 (MIT, Eric Allam), kept to what
 * SchemaExtractor reads. The package was dropped because it pulls in `@jsonhero/json-schema-fns`,
 * whose `deepmerge` (GHSA-gcqx-w48m-w2h4) has no patched version. Value classification and string
 * formats still come from `@jsonhero/json-infer-types`, as they did inside schema-infer.
 * @module ai/schema/inferSchema
 */

import { inferType, type JSONValueType } from "@jsonhero/json-infer-types";

/** The inferred schema of every value folded in so far. */
export type InferredSchema =
    | { type: "unknown" }
    | { type: "boolean" }
    | { type: "int" | "float"; range: { min: number; max: number } }
    | { type: "string"; format?: { name: string } }
    | { type: "array"; items: InferredSchema }
    | {
          type: "object";
          properties: { required: Record<string, InferredSchema>; optional: Record<string, InferredSchema> };
      }
    | { type: "nullable"; schema: InferredSchema }
    | { type: "any"; schemas: Set<InferredSchema> };

const UNKNOWN: InferredSchema = { type: "unknown" };

type Properties = Record<string, InferredSchema>;

/**
 * Write a key as an own property. Plain assignment of a data key named `__proto__` would replace
 * the map's prototype instead, which is the poisoning deepmerge's advisory describes.
 * @param target - The property map
 * @param key - The property name, whatever it is
 * @param schema - The schema to record under it
 */
function put(target: Properties, key: string, schema: InferredSchema): void {
    Object.defineProperty(target, key, { value: schema, enumerable: true, writable: true, configurable: true });
}

const EMPTY_RANGE = { min: Number.MAX_SAFE_INTEGER, max: Number.MIN_SAFE_INTEGER };

function inferRange(value: number, range = EMPTY_RANGE): { min: number; max: number } {
    return { min: Math.min(range.min, value), max: Math.max(range.max, value) };
}

function toAny(schema: InferredSchema, value: unknown): InferredSchema {
    return { type: "any", schemas: new Set([schema, inferSchema(UNKNOWN, value)]) };
}

function foldItems(items: InferredSchema, values: unknown[]): InferredSchema {
    return values.reduce<InferredSchema>((acc, item) => inferSchema(acc, item), items);
}

function fromValue(t: Exclude<JSONValueType, { name: "null" }>): InferredSchema {
    switch (t.name) {
        case "bool":
            return { type: "boolean" };
        case "int":
        case "float":
            return { type: t.name, range: inferRange(t.value) };
        case "string":
            return t.format ? { type: "string", format: t.format } : { type: "string" };
        case "array":
            return { type: "array", items: foldItems(UNKNOWN, t.value) };
        case "object": {
            const required: Properties = {};

            for (const [key, v] of Object.entries(t.value)) {
                put(required, key, inferSchema(UNKNOWN, v));
            }

            return { type: "object", properties: { required, optional: {} } };
        }
        default:
            return UNKNOWN;
    }
}

function mergeNumber(
    schema: { type: "int" | "float"; range: { min: number; max: number } },
    t: JSONValueType,
): InferredSchema {
    if (t.name !== "int" && t.name !== "float") {
        return toAny(schema, t.value);
    }

    const type = schema.type === "int" && t.name === "int" ? "int" : "float";

    return { type, range: inferRange(t.value, schema.range) };
}

function mergeString(schema: { type: "string"; format?: { name: string } }, t: JSONValueType): InferredSchema {
    if (t.name !== "string") {
        return toAny(schema, t.value);
    }

    // A format survives only while every value has had that same format.
    return schema.format && t.format?.name === schema.format.name
        ? { type: "string", format: t.format }
        : { type: "string" };
}

function mergeObject(properties: { required: Properties; optional: Properties }, value: object): InferredSchema {
    const required: Properties = {};
    const optional: Properties = { ...properties.optional };

    for (const [key, schema] of Object.entries(properties.required)) {
        put(Object.hasOwn(value, key) ? required : optional, key, schema);
    }

    for (const [key, v] of Object.entries(value)) {
        if (Object.hasOwn(required, key)) {
            put(required, key, inferSchema(required[key], v));
        } else {
            put(optional, key, inferSchema(Object.hasOwn(optional, key) ? optional[key] : UNKNOWN, v));
        }
    }

    return { type: "object", properties: { required, optional } };
}

/**
 * Fold one value into a schema.
 * @param schema - The schema inferred from the values seen so far (`{ type: "unknown" }` to start)
 * @param value - The next value
 * @returns The schema that covers the earlier values and this one
 */
export function inferSchema(schema: InferredSchema, value: unknown): InferredSchema {
    const t = inferType(value);

    if (t.name === "null") {
        return { type: "nullable", schema };
    }

    switch (schema.type) {
        case "nullable":
            return { type: "nullable", schema: inferSchema(schema.schema, value) };
        case "unknown":
            return fromValue(t);
        case "any":
            return { type: "any", schemas: new Set([...schema.schemas, inferSchema(UNKNOWN, value)]) };
        case "array":
            return t.name === "array"
                ? { type: "array", items: foldItems(schema.items, t.value) }
                : toAny(schema, value);
        case "object":
            return t.name === "object" ? mergeObject(schema.properties, t.value) : toAny(schema, value);
        case "boolean":
            return t.name === "bool" ? schema : toAny(schema, value);
        case "int":
        case "float":
            return mergeNumber(schema, t);
        case "string":
            return mergeString(schema, t);
        default:
            return toAny(schema, value);
    }
}
