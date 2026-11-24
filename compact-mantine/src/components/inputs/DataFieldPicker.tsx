import { Button } from "@mantine/core";
import React, { useState } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { FieldGlyph } from "../../icons";
import { useCompactStyles } from "../../theme/useCompactStyles";
import type { ChangeHandler } from "../../types/events";
import { matchesWordStart } from "../../utils/word-start";
import { type QuickAction, QuickActions } from "../shell/QuickActions";
import { type DataFieldType, FieldTypeGlyph } from "./FieldTypeGlyph";
import { PickerPopout } from "./PickerPopout";

export type { DataFieldType } from "./FieldTypeGlyph";

/** One field the reader can pick. */
export interface DataField {
    id: string;
    name: string;
    type: DataFieldType;
    /** A section heading; fields keep the caller's order, grouped by first appearance of their group. */
    group?: string;
    /** A short sample or fact shown dimmed at the row's end ("1 to 36", "6 values"). */
    sample?: string;
    /** Other names a search finds it by (a technical name). */
    keywords?: readonly string[];
    /** Shown but not pickable; the reason is shown instead of `sample`. */
    disabledReason?: string;
}

/** A row above the fields that is not a field ("Fixed size"). */
export interface DataFieldAction {
    id: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    /** Multi mode: running it leaves the list open (a row that adds an item and lets the reader go on picking). */
    keepsOpen?: boolean;
}

/** The words DataFieldPicker shows and speaks. */
export interface DataFieldPickerLabels {
    /** The search box's placeholder and name. */
    search: string;
    /** The row that picks nothing. */
    none: string;
    /** What an empty list says when no `emptyText` is given. */
    empty: string;
    /** The spoken word for each type, joined to a row's name ("Age, number"). */
    types: Record<DataFieldType, string>;
    /** Multi mode: the button that closes the list and keeps what is checked. */
    done: string;
    /** Multi mode: the row that checks every field whose name starts with the search ({query} is replaced). */
    allMatching: string;
    /** Multi mode: the row that checks every field whose name does not start with the search. */
    allExcept: string;
}

/** The English words. */
export const DATA_FIELD_PICKER_LABELS: DataFieldPickerLabels = {
    search: "Find field",
    none: "None",
    empty: "No fields",
    types: {
        number: "number",
        string: "text",
        boolean: "yes or no",
        date: "date",
        category: "category",
        id: "id",
        list: "list",
        other: "other",
    },
    done: "Done",
    allMatching: 'All starting with "{query}"',
    allExcept: 'All except starting with "{query}"',
};

/** Props for the DataFieldPicker component. */
export interface DataFieldPickerProps {
    /** The field's name: its accessible name, the pop-out's title and FieldRow's caption above it. */
    label: string;
    fields: readonly DataField[];
    /** The picked field's id, or null. */
    value: string | null;
    onChange: ChangeHandler<string | null>;
    /** Offer a first "None" row that picks null. @default false */
    clearable?: boolean;
    /** Rows above the fields; picking one calls onAction and closes. */
    actions?: readonly DataFieldAction[];
    onAction?: (id: string) => void;
    /** The action that is in force, drawn as chosen instead of a field. */
    actionValue?: string;
    /** Shown when `fields` is empty (why, and where to go). */
    emptyText?: string;
    placeholder?: string;
    disabled?: boolean;
    disabledReason?: string;
    labels?: Partial<DataFieldPickerLabels>;
    multiple?: false;
}

/** Props for DataFieldPicker's multi mode: rows are checked and unchecked, and the host writes once, on Done. */
export interface DataFieldPickerMultiProps {
    multiple: true;
    /** The field's name: its accessible name and the pop-out's title. */
    label: string;
    fields: readonly DataField[];
    /** The checked ids (controlled). */
    values: readonly string[];
    /** Called on every toggle with the ids checked now. */
    onChange: (values: readonly string[]) => void;
    /** Done, or a click outside the pop-out: keep what is checked. */
    onDone: () => void;
    /** Escape: drop what was checked since the list opened. */
    onCancel: () => void;
    /** Given: while a search is typed, rows that check every field starting with it, or every other one. */
    onMatch?: (query: string, except: boolean) => void;
    /** Rows above the fields; a `keepsOpen` one leaves the list open. */
    actions?: readonly DataFieldAction[];
    onAction?: (id: string) => void;
    /** The action in force, drawn as the field's words. */
    actionValue?: string;
    /** The field's words, when neither an action nor a checked field says it. */
    shown?: string;
    emptyText?: string;
    disabled?: boolean;
    disabledReason?: string;
    labels?: Partial<DataFieldPickerLabels>;
}

// Row keys are prefixed so a field, an action and the None row never share one.
const NONE = "none";
const FIELD = "field:";
const ACTION = "action:";
/** QuickActions' role inside a pop-out, which is already the dialog and names it. */
const IN_POPOUT = "group";
const MATCH = "match:";
const EXCEPT = "except:";

