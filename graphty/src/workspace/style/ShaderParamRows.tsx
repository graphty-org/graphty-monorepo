import { ControlSection, PanelField, PanelLabelsProvider, Popout, PopoutButton } from "@graphty/compact-mantine";
import {
    changeShaderParamType,
    removeShaderParam,
    renameShaderParam,
    SHADER_CLOCKS,
    SHADER_PARAM_TYPES,
    type ShaderParamDescriptor,
    type ShaderParamDraft,
    shaderParamPlainName,
    shaderParamShape,
    type ShaderParamValue,
    type ShaderTextDraft,
} from "@graphty/graphty-element/catalog";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { GLYPHS } from "../glyphs";
import { AddButton } from "./Section";
import { ParamControl } from "./ShaderParams";
import { CLOCK_WORDS, clockWords, EDITOR_WORDS, type ShaderTab } from "./words";

/** The gear's width, as the style rows' pop-outs. */
const GEAR_WIDTH = 240;

/** The seconds a new clock binding maps, as the element's starters write it. */
const NEW_DOMAIN: readonly [number, number] = [0, 0.3];

/** The value of the Starts select that means no clock. */
const NO_CLOCK = "none";

/** The fields in a row's gear, whose problems mark the gear. */
export const GEAR_FIELDS: ReadonlySet<string> = new Set(["plainName", "min", "max", "step", "values", "varies"]);

/** A problem on one field of one parameter row. */
export interface ParamMark {
    readonly index: number;
    readonly field: string;
}

/**
 * What a number typed as text is written as: nothing when empty, the number when it reads as one,
 * else the text as typed so a half-typed value survives and the check reports it.
 * @param text - the field's text.
 * @returns the value to write.
 */
function numberOrText(text: string): number | string | undefined {
    if (text === "") {
        return undefined;
    }
    const number = Number(text);
    return String(number) === text ? number : text;
}

/** Props for NumberTextField. */
interface NumberTextFieldProps {
    readonly label: string;
    readonly value: unknown;
    readonly invalid: boolean;
    /** The limits a number is held to. */
    readonly range?: { readonly min: number; readonly max: number };
    readonly onChange: (value: number | string | undefined) => void;
}

/**
 * A number field that can be emptied, for a key whose absence means something; the panel's number
 * field reverts on empty.
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - the header's value
 * @param props.invalid - whether a problem is marked on it
 * @param props.range - the limits a number is held to
 * @param props.onChange - writes the value, undefined for no key
 * @returns The field
 */
export function NumberTextField({
    label,
    value,
    invalid,
    range,
    onChange,
}: Readonly<NumberTextFieldProps>): React.JSX.Element {
    return (
        <PanelField
            label={label}
            width="fill"
            inputMode="decimal"
            aria-invalid={invalid ? true : undefined}
            value={typeof value === "number" || typeof value === "string" ? String(value) : ""}
            onChange={(next) => {
                const typed = numberOrText(String(next));
                onChange(
                    typeof typed === "number" && range !== undefined
                        ? Math.min(range.max, Math.max(range.min, typed))
                        : typed,
                );
            }}
        />
    );
}

/**
 * Sets one key of a row, or takes it off when the value is undefined.
 * @param row - the row.
 * @param key - the key.
 * @param value - the value.
 * @returns the row.
 */
function withKey(row: ShaderParamDraft, key: string, value: unknown): ShaderParamDraft {
    if (value !== undefined) {
        return { ...row, [key]: value };
    }
    return Object.fromEntries(Object.entries(row).filter(([each]) => each !== key));
}

/**
 * A row's default bound to a clock, or undefined for a plain value.
 * @param value - the default as written.
 * @returns the binding.
 */
function clockOf(value: unknown): { by: string; domain: [number, number]; range?: [string, string] } | undefined {
    if (typeof value !== "object" || value === null || !("by" in value)) {
        return undefined;
    }
    const { by, domain, range } = value as { by: unknown; domain?: unknown; range?: unknown };
    return {
        by: String(by),
        domain: Array.isArray(domain) ? (domain as [number, number]) : [...NEW_DOMAIN],
        ...(Array.isArray(range) ? { range: range as [string, string] } : {}),
    };
}

/**
 * A draft row as the descriptor the app's value controls read; only the fields they use are real.
 * @param row - the row as written.
 * @param label - its name.
 * @returns the descriptor.
 */
