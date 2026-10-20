import { ControlSection, FieldRow } from "@graphty/compact-mantine";
import type { ColumnRole, GraphSession, LoadedSource, TableMapping } from "@graphty/graphty-element/session";
import { Select, Text } from "@mantine/core";
import React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import {
    columnChoices,
    DIRECTIONS,
    FIELD_ROWS,
    type FieldRow as FieldRowSpec,
    type FieldSide,
    KIND_OF,
    kindChoices,
    loadValue,
    roleHolder,
    tableRoles,
    WEIGHT_MEANINGS,
} from "./words";

/** The Select value that means no column. */
const NONE = "__none__";

/** What an id that appears under two kinds makes. */
const SHARED_IDS = ["Same node", "Different nodes"];

/**
 * One dropdown row: its label and a pick list of `none` and the choices.
 * @param props - Component props
 * @param props.label - the row's label
 * @param props.name - the dropdown's accessible name, when not the label
 * @param props.withNone - whether `none` is offered (false for a row that always holds a choice)
 * @param props.value - the choice now, or null for none
 * @param props.choices - what it offers
 * @param props.onPick - takes the picked choice, or null for none
 * @returns the row
 */
function PickRow({
    label,
    name = label,
    value,
    choices,
    withNone = true,
    onPick,
}: Readonly<{
    label: string;
    name?: string;
    value: string | null;
    choices: readonly string[];
    withNone?: boolean;
    onPick: (value: string | null) => void;
}>): React.JSX.Element {
    const none = withNone ? [{ value: NONE, label: "none" }] : [];
    return (
        <FieldRow>
            <Text size="xs" truncate>
                {label}
            </Text>
            <Select
                size="xs"
                aria-label={name}
                allowDeselect={false}
                data={[...none, ...choices.map((choice) => ({ value: choice, label: choice }))]}
                value={value ?? NONE}
                onChange={(picked) => {
                    const next = picked === null || picked === NONE ? null : picked;
                    if (next !== value) {
                        onPick(next);
                    }
                }}
            />
        </FieldRow>
    );
}

/**
 * A load-time mapping that changes one role, in the shape the load's table is named by: a bare
 * mapping for a load of one table, the table by id otherwise.
 * @param source - the load.
 * @param side - which table.
 * @param roles - the roles to change.
 * @returns the mapping.
 */
function remap(
    source: LoadedSource,
    side: FieldSide,
    roles: TableMapping,
): TableMapping | { tables: Record<string, TableMapping> } {
    const tables = Object.entries(source.mapping?.tables ?? {});
    const id = tables.find(([, table]) => table.rowsAre === side)?.[0];
    return tables.length <= 1 || id === undefined ? roles : { tables: { [id]: roles } };
}

/**
 * The Fields section (spec section 3.3): one row per special field of the selected load -- Id,
 * Label, Kind and Time of its nodes; Source, Target, Weight (with what it means), Time and the
 * kinds of the two ends of its edges -- then the graph's direction, and the shared-ids choice when
 * an id appears under two kinds. A setting row changes the element's role in place
 * (`data.setRole`); a row read when the rows load reads the load again (`data.reloadSource`).
 * Each change is one undo step. No list of the other columns: every column is in the table.
 * @param props - Component props
 * @param props.source - the selected load, or undefined when the graph was not loaded from one
 * @returns the section, or nothing before the element has come up
 */
export function Fields({ source }: Readonly<{ source: LoadedSource | undefined }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
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
    const sides: FieldSide[] = (["nodes", "edges"] as const).filter(
        (side) => attributes.some((a) => a.kind === KIND_OF[side]) || tableRoles(source, side) !== undefined,
    );
    const rowOf = (row: FieldRowSpec): React.JSX.Element | null => {
        if (!sides.includes(row.side)) {
            return null;
        }
        const id = `${row.side}:${row.key}`;
        if (row.atLoad) {
            const roles = tableRoles(source, row.side);
            if (source?.reloadable !== true || roles === undefined) {
                // Read when the rows load, and this load cannot be read again here.
                return null;
            }
            const value = loadValue(roles, row.key);
            const kindRow = row.key === "sourceKind" || row.key === "targetKind";
            return (
                <PickRow
                    key={id}
                    label={row.label}
                    value={value}
                    choices={kindRow ? kindChoices(roles, value) : columnChoices(attributes, source, row.side, value)}
                    onPick={(picked) => {
                        reload({ mapping: remap(source, row.side, { [row.key]: picked }) });
                    }}
                />
            );
        }
        const role = row.key as ColumnRole;
        const holder = roleHolder(attributes, row.side, role);
        const kind = KIND_OF[row.side];
        return (
            <PickRow
                key={id}
                label={row.label}
                value={holder}
                choices={columnChoices(attributes, source, row.side, holder)}
                onPick={(picked) => {
                    // `none` takes the role from the column holding it.
                    const column = picked ?? holder;
                    if (column !== null) {
                        session.data.setRole({ kind, name: column }, picked === null ? null : role).catch(fail);
                    }
                }}
            />
        );
    };

    const { knownFields, directed } = session.config.data;
    const weighted = roleHolder(attributes, "edges", "weight") !== null;
    const kinds = source?.reloadable === true ? session.data.lastImport()?.kinds : undefined;
    const rows = FIELD_ROWS.map(rowOf);
    return (
        <ControlSection label="Fields" empty={sides.length === 0}>
            <div className="dp-fields">
                {rows.slice(0, 4)}
                {rows.slice(4, 7)}
                {sides.includes("edges") && weighted ? (
                    <PickRow
                        label="Meaning"
                        value={knownFields.edgeWeightMeaning ?? null}
                        choices={WEIGHT_MEANINGS.flatMap((m) => (m.value === "" ? [] : [m.value]))}
                        onPick={(meaning) => {
                            session.config
                                .set({
                                    data: {
                                        knownFields: {
                                            edgeWeightMeaning: (meaning ??
                                                undefined) as typeof knownFields.edgeWeightMeaning,
                                        },
                                    },
                                })
                                .catch(fail);
                        }}
                    />
                ) : null}
                {rows.slice(7)}
                {kinds === undefined || kinds.sharedIds === 0 ? null : (
                    <PickRow
                        label={`${String(kinds.sharedIds)} in both`}
                        name="Shared ids"
                        value={source?.choices?.kindIds === "scoped" ? "Different nodes" : "Same node"}
                        choices={SHARED_IDS}
                        withNone={false}
                        onPick={(picked) => {
                            reload({ kindIds: picked === "Different nodes" ? "scoped" : "shared" });
                        }}
                    />
                )}
                {sides.includes("edges") ? (
                    <PickRow
                        label="Direction"
                        value={DIRECTIONS.find((d) => d.value === String(directed))?.label ?? null}
                        choices={DIRECTIONS.map((d) => d.label)}
                        withNone={false}
                        onPick={(picked) => {
                            const value = DIRECTIONS.find((d) => d.label === picked)?.value ?? "auto";
                            const next = value === "auto" ? "auto" : value === "true";
                            session.config.set({ data: { directed: next } }).catch(fail);
                        }}
                    />
                ) : null}
            </div>
        </ControlSection>
    );
}
