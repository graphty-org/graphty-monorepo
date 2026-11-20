import { ComboInput, FieldRow, SegmentedControl } from "@graphty/compact-mantine";
import type {
    GraphSession,
    LoadedSource,
    SourceMappingPatch,
    SourceTableMapping,
} from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Kbd, Menu, Select, Text } from "@mantine/core";
import React, { useId } from "react";

import { sourceName } from "../data-place/words";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { ariaKey, formatKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { remap, removeStaged, startAdd } from "./actions";
import { AddCard } from "./AddCard";
import { type Choice, spaceChoices } from "./join";
import { JoinButton } from "./JoinButton";
import { ADD_KEY } from "./keys";
import { distinctWords, fileWords, repeatsWords, replaceWords, ROWS_ARE, STAGED_WORDS } from "./words";

/** The edge end a row edits. */
type End = "source" | "target";

/**
 * One labeled row: the words, then the control, as the Fields rows draw them.
 * @param props - Component props
 * @param props.label - the row's words
 * @param props.children - the control, given the id its label points at
 * @returns the row
 */
function LabeledRow({
    label,
    children,
}: Readonly<{ label: string; children: (id: string) => React.ReactNode }>): React.JSX.Element {
    const id = useId();
    return (
        <FieldRow>
            <Text component="label" htmlFor={id} size="xs" truncate>
                {label}
            </Text>
            {children(id)}
        </FieldRow>
    );
}

/**
 * A row showing a fact: its words and its value.
 * @param props - Component props
 * @param props.label - the words
 * @param props.value - the value
 * @returns the row
 */
function FactRow({ label, value }: Readonly<{ label: string; value: string }>): React.JSX.Element {
    return (
        <FieldRow>
            <Text size="xs" truncate>
                {label}
            </Text>
            <Text size="xs" truncate aria-label={label}>
                {value}
            </Text>
        </FieldRow>
    );
}

/**
 * A column picker.
 * @param props - Component props
 * @param props.id - the id its label points at
 * @param props.name - its accessible name
 * @param props.columns - the columns offered
 * @param props.value - the column picked, or null
 * @param props.onPick - takes a pick
 * @returns the picker
 */
function ColumnSelect({
    id,
    name,
    columns,
    value,
    onPick,
}: Readonly<{
    id: string;
    name: string;
    columns: readonly string[];
    value: string | null;
    onPick: (column: string) => void;
}>): React.JSX.Element {
    return (
        <Select
            id={id}
            size="xs"
            aria-label={name}
            allowDeselect={false}
            data={[...columns]}
            value={value}
            onChange={(next) => {
                if (next !== null && next !== value) {
                    onPick(next);
                }
            }}
        />
    );
}

/**
 * Names as choices that read as themselves: the types.
 * @param names - the names.
 * @returns the choices.
 */
function plain(names: readonly string[]): readonly Choice[] {
    return names.map((each) => ({ value: each, label: each }));
}

/**
 * A name picker that also takes a new name typed in: a Type or a Space. It shows each choice's
 * label and writes its value; text that is no choice's label is a new name.
 * @param props - Component props
 * @param props.name - its accessible name
 * @param props.choices - the names offered
 * @param props.value - the name now, or undefined while unset
 * @param props.placeholder - what an unset one reads
 * @param props.onPick - takes a name, or null when emptied
 * @returns the picker
 */
function NamePicker({
    name,
    choices,
    value,
    placeholder,
    onPick,
}: Readonly<{
    name: string;
    choices: readonly Choice[];
    value: string | undefined;
    placeholder: string;
    onPick: (next: string | null) => void;
}>): React.JSX.Element {
    const shown = choices.find((each) => each.value === value)?.label ?? value ?? "";
    return (
        <ComboInput
            label={name}
            width="100%"
            variant="outlined"
            placeholder={placeholder}
            options={choices.map((each) => ({ value: each.label }))}
            value={shown}
            onChange={(next) => {
                const text = String(next).trim();
                if (text !== shown) {
                    onPick(text === "" ? null : (choices.find((each) => each.label === text)?.value ?? text));
                }
            }}
        />
    );
}

/**
 * One edge end's rows: its column, its type, and its space with how many of its values meet a node
 * there (`data.matchCounts`).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.source - the staged source
 * @param props.end - which end
 * @param props.columns - the columns offered
 * @param props.column - the column picked, or null while none is
 * @param props.mapping - what the rows are for now
 * @param props.onColumn - takes a column pick
 * @param props.onChange - writes a change
 * @returns the rows
 */
function EndRows({
    session,
    source,
    end,
    columns,
    column,
    mapping,
    onColumn,
    onChange,
}: Readonly<{
    session: GraphSession;
    source: LoadedSource;
    end: End;
    columns: readonly string[];
    column: string | null;
    mapping: SourceTableMapping;
    onColumn: (column: string) => void;
    onChange: (patch: SourceMappingPatch) => void;
}>): React.JSX.Element {
    const label = end === "source" ? STAGED_WORDS.from : STAGED_WORDS.to;
    const space = end === "source" ? mapping.edges?.sourceSpace : mapping.edges?.targetSpace;
    const meets =
        column === null || space === undefined || mapping.edges === undefined
            ? null
            : session.data.matchCounts({ from: { source: source.key, field: column }, into: { space } }).matched;
    const types = session.data
        .types()
        .filter((type) => type.kind === "node")
        .map((type) => type.name);
    const spaces = spaceChoices(session);
    return (
        <>
            <LabeledRow label={label}>
                {(id) => <ColumnSelect id={id} name={label} columns={columns} value={column} onPick={onColumn} />}
            </LabeledRow>
            {mapping.edges === undefined ? null : (
                <>
                    <FieldRow>
                        <NamePicker
                            name={`${label} ${STAGED_WORDS.type.toLowerCase()}`}
                            choices={plain(types)}
                            value={mapping.endTypes?.[end]}
                            placeholder={STAGED_WORDS.type}
                            onPick={(next) => {
                                onChange({ endTypes: { [end]: next } });
                            }}
                        />
                        <NamePicker
                            name={`${label} ${STAGED_WORDS.space.toLowerCase()}`}
                            choices={spaces}
                            value={space}
                            placeholder={STAGED_WORDS.unset}
                            onPick={(next) => {
                                if (next !== null) {
                                    onChange({
                                        edges: end === "source" ? { sourceSpace: next } : { targetSpace: next },
                                    });
                                }
                            }}
                        />
                    </FieldRow>
                    {meets === null ? null : (
                        <FactRow label={`${label} ${STAGED_WORDS.meets}`} value={formatNumber(meets)} />
                    )}
                </>
            )}
        </>
    );
}

/**
 * The node rows' Key, Space, Distinct, Repeats and Type.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.source - the staged source
 * @param props.columns - the node table's columns
 * @param props.mapping - what the rows are for now
 * @param props.onChange - writes a change
 * @returns the rows
 */
function NodeRows({
    session,
    source,
    columns,
    mapping,
    onChange,
}: Readonly<{
    session: GraphSession;
    source: LoadedSource;
    columns: readonly string[];
    mapping: SourceTableMapping;
    onChange: (patch: SourceMappingPatch) => void;
}>): React.JSX.Element {
    const profile =
        mapping.key === undefined
            ? null
            : session.data.sourceTable(source.key).profile(mapping.key, { table: "nodes" });
    const types = session.data
        .types()
        .filter((type) => type.kind === "node")
        .map((type) => type.name);
    return (
        <>
            <LabeledRow label={STAGED_WORDS.key}>
                {(id) => (
                    <ColumnSelect
                        id={id}
                        name={STAGED_WORDS.key}
                        columns={columns}
                        value={mapping.key ?? null}
                        onPick={(key) => {
                            onChange({ nodes: { key } });
                        }}
                    />
                )}
            </LabeledRow>
            <FieldRow>
                <Text size="xs">{STAGED_WORDS.space}</Text>
                <NamePicker
                    name={STAGED_WORDS.space}
                    choices={spaceChoices(session)}
                    value={mapping.space}
                    placeholder={STAGED_WORDS.unset}
                    onPick={(next) => {
                        if (next !== null) {
                            onChange({ space: next });
                        }
                    }}
                />
            </FieldRow>
            {profile === null ? null : (
                <>
                    <FactRow label={STAGED_WORDS.distinct} value={distinctWords(profile.distinct)} />
                    <FactRow label={STAGED_WORDS.repeats} value={repeatsWords(profile.repeated)} />
                </>
            )}
            <FieldRow>
                <Text size="xs">{STAGED_WORDS.type}</Text>
                <NamePicker
                    name={STAGED_WORDS.type}
                    choices={plain(types)}
                    value={mapping.type}
                    placeholder={STAGED_WORDS.type}
                    onPick={(next) => {
                        onChange({ type: next });
                    }}
                />
            </FieldRow>
        </>
    );
}

/**
 * A staged source's own dashed section (design 5.1, the source-steps experiment): never drawn,
 * matched or preselected. It shows the file's size and rows and lets the reader say what its rows
 * are (Rows are, Key, Space, Type, and each edge end with its space and how many of its values
 * meet a node there), with the key's distinct and repeated values. Add (Shift+D) adds it; Replace
 * <name> shows when a committed source has its name. Its menu holds Remove. Every fact is the
 * element's (`data.sourceTable`, `data.matchCounts`); every change is `data.setMapping`.
 * @param props - Component props
 * @param props.source - the staged source
 * @returns the section
 */
export function StagedSection({ source }: Readonly<{ source: LoadedSource }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const card = useWorkspaceState((state) => state.sourceCard);
    // Edges picked in Rows are before both ends are: held in the store until they are, then written.
    // Add waits for them, since the element still holds the old rows.
    const rowsLabel = useId();
    const pending = useWorkspaceState((state) => state.stagedEnds);
    const wanted = pending?.source === source.key ? pending : null;
    const setWanted = (next: { rows: "edges" | "both"; from: string | null; to: string | null } | null): void => {
        store.set({ stagedEnds: next === null ? null : { source: source.key, ...next } });
    };
    if (session === null) {
        return null;
    }
    const name = sourceName(source);
    const facts = session.data.sourceTable(source.key).summary();
    const { mapping } = facts;
    const rows = facts.tables.reduce((sum, table) => sum + table.rows, 0);
    const nodeColumns = facts.tables.find((table) => table.table === "nodes")?.columns ?? [];
    const edgeColumns = facts.tables.find((table) => table.table === "edges")?.columns ?? nodeColumns;
    const change = (patch: SourceMappingPatch): void => {
        void remap(store, session, source.key, patch);
    };
    const pickRows = (next: string): void => {
        if (next === mapping.rows) {
            setWanted(null);
            return;
        }
        if (next === "nodes" || mapping.edges !== undefined) {
            setWanted(null);
            change({ rows: next as SourceTableMapping["rows"] });
            return;
        }
        setWanted({ rows: next === "both" ? "both" : "edges", from: null, to: null });
    };
    const pickEnd = (end: End, column: string): void => {
        if (wanted === null) {
            change({ edges: { [end]: column } });
            return;
        }
        const next = {
            rows: wanted.rows,
            from: wanted.from,
            to: wanted.to,
            [end === "source" ? "from" : "to"]: column,
        };
        if (next.from !== null && next.to !== null) {
            setWanted(null);
            change({ rows: next.rows, edges: { source: next.from, target: next.to } });
        } else {
            setWanted(next);
        }
    };
    const shownRows = wanted?.rows ?? mapping.rows;
    const withEdges = shownRows !== "nodes";
    const same =
        source.sameName === undefined ? undefined : session.data.sources().find((each) => each.key === source.sameName);
    const adding = card?.kind === "add" && card.source === source.key;
    // While the Join card is open every staged section shows only its name (design 7.1).
    const collapsed = card?.kind === "join";
    const head = (
        <div className="ss-staged-head">
            <Text size="xs" fw={600} truncate className="ss-staged-name">
                {name}
            </Text>
            <Menu position="bottom-end">
                <Menu.Target>
                    <ActionIcon variant="subtle" size="sm" aria-label={`${name} menu`}>
                        <GLYPHS.more size={14} aria-hidden />
                    </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item
                        leftSection={<GLYPHS.delete size={14} aria-hidden />}
                        onClick={() => {
                            void removeStaged(store, session, source.key);
                        }}
                    >
                        {STAGED_WORDS.remove}
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </div>
    );
    if (collapsed) {
        return (
            <section className="ss-staged" data-staged={source.key} aria-label={name}>
                {head}
            </section>
        );
    }
    return (
        <section className="ss-staged" data-staged={source.key} aria-label={name}>
            {head}
            <FactRow label={STAGED_WORDS.file} value={fileWords(facts.size, rows)} />
            <Text size="xs" id={rowsLabel}>
                {STAGED_WORDS.rowsAre}
            </Text>
            {/* The label above, and each choice as wide as its words plus an even share of the rest
                (Mantine splits the width evenly), so "Nodes + edges" fits the 240px panel. */}
            <SegmentedControl
                size="xs"
                fullWidth
                styles={{ control: { flex: "1 1 auto" } }}
                aria-labelledby={rowsLabel}
                value={shownRows}
                data={ROWS_ARE.map((each) => ({ value: each.value, label: each.label }))}
                onChange={pickRows}
            />
            {shownRows === "edges" ? null : (
                <NodeRows session={session} source={source} columns={nodeColumns} mapping={mapping} onChange={change} />
            )}
            {withEdges
                ? (["source", "target"] as const).map((end) => (
                      <EndRows
                          key={end}
                          session={session}
                          source={source}
                          end={end}
                          columns={edgeColumns}
                          column={
                              wanted === null
                                  ? (mapping.edges?.[end] ?? null)
                                  : wanted[end === "source" ? "from" : "to"]
                          }
                          mapping={wanted === null ? mapping : { rows: wanted.rows }}
                          onColumn={(column) => {
                              pickEnd(end, column);
                          }}
                          onChange={change}
                      />
                  ))
                : null}
            {adding ? (
                <AddCard session={session} />
            ) : (
                <Group gap={6} className="ss-staged-acts">
                    <JoinButton start={{ field2: source.key }} disabled={wanted !== null} />
                    <Button
                        size="compact-xs"
                        variant="default"
                        rightSection={<Kbd size="xs">{formatKey(ADD_KEY)}</Kbd>}
                        aria-keyshortcuts={ariaKey(ADD_KEY)}
                        disabled={card !== null || wanted !== null}
                        onClick={() => {
                            void startAdd(store, session, source.key);
                        }}
                    >
                        {STAGED_WORDS.add}
                    </Button>
                    {same === undefined ? null : (
                        // Replacing waits for graphty-element's draft.replace (stage 6 of the design).
                        <Button size="compact-xs" variant="default" disabled>
                            {replaceWords(sourceName(same))}
                        </Button>
                    )}
                </Group>
            )}
        </section>
    );
}
