/**
 * Zod schema introspection utilities for dynamically generating form fields.
 * This module parses Zod schemas to extract field types, defaults, and constraints.
 */
import type { z } from "zod";

/**
 * Zod's internal _def property types.
 * These are not exported by Zod but are needed for schema introspection.
 */
interface ZodInternalDef {
    typeName: string;
    innerType?: z.ZodTypeAny;
    options?: z.ZodTypeAny[];
    checks?: Array<{ kind: string; value?: number }>;
    values?: string[];
    defaultValue?: () => unknown;
    shape?: () => z.ZodRawShape;
}

/**
 * Helper to access Zod's internal _def property with proper typing.
 * @param schema - The Zod schema to extract the definition from
 * @returns The internal definition of the schema
 */
function getZodDef(schema: z.ZodTypeAny): ZodInternalDef {
    return schema._def as ZodInternalDef;
}

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
 * Get the Zod type name from a schema definition.
 * @param def - The Zod internal definition
 * @returns The type name string
 */
function getZodTypeName(def: ZodInternalDef): string {
    return def.typeName;
}

/**
 * Unwrap optional, nullable, and default wrappers to get the inner type.
 * @param schema - The Zod schema to unwrap
 * @returns The unwrapped schema with metadata about wrappers
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
        const def = getZodDef(current);
        const typeName = getZodTypeName(def);

        if (typeName === "ZodOptional" && def.innerType) {
            isOptional = true;
            current = def.innerType;
        } else if (typeName === "ZodNullable" && def.innerType) {
            isNullable = true;
            current = def.innerType;
        } else if (typeName === "ZodDefault" && def.innerType && def.defaultValue) {
            hasDefault = true;
            defaultValue = def.defaultValue();
            current = def.innerType;
        } else if (typeName === "ZodUnion" && def.options) {
            // Check for union with null (e.g., z.number().or(z.null()))
            const { options } = def;
            const nullOption = options.find((opt) => getZodTypeName(getZodDef(opt)) === "ZodNull");
            if (nullOption) {
                isNullable = true;
                // Find the non-null option
                const nonNullOption = options.find((opt) => getZodTypeName(getZodDef(opt)) !== "ZodNull");
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

    return { innerSchema: current, isOptional, isNullable, defaultValue, hasDefault };
}

/**
 * Extract constraints from a number schema.
 * @param schema - The Zod number schema to extract constraints from
 * @returns The min and max constraints if present
 */
function extractNumberConstraints(schema: z.ZodTypeAny): { min?: number; max?: number } {
    const def = getZodDef(schema);
    const result: { min?: number; max?: number } = {};

    if (!def.checks) {
        return result;
    }

    for (const check of def.checks) {
        if (check.kind === "min") {
            result.min = check.value;
        } else if (check.kind === "max") {
            result.max = check.value;
        }
    }

    return result;
}

/**
 * Parse a single field from a Zod schema.
 * @param schema - The Zod schema for the field
 * @returns The parsed field information
 */
function parseField(schema: z.ZodTypeAny): ParsedField {
    const { innerSchema, isOptional, isNullable, defaultValue, hasDefault } = unwrapType(schema);
    const innerDef = getZodDef(innerSchema);
    const typeName = getZodTypeName(innerDef);

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
            if (innerDef.checks?.some((c) => c.kind === "positive" || c.kind === "nonnegative")) {
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
            field.enumValues = innerDef.values;
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
 * @param schema - A Zod object schema to parse
 * @returns A record of field names to their parsed information
 */
export function parseZodSchema(schema: z.ZodObject<z.ZodRawShape>): ParsedSchema {
    const result: ParsedSchema = {};

    // Handle both strict and regular object schemas
    const def = getZodDef(schema);
    const shape = def.shape?.() ?? {};

    for (const [key, fieldSchema] of Object.entries(shape)) {
        result[key] = parseField(fieldSchema);
    }

    return result;
}

/**
 * Extract default values from a Zod object schema.
 * @param schema - A Zod object schema
 * @returns A record of field names to their default values (only for fields with defaults)
 */
export function getDefaultValues(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const def = getZodDef(schema);
    const shape = def.shape?.() ?? {};

    for (const [key, fieldSchema] of Object.entries(shape)) {
        const { defaultValue, hasDefault } = unwrapType(fieldSchema);
        if (hasDefault) {
            result[key] = defaultValue;
        }
    }

    return result;
}

/**
 * Convert a camelCase string to Title Case for form labels.
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
