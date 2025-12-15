/**
 * Zod schema introspection utilities for dynamically generating form fields.
 * This module parses Zod schemas to extract field types, defaults, and constraints.
 */
import type {z} from "zod";

export interface ParsedField {
    type: "number" | "boolean" | "enum" | "string" | "complex";
    default?: unknown;
    min?: number;
    max?: number;
    enumValues?: string[];
    isOptional: boolean;
    isNullable: boolean;
}

export type ParsedSchema = Record<string, ParsedField>;

/**
 * Get the Zod type name from a schema definition
 */
function getZodTypeName(def: unknown): string {
    if (def && typeof def === "object" && "typeName" in def) {
        return def.typeName as string;
    }

    return "";
}

/**
 * Unwrap optional, nullable, and default wrappers to get the inner type
 */
function unwrapType(schema: z.ZodTypeAny): {
    innerSchema: z.ZodTypeAny;
    isOptional: boolean;
    isNullable: boolean;
    defaultValue: unknown;
    hasDefault: boolean;
} {
    let isOptional = false;
    let isNullable = false;
    let defaultValue: unknown = undefined;
    let hasDefault = false;
    let current = schema;

    // Keep unwrapping until we get to the base type
    let maxIterations = 10; // Prevent infinite loops
    while (maxIterations-- > 0) {
        const typeName = getZodTypeName(current._def);

        if (typeName === "ZodOptional") {
            isOptional = true;
            current = current._def.innerType;
        } else if (typeName === "ZodNullable") {
            isNullable = true;
            current = current._def.innerType;
        } else if (typeName === "ZodDefault") {
            hasDefault = true;
            defaultValue = current._def.defaultValue();
            current = current._def.innerType;
        } else if (typeName === "ZodUnion") {
            // Check for union with null (e.g., z.number().or(z.null()))
            const options = current._def.options as z.ZodTypeAny[];
            const nullOption = options.find((opt) => getZodTypeName(opt._def) === "ZodNull");
            if (nullOption) {
                isNullable = true;
                // Find the non-null option
                const nonNullOption = options.find((opt) => getZodTypeName(opt._def) !== "ZodNull");
                if (nonNullOption) {
                    current = nonNullOption;
                } else {
                    break;
                }
            } else {
                break;
            }
        } else {
            break;
        }
    }

    return {innerSchema: current, isOptional, isNullable, defaultValue, hasDefault};
}

/**
 * Extract constraints from a number schema
 */
function extractNumberConstraints(schema: z.ZodTypeAny): {min?: number, max?: number} {
    const checks = schema._def.checks as {kind: string, value?: number}[] | undefined;
    const result: {min?: number, max?: number} = {};

    if (!checks) {
        return result;
    }

    for (const check of checks) {
        if (check.kind === "min") {
            result.min = check.value;
        } else if (check.kind === "max") {
            result.max = check.value;
        }
    }

    return result;
}

/**
 * Parse a single field from a Zod schema
 */
function parseField(schema: z.ZodTypeAny): ParsedField {
    const {innerSchema, isOptional, isNullable, defaultValue, hasDefault} = unwrapType(schema);
    const typeName = getZodTypeName(innerSchema._def);

    const field: ParsedField = {
        type: "complex",
        isOptional,
        isNullable,
    };

    if (hasDefault) {
        field.default = defaultValue;
    }

    switch (typeName) {
        case "ZodNumber": {
            field.type = "number";
            const constraints = extractNumberConstraints(innerSchema);
            if (constraints.min !== undefined) {
                field.min = constraints.min;
            }

            if (constraints.max !== undefined) {
                field.max = constraints.max;
            }

            // Check for .positive() which sets min to 0
            const checks = innerSchema._def.checks as {kind: string}[] | undefined;
            if (checks?.some((c) => c.kind === "positive" || c.kind === "nonnegative")) {
                field.min = 0;
            }

            break;
        }
        case "ZodBoolean":
            field.type = "boolean";
            break;
        case "ZodString":
            field.type = "string";
            break;
        case "ZodEnum": {
            field.type = "enum";
            field.enumValues = innerSchema._def.values as string[];
            break;
        }
        case "ZodArray":
        case "ZodRecord":
        case "ZodObject":
            field.type = "complex";
            break;
        default:
            field.type = "complex";
    }

    return field;
}

/**
 * Parse a Zod object schema to extract field information for form generation.
 *
 * @param schema - A Zod object schema to parse
 * @returns A record of field names to their parsed information
 */
export function parseZodSchema(schema: z.ZodObject<z.ZodRawShape>): ParsedSchema {
    const result: ParsedSchema = {};

    // Handle both strict and regular object schemas
    const shape = schema._def.shape();

    for (const [key, fieldSchema] of Object.entries(shape)) {
        result[key] = parseField(fieldSchema);
    }

    return result;
}

/**
 * Extract default values from a Zod object schema.
 *
 * @param schema - A Zod object schema
 * @returns A record of field names to their default values (only for fields with defaults)
 */
export function getDefaultValues(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const shape = schema._def.shape();

    for (const [key, fieldSchema] of Object.entries(shape)) {
        const {defaultValue, hasDefault} = unwrapType(fieldSchema);
        if (hasDefault) {
            result[key] = defaultValue;
        }
    }

    return result;
}

/**
 * Convert a camelCase string to Title Case for form labels.
 *
 * @param str - A camelCase string
 * @returns The string converted to Title Case with spaces
 */
export function camelToTitle(str: string): string {
    // Handle consecutive capitals (like "BFS" in "enableBFS")
    const result = str
        // Insert space before capitals that follow lowercase letters
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        // Insert space before a sequence of capitals followed by lowercase (e.g., "BFSTree" -> "BFS Tree")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

    // Capitalize first letter
    return result.charAt(0).toUpperCase() + result.slice(1);
}
