/**
 * The options form: one control per option, drawn from graphty-element's option descriptors.
 *
 * A descriptor is plain JSON -- a name, a label, a control type, a default, a range, a list of
 * choices -- so this file needs no knowledge of how the element validates an option and no
 * dependency on the library it validates with. The element walks its own Zod schemas once and
 * publishes the result; the two used to be walked again here, against Zod's private internals,
 * with a branch for each Zod major because the element's Zod and this application's Zod were
 * different versions of the same library.
 */
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";
import { Checkbox, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { useCallback, useMemo } from "react";

import { optionDefaults } from "./optionDefaults";

/**
 * The option types this form has no control for.
 *
 * Each of these names part of a graph -- a node, a set of nodes, a grouping, an ordering, an
 * attribute -- or is an option the element could not classify at all. Drawing a text box for
 * one would invite a reader to type an identifier that nothing checks, so the caller that has
 * the graph draws these itself. They are skipped here rather than dropped from the descriptor
 * list, so a caller that does have the graph can still find them.
 */
const UNDRAWABLE_TYPES: readonly OptionDescriptor["type"][] = [
    "node-id",
    "node-set",
    "attribute",
    "partition",
    "ordering",
    "unknown",
];

/**
 * A bound the element resolved to a number. A bound that is still a reference to something
 * measured on the graph ("up to the largest core in this graph") is not a number and cannot
 * limit an input until `catalog.optionsFor` has resolved it against a loaded graph.
 * @param bound - The descriptor's min or max.
 * @returns The bound as a number, or undefined when it is not one.
 */
function numericBound(bound: OptionDescriptor["min"]): number | undefined {
    return typeof bound === "number" ? bound : undefined;
}

interface FieldRendererProps {
    option: OptionDescriptor;
    value: unknown;
    onChange: (value: unknown) => void;
}

/**
 * Draw one option's control.
 * @param root0 - Component props
 * @param root0.option - The option to draw.
 * @param root0.value - The value in force, which is the descriptor's default until the reader
 * changes it.
 * @param root0.onChange - Called with the new value.
 * @returns The control, or null when the option has no control here.
 */
function FieldRenderer({ option, value, onChange }: FieldRendererProps): React.JSX.Element | null {
    const label = option.plainName;
    const { description } = option;
    const labelStyles = {
        label: { color: "var(--mantine-color-gray-3)" },
        description: { color: "var(--mantine-color-gray-5)", fontSize: "0.75rem" },
    };

    switch (option.type) {
        case "number":
        case "integer":
        case "seed": {
            const min = numericBound(option.min);
            const max = numericBound(option.max);
            const numeric = value !== null && value !== undefined ? Number(value) : undefined;

            // A fractional option with no declared step steps by a hundredth, which is the
            // smallest move that reads as deliberate on a zero-to-one weight.
            const fractional = min !== undefined && min >= 0 && max !== undefined && max <= 1;
            const step = option.step ?? (option.type === "number" && fractional ? 0.01 : undefined);

            return (
                <NumberInput
                    label={label}
                    description={description}
                    value={numeric ?? ""}
                    onChange={(next) => {
                        onChange(next === "" ? null : next);
                    }}
                    min={min}
                    max={max}
                    step={step}
                    allowDecimal={option.type === "number"}
                    decimalScale={4}
                    styles={labelStyles}
                />
            );
        }

        case "boolean":
            return (
                <Checkbox
                    label={label}
                    description={description}
                    checked={value === true}
                    onChange={(event) => {
                        onChange(event.currentTarget.checked);
                    }}
                    styles={labelStyles}
                />
            );

        case "enum":
            return (
                <Select
                    label={label}
                    description={description}
                    value={typeof value === "string" ? value : null}
                    onChange={onChange}
                    data={(option.values ?? []).map((choice) => ({ value: choice.value, label: choice.label }))}
                    styles={labelStyles}
                />
            );

        case "string":
            return (
                <TextInput
                    label={label}
                    description={description}
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) => {
                        onChange(event.currentTarget.value);
                    }}
                    styles={labelStyles}
                />
            );

        default:
            return null;
    }
}

interface OptionsFormProps {
    /** The options to draw, as the element's catalogue publishes them. */
    options: readonly OptionDescriptor[];
    /** The values the reader has changed. Anything absent shows its default. */
    values: Record<string, unknown>;
    /** Called with every value, defaults included, whenever one changes. */
    onChange: (values: Record<string, unknown>) => void;
    /** Whether to draw the options the element marked advanced. */
    showAdvanced?: boolean;
    /** Options the caller draws itself, or drives from a control of its own. */
    hiddenFields?: readonly string[];
}

/**
 * Draw a form for a list of option descriptors.
 * @param root0 - Component props
 * @param root0.options - The options to draw.
 * @param root0.values - The values the reader has changed.
 * @param root0.onChange - Called with every value whenever one changes.
 * @param root0.showAdvanced - Whether to draw the advanced options.
 * @param root0.hiddenFields - Options the caller draws itself.
 * @returns The form, or a line saying there is nothing to configure.
 */
export function OptionsForm({
    options,
    values,
    onChange,
    showAdvanced = false,
    hiddenFields = [],
}: OptionsFormProps): React.JSX.Element {
    const defaults = useMemo(() => optionDefaults(options), [options]);

    const visible = useMemo(
        () =>
            options.filter((option) => {
                if (UNDRAWABLE_TYPES.includes(option.type) || option.internal === true) {
                    return false;
                }

                if (hiddenFields.includes(option.name)) {
                    return false;
                }

                return showAdvanced || option.advanced !== true;
            }),
        [options, showAdvanced, hiddenFields],
    );

    const handleFieldChange = useCallback(
        (name: string, next: unknown) => {
            onChange({ ...defaults, ...values, [name]: next });
        },
        [values, defaults, onChange],
    );

    if (visible.length === 0) {
        return (
            <Text size="sm" c="gray.5" fs="italic">
                No configurable options for this selection.
            </Text>
        );
    }

    return (
        <Stack gap="sm">
            {visible.map((option) => (
                <FieldRenderer
                    key={option.name}
                    option={option}
                    value={values[option.name] !== undefined ? values[option.name] : defaults[option.name]}
                    onChange={(next) => {
                        handleFieldChange(option.name, next);
                    }}
                />
            ))}
        </Stack>
    );
}
