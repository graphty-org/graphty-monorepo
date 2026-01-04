/**
 * Shared options form component that renders form controls for any OptionsSchema.
 * Used by both RunLayoutsModal and RunAlgorithmModal.
 *
 * Uses graphty-element's unified schema system with rich metadata.
 */
import { Checkbox, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { useCallback, useMemo } from "react";
import type { z } from "zod/v4";

/**
 * UI metadata for an option (from graphty-element OptionsSchema)
 */
export interface OptionMeta {
    /** Human-readable label for UI display */
    label: string;
    /** Detailed description/help text */
    description: string;
    /** Hide in basic UI mode (show only in advanced settings) */
    advanced?: boolean;
    /** Group related options together in UI */
    group?: string;
    /** Suggested step increment for numeric sliders */
    step?: number;
}

/**
 * A single option definition: Zod schema + UI metadata
 */
export interface OptionDefinition<T extends z.ZodType = z.ZodType> {
    /** Zod schema for validation and type inference */
    schema: T;
    /** UI metadata for display and organization */
    meta: OptionMeta;
}

/**
 * Complete options schema: map of option names to definitions
 */
export type OptionsSchema = Record<string, OptionDefinition>;

// ============================================================================
// Local implementations of graphty-element utilities
// ============================================================================

/**
 * Get default values from an options schema.
 * Extracts the default value from each Zod schema definition.
 * @param optionsSchema - The options schema to extract defaults from
 * @returns Record of option names to their default values
 */
function getDefaults(optionsSchema: OptionsSchema): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, optionDef] of Object.entries(optionsSchema)) {
        const defaultValue = extractDefaultValue(optionDef.schema);
        if (defaultValue !== undefined) {
            result[key] = defaultValue;
        }
    }

    return result;
}

/**
 * Get def object from a zod schema (handles both v3 and v4)
 * @param schema - The Zod schema to get def from
 * @returns The def object or null if not found
 */
function getZodDef(schema: unknown): Record<string, unknown> | null {
    if (!schema || typeof schema !== "object") {
        return null;
    }

    // zod v4 uses `def`
    if ("def" in schema) {
        return (schema as { def: Record<string, unknown> }).def;
    }

    // zod v3 uses `_def`
    if ("_def" in schema) {
        return (schema as { _def: Record<string, unknown> })._def;
    }

    return null;
}

/**
 * Get type name from a zod schema (handles both v3 and v4)
 * Normalizes to v3 format (e.g., "ZodNumber") for switch compatibility
 * @param schema - The Zod schema to get type name from
 * @returns The normalized type name (e.g., "ZodNumber")
 */
function getZodTypeName(schema: unknown): string {
    const def = getZodDef(schema);
    if (!def) {
        return "";
    }

    // zod v4: type is in def.type (lowercase)
    if (typeof def.type === "string") {
        // Normalize to v3 format for consistency
        const v4Type = def.type;
        const normalized = v4Type.charAt(0).toUpperCase() + v4Type.slice(1);

        return `Zod${normalized}`;
    }

    // zod v3: typeName is in _def.typeName
    if (typeof def.typeName === "string") {
        return def.typeName;
    }

    return "";
}

/**
 * Extract default value from a Zod schema by unwrapping wrappers
 * @param zodSchema - The Zod schema to extract default from
 * @returns The default value or undefined if none
 */
function extractDefaultValue(zodSchema: unknown): unknown {
    if (!zodSchema || typeof zodSchema !== "object") {
        return undefined;
    }

    // Use unknown to avoid TypeScript narrowing issues in the loop
    let current: unknown = zodSchema;
    let maxIterations = 10;

    while (maxIterations-- > 0) {
        if (!current || typeof current !== "object") {
            break;
        }

        const def = getZodDef(current);
        if (!def) {
            break;
        }

        const typeName = getZodTypeName(current);

        if (typeName === "ZodDefault") {
            const { defaultValue } = def;

            // v4: defaultValue is stored directly
            // v3: defaultValue is a function that returns the value
            if (typeof defaultValue === "function") {
                return defaultValue();
            }

            return defaultValue;
        } else if (typeName === "ZodOptional" || typeName === "ZodNullable") {
            current = def.innerType;
        } else {
            break;
        }
    }

    return undefined;
}