function optionOf(row: ShaderParamDraft, label: string): ShaderParamDescriptor {
    const values = Array.isArray(row.values) ? (row.values as { value: string; label: string }[]) : [];
    return { name: label, plainName: label, type: row.type, default: row.default, values } as ShaderParamDescriptor;
}

/**
 * The row's type as written, when it is one the element knows.
 * @param row - the row.
 * @returns the type, or undefined.
 */
function typeOf(row: ShaderParamDraft): ShaderParamDescriptor["type"] | undefined {
    return SHADER_PARAM_TYPES.find((type) => type === row.type);
}

/**
 * The first name of the form param1, param2 not yet on a row.
 * @param rows - the rows.
 * @returns the name.
 */
function freeName(rows: readonly ShaderParamDraft[]): string {
    const taken = new Set(rows.map((row) => row.name));
    let number = 1;
    while (taken.has(`param${String(number)}`)) {
        number += 1;
    }
    return `param${String(number)}`;
}

/** Props for ChoiceRows. */
interface ChoiceRowsProps {
    readonly row: ShaderParamDraft;
    readonly rowName: string;
    readonly invalid: boolean;
    readonly onChange: (row: ShaderParamDraft) => void;
}

/**
 * A Choice row's values: a label with the index the body reads, a minus, and a +. The label is the
 * stored value, so renaming the default's label moves the default with it.
 * @param props - Component props
 * @param props.row - the row
 * @param props.rowName - its name, for the controls' names
 * @param props.invalid - whether a problem is marked on the choices
 * @param props.onChange - writes the row
 * @returns The rows
 */
function ChoiceRows({ row, rowName, invalid, onChange }: Readonly<ChoiceRowsProps>): React.JSX.Element {
    const values = Array.isArray(row.values) ? (row.values as { value: string; label: string }[]) : [];
    const writeValues = (next: { value: string; label: string }[], renamedDefault?: string): void => {
        onChange({
            ...row,
            values: next,
            ...(renamedDefault === undefined ? {} : { default: renamedDefault }),
        });
    };
    return (
        <div className="ws-param-choices-edit" data-invalid={invalid ? "" : undefined}>
            <Text size="xs">{EDITOR_WORDS.choices}</Text>
            {values.map((choice, index) => (
                <Group key={String(index)} gap={4} wrap="nowrap">
                    <PanelField
                        label={EDITOR_WORDS.choiceLabel(rowName, index)}
                        width="fill"
                        value={choice.label}
                        onChange={(next) => {
                            const text = String(next);
                            writeValues(
                                values.map((each, at) => (at === index ? { value: text, label: text } : each)),
                                row.default === choice.value ? text : undefined,
                            );
                        }}
                    />
                    <Text size="xs" c="dimmed" className="ws-param-choice-index">
                        {index}
                    </Text>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={EDITOR_WORDS.removeChoice(rowName, index)}
                        onClick={() => {
                            const next = values.filter((_, at) => at !== index);
                            writeValues(next, row.default === choice.value ? next[0]?.value : undefined);
                        }}
                    >
                        <GLYPHS.remove size={14} aria-hidden />
                    </ActionIcon>
                </Group>
            ))}
            <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={EDITOR_WORDS.addChoice(rowName)}
                onClick={() => {
                    const label = EDITOR_WORDS.newChoice(values.length + 1);
                    writeValues([...values, { value: label, label }]);
                }}
            >
                <GLYPHS.add size={14} aria-hidden />
            </ActionIcon>
        </div>
    );
}

/** Props for StartsFields. */
interface StartsFieldsProps {
    readonly row: ShaderParamDraft;
    readonly rowName: string;
    readonly onChange: (row: ShaderParamDraft) => void;
}

/**
 * A Number or Color row's clock binding: the clock, From and To seconds, and a Color's two colors.
 * @param props - Component props
 * @param props.row - the row
 * @param props.rowName - its name, for the controls' names
 * @param props.onChange - writes the row
 * @returns The fields
 */
