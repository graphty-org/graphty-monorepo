import { ControlSection, EntityChip, FieldRow } from "@graphty/compact-mantine";
import type { ColumnRole, GraphSession, LoadedSource } from "@graphty/graphty-element/session";
import { Select, Text } from "@mantine/core";
import React from "react";

import { formatNumber } from "../inspector/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { pickEnd } from "./commands";
import {
    columnChoices,
    DIRECTIONS,
    FIELD_ROWS,
    type FieldRow as FieldRowSpec,
    type FieldSide,
    isNumeric,
    KIND_OF,
    kindChoices,
    loadValue,
    remap,
    roleHolder,
    ROWS_ARE,
    sidesOf,
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
 * The Fields section (spec section 3.3), for the selected load: its name, then Rows are (for a
 * load of one table), then its special fields grouped under a node chip and an edge chip -- Id,
 * Label, Kind and Node time of its nodes; Source, Target, Weight (numbers only, with what it
 * means), Edge time and the kinds of the two ends of its edges -- the shared-ids choice when an id
 * appears under two kinds, and the graph's direction. A setting row changes the element's role in
 * place (`data.setRole`); a row read when the rows load reads the load again
 * (`data.reloadSource`). Rows are: edges on a table of nodes asks for Source and Target first and
 * reads the load again once both are picked. Each change is one undo step. No list of the other
 * columns: every column is in the table.
 * @param props - Component props
 * @param props.source - the selected load, or undefined when the graph was not loaded from one
 * @returns the section, or nothing before the element has come up
 */
export function Fields({ source }: Readonly<{ source: LoadedSource | undefined }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const held = useWorkspaceState((state) => state.ends);
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
    const own = sidesOf(source);
    const sides: FieldSide[] =
        ends === null
            ? (["nodes", "edges"] as const).filter((side) =>
                  own === undefined
                      ? attributes.some((a) => a.kind === KIND_OF[side]) || tableRoles(source, side) !== undefined
                      : own.includes(side),
              )
            : [];
    const rowOf = (row: FieldRowSpec): React.JSX.Element | null => {
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
        const offered = role === "weight" ? attributes.filter((a) => isNumeric(a) || a.name === holder) : attributes;
        return (
            <PickRow
                key={id}
                label={row.label}
                value={holder}
                choices={columnChoices(offered, source, row.side, holder)}
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
    const rowsOf = (side: FieldSide): (React.JSX.Element | null)[] =>
        FIELD_ROWS.filter((row) => row.side === side).map(rowOf);

    const { knownFields, directed } = session.config.data;
    const weighted = roleHolder(attributes, "edges", "weight") !== null;
    const kinds = source?.reloadable === true ? session.data.lastImport()?.kinds : undefined;
    const { totalNodes, totalEdges } = session.visibility.summary;
    const edgeRows = rowsOf("edges");
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
                        withNone={false}
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
                    <>
                        <div className="dp-fields-group">
                            <EntityChip kind="node">{formatNumber(source?.counts.nodes ?? totalNodes)}</EntityChip>
                        </div>
                        {rowsOf("nodes")}
                    </>
                ) : null}
                {sides.includes("edges") ? (
                    <>
                        <div className="dp-fields-group">
                            <EntityChip kind="edge">{formatNumber(source?.counts.edges ?? totalEdges)}</EntityChip>
                        </div>
                        {edgeRows.slice(0, 3)}
                        {weighted ? (
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
                                                        null) as typeof knownFields.edgeWeightMeaning,
                                                },
                                            },
                                        })
                                        .catch(fail);
                                }}
                            />
                        ) : null}
                        {edgeRows.slice(3)}
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
                    </>
                ) : null}
            </div>
        </ControlSection>
    );
}
