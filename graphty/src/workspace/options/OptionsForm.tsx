import {
    AdvancedButton,
    DataRow,
    FieldRow,
    PanelField,
    PanelLabelsProvider,
    Popout,
    PopoutManager,
    ResetButton,
} from "@graphty/compact-mantine";
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Checkbox,
    Group,
    type MantineSpacing,
    Select,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";
import React, { useEffect, useState } from "react";

import { type Meaning, weightName, weightRead } from "../analyze/words";
import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";

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
    /** More controls at the end of the Advanced pop-out (a layout's Seed and Reshuffle). */
    advanced?: React.ReactNode;
    /**
     * The meaning of weight the algorithm reads (`descriptor.weightMeaning`): when set, its
     * `weight` option is drawn as the Weight line, listing the loaded weight first.
     */
    weightReads?: Meaning;
    /** The algorithm the form sets up: the element's plan for it says whether the loaded weight is read. */
    algorithm?: string;
    /** The Advanced pop-out's name, when two folds can be on screen at once (the right panel's and a popover's). */
    advancedLabel?: string;
    /**
     * Insets the fields (and the Advanced pop-out's fields) from the section's content edge, while
     * the fold's own toggle stays on that edge, so its chevron hangs in the section's gutter in
     * line with the section chevrons.
     */
    fieldInset?: MantineSpacing;
    /** A short line under an option's field (a warning about what it read), or null for none. */
    note?: (option: OptionDescriptor) => string | null;
    /** Why an option cannot be changed in this view, or null when it can; a disabled field says why. */
    disabledReason?: (option: OptionDescriptor) => string | null;
    /** Why a column an option lists does not fit it, for the entries the element refused. */
    choiceNote?: (option: OptionDescriptor, refusal: { readonly code: string }) => string;
    /** Options drawn side by side, each group in one row, by name. */
    rows?: readonly (readonly string[])[];
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
interface FieldProps extends Omit<
    OptionsFormProps,
    "options" | "values" | "advanced" | "advancedLabel" | "fieldInset" | "rows"
> {
    option: OptionDescriptor;
    value: unknown;
}

/**
 * An attribute or partition option as a choice among the attributes the graph carries on the
 * option's side (nodes unless it says edges). A partition the element has resolved lists the
 * element's choices (its groupable columns, a run's community among them); otherwise it lists
 * attributes that are not plain numbers. An attribute option with no default can be left at None (null),
 * or at the app's word for what empty means there ("Automatic").
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.option - The option descriptor
 * @param props.value - The value set
 * @param props.label - The app's words for it
 * @param props.empty - What leaving it empty means, when not "None"
 * @param props.onChange - Called with the new value
 * @param props.note - A short line under the field, or null
 * @param props.disabled - Whether the field is disabled
 * @param props.choiceNote - Why a column the element refused does not fit
 * @returns The select
 */