function StartsFields({ row, rowName, onChange }: Readonly<StartsFieldsProps>): React.JSX.Element {
    const clock = clockOf(row.default);
    const isColor = row.type === "color";
    const plainDefault = (): unknown => {
        const first = clock?.range?.[0];
        return isColor && first !== undefined ? first : shaderParamShape(row.type as "number").default;
    };
    const bind = (by: string): void => {
        if (by === NO_CLOCK) {
            onChange({ ...row, default: plainDefault() });
            return;
        }
        const color = typeof row.default === "string" ? row.default : "#ffffff";
        onChange({
            ...row,
            default: {
                by,
                domain: clock?.domain ?? [...NEW_DOMAIN],
                ...(isColor ? { range: clock?.range ?? [color, color] } : {}),
            },
        });
    };
    const writeBinding = (patch: Record<string, unknown>): void => {
        onChange({ ...row, default: { ...clock, ...patch } });
    };
    return (
        <>
            <PanelField
                label={EDITOR_WORDS.starts}
                kind="select"
                width="fill"
                value={clock?.by ?? NO_CLOCK}
                data={[
                    { value: NO_CLOCK, label: EDITOR_WORDS.startsNone },
                    ...SHADER_CLOCKS.map((by) => ({ value: by, label: CLOCK_WORDS[by] ?? by })),
                ]}
                onChange={(picked) => {
                    bind(String(picked));
                }}
            />
            {clock !== undefined && (
                <>
                    {(["from", "to"] as const).map((end, at) => (
                        <PanelField
                            key={end}
                            label={EDITOR_WORDS[end]}
                            kind="number"
                            width="fill"
                            value={clock.domain[at]}
                            min={0}
                            step={0.1}
                            onChange={(next) => {
                                const domain = [...clock.domain];
                                domain[at] = Number(next);
                                writeBinding({ domain });
                            }}
                        />
                    ))}
                    {isColor &&
                        [0, 1].map((at) => (
                            <div key={String(at)} className="ws-param-cell">
                                <ParamControl
                                    ctx={undefined}
                                    option={optionOf({ ...row, type: "color" }, EDITOR_WORDS.rangeColor(rowName, at))}
                                    label={EDITOR_WORDS.rangeColor(rowName, at)}
                                    shown={clock.range?.[at]}
                                    write={(next) => {
                                        const range = [...(clock.range ?? ["#ffffff", "#ffffff"])];
                                        range[at] = typeof next === "string" ? next : range[at];
                                        writeBinding({ range });
                                    }}
                                />
                            </div>
                        ))}
                </>
            )}
        </>
    );
}

/** Props for ParamGear. */
interface ParamGearProps {
    readonly row: ShaderParamDraft;
    readonly rowName: string;
    readonly marked: ReadonlySet<string>;
    readonly onChange: (row: ShaderParamDraft) => void;
}

/**
 * A row's gear: Display name and the fields of its type, and for Number and Color what Starts it.
 * @param props - Component props
 * @param props.row - the row
 * @param props.rowName - its name
 * @param props.marked - the row's fields with a problem
 * @param props.onChange - writes the row
 * @returns The gear and its pop-out
 */
