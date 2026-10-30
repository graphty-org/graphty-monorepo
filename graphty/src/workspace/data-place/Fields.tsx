import { ControlSection, EntityChip, FieldRow, focusWithRing, ListboxCheck } from "@graphty/compact-mantine";
import type { GraphSession, LoadedSource, ValueType } from "@graphty/graphty-element/session";
import { ActionIcon, Select, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { MEANING_WORDS } from "../analyze/words";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { AddButton } from "../style/Section";
import { failWords } from "../table/columns";
import { designate, unitOf } from "../time/timeActions";
import { UNIT_CHOICES } from "../time/timeWords";
import { useTimeFieldVersion } from "../time/useTimeVersion";
import { pickEnd } from "./commands";
import { TypeGlyphIcon } from "./TypeGlyphIcon";
import {
    columnChoices,
    columnGlyph,
    DIRECTIONS,
    type EntryId,
    FIELD_ENTRIES,
    FIELD_ROWS,
    type FieldEntry,
    type FieldSide,
    isNumeric,
    KIND_OF,
    kindChoices,
    loadValue,
    LOCATION_ENTRIES,
    remap,
    roleHolder,
    ROWS_ARE,
    sidesOf,
    sourceName,
    tableRoles,
    type TypeGlyph,
    unusedWords,
} from "./words";

/** The Select value that means no column. */
const NONE = "__none__";

/** What an id that appears under two kinds makes. */
const SHARED_IDS = ["Same node", "Different nodes"];

/** The glyph each kind of entry wears. */
const ENTRY_GLYPHS: Readonly<Record<EntryId, (typeof GLYPHS)[keyof typeof GLYPHS]>> = {
    label: GLYPHS.label,
    kind: GLYPHS.category,
    weight: GLYPHS.weight,
    time: GLYPHS.time,
    latitude: GLYPHS.location,
    longitude: GLYPHS.location,
    coordinates: GLYPHS.location,
    country: GLYPHS.location,
    region: GLYPHS.location,
    city: GLYPHS.location,
    edgeId: GLYPHS.key,
    sourceKind: GLYPHS.category,
    targetKind: GLYPHS.category,
};

/** A pick list's choice: a value, or a value with its label, its kind's glyph and a detail. */
type Choice =
    string | { readonly value: string; readonly label: string; readonly glyph?: TypeGlyph; readonly detail?: string };

/** The type an entry's column is read as, where it must be one: the rest list "N will not convert". */
const ENTRY_TYPES: Partial<Readonly<Record<EntryId, ValueType>>> = {
    weight: "number",
    time: "date",
    latitude: "number",
    longitude: "number",
};

/**
 * An entry's column choices, each with its kind's glyph: the ones that fit first (already the
 * type the entry reads, then every value converting), then the rest, each saying how many of its
 * values will not convert, as the header's Type menu does.
 * @param session - the element's session.
 * @param attributes - `data.attributes()`.
 * @param side - nodes or edges.
 * @param entry - the entry.
 * @param names - the column names it offers.
 * @returns the choices.
 */
function columnOptions(
    session: GraphSession,
    attributes: ReturnType<GraphSession["data"]["attributes"]>,
    side: FieldSide,
    entry: EntryId,
    names: readonly string[],
): Choice[] {
    const kind = KIND_OF[side];
    const type = ENTRY_TYPES[entry];
    const ranked = names.map((name) => {
        const column = attributes.find((a) => a.kind === kind && a.name === name);
        if (column === undefined) {
            return { rank: 0, choice: { value: name, label: name } };
        }
        const glyph = columnGlyph(session, column);
        const already = type === undefined || (type === "number" ? isNumeric(column) : column.measurement === "time");
        const detail = already ? undefined : failWords(session, { kind, name }, type);
        let rank = 0;
        if (detail !== undefined) {
            rank = 2;
        } else if (!already) {
            rank = 1;
        }
        return { rank, choice: { value: name, label: name, glyph, ...(detail === undefined ? {} : { detail }) } };
    });
    ranked.sort((a, b) => a.rank - b.rank);
    return ranked.map((each) => each.choice);
}

/**
 * Draws a column choice: the list's check, its kind's glyph, its name and its detail.
 * @param input - Mantine's option.
 * @param input.option - the option.
 * @param input.option.value - its value.
 * @param input.option.label - its label.
 * @param choices - the choices, for their glyphs and details.
 * @returns the option's content.
 */
function renderChoice(
    { option }: { option: { value: string; label: string } },
    choices: readonly Choice[],
): React.ReactNode {
    const choice = choices.find((each) => typeof each !== "string" && each.value === option.value);
    const glyph = typeof choice === "string" ? undefined : choice?.glyph;
    const detail = typeof choice === "string" ? undefined : choice?.detail;
    return (
        <>
            <ListboxCheck />
            {glyph === undefined ? null : (
                // The type glyph at its own 14 px, as the table's headers draw it.
                <span aria-hidden="true" style={{ display: "inline-flex", flex: "none", marginInlineEnd: 6 }}>
                    <TypeGlyphIcon glyph={glyph} />
                </span>
            )}
            <span className="cm-listbox-label">{option.label}</span>
            {detail === undefined ? null : (
                <Text span size="xs" c="dimmed" ml="auto" pl="xs">
                    {detail}
                </Text>
            )}
        </>
    );
}

/** A side's word in a control's name. */
const SIDE_WORD: Readonly<Record<FieldSide, string>> = { nodes: "Node", edges: "Edge" };

/**
 * One dropdown row: its label and a pick list of the choices, with `none` when asked for.
 * @param props - Component props
 * @param props.label - the row's label
 * @param props.name - the dropdown's accessible name, when not the label
 * @param props.sub - drawn as a setting of the entry above it, indented
 * @param props.withNone - whether `none` is offered
 * @param props.repick - whether picking the choice shown again counts (it was only preselected)
 * @param props.value - the choice now, or null for none
 * @param props.choices - what it offers, as values or as values with labels
 * @param props.onPick - takes the picked choice, or null for none
 * @returns the row
 */
function PickRow({
    label,
    name = label,
    sub = false,
    value,
    choices,
    withNone = false,
    repick = false,
    onPick,
}: Readonly<{
    label: string;
    name?: string;
    sub?: boolean;
    value: string | null;
    choices: readonly (string | { readonly value: string; readonly label: string })[];
    withNone?: boolean;
    repick?: boolean;
    onPick: (value: string | null) => void;
}>): React.JSX.Element {
    const none = withNone ? [{ value: NONE, label: "None" }] : [];
    const id = useId();
    return (
        <FieldRow>
            {/* The row's words are the box's label: a click on them opens it. */}
            <Text component="label" htmlFor={id} size="xs" truncate className={sub ? "dp-sub-label" : undefined}>
                {label}
            </Text>
            <Select
                id={id}
                size="xs"
                aria-label={name}
                allowDeselect={false}
                data={[
                    ...none,
                    ...choices.map((choice) =>
                        typeof choice === "string" ? { value: choice, label: choice } : choice,
                    ),
                ]}
                value={value ?? (withNone ? NONE : null)}
                onChange={(picked) => {
                    const next = picked === null || picked === NONE ? null : picked;
                    if (next !== value) {
                        onPick(next);
                    }
                }}
                // The list calls onChange only for a new value; a preselected one picked again
                // comes here.
                onOptionSubmit={(picked) => {
                    if (repick && picked === value) {
                        onPick(picked);
                    }
                }}
            />
        </FieldRow>
    );
}

/**
 * One entry of the Fields list: its kind's glyph and name, its column, and a minus. An entry just
 * picked from "+" opens its control's list; closing it with no pick drops the entry. An entry the
 * element lists but does not read is dimmed, and says why in a tooltip and its description.
 * @param props - Component props
 * @param props.side - nodes or edges
 * @param props.entry - the kind of entry
 * @param props.name - the control's accessible name
 * @param props.value - the control's value, or null while it has none
 * @param props.choices - what the control offers
 * @param props.opened - open the control's list when drawn (the entry was just added)
 * @param props.repick - whether picking the value shown again counts
 * @param props.note - why the element does not read it, when it does not
 * @param props.onPick - takes a pick
 * @param props.onDropped - the list closed with no pick on an entry just added
 * @param props.onRemove - the minus
 * @returns the entry
 */
function EntryRow({
    side,
    entry,
    name,
    value,
    choices,
    opened,
    repick = false,
    note,
    onPick,
    onDropped,
    onRemove,
}: Readonly<{
    side: FieldSide;
    entry: FieldEntry;
    name: string;
    value: string | null;
    choices: readonly Choice[];
    opened: boolean;
    repick?: boolean;
    note?: string;
    onPick: (value: string) => void;
    onDropped: () => void;
    onRemove: () => void;
}>): React.JSX.Element {
    const picked = useRef(false);
    const noun = `${SIDE_WORD[side].toLowerCase()} ${entry.name.toLowerCase()}`;
    return (
        <FieldRow
            data-entry={entry.id}
            data-unused={note === undefined ? undefined : true}
            className={note === undefined ? undefined : "dp-entry-unused"}
            trailing={
                <Tooltip label={`Remove ${noun}`}>
                    <ActionIcon variant="subtle" size="sm" aria-label={`Remove ${noun}`} onClick={onRemove}>
                        <GLYPHS.remove size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            }
        >
            <Tooltip label={note} disabled={note === undefined}>
                <span className="dp-entry-kind">
                    {React.createElement(ENTRY_GLYPHS[entry.id], { size: 14, "aria-hidden": true })}
                    <Text size="xs" truncate>
                        {entry.name}
                    </Text>
                </span>
            </Tooltip>
            <Select
                size="xs"
                aria-label={name}
                aria-description={note}
                allowDeselect={false}
                data={choices.map((choice) =>
                    typeof choice === "string"
                        ? { value: choice, label: choice }
                        : { value: choice.value, label: choice.label },
                )}
                renderOption={(input) => renderChoice(input, choices)}
                value={value}
                autoFocus={opened}
                defaultDropdownOpened={opened}
                onChange={(next) => {
                    picked.current = true;
                    if (next !== null && next !== value) {
                        onPick(next);
                    }
                }}
                onOptionSubmit={(next) => {
                    picked.current = true;
                    if (repick && next === value) {
                        onPick(next);
                    }
                }}
                onDropdownClose={() => {
                    if (opened && !picked.current) {
                        onDropped();
                    }
                }}
            />
        </FieldRow>
    );
}

/**
 * Hands focus to a group's "+" on the render after it is asked for.
 * @returns the group's ref and the call that asks.
 */
function useFocusPlus(): [React.RefObject<HTMLDivElement | null>, () => void] {
    const group = useRef<HTMLDivElement>(null);
    const [asked, setAsked] = useState(0);
    useEffect(() => {
        if (asked > 0) {
            group.current?.querySelector<HTMLElement>("[data-plus]")?.focus();
        }
    }, [asked]);
    return [
        group,
        () => {
            setAsked((n) => n + 1);
        },
    ];
}

/**
 * The time entry's designation (`session.time`), which the timeline reads with the column's unit.
 * The timeline reads one column: a pick on one side keeps the other side only when it names the
 * same column.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param side - nodes or edges.
 * @param start - the column, or null for none.
 * @param unit - the unit, when picked.
 */
function designateTime(
    session: GraphSession,
    store: WorkspaceStore,
    side: FieldSide,
    start: string | null,
    unit?: (typeof UNIT_CHOICES)[number]["value"],
): void {
    const now = session.time.field ?? {};
    const otherSide = side === "nodes" ? "edges" : "nodes";
    const other = now[otherSide];
    const keep = other !== undefined && (start === null || other.start === start);
    const field = {
        ...(keep ? { [otherSide]: other } : {}),
        ...(start === null ? {} : { [side]: { start, ...(unit === undefined ? {} : { unit }) } }),
    };
    designate(session, store, Object.keys(field).length === 0 ? null : field);
}

/**
 * One side's group: its chip with a "+" at the right end, its fixed structure rows, then its
 * entries -- only the kinds of field the element reports (a role a column has, a location it
 * reads), so a detected one is listed with no action from the reader and nothing detected leaves
 * the list empty. "+" offers the kinds not listed yet; picking one opens its column list, and
 * closing that with no pick drops it. The minus takes the role away through the element, focus
 * then going to "+".
 * @param props - Component props
 * @param props.side - nodes or edges
 * @param props.count - the chip's count
 * @param props.source - the selected load
 * @param props.attributes - `data.attributes()`, read once per render of the section
 * @param props.fixed - the fixed rows, drawn above the entries
 * @param props.onReload - reads the load again with new choices
 * @param props.onFail - called when the element refuses a change
 * @returns the group
 */
function SideGroup({
    side,
    count,
    source,
    attributes,
    fixed,
    onReload,
    onFail,
}: Readonly<{
    side: FieldSide;
    count: number;
    source: LoadedSource | undefined;
    attributes: ReturnType<GraphSession["data"]["attributes"]>;
    fixed: React.ReactNode;
    onReload: (choices: Parameters<GraphSession["data"]["reloadSource"]>[1]) => void;
    onFail: () => void;
}>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [adding, setAdding] = useState<EntryId | null>(null);
    const [group, focusPlus] = useFocusPlus();
    const kind = KIND_OF[side];
    const roles = tableRoles(source, side);
    const reloadable = source?.reloadable === true && roles !== undefined;
    // `located` is read once a render: it reads every node's values.
    const located = side === "nodes" ? session?.layout.locationColumns() : undefined;
    const locationOf = (entry: FieldEntry): string | null | undefined =>
        located === undefined || !LOCATION_ENTRIES.some((each) => each.id === entry.id)
            ? undefined
            : (located.kinds[entry.id as keyof typeof located.kinds] ?? null);
    const holderOf = (entry: FieldEntry): string | null => {
        const location = locationOf(entry);
        if (location !== undefined) {
            return location;
        }

        if (entry.role !== undefined) {
            return roleHolder(attributes, side, entry.role);
        }
        return entry.load !== undefined && reloadable ? loadValue(roles, entry.load) : null;
    };
    const present = (entry: FieldEntry): boolean => holderOf(entry) !== null;
    const available = (entry: FieldEntry): boolean => entry.load === undefined || reloadable;
    const entries = FIELD_ENTRIES[side].filter(available);
    const presentNow = new Set(entries.filter(present).map((entry) => entry.id));
    const settled = adding !== null && presentNow.has(adding);
    // The entry "+" added is listed by the element now: it is no longer waiting.
    useEffect(() => {
        if (settled) {
            setAdding(null);
        }
    }, [settled]);
    // An entry asked for from elsewhere (the Overview's Set in Data) is brought into view and
    // focused once it is listed.
    const wanted = useWorkspaceState((state) => state.fieldsEntry);
    const wantedHere = wanted?.startsWith(`${side}:`) === true ? wanted.slice(side.length + 1) : null;
    const ready = wantedHere !== null && presentNow.has(wantedHere as EntryId);
    useEffect(() => {
        if (!ready) {
            return;
        }
        const field = group.current?.querySelector<HTMLElement>(`[data-entry="${wantedHere ?? ""}"] input`);
        if (field !== null && field !== undefined) {
            field.scrollIntoView({ block: "nearest" });
            focusWithRing(field);
        }
        store.set({ fieldsEntry: null });
    }, [ready, wantedHere, group, store]);
    if (session === null) {
        return null;
    }
    const drop = (): void => {
        setAdding(null);
        focusPlus();
    };
    const offered = entries.filter((entry) => !presentNow.has(entry.id) && entry.id !== adding);
    const rowOf = (entry: FieldEntry): React.ReactNode => {
        const opened = adding === entry.id && !presentNow.has(entry.id);
        if (!presentNow.has(entry.id) && !opened) {
            return null;
        }
        let name = entry.load === undefined ? `${SIDE_WORD[side]} ${entry.name.toLowerCase()}` : entry.name;
        if (locationOf(entry) !== undefined) {
            name = `${name} column`;
        }
        const holder = holderOf(entry);
        const common = {
            side,
            entry,
            name,
            value: holder,
            opened,
            onDropped: drop,
        };
        if (entry.load !== undefined) {
            const key = entry.load;
            const endKind = key === "sourceKind" || key === "targetKind";
            return (
                <EntryRow
                    key={entry.id}
                    {...common}
                    choices={
                        endKind
                            ? kindChoices(roles, holder)
                            : columnOptions(
                                  session,
                                  attributes,
                                  side,
                                  entry.id,
                                  columnChoices(attributes, source, side, holder),
                              )
                    }
                    onPick={(picked) => {
                        if (source !== undefined) {
                            onReload({ mapping: remap(source, side, { [key]: picked }) });
                        }
                    }}
                    onRemove={() => {
                        focusPlus();
                        if (source !== undefined) {
                            onReload({ mapping: remap(source, side, { [key]: null }) });
                        }
                    }}
                />
            );
        }
        const role = entry.role ?? "label";
        const numeric = entry.id === "weight";
        if (entry.id === "time") {
            return (
                <TimeEntry
                    key={entry.id}
                    session={session}
                    store={store}
                    common={common}
                    offered={attributes}
                    source={source}
                    onRemove={focusPlus}
                />
            );
        }
        const meaning = session.config.data.knownFields.edgeWeightMeaning ?? null;
        const isLocation = locationOf(entry) !== undefined;
        const unused = located?.unused.find((fact) => fact.params.kind === entry.id);
        return (
            <React.Fragment key={entry.id}>
                <EntryRow
                    {...common}
                    // A location the element found is only preselected: picking it designates it.
                    repick={isLocation && located?.from === "detected"}
                    note={unused === undefined ? undefined : unusedWords(unused)}
                    choices={columnOptions(
                        session,
                        attributes,
                        side,
                        entry.id,
                        columnChoices(attributes, source, side, holder),
                    )}
                    onPick={(picked) => {
                        session.data.setRole({ kind, name: picked }, role).catch(onFail);
                    }}
                    onRemove={() => {
                        focusPlus();
                        if (holder !== null) {
                            session.data.setRole({ kind, name: holder }, null).catch(onFail);
                        }
                    }}
                />
                {numeric && side === "edges" && holder !== null ? (
                    <PickRow
                        sub
                        label="Higher means"
                        // Starts with the words on screen, so a reader who says them reaches it.
                        name="Higher means, edge weight"
                        value={meaning}
                        choices={Object.entries(MEANING_WORDS).map(([value, label]) => ({ value, label }))}
                        onPick={(picked) => {
                            session.config
                                .set({
                                    data: {
                                        knownFields: { edgeWeightMeaning: picked as typeof meaning },
                                    },
                                })
                                .catch(onFail);
                        }}
                    />
                ) : null}
            </React.Fragment>
        );
    };
    return (
        <div ref={group} data-fields-side={side}>
            <div className="dp-fields-group">
                <EntityChip kind={kind}>{formatNumber(count)}</EntityChip>
                <AddButton
                    kind={kind}
                    title="Fields"
                    options={offered.map((entry) => ({ key: entry.id, label: entry.name }))}
                    onAdd={(key) => {
                        setAdding(key as EntryId);
                    }}
                />
            </div>
            {fixed}
            {entries.map(rowOf)}
        </div>
    );
}

/**
 * The Time entry: a column the timeline reads (`session.time`), the columns read as time first,
 * and under it, for a number column, the unit its numbers are in.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.common - the entry's shared props
 * @param props.offered - the columns it can name
 * @param props.source - the selected load
 * @param props.onRemove - called once the minus was pressed
 * @returns the entry and its Unit row
 */
function TimeEntry({
    session,
    store,
    common,
    offered,
    source,
    onRemove,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    common: Omit<React.ComponentProps<typeof EntryRow>, "choices" | "onPick" | "onRemove">;
    offered: ReturnType<GraphSession["data"]["attributes"]>;
    source: LoadedSource | undefined;
    onRemove: () => void;
}>): React.JSX.Element {
    const { side, value: holder } = common;
    const kind = KIND_OF[side];
    const names = columnOptions(session, offered, side, "time", columnChoices(offered, source, side, holder));
    const column = offered.find((a) => a.kind === kind && a.name === holder);
    const unit = UNIT_CHOICES.find((choice) => choice.value === unitOf(session))?.label ?? null;
    return (
        <>
            <EntryRow
                {...common}
                choices={names}
                onPick={(picked) => {
                    designateTime(session, store, side, picked);
                }}
                onRemove={() => {
                    onRemove();
                    designateTime(session, store, side, null);
                }}
            />
            {session.time.field?.[side] !== undefined &&
            holder !== null &&
            column !== undefined &&
            isNumeric(column) ? (
                <PickRow
                    sub
                    label="Unit"
                    name={`${common.name} unit`}
                    value={unit}
                    choices={UNIT_CHOICES.map((choice) => choice.label)}
                    onPick={(label) => {
                        designateTime(
                            session,
                            store,
                            side,
                            holder,
                            UNIT_CHOICES.find((choice) => choice.label === label)?.value,
                        );
                    }}
                />
            ) : null}
        </>
    );
}

/**
 * The sides Fields shows: the load's own, or for a graph not loaded from one, each side with
 * columns.
 * @param attributes - `data.attributes()`.
 * @param source - the selected load.
 * @returns the sides.
 */
function sidesShown(
    attributes: ReturnType<GraphSession["data"]["attributes"]>,
    source: LoadedSource | undefined,
): FieldSide[] {
    const own = sidesOf(source);
    return (["nodes", "edges"] as const).filter((side) =>
        own === undefined
            ? attributes.some((a) => a.kind === KIND_OF[side]) || tableRoles(source, side) !== undefined
            : own.includes(side),
    );
}

/**
 * The edge side's rows that are settings of the whole graph: the shared-ids choice when an id
 * appears under two kinds, and the direction.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.source - the selected load
 * @param props.onReload - reads the load again with new choices
 * @param props.onFail - called when the element refuses a change
 * @returns the rows
 */
function GraphRows({
    session,
    source,
    onReload,
    onFail,
}: Readonly<{
    session: GraphSession;
    source: LoadedSource | undefined;
    onReload: (choices: Parameters<GraphSession["data"]["reloadSource"]>[1]) => void;
    onFail: () => void;
}>): React.JSX.Element {
    const { directed } = session.config.data;
    const kinds = source?.reloadable === true ? session.data.lastImport()?.kinds : undefined;
    return (
        <>
            {kinds === undefined || kinds.sharedIds === 0 ? null : (
                <PickRow
                    label={`${String(kinds.sharedIds)} in both`}
                    name="Shared ids"
                    value={source?.choices?.kindIds === "scoped" ? "Different nodes" : "Same node"}
                    choices={SHARED_IDS}
                    onPick={(picked) => {
                        onReload({ kindIds: picked === "Different nodes" ? "scoped" : "shared" });
                    }}
                />
            )}
            <PickRow
                label="Direction"
                value={DIRECTIONS.find((d) => d.value === String(directed))?.label ?? null}
                choices={DIRECTIONS.map((d) => d.label)}
                onPick={(picked) => {
                    const value = DIRECTIONS.find((d) => d.label === picked)?.value ?? "auto";
                    const next = value === "auto" ? "auto" : value === "true";
                    session.config.set({ data: { directed: next } }).catch(onFail);
                }}
            />
        </>
    );
}

/**
 * One load's Fields (spec section 3.3): Rows are (for a
 * load of one table), then each side under its node or edge chip -- its fixed structure rows (the
 * node Id; an edge's Source and Target, the shared-ids choice when an id appears under two kinds,
 * and the graph's direction), which always hold a value, then its list of special fields with a
 * "+" at the chip's right end (Label, Kind, Weight, Time, and Latitude, Longitude, Coordinates,
 * Country, Region and City of nodes; Weight, Time,
 * Kind, Id and the kinds of the two ends of edges), each with its settings indented under it. A
 * setting row changes the element's role in place (`data.setRole`); a row read when the rows load
 * reads the load again (`data.reloadSource`). Rows are: edges on a table of nodes asks for Source
 * and Target first and reads the load again once both are picked. Each change is one undo step.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.source - the load, or undefined when the graph was not loaded from one
 * @returns the rows
 */
function SourceFields({
    session,
    source,
}: Readonly<{ session: GraphSession; source: LoadedSource | undefined }>): React.JSX.Element {
    const { store } = useWorkspace();
    const held = useWorkspaceState((state) => state.ends);
    const attributes = session.data.attributes();
    const fail = (): void => {
        store.set({ notice: { message: "Field not changed" } });
    };
    const reload = (choices: Parameters<GraphSession["data"]["reloadSource"]>[1]): void => {
        if (source !== undefined) {
            session.data.reloadSource(source.key, choices).catch(fail);
        }
    };
    const tables = Object.values(source?.mapping?.tables ?? {});
    const ends = source !== undefined && held?.load === source.key ? held : null;
    const sides = ends === null ? sidesShown(attributes, source) : [];
    // The fixed rows read when the rows load: shown only when this load can be read again here.
    const fixedRows = (side: FieldSide): React.ReactNode[] => {
        const roles = tableRoles(source, side);
        if (source?.reloadable !== true || roles === undefined) {
            return [];
        }
        return FIELD_ROWS.filter((row) => row.side === side).map((row) => {
            const value = loadValue(roles, row.key);
            return (
                <PickRow
                    key={row.key}
                    label={row.label}
                    withNone
                    value={value}
                    choices={columnChoices(attributes, source, side, value)}
                    onPick={(picked) => {
                        reload({ mapping: remap(source, side, { [row.key]: picked }) });
                    }}
                />
            );
        });
    };

    const { totalNodes, totalEdges } = session.visibility.summary;
    const single = tables.length === 1 ? tables[0].rowsAre : undefined;
    const rowsAre = ends === null ? single : "edges";
    return (
        <div className="dp-fields">
            {source?.reloadable === true && rowsAre !== undefined ? (
                <PickRow
                    label="Rows are"
                    value={rowsAre}
                    choices={ROWS_ARE}
                    onPick={(picked) => {
                        if (picked === "edges") {
                            store.set({ ends: { load: source.key, source: null, target: null } });
                        } else if (ends === null) {
                            reload({ mapping: remap(source, "edges", { rowsAre: "nodes" }) });
                        } else {
                            store.set({ ends: null });
                        }
                    }}
                />
            ) : null}
            {ends === null || source === undefined ? null : (
                <>
                    <div className="dp-fields-group">
                        <EntityChip kind="edge">{formatNumber(source.counts.nodes)}</EntityChip>
                    </div>
                    {(["source", "target"] as const).map((end) => (
                        <PickRow
                            key={end}
                            label={end === "source" ? "Source" : "Target"}
                            withNone
                            value={ends[end]}
                            choices={columnChoices(attributes, source, "nodes", ends[end])}
                            onPick={(picked) => {
                                pickEnd(store, session, source, end, picked).catch(fail);
                            }}
                        />
                    ))}
                </>
            )}
            {sides.includes("nodes") ? (
                <SideGroup
                    side="nodes"
                    count={source?.counts.nodes ?? totalNodes}
                    source={source}
                    attributes={attributes}
                    fixed={fixedRows("nodes")}
                    onReload={reload}
                    onFail={fail}
                />
            ) : null}
            {sides.includes("edges") ? (
                <SideGroup
                    side="edges"
                    count={source?.counts.edges ?? totalEdges}
                    source={source}
                    attributes={attributes}
                    fixed={
                        <>
                            {fixedRows("edges")}
                            <GraphRows session={session} source={source} onReload={reload} onFail={fail} />
                        </>
                    }
                    onReload={reload}
                    onFail={fail}
                />
            ) : null}
        </div>
    );
}

/**
 * The Fields section: one collapsible group per load, named after it (the Style panel's kind
 * groups), the selected load's open and first. Picking another load opens its group and scrolls to
 * it; the reader opens and closes the rest. A graph not loaded from a file shows its fields
 * ungrouped.
 * @param props - Component props
 * @param props.sources - `data.sources()`
 * @param props.selected - the selected load
 * @returns the section, or nothing before the element has come up
 */
export function Fields({
    sources,
    selected,
}: Readonly<{ sources: readonly LoadedSource[]; selected: LoadedSource | undefined }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const held = useWorkspaceState((state) => state.ends);
    useTimeFieldVersion(session);
    // The groups the reader opened or closed; a group they never touched is open only while its load
    // is selected. A new pick forgets the reader's choice for that group, so it opens.
    const [opened, setOpened] = useState<Readonly<Record<string, boolean>>>({});
    const [openedFor, setOpenedFor] = useState(selected?.key);
    if (openedFor !== selected?.key) {
        setOpenedFor(selected?.key);
        if (selected !== undefined) {
            setOpened(({ [selected.key]: _picked, ...rest }) => rest);
        }
    }
    const groups = useRef<HTMLDivElement>(null);
    const drawn = useRef(false);
    useEffect(() => {
        // Not on the first drawing: only a new pick scrolls the panel.
        if (drawn.current) {
            groups.current?.firstElementChild?.scrollIntoView({ block: "nearest" });
        }
        drawn.current = true;
    }, [selected?.key]);
    if (session === null) {
        return null;
    }
    const attributes = session.data.attributes();
    const empty = (source: LoadedSource | undefined): boolean =>
        sidesShown(attributes, source).length === 0 && !(source !== undefined && held?.load === source.key);
    if (sources.length === 0) {
        return (
            <ControlSection label="Fields" empty={empty(undefined)}>
                <SourceFields session={session} source={undefined} />
            </ControlSection>
        );
    }
    const ordered = selected === undefined ? sources : [selected, ...sources.filter((each) => each !== selected)];
    return (
        <ControlSection label="Fields">
            <div ref={groups} className="dp-field-groups">
                {ordered.map((source) => (
                    <ControlSection
                        key={source.key}
                        label={sourceName(source)}
                        headingLevel={3}
                        empty={empty(source)}
                        opened={opened[source.key] ?? source === selected}
                        onOpenChange={(open) => {
                            setOpened((was) => ({ ...was, [source.key]: open }));
                        }}
                    >
                        <SourceFields session={session} source={source} />
                    </ControlSection>
                ))}
            </div>
        </ControlSection>
    );
}