/**
 * A field that opens a searchable list of data fields: sections, a type glyph and a dimmed fact
 * per row, rows that cannot be picked with their reason, an optional "None" row and rows of the
 * caller's own above the fields. Generic: it knows nothing of where the fields come from.
 * @param props - Component props
 * @param props.label - The field's name
 * @param props.fields - The fields offered
 * @param props.value - The picked field's id, or null
 * @param props.onChange - Called with the picked id, or null for None
 * @param props.clearable - Offer a first "None" row
 * @param props.actions - Rows above the fields
 * @param props.onAction - Called with a picked action's id
 * @param props.actionValue - The action in force
 * @param props.emptyText - What an empty list says
 * @param props.placeholder - Shown while nothing is picked
 * @param props.disabled - Whether the field cannot be used
 * @param props.disabledReason - Why it cannot be used
 * @param props.labels - Words to replace
 * @returns The picker
 * @example
 * ```tsx
 * const fields = [
 *     { id: "age", name: "Age", type: "number" },
 *     { id: "city", name: "City", type: "category" },
 * ] as const;
 * const [field, setField] = useState<string | null>(null);
 * <DataFieldPicker label="Size by" fields={fields} value={field} onChange={setField} />
 * ```
 */
export function DataFieldPicker(props: Readonly<DataFieldPickerProps | DataFieldPickerMultiProps>): React.JSX.Element {
    return props.multiple === true ? <MultiFieldPicker {...props} /> : <SingleFieldPicker {...props} />;
}

/**
 * A field's row in the list.
 * @param field - The field.
 * @param labels - The words.
 * @returns The row.
 */
function fieldRow(field: DataField, labels: DataFieldPickerLabels): QuickAction {
    const description = field.disabledReason ?? field.sample;
    return {
        value: FIELD + field.id,
        label: field.name,
        "aria-label": [field.name, labels.types[field.type], description].filter(Boolean).join(", "),
        section: field.group,
        icon: <FieldTypeGlyph type={field.type} />,
        description,
        keywords: field.keywords,
        disabled: field.disabledReason !== undefined,
    };
}

/**
 * The single mode: see DataFieldPicker.
 * @param props - Component props
 * @returns The picker
 */
function SingleFieldPicker(props: Readonly<DataFieldPickerProps>): React.JSX.Element {
    const {
        label,
        fields,
        value,
        onChange,
        clearable = false,
        actions = [],
        onAction,
        actionValue,
        emptyText,
        placeholder,
        disabled,
        disabledReason,
        labels: labelsProp,
    } = props;
    useCompactStyles();
    const labels = { ...DATA_FIELD_PICKER_LABELS, ...labelsProp };
    const picked = value === null ? undefined : fields.find((field) => field.id === value);
    const action = actionValue === undefined ? undefined : actions.find((a) => a.id === actionValue);
    // A value the fields no longer hold still shows its id, never a blank field.
    const shown = action?.label ?? picked?.name ?? value ?? "";
    const glyph = action?.icon ?? (picked ? <FieldTypeGlyph type={picked.type} /> : <FieldGlyph name="attribute" />);

    let highlight: string | undefined;
    if (actionValue !== undefined) {
        highlight = ACTION + actionValue;
    } else if (value !== null) {
        highlight = FIELD + value;
    } else if (clearable) {
        highlight = NONE;
    }

    const rows: QuickAction[] = [
        ...(clearable ? [{ value: NONE, label: labels.none }] : []),
        ...actions.map((a) => ({ value: ACTION + a.id, label: a.label, description: a.description, icon: a.icon })),
        ...fields.map((field) => fieldRow(field, labels)),
    ];

    const run = (key: string, close: () => void): void => {
        if (key === NONE) {
            onChange(null);
        } else if (key.startsWith(ACTION)) {
            onAction?.(key.slice(ACTION.length));
        } else {
            onChange(key.slice(FIELD.length));
        }
        close();
    };

    return (
        <PickerPopout
            label={label}
            value={shown}
            // With nothing picked, a clearable picker reads "None", the row that picked it.
            placeholder={placeholder ?? (clearable ? labels.none : undefined)}
            glyph={glyph}
            disabled={disabled}
            disabledReason={disabledReason}
        >
            {(close) => (
                <>
                    {/* Tab leaves the list (taking the row typed toward, see tabTakes) and closes it, as a
                    select's list does; focus goes back to the trigger. */}
                    <div // eslint-disable-line jsx-a11y/no-static-element-interactions -- catches Tab bubbling up from the list inside; the box is not drawn and takes no focus
                        style={{ display: "contents" }}
                        onKeyDown={(event) => {
                            if (event.key === "Tab") {
                                event.preventDefault();
                                close();
                            }
                        }}
                    >
                        <QuickActions
                            role={IN_POPOUT}
                            aria-label={label}
                            placeholder={labels.search}
                            width={PANEL_GRID.POPOVER_WIDTH}
                            height={320}
                            descriptions="end"
                            emptyText={fields.length === 0 ? (emptyText ?? labels.empty) : undefined}
                            highlight={highlight}
                            activeOnOpen="none"
                            tabTakes
                            actions={rows}
                            filter={(row, query) =>
                                [row.label, ...(row.keywords ?? [])].some((words) => matchesWordStart(words, query))
                            }
                            onRun={(key) => {
                                run(key, close);
                            }}
                            onClose={close}
                        />
                    </div>
                </>
            )}
        </PickerPopout>
    );
}