function ParamGear({ row, rowName, marked, onChange }: Readonly<ParamGearProps>): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const type = typeOf(row);
    const fields: readonly string[] = type === undefined ? [] : shaderParamShape(type).fields;
    const invalid = [...marked].some((field) => GEAR_FIELDS.has(field));
    const title = EDITOR_WORDS.settingsOf(rowName);
    const typedName = typeof row.plainName === "string" ? row.plainName : "";
    return (
        <Popout opened={open} onOpenChange={setOpen}>
            <Popout.Trigger>
                <Tooltip label={title}>
                    <PopoutButton
                        icon={<GLYPHS.settings size={14} aria-hidden />}
                        aria-label={title}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        data-invalid={invalid ? "" : undefined}
                    />
                </Tooltip>
            </Popout.Trigger>
            <Popout.Panel
                width={GEAR_WIDTH}
                placement="left"
                alignment="start"
                header={{ variant: "title", title }}
                closeLabel={EDITOR_WORDS.closeSettings(rowName)}
            >
                <Popout.Content>
                    <PanelLabelsProvider showLabels>
                        <div className="ws-param-gear">
                            <PanelField
                                label={EDITOR_WORDS.displayName}
                                width="fill"
                                placeholder={shaderParamPlainName(typeof row.name === "string" ? row.name : "")}
                                aria-invalid={marked.has("plainName") ? true : undefined}
                                value={typedName}
                                onChange={(next) => {
                                    onChange(withKey(row, "plainName", next === "" ? undefined : String(next)));
                                }}
                            />
                            {(["min", "max", "step"] as const)
                                .filter((key) => fields.includes(key))
                                .map((key) => (
                                    <NumberTextField
                                        key={key}
                                        label={EDITOR_WORDS[key]}
                                        value={row[key]}
                                        invalid={marked.has(key)}
                                        onChange={(next) => {
                                            onChange(withKey(row, key, next));
                                        }}
                                    />
                                ))}
                            {fields.includes("values") && (
                                <ChoiceRows
                                    row={row}
                                    rowName={rowName}
                                    invalid={marked.has("values")}
                                    onChange={onChange}
                                />
                            )}
                            {fields.includes("varies") && (
                                <PanelField
                                    label={EDITOR_WORDS.varies}
                                    kind="select"
                                    width="fill"
                                    aria-invalid={marked.has("varies") ? true : undefined}
                                    value={row.varies === true ? "on" : "off"}
                                    data={[
                                        { value: "on", label: EDITOR_WORDS.on },
                                        { value: "off", label: EDITOR_WORDS.off },
                                    ]}
                                    onChange={(picked) => {
                                        onChange(withKey(row, "varies", picked === "on" ? true : undefined));
                                    }}
                                />
                            )}
                            {(row.type === "number" || row.type === "color") && (
                                <StartsFields row={row} rowName={rowName} onChange={onChange} />
                            )}
                        </div>
                    </PanelLabelsProvider>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/** Props for one parameter row. */
interface ParamRowProps {
    readonly row: ShaderParamDraft;
    readonly index: number;
    readonly marked: ReadonlySet<string>;
    readonly canInsert: boolean;
    readonly onRow: (row: ShaderParamDraft) => void;
    readonly onRename: (from: string, to: string) => void;
    readonly onRemove: (name: string) => void;
    readonly onInsert: (name: string) => void;
}

/**
 * The Default cell: the app's value control for the type, a number field for a number or an
 * integer, or the binding's words while it is bound to a clock.
 * @param props - Component props
 * @param props.row - the row
 * @param props.rowName - its name
 * @param props.invalid - whether a problem is marked on it
 * @param props.onChange - writes the default
 * @returns The cell's control
 */
function DefaultCell({
    row,
    rowName,
    invalid,
    onChange,
}: Readonly<{
    row: ShaderParamDraft;
    rowName: string;
    invalid: boolean;
    onChange: (value: ShaderParamValue) => void;
}>): React.JSX.Element {
    const label = EDITOR_WORDS.defaultOf(rowName);
    const clock = clockOf(row.default);
    if (clock !== undefined) {
        const words = clockWords(clock);
        return (
            <Text size="xs" truncate data-param-clock title={words}>
                {words}
            </Text>
        );
    }
    if (row.type === "number" || row.type === "integer" || typeOf(row) === undefined) {
        return (
            <PanelField
                label={label}
                kind="number"
                width="fill"
                aria-invalid={invalid ? true : undefined}
                value={typeof row.default === "number" ? row.default : null}
                {...(row.type === "integer" ? { decimalScale: 0, step: 1 } : {})}
                onChange={(next) => {
                    onChange(Number(next));
                }}
            />
        );
    }
    return (
        <ParamControl
            ctx={undefined}
            option={optionOf(row, label)}
            label={label}
            shown={row.default}
            write={onChange}
        />
    );
}

/**
 * One parameter: Name, Type, Default, insert, gear, minus.
 * @param props - Component props
 * @param props.row - the row
 * @param props.index - its place in the list
 * @param props.marked - its fields with a problem
 * @param props.canInsert - whether the code box has a cursor to insert at
 * @param props.onRow - writes the row
 * @param props.onRename - renames it
 * @param props.onRemove - removes it
 * @param props.onInsert - puts the name at the code box's cursor
 * @returns The row
 */
function ParamRow({
    row,
    index,
    marked,
    canInsert,
    onRow,
    onRename,
    onRemove,
    onInsert,
}: Readonly<ParamRowProps>): React.JSX.Element {
    const name = typeof row.name === "string" ? row.name : "";
    const rowName = name === "" ? EDITOR_WORDS.unnamedParam : name;
    // The name commits on Enter or leaving the field, so one rename is one call.
    const [typed, setTyped] = useState(name);
    useEffect(() => {
        setTyped(name);
    }, [name]);
    const commitName = (): void => {
        if (typed !== name) {
            onRename(name, typed);
        }
    };
    const cell = (field: string): { "data-param": number; "data-field": string; "data-invalid"?: string } => ({
        "data-param": index,
        "data-field": field,
        ...(marked.has(field) ? { "data-invalid": "" } : {}),
    });
    const insertLabel = canInsert ? EDITOR_WORDS.insert(rowName) : EDITOR_WORDS.insertNeedsCursor;
    return (
        <div className="ws-param-row" role="group" aria-label={rowName}>
            <div className="ws-param-cell" {...cell("name")}>
                <PanelField
                    label={EDITOR_WORDS.nameOf(rowName)}
                    width="fill"
                    aria-invalid={marked.has("name") ? true : undefined}
                    value={typed}
                    onChange={(next) => {
                        setTyped(String(next));
                    }}
                    onBlur={commitName}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            commitName();
                        }
                    }}
                />
            </div>
            <div className="ws-param-cell" {...cell("type")}>
                <PanelField
                    label={EDITOR_WORDS.typeOf(rowName)}
                    kind="select"
                    width="fill"
                    aria-invalid={marked.has("type") ? true : undefined}
                    value={typeOf(row) ?? null}
                    data={SHADER_PARAM_TYPES.map((type) => ({
                        value: type,
                        label: EDITOR_WORDS.paramTypes[type] ?? type,
                    }))}
                    onChange={(picked) => {
                        const type = SHADER_PARAM_TYPES.find((each) => each === picked);
                        if (type !== undefined) {
                            onRow(changeShaderParamType(row, type, EDITOR_WORDS.seedChoices));
                        }
                    }}
                />
            </div>
            <div className="ws-param-cell" {...cell("default")}>
                <DefaultCell
                    row={row}
                    rowName={rowName}
                    invalid={marked.has("default")}
                    onChange={(value) => {
                        onRow({ ...row, default: value });
                    }}
                />
            </div>
            <Tooltip label={insertLabel}>
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={EDITOR_WORDS.insert(rowName)}
                    aria-disabled={canInsert ? undefined : true}
                    data-disabled={canInsert ? undefined : true}
                    onClick={() => {
                        if (canInsert) {
                            onInsert(name);
                        }
                    }}
                >
                    <GLYPHS.go size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
            <span data-param={index} data-field="gear">
                <ParamGear row={row} rowName={rowName} marked={marked} onChange={onRow} />
            </span>
            <Tooltip label={EDITOR_WORDS.removeParam(rowName)}>
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={EDITOR_WORDS.removeParam(rowName)}
                    onClick={() => {
                        onRemove(name);
                    }}
                >
                    <GLYPHS.remove size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        </div>
    );
}

