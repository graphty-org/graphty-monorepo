import { ControlSection, EntityChip, FieldRow } from "@graphty/compact-mantine";
import type { GraphSession, LoadedSource, LocationColumns } from "@graphty/graphty-element/session";
import { ActionIcon, Select, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { MEANING_WORDS } from "../analyze/words";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { AddButton } from "../style/Section";
import { designate, unitOf } from "../time/timeActions";
import { UNIT_CHOICES } from "../time/timeWords";
import { useTimeVersion } from "../time/useTimeVersion";
import { pickEnd } from "./commands";
import {
    columnChoices,
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
    LOCATION_MODES,
    type LocationMode,
    PLACE_TYPES,
    remap,
    roleHolder,
    ROWS_ARE,
    sidesOf,
    tableRoles,
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
    location: GLYPHS.location,
    edgeId: GLYPHS.key,
    sourceKind: GLYPHS.category,
    targetKind: GLYPHS.category,
};

/** A side's word in a control's name. */
const SIDE_WORD: Readonly<Record<FieldSide, string>> = { nodes: "Node", edges: "Edge" };

/** The knownFields the Location entry writes; each write names them all, so one form replaces another. */
type LocationWrite = Pick<
    GraphSession["config"]["data"]["knownFields"],
    "nodeLocationPath" | "nodeLatitudePath" | "nodeLongitudePath" | "nodeLocationRole" | "nodeLocationWithinPath"
>;

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
    const none = withNone ? [{ value: NONE, label: "none" }] : [];
    return (
        <FieldRow>
            <Text size="xs" truncate className={sub ? "dp-sub-label" : undefined}>
                {label}
            </Text>
            <Select
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
 * One entry of the Fields list: its kind's glyph and name, its control (a column, or for Location
 * how it is read), and a minus. An entry just picked from "+" opens its control's list; closing it
 * with no pick drops the entry.
 * @param props - Component props
 * @param props.side - nodes or edges
 * @param props.entry - the kind of entry
 * @param props.name - the control's accessible name
 * @param props.value - the control's value, or null while it has none
 * @param props.choices - what the control offers
 * @param props.opened - open the control's list when drawn (the entry was just added)
 * @param props.repick - whether picking the value shown again counts
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
    onPick,
    onDropped,
    onRemove,
}: Readonly<{
    side: FieldSide;
    entry: FieldEntry;
    name: string;
    value: string | null;
    choices: readonly (string | { readonly value: string; readonly label: string })[];
    opened: boolean;
    repick?: boolean;
    onPick: (value: string) => void;
    onDropped: () => void;
    onRemove: () => void;
}>): React.JSX.Element {
    const picked = useRef(false);
    const noun = `${SIDE_WORD[side].toLowerCase()} ${entry.name.toLowerCase()}`;
    return (
        <FieldRow
            data-entry={entry.id}
            trailing={
                <Tooltip label={`Remove ${noun}`}>
                    <ActionIcon variant="subtle" size="sm" aria-label={`Remove ${noun}`} onClick={onRemove}>
                        <GLYPHS.remove size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            }
        >
            <span className="dp-entry-kind">
                {React.createElement(ENTRY_GLYPHS[entry.id], { size: 14, "aria-hidden": true })}
                <Text size="xs" truncate>
                    {entry.name}
                </Text>
            </span>
            <Select
                size="xs"
                aria-label={name}
                allowDeselect={false}
                data={choices.map((choice) => (typeof choice === "string" ? { value: choice, label: choice } : choice))}
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
 * How the element reads the nodes' locations now, as the Location entry's "Read as" says it.
 * @param shown - `layout.locationColumns()`.
 * @returns the form.
 */
function modeOf(shown: LocationColumns): LocationMode {
    if (shown.latitude !== null || shown.longitude !== null) {
        return "pair";
    }
    // A place name's role is its place type (`auto` until the gazetteer decides it).
    return shown.within !== null || (shown.role !== null && shown.role !== "coords") ? "place" : "coords";
}

/**
 * The Location entry: how its column is read, then that form's own rows -- the latitude and
 * longitude pair, one column of coordinates, or a column of place names with its place type and
 * the column that narrows it. Each pick designates it in the element (`data.knownFields`), one
 * undo step; until then the columns the element found are shown. The minus writes
 * `nodeLocationRole: "none"`, so the element stops finding one.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.shown - `layout.locationColumns()`
 * @param props.choices - the node columns offered
 * @param props.opened - the entry was just added: its "Read as" list opens
 * @param props.onDropped - the list closed with no pick on an entry just added
 * @param props.onRemove - called once the minus was pressed
 * @param props.onFail - called when the element refuses the change
 * @returns the entry and its rows
 */
function LocationEntry({
    session,
    shown,
    choices,
    opened,
    onDropped,
    onRemove,
    onFail,
}: Readonly<{
    session: GraphSession;
    shown: LocationColumns;
    choices: readonly string[];
    opened: boolean;
    onDropped: () => void;
    onRemove: () => void;
    onFail: () => void;
}>): React.JSX.Element {
    // A form picked before any of its columns is: the element still reads the old one.
    const [asked, setAsked] = useState<LocationMode | null>(null);
    const present = shown.from !== "none";
    const mode = asked ?? (present ? modeOf(shown) : null);
    // What the element found is only preselected: picking it designates it.
    const repick = shown.from === "detected";
    const pair = present && modeOf(shown) === "pair";
    const column = present && !pair ? shown.location : null;
    const placeType = PLACE_TYPES.find((type) => type.value === shown.role)?.value ?? "auto";
    const write = (fields: Partial<LocationWrite>): void => {
        session.config
            .set({
                data: {
                    knownFields: {
                        nodeLocationPath: null,
                        nodeLatitudePath: null,
                        nodeLongitudePath: null,
                        nodeLocationWithinPath: null,
                        nodeLocationRole: "coords",
                        ...fields,
                    },
                },
            })
            .catch(onFail);
    };
    const place = (at: string | null, role: LocationWrite["nodeLocationRole"], within: string | null): void => {
        if (at !== null) {
            write({ nodeLocationPath: at, nodeLocationRole: role, nodeLocationWithinPath: within });
        }
    };
    const entry = FIELD_ENTRIES.nodes.find((each) => each.id === "location") ?? { id: "location", name: "Location" };
    return (
        <>
            <EntryRow
                side="nodes"
                entry={entry}
                name="Location read as"
                value={mode}
                choices={LOCATION_MODES}
                opened={opened}
                onPick={(next) => {
                    setAsked(next as LocationMode);
                }}
                onDropped={onDropped}
                onRemove={() => {
                    setAsked(null);
                    onRemove();
                    write({ nodeLocationRole: "none" });
                }}
            />
            {mode === "pair" ? (
                <>
                    <PickRow
                        sub
                        label="Latitude"
                        repick={repick}
                        value={pair ? shown.latitude : null}
                        choices={choices}
                        onPick={(picked) => {
                            write({ nodeLatitudePath: picked, nodeLongitudePath: pair ? shown.longitude : null });
                        }}
                    />
                    <PickRow
                        sub
                        label="Longitude"
                        repick={repick}
                        value={pair ? shown.longitude : null}
                        choices={choices}
                        onPick={(picked) => {
                            write({ nodeLatitudePath: pair ? shown.latitude : null, nodeLongitudePath: picked });
                        }}
                    />
                </>
            ) : null}
            {mode === "coords" ? (
                <PickRow
                    sub
                    label="Column"
                    name="Location column"
                    repick={repick}
                    value={column}
                    choices={choices}
                    onPick={(picked) => {
                        write({ nodeLocationPath: picked });
                    }}
                />
            ) : null}
            {mode === "place" ? (
                <>
                    <PickRow
                        sub
                        label="Column"
                        name="Location column"
                        repick={repick}
                        value={column}
                        choices={choices}
                        onPick={(picked) => {
                            place(picked, placeType, shown.within);
                        }}
                    />
                    <PickRow
                        sub
                        label="Place type"
                        value={placeType}
                        choices={PLACE_TYPES}
                        onPick={(picked) => {
                            place(
                                column,
                                PLACE_TYPES.find((type) => type.value === picked)?.value ?? "auto",
                                shown.within,
                            );
                        }}
                    />
                    <PickRow
                        sub
                        label="Within"
                        withNone
                        value={column === null ? null : shown.within}
                        choices={choices}
                        onPick={(picked) => {
                            place(column, placeType, picked);
                        }}
                    />
                </>
            ) : null}
        </>
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
    // Read once a render: it reads every node's values.
    const located = side === "nodes" ? session?.layout.locationColumns() : undefined;
    const holderOf = (entry: FieldEntry): string | null => {
        if (entry.role !== undefined) {
            return roleHolder(attributes, side, entry.role);
        }
        return entry.load !== undefined && reloadable ? loadValue(roles, entry.load) : null;
    };
    const present = (entry: FieldEntry): boolean =>
        entry.id === "location" ? located !== undefined && located.from !== "none" : holderOf(entry) !== null;
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
        const name = entry.load === undefined ? `${SIDE_WORD[side]} ${entry.name.toLowerCase()}` : entry.name;
        if (entry.id === "location" && located !== undefined) {
            return (
                <LocationEntry
                    key={entry.id}
                    session={session}
                    shown={located}
                    choices={columnChoices(attributes, source, "nodes", null)}
                    opened={opened}
                    onDropped={drop}
                    onRemove={() => {
                        setAdding(null);
                        focusPlus();
                    }}
                    onFail={onFail}
                />
            );
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
                    choices={endKind ? kindChoices(roles, holder) : columnChoices(attributes, source, side, holder)}
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
        const offeredColumns = numeric ? attributes.filter((a) => isNumeric(a) || a.name === holder) : attributes;
        if (entry.id === "time") {
            return (
                <TimeEntry
                    key={entry.id}
                    session={session}
                    store={store}
                    common={common}
                    offered={offeredColumns}
                    source={source}
                    onRemove={focusPlus}
                />
            );
        }
        const meaning = session.config.data.knownFields.edgeWeightMeaning ?? null;
        return (
            <React.Fragment key={entry.id}>
                <EntryRow
                    {...common}
                    choices={columnChoices(offeredColumns, source, side, holder)}
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
                        name="Higher weight means"
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
    const isTime = (name: string): boolean =>
        offered.find((a) => a.kind === kind && a.name === name)?.measurement === "time";
    const names = columnChoices(offered, source, side, holder);
    const column = offered.find((a) => a.kind === kind && a.name === holder);
    const unit = UNIT_CHOICES.find((choice) => choice.value === unitOf(session))?.label ?? null;
    return (
        <>
            <EntryRow
                {...common}
                choices={[...names.filter(isTime), ...names.filter((name) => !isTime(name))]}
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
 * The Fields section (spec section 3.3), for the selected load: its name, then Rows are (for a
 * load of one table), then each side under its node or edge chip -- its fixed structure rows (the
 * node Id; an edge's Source and Target, the shared-ids choice when an id appears under two kinds,
 * and the graph's direction), which always hold a value, then its list of special fields with a
 * "+" at the chip's right end (Label, Kind, Weight, Time and Location of nodes; Weight, Time,
 * Kind, Id and the kinds of the two ends of edges), each with its settings indented under it. A
 * setting row changes the element's role in place (`data.setRole`); a row read when the rows load
 * reads the load again (`data.reloadSource`). Rows are: edges on a table of nodes asks for Source
 * and Target first and reads the load again once both are picked. Each change is one undo step.
 * @param props - Component props
 * @param props.source - the selected load, or undefined when the graph was not loaded from one
 * @returns the section, or nothing before the element has come up
 */
export function Fields({ source }: Readonly<{ source: LoadedSource | undefined }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const held = useWorkspaceState((state) => state.ends);
    useTimeVersion(session);
    if (session === null) {
        return null;
    }
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
        <ControlSection label="Fields" empty={sides.length === 0 && ends === null}>
            <div className="dp-fields">
                {source === undefined ? null : (
                    <Text size="xs" fw={600} truncate className="dp-fields-source">
                        {source.name}
                    </Text>
                )}
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
        </ControlSection>
    );
}