/**
 * The multi mode: rows carry a check column and a click (or Enter on the active row) toggles one; the host keeps a
 * draft from `onChange` and writes it on `onDone` (Done, a click outside) or drops it on `onCancel` (Escape).
 * @param props - Component props
 * @returns The picker
 */
function MultiFieldPicker(props: Readonly<DataFieldPickerMultiProps>): React.JSX.Element {
    const {
        label,
        fields,
        values,
        onChange,
        onDone,
        onCancel,
        onMatch,
        actions = [],
        onAction,
        actionValue,
        shown,
        emptyText,
        disabled,
        disabledReason,
        labels: labelsProp,
    } = props;
    useCompactStyles();
    const labels = { ...DATA_FIELD_PICKER_LABELS, ...labelsProp };
    const [query, setQuery] = useState("");
    const checked = new Set(values);
    const action = actionValue === undefined ? undefined : actions.find((a) => a.id === actionValue);
    // The trigger reads the first value in the host's order (its first entry), not the first checked row listed.
    const first = values.map((id) => fields.find((field) => field.id === id)).find((field) => field !== undefined);
    const words = action?.label ?? shown ?? first?.name ?? "";
    const typed = query.trim();
    const rows: QuickAction[] = [
        ...(onMatch !== undefined && typed !== ""
            ? [
                  { value: MATCH + typed, label: labels.allMatching.replace("{query}", typed), keywords: [typed] },
                  { value: EXCEPT + typed, label: labels.allExcept.replace("{query}", typed), keywords: [typed] },
              ]
            : []),
        ...actions.map((a) => ({ value: ACTION + a.id, label: a.label, description: a.description, icon: a.icon })),
        ...fields.map((field) => ({ ...fieldRow(field, labels), selected: checked.has(field.id) })),
    ];
    const run = (key: string, close: () => void): void => {
        if (key.startsWith(MATCH) || key.startsWith(EXCEPT)) {
            onMatch?.(typed, key.startsWith(EXCEPT));
            return;
        }
        if (key.startsWith(ACTION)) {
            const id = key.slice(ACTION.length);
            onAction?.(id);
            if (actions.find((a) => a.id === id)?.keepsOpen !== true) {
                setQuery("");
                close();
            }
            return;
        }
        const id = key.slice(FIELD.length);
        onChange(checked.has(id) ? values.filter((each) => each !== id) : [...values, id]);
    };
    return (
        <PickerPopout
            label={label}
            value={words}
            glyph={action?.icon ?? (first ? <FieldTypeGlyph type={first.type} /> : <FieldGlyph name="attribute" />)}
            disabled={disabled}
            disabledReason={disabledReason}
            // Only a click outside or the close button dismisses it by itself: both keep what is checked.
            onDismiss={() => {
                onDone();
                setQuery("");
            }}
        >
            {(close) => (
                <div // catches Escape (a cancel) and Tab (leaving keeps what is checked) before the list and the pop-out see them; the box is not drawn and takes no focus
                    style={{ display: "contents" }}
                    onKeyDownCapture={(event) => {
                        if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            onCancel();
                            setQuery("");
                            close();
                        } else if (event.key === "Tab") {
                            event.preventDefault();
                            onDone();
                            setQuery("");
                            close();
                        }
                    }}
                >
                    <QuickActions
                        role={IN_POPOUT}
                        aria-label={label}
                        placeholder={labels.search}
                        width={PANEL_GRID.POPOVER_WIDTH}
                        height={320}
                        descriptions="end"
                        multiselectable
                        query={query}
                        onQueryChange={setQuery}
                        emptyText={fields.length === 0 ? (emptyText ?? labels.empty) : undefined}
                        activeOnOpen="none"
                        actions={rows}
                        filter={(row, search) =>
                            row.value.startsWith(MATCH) ||
                            row.value.startsWith(EXCEPT) ||
                            [row.label, ...(row.keywords ?? [])].some((each) => matchesWordStart(each, search))
                        }
                        keepSearchAction
                        searchAction={
                            <Button
                                size="compact-sm"
                                onClick={() => {
                                    onDone();
                                    setQuery("");
                                    close();
                                }}
                            >
                                {labels.done}
                            </Button>
                        }
                        onRun={(key) => {
                            run(key, close);
                        }}
                        onClose={() => {
                            setQuery("");
                            close();
                        }}
                    />
                </div>
            )}
        </PickerPopout>
    );
}