/**
 * Get all option metadata from a schema (for UI generation)
 * @param optionsSchema - The options schema to extract metadata from
 * @returns Map of option names to their metadata
 */
function getOptionsMeta(optionsSchema: OptionsSchema): Map<string, OptionMeta> {
    const result = new Map<string, OptionMeta>();

    for (const [key, optionDef] of Object.entries(optionsSchema)) {
        result.set(key, optionDef.meta);
    }

    return result;
}

/**
 * Get options filtered by advanced flag.
 * @param optionsSchema - The options schema to filter
 * @param advanced - If true, return only advanced options. If false, return only basic options.
 * @returns Filtered options schema
 */
function getOptionsFiltered(optionsSchema: OptionsSchema, advanced: boolean): OptionsSchema {
    const result: OptionsSchema = {};

    for (const [key, optionDef] of Object.entries(optionsSchema)) {
        const isAdvanced = optionDef.meta.advanced === true;

        // If we want advanced options, include only advanced ones
        // If we want basic options, include only non-advanced ones
        if (advanced === isAdvanced) {
            result[key] = optionDef;
        }
    }

    return result;
}

// ============================================================================
// Component Props
// ============================================================================

export interface OptionsFormProps {
    /** The options schema from graphty-element */
    schema: OptionsSchema;
    /** Current option values */
    values: Record<string, unknown>;
    /** Callback when values change */
    onChange: (values: Record<string, unknown>) => void;
    /** Whether to show advanced options (default: false) */
    showAdvanced?: boolean;
    /** Optional filter for which options to show */
    filter?: (key: string, meta: OptionMeta) => boolean;
}

/**
 * Detected field type from Zod schema introspection
 */
type FieldType = "number" | "boolean" | "enum" | "string" | "complex";

interface ParsedField {
    type: FieldType;
    min?: number;
    max?: number;
    enumValues?: string[];
}

/**
 * Unwrap Zod wrappers (optional, nullable, default) to get the inner type
 * Works with zod v4 structure
 * @param schema - The Zod schema to unwrap
 * @returns The unwrapped inner schema
 */
function unwrapZodType(schema: unknown): unknown {
    if (!schema || typeof schema !== "object") {
        return schema;
    }

    const typeName = getZodTypeName(schema);
    const def = getZodDef(schema);

    if (!def) {
        return schema;
    }

    // Unwrap wrapper types recursively (normalized to ZodXxx format)
    if (["ZodOptional", "ZodNullable", "ZodDefault"].includes(typeName)) {
        const { innerType } = def;
        if (innerType) {
            return unwrapZodType(innerType);
        }
    }

    // Handle union with null (z.number().or(z.null()))
    if (typeName === "ZodUnion") {
        const { options } = def;
        if (Array.isArray(options)) {
            const nonNullOption = options.find((opt) => {
                const optType = getZodTypeName(opt);

                return optType !== "ZodNull";
            });
            if (nonNullOption) {
                return unwrapZodType(nonNullOption);
            }
        }
    }

    return schema;
}

/**
 * Extract number constraints from a Zod number schema
 * Works with both v3 (checks array) and v4 (minValue/maxValue)
 * @param schema - The Zod number schema
 * @returns Object with min and max constraints
 */
function extractNumberConstraints(schema: unknown): { min?: number; max?: number } {
    const def = getZodDef(schema);
    if (!def) {
        return {};
    }

    const result: { min?: number; max?: number } = {};

    // zod v4: constraints are directly on def (minValue, maxValue)
    if (typeof def.minValue === "number") {
        result.min = def.minValue;
    }

    if (typeof def.maxValue === "number") {
        result.max = def.maxValue;
    }

    // zod v3: constraints are in checks array
    const checks = def.checks as { kind: string; value?: number }[] | undefined;
    if (Array.isArray(checks)) {
        for (const check of checks) {
            if (check.kind === "min") {
                result.min = check.value;
            } else if (check.kind === "max") {
                result.max = check.value;
            } else if (check.kind === "positive" || check.kind === "nonnegative") {
                result.min = 0;
            }
        }
    }

    return result;
}

