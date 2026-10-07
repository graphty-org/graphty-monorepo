import { ControlSubGroup, StyleNumberInput } from "@graphty/compact-mantine";
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Button, Checkbox, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import React, { useState } from "react";

/** What the app calls one option, and each of its choices. */
interface OptionLabel {
    readonly label: string;
    readonly choice: (value: string) => string;
}

/** Props for OptionsForm. */
interface OptionsFormProps {
    session: GraphSession;
    /** The element's option descriptors, in catalog order. */
    options: readonly OptionDescriptor[];
    /** The values set; an option missing here shows its default. */
    values: Readonly<Record<string, unknown>>;
    /** Called with an option's name and its new value. */
    onChange: (name: string, value: unknown) => void;
    /** The app's words for an option. */
    words: (option: OptionDescriptor) => OptionLabel;
    /** Whether a node option offers "Use selected node" (off where the selection fills it). */
    canUseSelectedNode?: boolean;
    /** More controls at the end of the Advanced fold (a layout's Seed and Reshuffle). */
    advanced?: React.ReactNode;
}

/** The option types the form draws a control for; the rest keep their defaults. */
const DRAWN = new Set<OptionDescriptor["type"]>([
    "number",
    "integer",
    "enum",
    "boolean",
    "string",
    "attribute",
    "partition",
    "node-id",
]);

/**
 * A value if it is a number.
 * @param value - the value.
 * @returns the number, or undefined.
 */
function num(value: unknown): number | undefined {
    return typeof value === "number" ? value : undefined;
}

/** Props for one field. */
interface FieldProps extends Omit<OptionsFormProps, "options" | "values" | "advanced"> {
    option: OptionDescriptor;
    value: unknown;
}

/**
 * An attribute or partition option as a choice among the attributes the graph carries on the
 * option's side (nodes unless it says edges). A partition the element has resolved lists the
 * element's choices (its groupable columns, a run's community among them); otherwise it lists
 * attributes that are not plain numbers. An attribute option with no default can be left at None (null).
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.option - The option descriptor
 * @param props.value - The value set
 * @param props.label - The app's words for it
 * @param props.onChange - Called with the new value
 * @returns The select
 */
function AttributeField({
    session,
    option,
    value,
    label,
    onChange,
}: Readonly<
    Pick<FieldProps, "session" | "option" | "value"> & { label: string; onChange: (v: unknown) => void }
>): React.JSX.Element {
    const on = option.on ?? "node";
    const data =
        option.type === "partition" && option.values !== undefined
            ? option.values.map((choice) => ({ value: choice.value, label: choice.label }))
            : session.data
                  .attributes()
                  .filter((a) => a.kind === on && (option.type !== "partition" || a.type !== "number"))
                  .map((a) => ({ value: a.name, label: a.plainName }));
    const optional =
        option.type === "attribute" &&
        (option.default === undefined || option.default === null || option.default === "");
    if (optional) {
        data.unshift({ value: "", label: "None" });
    }
    const fallback = typeof option.default === "string" && option.default !== "" ? option.default : null;
    const none = optional ? "" : null;
    return (
        <Select
            size="xs"
            label={label}
            value={typeof value === "string" && value !== "" ? value : (fallback ?? none)}
            data={data}
            allowDeselect={false}
            // The list stays inside a popover, so picking from it is not an outside click.
            comboboxProps={{ withinPortal: false }}
            onChange={(picked) => {
                // None is the element's own "unweighted" default.
                onChange(picked === "" ? null : picked);
            }}
        />
    );
}

/**
 * One option, drawn from the element's option descriptor.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.option - The option descriptor
 * @param props.value - The value set, or undefined for the default
 * @param props.onChange - Called with the option's name and new value
 * @param props.words - The app's words for an option
 * @param props.canUseSelectedNode - Whether a node option offers "Use selected node"
 * @returns The control, or nothing for an option the form does not draw
 */