function AttributeField({
    session,
    option,
    value,
    label,
    empty,
    onChange,
    note,
    disabled,
    choiceNote,
}: Readonly<
    Pick<FieldProps, "session" | "option" | "value" | "choiceNote"> & {
        label: string;
        empty: string | undefined;
        onChange: (v: unknown) => void;
        note?: string | null;
        disabled?: boolean;
    }
>): React.JSX.Element {
    const on = option.on ?? "node";
    // The element's own list, when it resolved one: the columns that fit first, the rest refused.
    const notes = new Map<string, string>();
    const data: { value: string; label: string; disabled?: boolean }[] =
        option.values !== undefined && (option.type === "partition" || option.values.length > 0)
            ? option.values.map((choice) => {
                  if (choice.refusal !== undefined && choiceNote !== undefined) {
                      notes.set(choice.value, choiceNote(option, choice.refusal));
                  }
                  return {
                      value: choice.value,
                      label: choice.label,
                      ...(choice.refusal === undefined ? {} : { disabled: true }),
                  };
              })
            : session.data
                  .attributes()
                  .filter((a) => a.kind === on && (option.type !== "partition" || a.type !== "number"))
                  .map((a) => ({ value: a.name, label: a.plainName }));
    const optional =
        option.type === "attribute" &&
        (option.default === undefined || option.default === null || option.default === "");
    if (optional) {
        data.unshift({ value: "", label: empty ?? "None" });
    }
    const fallback = typeof option.default === "string" && option.default !== "" ? option.default : null;
    const none = optional ? "" : null;
    return (
        <Select
            size="xs"
            label={label}
            value={typeof value === "string" && value !== "" ? value : (fallback ?? none)}
            data={data}
            description={note ?? undefined}
            disabled={disabled}
            allowDeselect={false}
            // The list stays inside a popover, so picking from it is not an outside click.
            comboboxProps={{ withinPortal: false }}
            renderOption={({ option: item }) =>
                notes.has(item.value) ? (
                    <Stack gap={0}>
                        <Text size="xs">{item.label}</Text>
                        <Text size="xs" c="dimmed">
                            {notes.get(item.value)}
                        </Text>
                    </Stack>
                ) : (
                    item.label
                )
            }
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
    const data = weightChoices(session, loaded, unread, reads);
    const shown = shownWeight(value, loaded, unread);
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

/** The weight the graph was loaded with, as the element reports it. */
type LoadedWeight = ReturnType<GraphSession["data"]["loadedWeight"]>;

/**
 * The weight box's choices: the loaded weight, None, and every other number edge column. A loaded
 * weight the run would leave unread is listed, so the reader sees it is there, but not offered:
 * choosing it would run exactly as None does.
 * @param session - The element's session
 * @param loaded - The loaded weight, or null
 * @param unread - Why the run would leave the loaded weight unread, or null
 * @param reads - The meaning the algorithm reads
 * @returns The choices
 */
function weightChoices(
    session: GraphSession,
    loaded: LoadedWeight,
    unread: string | null,
    reads: WeightMeaningRead,
): { value: string; label: string; disabled?: boolean }[] {
    const data: { value: string; label: string; disabled?: boolean }[] = [];
    if (loaded !== null) {
        const note = unread === null ? "loaded" : "loaded, not read";
        data.push({
            value: LOADED,
            label: weightName(loaded.attribute, loaded.meaning, note),
            ...(unread === null ? {} : { disabled: true }),
        });
    }
    data.push({ value: "", label: "None" });
    for (const column of session.data.attributes()) {
        const isNumber = column.type === "number" || column.type === "integer";
        if (column.kind === "edge" && isNumber && column.name !== loaded?.attribute) {
            data.push({ value: column.name, label: weightName(column.plainName, reads) });
        }
    }
    return data;
}

/**
 * What the weight box shows: what the run will read, the loaded weight when it is read, else None.
 * @param value - The value set
 * @param loaded - The loaded weight, or null
 * @param unread - Why the run would leave the loaded weight unread, or null
 * @returns The box's value
 */
function shownWeight(value: unknown, loaded: LoadedWeight, unread: string | null): string {
    if (value === undefined || (loaded !== null && value === loaded.attribute)) {
        return loaded === null || unread !== null ? "" : LOADED;
    }
    return typeof value === "string" ? value : "";
}

/** Props of one option's control. */
interface ControlProps {
    option: OptionDescriptor;
    value: unknown;
    label: string;
    empty: string | undefined;
    onChange: (v: unknown) => void;
}

/**
 * A number or integer option as a number box.
 * @param props - Component props
 * @param props.option - The option descriptor
 * @param props.value - The value set
 * @param props.label - The app's words for it
 * @param props.empty - What an empty box means, when the default is no value
 * @param props.onChange - Called with the new value
 * @returns The number box
 */
function NumberOption({ option, value, label, empty, onChange }: Readonly<ControlProps>): React.JSX.Element {
    const integer = option.type === "integer";
    // The value in force, the default included: an option always has one, so the box never says
    // "not set" beside it. At the default there is nothing to reset: no Reset is drawn.
    const shown = num(value) ?? num(option.default);
    const changed = num(value) !== undefined && num(value) !== num(option.default);
    return (
        <PanelLabelsProvider showLabels>
            <FieldRow
                trailing={
                    changed && (
                        <ResetButton
                            label={label}
                            onClick={() => {
                                // A reset sets the default itself, so a run reset to what it used is unchanged.
                                onChange(typeof option.default === "number" ? option.default : undefined);
                            }}
                        />
                    )
                }
            >
                <PanelField
                    label={label}
                    kind="number"
                    width="fill"
                    value={shown ?? null}
                    // A default of no value (a sample size left to every node) is an empty box
                    // that says what empty means, never a 0 the run would not use.
                    placeholder={option.default === null ? (empty ?? "Not set") : undefined}
                    min={num(option.min)}
                    max={num(option.max)}
                    step={option.step ?? (integer ? 1 : undefined)}
                    decimalScale={integer ? 0 : undefined}
                    onChange={(v) => {
                        onChange(Number(v));
                    }}
                />
            </FieldRow>
        </PanelLabelsProvider>
    );
}

/**
 * An enum option as a select of its values.
 * @param props - Component props
 * @param props.option - The option descriptor
 * @param props.value - The value set
 * @param props.label - The app's words for it
 * @param props.empty - What an empty box means, when the default is no value
 * @param props.choice - The app's words for a value
 * @param props.onChange - Called with the new value
 * @param props.disabled - Whether the select is disabled
 * @returns The select
 */
function EnumOption({
    option,
    value,
    label,
    empty,
    choice,
    onChange,
    disabled,
}: Readonly<ControlProps & { choice: (value: string) => string; disabled?: boolean }>): React.JSX.Element {
    const fallback = typeof option.default === "string" ? option.default : null;
    return (
        <Select
            size="xs"
            label={label}
            disabled={disabled}
            value={typeof value === "string" ? value : fallback}
            // A default of no value says what empty means, like a number's empty box.
            placeholder={option.default === null ? (empty ?? "Not set") : undefined}
            data={(option.values ?? []).map(({ value: v }) => ({ value: v, label: choice(v) }))}
            allowDeselect={false}
            comboboxProps={{ withinPortal: false }}
            onChange={onChange}
        />
    );
}

/**
 * A node option as a label and value row, with "Use selected node" when a different node is selected.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.label - The app's words for it
 * @param props.value - The value set
 * @param props.canUseSelectedNode - Whether to offer the selected node
 * @param props.onChange - Called with the new value
 * @returns The row, or nothing when there is no node and none to offer
 */
function NodeOption({
    session,
    label,
    value,
    canUseSelectedNode,
    onChange,
}: Readonly<{
    session: GraphSession;
    label: string;
    value: unknown;
    canUseSelectedNode: boolean;
    onChange: (v: unknown) => void;
}>): React.JSX.Element | null {
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
                                onChange(selected);
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
function OptionField(props: Readonly<FieldProps>): React.JSX.Element | null {
    const reason = props.disabledReason?.(props.option) ?? null;
    const field = <OptionControl {...props} disabled={reason !== null} />;
    // A disabled field says why on hover and focus; the wrapper takes the pointer the field ignores.
    return reason === null ? (
        field
    ) : (
        <Tooltip label={reason} withinPortal={false}>
            <div aria-description={reason}>{field}</div>
        </Tooltip>
    );
}

/**
 * The control of one option.
 * @param props - Component props, as for {@link OptionField}
 * @param props.disabled - Whether the control is disabled
 * @param props.session - The element's session
 * @param props.option - The option descriptor
 * @param props.value - The value set, or undefined for the default
 * @param props.onChange - Called with the option's name and new value
 * @param props.words - The app's words for an option
 * @param props.canUseSelectedNode - Whether a node option offers "Use selected node"
 * @param props.weightReads - The meaning of weight the algorithm reads, or null
 * @param props.algorithm - The algorithm the form sets up
 * @param props.note - A short line under the field, or null
 * @param props.choiceNote - Why a column the element refused does not fit
 * @returns The control, or nothing for an option the form does not draw
 */
function OptionControl({
    session,
    option,
    value,
    onChange,
    words,
    canUseSelectedNode = false,
    weightReads = null,
    algorithm,
    note,
    choiceNote,
    disabled = false,
}: Readonly<FieldProps & { disabled?: boolean }>): React.JSX.Element | null {
    const { label, choice, empty } = words(option);
    const set = (v: unknown): void => {
        onChange(option.name, v);
    };
    switch (option.type) {
        case "number":
        case "integer":
            return <NumberOption option={option} value={value} label={label} empty={empty} onChange={set} />;
        case "enum":
            return (
                <EnumOption
                    option={option}
                    value={value}
                    label={label}
                    empty={empty}
                    choice={choice}
                    onChange={set}
                    disabled={disabled}
                />
            );
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
            return (
                <AttributeField
                    session={session}
                    option={option}
                    value={value}
                    label={label}
                    empty={empty}
                    onChange={set}
                    note={note?.(option)}
                    disabled={disabled}
                    choiceNote={choiceNote}
                />
            );
        case "node-id":
            return (
                <NodeOption
                    session={session}
                    label={label}
                    value={value}
                    canUseSelectedNode={canUseSelectedNode}
                    onChange={set}
                />
            );
        default:
            return null;
    }
}

/**
 * The options form shared by every method editor (an algorithm's short form, a run's Made with,
 * a layout's form): the key options first, then the advanced ones behind an "Advanced" button whose pop-out
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
 * @param props.advanced - More controls at the end of the Advanced pop-out
 * @param props.advancedLabel - The Advanced pop-out's name
 * @param props.fieldInset - Insets the fields, not the fold's toggle
 * @param props.rows - Options drawn side by side, each group in one row
 * @returns The fields
 */
export function OptionsForm({
    options,
    values,
    advanced: more,
    advancedLabel = "Advanced",
    fieldInset,
    rows = [],
    ...rest
}: Readonly<OptionsFormProps>): React.JSX.Element {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const drawn = options.filter((o) => o.internal !== true && DRAWN.has(o.type));
    const field = (option: OptionDescriptor): React.JSX.Element => (
        <OptionField key={option.name} option={option} value={values[option.name]} {...rest} />
    );
    // Options that share a row are drawn side by side where the row's first one stands.
    const rowOf = (option: OptionDescriptor): readonly string[] | undefined =>
        rows.find((r) => r.includes(option.name));
    const placed = (list: readonly OptionDescriptor[]): React.JSX.Element[] =>
        list.flatMap((option) => {
            const row = rowOf(option);
            if (row === undefined) {
                return [field(option)];
            }
            if (row[0] !== option.name) {
                return [];
            }
            const members = row.flatMap((name) => list.filter((o) => o.name === name));
            return [
                <Group key={`row-${option.name}`} gap={8} grow wrap="nowrap" align="flex-start">
                    {members.map(field)}
                </Group>,
            ];
        });
    const advanced = drawn.filter((o) => o.advanced === true);
    const basic = drawn.filter((o) => o.advanced !== true);
    return (
        <>
            {fieldInset === undefined && placed(basic)}
            {fieldInset !== undefined && basic.length > 0 && (
                <Stack gap={8} px={fieldInset}>
                    {placed(basic)}
                </Stack>
            )}
            {advanced.length > 0 || more !== undefined ? (
                // The rare settings behind an Advanced button that opens a pop-out (compact-mantine
                // draws no folds inside a panel). The form brings its own floating layer, whose
                // panels render in place: inside a Mantine popover (Analyze, Layout) a panel in the
                // page's layer would be a click outside that popover, which closes it under the click.
                // Escape while the pop-out is open closes it alone: the form around it (a popover's
                // form steps back to its list on Escape) never sees it. The pop-out renders in place,
                // so its keys bubble through here.
                <div // NOSONAR(S6847): catches Escape bubbling from the pop-out's own controls
                    style={{ display: "contents" }}
                    onKeyDown={(event) => {
                        if (advancedOpen && isPanelEscape(event)) {
                            event.preventDefault();
                            event.stopPropagation();
                            setAdvancedOpen(false);
                        }
                    }}
                >
                    <PopoutManager>
                        <Popout opened={advancedOpen} onOpenChange={setAdvancedOpen}>
                            <Popout.Trigger>
                                <Tooltip label={advancedLabel}>
                                    <AdvancedButton
                                        label={advancedLabel}
                                        changed={advanced.some((o) => values[o.name] !== undefined)}
                                        aria-haspopup="dialog"
                                        aria-expanded={advancedOpen}
                                    />
                                </Tooltip>
                            </Popout.Trigger>
                            <Popout.Panel
                                width={264}
                                placement="left"
                                alignment="start"
                                header={{ variant: "title", title: advancedLabel }}
                            >
                                <Popout.Content>
                                    <Stack gap={8}>
                                        {advanced.map(field)}
                                        {more}
                                    </Stack>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </PopoutManager>
                </div>
            ) : null}
        </>
    );
}