/**
 * Parse a Zod schema to determine its field type and constraints
 * @param zodSchema - The Zod schema to parse
 * @returns Parsed field information including type and constraints
 */
function parseZodSchema(zodSchema: unknown): ParsedField {
    const innerSchema = unwrapZodType(zodSchema);
    const def = getZodDef(innerSchema);

    if (!def) {
        return { type: "complex" };
    }

    const typeName = getZodTypeName(innerSchema);

    switch (typeName) {
        case "ZodNumber": {
            const constraints = extractNumberConstraints(innerSchema);

            return {
                type: "number",
                min: constraints.min,
                max: constraints.max,
            };
        }
        case "ZodBoolean":
            return { type: "boolean" };
        case "ZodString":
            return { type: "string" };
        case "ZodEnum": {
            // v4 stores values in def.entries (object), v3 in def.values (array)
            let values: string[] = [];
            if (def.entries && typeof def.entries === "object") {
                // v4: entries is an object like {fast: "fast", accurate: "accurate"}
                values = Object.keys(def.entries);
            } else if (Array.isArray(def.values)) {
                // v3: values is an array
                values = def.values as string[];
            }

            return {
                type: "enum",
                enumValues: values,
            };
        }
        default:
            return { type: "complex" };
    }
}

interface FieldRendererProps {
    fieldKey: string;
    meta: OptionMeta;
    parsedField: ParsedField;
    value: unknown;
    defaultValue: unknown;
    onChange: (value: unknown) => void;
}

/**
 * Renders a single form field based on its type and metadata
 * @param root0 - Component props
 * @param root0.fieldKey - The field key/name
 * @param root0.meta - Field metadata for UI display
 * @param root0.parsedField - Parsed field type and constraints
 * @param root0.value - Current field value
 * @param root0.defaultValue - Default value from schema
 * @param root0.onChange - Callback when value changes
 * @returns The rendered form field or null for complex types
 */
function FieldRenderer({
    fieldKey,
    meta,
    parsedField,
    value,
    defaultValue,
    onChange,
}: FieldRendererProps): React.JSX.Element | null {
    // Use explicit label from metadata
    const { label } = meta;
    const { description } = meta;

    // Determine effective value (use provided, fall back to default)
    const effectiveValue = value !== undefined ? value : defaultValue;

    switch (parsedField.type) {
        case "number": {
            const numValue = effectiveValue !== null && effectiveValue !== undefined ? Number(effectiveValue) : undefined;

            // Use step from metadata, or derive from constraints
            const step =
                meta.step ??
                (parsedField.min !== undefined && parsedField.min >= 0 && parsedField.max !== undefined && parsedField.max <= 1
                    ? 0.01
                    : undefined);

            return (
                <NumberInput
                    key={fieldKey}
                    label={label}
                    description={description}
                    value={numValue ?? ""}
                    onChange={(val) => {
                        onChange(val === "" ? null : val);
                    }}
                    min={parsedField.min}
                    max={parsedField.max}
                    step={step}
                    decimalScale={4}
                    styles={{
                        label: { color: "var(--mantine-color-gray-3)" },
                        description: { color: "var(--mantine-color-gray-5)", fontSize: "0.75rem" },
                    }}
                />
            );
        }

        case "boolean": {
            const boolValue = effectiveValue === true;

            return (
                <Checkbox
                    key={fieldKey}
                    label={label}
                    description={description}
                    checked={boolValue}
                    onChange={(event) => {
                        onChange(event.currentTarget.checked);
                    }}
                    styles={{
                        label: { color: "var(--mantine-color-gray-3)" },
                        description: { color: "var(--mantine-color-gray-5)", fontSize: "0.75rem" },
                    }}
                />
            );
        }

        case "enum": {
            const enumOptions =
                parsedField.enumValues?.map((val) => ({
                    value: val,
                    label: val,
                })) ?? [];

            return (
                <Select
                    key={fieldKey}
                    label={label}
                    description={description}
                    value={effectiveValue as string | null}
                    onChange={(val) => {
                        onChange(val);
                    }}
                    data={enumOptions}
                    styles={{
                        label: { color: "var(--mantine-color-gray-3)" },
                        description: { color: "var(--mantine-color-gray-5)", fontSize: "0.75rem" },
                    }}
                />
            );
        }

        case "string": {
            return (
                <TextInput
                    key={fieldKey}
                    label={label}
                    description={description}
                    value={typeof effectiveValue === "string" ? effectiveValue : ""}
                    onChange={(event) => {
                        onChange(event.currentTarget.value);
                    }}
                    styles={{
                        label: { color: "var(--mantine-color-gray-3)" },
                        description: { color: "var(--mantine-color-gray-5)", fontSize: "0.75rem" },
                    }}
                />
            );
        }

        case "complex":
        default:
            // Skip complex types
            return null;
    }
}