function OptionField({
    session,
    option,
    value,
    onChange,
    words,
    canUseSelectedNode = false,
}: Readonly<FieldProps>): React.JSX.Element | null {
    const { label, choice } = words(option);
    const set = (v: unknown): void => {
        onChange(option.name, v);
    };
    switch (option.type) {
        case "number":
        case "integer": {
            const integer = option.type === "integer";
            return (
                <StyleNumberInput
                    label={label}
                    value={num(value)}
                    defaultValue={num(option.default) ?? 0}
                    min={num(option.min)}
                    max={num(option.max)}
                    step={option.step ?? (integer ? 1 : undefined)}
                    decimalScale={integer ? 0 : undefined}
                    onChange={set}
                />
            );
        }
        case "enum": {
            const fallback = typeof option.default === "string" ? option.default : null;
            return (
                <Select
                    size="xs"
                    label={label}
                    value={typeof value === "string" ? value : fallback}
                    data={(option.values ?? []).map(({ value: v }) => ({ value: v, label: choice(v) }))}
                    allowDeselect={false}
                    comboboxProps={{ withinPortal: false }}
                    onChange={set}
                />
            );
        }
        case "boolean":
            return (
                <Checkbox
                    size="xs"
                    label={label}
                    checked={typeof value === "boolean" ? value : option.default === true}
                    onChange={(event) => {
                        set(event.currentTarget.checked);
                    }}
                />
            );
        case "string": {
            return (
                <TextInput
                    size="xs"
                    label={label}
                    value={typeof value === "string" ? value : ""}
                    // The default shows until the reader types; a field refilled on clear could not be retyped.
                    placeholder={typeof option.default === "string" ? option.default : undefined}
                    onChange={(event) => {
                        // Cleared is unset: the element's own default applies.
                        const text = event.currentTarget.value;
                        set(text === "" ? undefined : text);
                    }}
                />
            );
        }
        case "attribute":
        case "partition":
            return <AttributeField session={session} option={option} value={value} label={label} onChange={set} />;
        case "node-id": {
            const selected = session.selection.nodes.at(0);
            const offer = canUseSelectedNode && selected !== undefined && selected !== value;
            const id = typeof value === "string" || typeof value === "number" ? value : undefined;
            if (id === undefined && !offer) {
                return null;
            }
            const name = id === undefined ? "None" : (session.data.name(id) ?? String(id));
            return (
                <Group justify="space-between" wrap="nowrap" gap={8}>
                    <Text size="xs" truncate>{`${label}: ${name}`}</Text>
                    {offer ? (
                        <Button
                            size="compact-xs"
                            variant="default"
                            onClick={() => {
                                set(selected);
                            }}
                        >
                            Use selected node
                        </Button>
                    ) : null}
                </Group>
            );
        }
        default:
            return null;
    }
}

/**
 * The options form shared by every method editor (an algorithm's short form, a run's Made with,
 * a layout's form): the key options first, then the advanced ones behind an "Advanced" fold that
 * starts closed and draws nothing while closed. Internal options are never drawn.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.options - The element's option descriptors
 * @param props.values - The values set
 * @param props.onChange - Called with an option's name and its new value
 * @param props.words - The app's words for an option
 * @param props.canUseSelectedNode - Whether a node option offers "Use selected node"
 * @param props.advanced - More controls at the end of the Advanced fold
 * @returns The fields
 */
export function OptionsForm({
    options,
    values,
    advanced: more,
    ...rest
}: Readonly<OptionsFormProps>): React.JSX.Element {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const drawn = options.filter((o) => o.internal !== true && DRAWN.has(o.type));
    const field = (option: OptionDescriptor): React.JSX.Element => (
        <OptionField key={option.name} option={option} value={values[option.name]} {...rest} />
    );
    const advanced = drawn.filter((o) => o.advanced === true);
    return (
        <>
            {drawn.filter((o) => o.advanced !== true).map(field)}
            {advanced.length > 0 || more !== undefined ? (
                <ControlSubGroup label="Advanced" opened={advancedOpen} onOpenChange={setAdvancedOpen}>
                    {advancedOpen ? (
                        <Stack gap={8}>
                            {advanced.map(field)}
                            {more}
                        </Stack>
                    ) : null}
                </ControlSubGroup>
            ) : null}
        </>
    );
}
