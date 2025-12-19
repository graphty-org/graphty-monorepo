/**
 * Dynamic form generator component that creates form fields based on Zod schemas.
 * Used by RunLayoutsModal to display layout-specific configuration options.
 */
import {Checkbox, NumberInput, Select, Stack} from "@mantine/core";
import {useCallback, useMemo} from "react";
import type {z} from "zod";

import {camelToTitle, getDefaultValues, type ParsedField, parseZodSchema} from "../../utils/zodSchemaParser";

export interface LayoutOptionsFormProps {
    /** The Zod schema defining the form structure */
    schema: z.ZodObject<z.ZodRawShape>;
    /** Current form values */
    values: Record<string, unknown>;
    /** Callback when form values change */
    onChange: (values: Record<string, unknown>) => void;
    /** Fields to hide from the form */
    hiddenFields?: string[];
}

interface FieldRendererProps {
    fieldName: string;
    field: ParsedField;
    value: unknown;
    defaultValue: unknown;
    onChange: (value: unknown) => void;
}

/**
 * Renders a single form field based on its parsed type
 */
function FieldRenderer({fieldName, field, value, defaultValue, onChange}: FieldRendererProps): React.JSX.Element | null {
    const label = camelToTitle(fieldName);

    // Determine the effective value (use provided value, fall back to default)
    const effectiveValue = value !== undefined ? value : defaultValue;

    switch (field.type) {
        case "number": {
            const numValue = effectiveValue !== null && effectiveValue !== undefined ?
                Number(effectiveValue) :
                undefined;

            return (
                <NumberInput
                    label={label}
                    value={numValue ?? ""}
                    onChange={(val) => {
                        onChange(val === "" ? null : val);
                    }}
                    min={field.min}
                    max={field.max}
                    step={field.min !== undefined && field.min >= 0 && field.max !== undefined && field.max <= 1 ? 0.01 : undefined}
                    decimalScale={4}
                    styles={{
                        label: {color: "var(--mantine-color-gray-3)"},
                    }}
                />
            );
        }

        case "boolean": {
            const boolValue = effectiveValue === true;

            return (
                <Checkbox
                    label={label}
                    checked={boolValue}
                    onChange={(event) => {
                        onChange(event.currentTarget.checked);
                    }}
                    styles={{
                        label: {color: "var(--mantine-color-gray-3)"},
                    }}
                />
            );
        }

        case "enum": {
            const enumOptions = field.enumValues?.map((val) => ({
                value: val,
                label: camelToTitle(val),
            })) ?? [];

            return (
                <Select
                    label={label}
                    value={effectiveValue as string | null}
                    onChange={(val) => {
                        onChange(val);
                    }}
                    data={enumOptions}
                    styles={{
                        label: {color: "var(--mantine-color-gray-3)"},
                    }}
                />
            );
        }

        case "string": {
            // String fields are rare in layout configs, but we could handle them
            // For now, skip them as most are complex paths or internal identifiers
            return null;
        }

        case "complex":
        default:
            // Skip complex types (arrays, records, objects)
            return null;
    }
}

export function LayoutOptionsForm({
    schema,
    values,
    onChange,
    hiddenFields = [],
}: LayoutOptionsFormProps): React.JSX.Element {
    // Parse the schema to get field information
    const parsedFields = useMemo(() => parseZodSchema(schema), [schema]);

    // Get default values from the schema
    const defaultValues = useMemo(() => getDefaultValues(schema), [schema]);

    // Filter out hidden fields and complex types
    const visibleFields = useMemo(() => {
        return Object.entries(parsedFields).filter(([fieldName, field]) => {
            // Hide fields in the hidden list
            if (hiddenFields.includes(fieldName)) {
                return false;
            }

            // Hide complex types (arrays, records, objects)
            if (field.type === "complex") {
                return false;
            }

            // Hide string types (usually paths or internal identifiers)
            if (field.type === "string") {
                return false;
            }

            return true;
        });
    }, [parsedFields, hiddenFields]);

    // Handle field value changes
    const handleFieldChange = useCallback((fieldName: string, newValue: unknown) => {
        const updatedValues = {
            ... defaultValues,
            ... values,
            [fieldName]: newValue,
        };
        onChange(updatedValues);
    }, [values, defaultValues, onChange]);

    return (
        <Stack gap="sm">
            {visibleFields.map(([fieldName, field]) => (
                <FieldRenderer
                    key={fieldName}
                    fieldName={fieldName}
                    field={field}
                    value={values[fieldName]}
                    defaultValue={defaultValues[fieldName]}
                    onChange={(newValue) => {
                        handleFieldChange(fieldName, newValue);
                    }}
                />
            ))}
        </Stack>
    );
}