/** Props for ShaderParamRows. */
interface ShaderParamRowsProps {
    readonly draft: ShaderTextDraft;
    /** The list it was opened for, naming its + as every section's is. */
    readonly tab: ShaderTab;
    readonly marks: readonly ParamMark[];
    /** Whether the code box has held focus since its text was loaded. */
    readonly canInsert: boolean;
    readonly onChange: (draft: ShaderTextDraft) => void;
    readonly onInsert: (name: string) => void;
}

/**
 * The header's parameters as rows, edited only through the element's row functions, so the
 * references to a row stay right and anything the form does not show passes through.
 * @param props - Component props
 * @param props.draft - the header as written
 * @param props.tab - the list it was opened for
 * @param props.marks - the problems on rows
 * @param props.canInsert - whether insert has a cursor
 * @param props.onChange - writes the header
 * @param props.onInsert - puts a name at the code box's cursor
 * @returns The section
 */
export function ShaderParamRows({
    draft,
    tab,
    marks,
    canInsert,
    onChange,
    onInsert,
}: Readonly<ShaderParamRowsProps>): React.JSX.Element {
    const rows = draft.params ?? [];
    const addRow = (): void => {
        const row = { name: freeName(rows), type: "number", default: shaderParamShape("number").default };
        onChange({ ...draft, params: [...rows, row] });
    };
    return (
        <ControlSection
            label={EDITOR_WORDS.parameters}
            headingLevel={3}
            collapsible={false}
            empty={rows.length === 0}
            actions={
                <AddButton
                    kind={tab}
                    title={EDITOR_WORDS.parameters}
                    options={[{ key: "param", label: EDITOR_WORDS.parameters }]}
                    onAdd={addRow}
                />
            }
        >
            {rows.map((row, index) => (
                <ParamRow
                    key={String(index)}
                    row={row}
                    index={index}
                    marked={new Set(marks.filter((mark) => mark.index === index).map((mark) => mark.field))}
                    canInsert={canInsert}
                    onRow={(next) => {
                        onChange({ ...draft, params: rows.map((each, at) => (at === index ? next : each)) });
                    }}
                    onRename={(from, to) => {
                        onChange(renameShaderParam(draft, from, to));
                    }}
                    onRemove={(name) => {
                        onChange(removeShaderParam(draft, name));
                    }}
                    onInsert={onInsert}
                />
            ))}
        </ControlSection>
    );
}
