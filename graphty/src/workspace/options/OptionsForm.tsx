import { ControlSubGroup, DataRow, StyleNumberInput } from "@graphty/compact-mantine";
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Checkbox, Select, Stack, TextInput, Tooltip } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { type Meaning, weightName, weightRead } from "../analyze/words";
import { GLYPHS } from "../glyphs";

/** What the app calls one option, and each of its choices. */
interface OptionLabel {
    readonly label: string;
    readonly choice: (value: string) => string;
    /** What a number option whose default is no value means while left empty ("Every node"). */
    readonly empty?: string;
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
    /**
     * The meaning of weight the algorithm reads (`descriptor.weightMeaning`): when set, its
     * `weight` option is drawn as the Weight line, listing the loaded weight first.
     */
    weightReads?: Meaning;
    /** The algorithm the form sets up: the element's plan for it says whether the loaded weight is read. */
    algorithm?: string;
    /** The Advanced fold's name, when two folds can be on screen at once (the right panel's and a popover's). */
    advancedLabel?: string;
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
interface FieldProps extends Omit<OptionsFormProps, "options" | "values" | "advanced" | "advancedLabel"> {
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

/** The Weight line's value for "the loaded weight": the option left absent. */
const LOADED = "\u0000loaded";

/**
 * The Weight line (tier2-design.md section 5): the loaded weight first, then None, then the
 * graph's other number edge columns, each with the meaning this run would read it as. Absent
 * reads the loaded weight, null none, a column name overrides it for this run. Whether the loaded
 * weight would be read is the element's rule: its plan for the run says. The box shows what the
 * run will read, so a loaded weight it would leave unread shows None, with the reason under the
 * box, and is listed as "not read" but cannot be chosen.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.value - The value set
 * @param props.label - The app's words for it
 * @param props.reads - The meaning the algorithm reads
 * @param props.algorithm - The algorithm, for the element's plan
 * @param props.onChange - Called with the new value
 * @returns The select
 */
function WeightField({
    session,
    value,
    label,
    reads,
    algorithm,
    onChange,
}: Readonly<{
    session: GraphSession;
    value: unknown;
    label: string;
    reads: WeightMeaningRead;
    algorithm: string | undefined;
    onChange: (v: unknown) => void;
}>): React.JSX.Element {
    const loaded = session.data.loadedWeight();
    // The plan is asked again when the loaded weight or its meaning changes.
    const loadedAttribute = loaded?.attribute;
    const loadedMeaning = loaded?.meaning;
    // Why the run would leave the loaded weight unread, or null when it would read it.
    const [unread, setUnread] = useState<string | null>(null);
    useEffect(() => {
        let live = true;
        if (algorithm === undefined || loadedAttribute === undefined) {
            setUnread(null);
            return undefined;
        }
        void session.plan({ op: "algo.run", algorithm, params: {} }).then(({ caveats }) => {
            if (live) {
                setUnread(caveats.weightSkipped === undefined ? null : weightRead(caveats).note);
            }
        });
        return () => {
            live = false;
        };
    }, [session, algorithm, loadedAttribute, loadedMeaning]);
    // A loaded weight the run would leave unread is listed, so the reader sees it is there, but
    // not offered: choosing it would run exactly as None does.
    const data: { value: string; label: string; disabled?: boolean }[] =
        loaded === null
            ? []
            : [
                  {
                      value: LOADED,
                      label: weightName(
                          loaded.attribute,
                          loaded.meaning,
                          unread === null ? "loaded" : "loaded, not read",
                      ),
                      ...(unread === null ? {} : { disabled: true }),
                  },
              ];
    data.push({ value: "", label: "None" });
    for (const column of session.data.attributes()) {
        if (
            column.kind === "edge" &&
            (column.type === "number" || column.type === "integer") &&
            column.name !== loaded?.attribute
        ) {
            data.push({ value: column.name, label: weightName(column.plainName, reads) });
        }
    }
    // The box shows what the run will read: the loaded weight when it is read, else None.
    let shown = typeof value === "string" ? value : "";
    if (value === undefined || (loaded !== null && value === loaded.attribute)) {
        shown = loaded === null || unread !== null ? "" : LOADED;
    }
    const unreadLoaded = unread !== null && (value === undefined || value === loaded?.attribute);
    return (
        <Select
            size="xs"
            label={label}
            value={shown}
            // "Not read -- weight's meaning is not set, and a path needs a distance.", under None.
            description={unreadLoaded ? unread : undefined}
            data={data}
            allowDeselect={false}
            comboboxProps={{ withinPortal: false }}
            onChange={(picked) => {
                if (picked === LOADED) {
                    onChange(undefined);
                } else {
                    onChange(picked === "" ? null : picked);
                }
            }}
        />
    );
}

/** A meaning an algorithm reads. */
type WeightMeaningRead = NonNullable<Meaning>;

/**
 * One option, drawn from the element's option descriptor.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.option - The option descriptor
 * @param props.value - The value set, or undefined for the default
 * @param props.onChange - Called with the option's name and new value
 * @param props.words - The app's words for an option
 * @param props.canUseSelectedNode - Whether a node option offers "Use selected node"
 * @param props.weightReads - The meaning of weight the algorithm reads, or null
 * @param props.algorithm - The algorithm the form sets up
 * @returns The control, or nothing for an option the form does not draw
 */
function OptionField({
    session,
    option,
    value,
    onChange,
    words,
    canUseSelectedNode = false,
    weightReads = null,
    algorithm,
}: Readonly<FieldProps>): React.JSX.Element | null {
    const { label, choice, empty } = words(option);
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
                    // The default is no change of the reader's: no reset to draw.
                    value={num(value) === num(option.default) ? undefined : num(value)}
                    defaultValue={num(option.default) ?? 0}
                    // A default of no value (a sample size left to every node) is an empty box
                    // that says what empty means, never a 0 the run would not use.
                    emptyText={option.default === null ? (empty ?? "Not set") : undefined}
                    min={num(option.min)}
                    max={num(option.max)}
                    step={option.step ?? (integer ? 1 : undefined)}
                    decimalScale={integer ? 0 : undefined}
                    // A reset sets the default itself, so a run reset to what it used is unchanged.
                    onChange={(v) => {
                        set(v === undefined && typeof option.default === "number" ? option.default : v);
                    }}
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
                    // A default of no value says what empty means, like a number's empty box.
                    placeholder={option.default === null ? (empty ?? "Not set") : undefined}
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
            if (weightReads !== null && option.name === "weight" && option.on === "edge") {
                return (
                    <WeightField
                        session={session}
                        value={value}
                        label={label}
                        reads={weightReads}
                        algorithm={algorithm}
                        onChange={set}
                    />
                );
            }
            return <AttributeField session={session} option={option} value={value} label={label} onChange={set} />;
        case "node-id": {
            const selected = session.selection.nodes.at(0);
            const offer = canUseSelectedNode && selected !== undefined && selected !== value;
            const id = typeof value === "string" || typeof value === "number" ? value : undefined;
            if (id === undefined && !offer) {
                return null;
            }
            const name = id === undefined ? "None" : (session.data.name(id) ?? String(id));
            // A node is a fact of the run, drawn as the same label and value row as the others.
            return (
                <DataRow
                    stat
                    name={label}
                    value={name}
                    trailing={
                        offer ? (
                            <Tooltip label="Use selected node">
                                <ActionIcon
                                    variant="subtle"
                                    aria-label={`Use selected node as ${label}`}
                                    onClick={() => {
                                        set(selected);
                                    }}
                                >
                                    <GLYPHS.pick size={14} />
                                </ActionIcon>
                            </Tooltip>
                        ) : undefined
                    }
                />
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
 * @param props.weightReads - The meaning of weight the algorithm reads, or null
 * @param props.algorithm - The algorithm the form sets up
 * @param props.advanced - More controls at the end of the Advanced fold
 * @param props.advancedLabel - The Advanced fold's name
 * @returns The fields
 */
export function OptionsForm({
    options,
    values,
    advanced: more,
    advancedLabel = "Advanced",
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
                <ControlSubGroup label={advancedLabel} opened={advancedOpen} onOpenChange={setAdvancedOpen}>
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