/**
 * Renders a dynamic form based on a Zod options schema.
 * Automatically generates form controls for each option based on its type.
 * @param root0 - Component props
 * @param root0.schema - The options schema defining available options
 * @param root0.values - Current option values
 * @param root0.onChange - Callback when option values change
 * @param root0.showAdvanced - Whether to show advanced options
 * @param root0.filter - Optional filter function for options
 * @returns The rendered options form
 */
export function OptionsForm({ schema, values, onChange, showAdvanced = false, filter }: OptionsFormProps): React.JSX.Element {
    // Get default values from schema
    const defaults = useMemo(() => getDefaults(schema), [schema]);

    // Get metadata for all options
    const allMeta = useMemo(() => getOptionsMeta(schema), [schema]);

    // Filter options based on advanced flag
    const filteredSchema = useMemo(() => {
        // First filter by advanced flag
        let result = schema;

        // If not showing advanced, filter to only non-advanced options
        if (!showAdvanced) {
            result = getOptionsFiltered(schema, false);
        }

        return result;
    }, [schema, showAdvanced]);

    // Parse each field's Zod schema for type detection
    const parsedFields = useMemo(() => {
        const result: Record<string, ParsedField> = {};

        for (const [key, optionDef] of Object.entries(filteredSchema)) {
            result[key] = parseZodSchema(optionDef.schema);
        }

        return result;
    }, [filteredSchema]);

    // Get visible fields (apply custom filter and exclude complex types)
    const visibleFields = useMemo(() => {
        return Object.entries(filteredSchema).filter(([key]) => {
            const parsedField = parsedFields[key];
            const meta = allMeta.get(key);

            // Skip complex types (parsedField exists since we populated parsedFields from filteredSchema)
            if (parsedField.type === "complex") {
                return false;
            }

            // Apply custom filter if provided
            if (filter && meta) {
                return filter(key, meta);
            }

            return true;
        });
    }, [filteredSchema, parsedFields, allMeta, filter]);

    // Handle field value changes
    const handleFieldChange = useCallback(
        (fieldKey: string, newValue: unknown) => {
            const updatedValues = {
                ...defaults,
                ...values,
                [fieldKey]: newValue,
            };
            onChange(updatedValues);
        },
        [values, defaults, onChange],
    );

    if (visibleFields.length === 0) {
        return (
            <Text size="sm" c="gray.5" fs="italic">
                No configurable options for this selection.
            </Text>
        );
    }

    return (
        <Stack gap="sm">
            {visibleFields.map(([fieldKey]) => {
                const meta = allMeta.get(fieldKey);
                const parsedField = parsedFields[fieldKey];

                if (!meta) {
                    return null;
                }

                return (
                    <FieldRenderer
                        key={fieldKey}
                        fieldKey={fieldKey}
                        meta={meta}
                        parsedField={parsedField}
                        value={values[fieldKey]}
                        defaultValue={defaults[fieldKey]}
                        onChange={(newValue) => {
                            handleFieldChange(fieldKey, newValue);
                        }}
                    />
                );
            })}
        </Stack>
    );
}
