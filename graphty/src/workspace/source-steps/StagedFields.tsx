import { ComboInput, FieldRow, SegmentedControl } from "@graphty/compact-mantine";
import type {
    GraphSession,
    LoadedSource,
    SourceMappingPatch,
    SourceTableMapping,
} from "@graphty/graphty-element/session";
import { Select, Text } from "@mantine/core";
import React, { useId } from "react";

import { formatNumber } from "../inspector/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type Choice, spaceChoices } from "./join";
import { distinctWords, repeatsWords, ROWS_ARE, STAGED_WORDS } from "./words";

/** What reads a staged source's rows: the committed sources, or the join workspace's draft. */
type Reader = Pick<GraphSession["data"], "sourceTable" | "matchCounts">;

/** The edge end a row edits. */
type End = "source" | "target";

/**
 * A row of a label and its control: the sidebar's Fields row, or a join card's, as wide as the card.
 * @param props - Component props
 * @param props.full - whether it is a join card's
 * @param props.children - the label and the control
 * @returns the row
 */
function StagedRow({ full, children }: Readonly<{ full: boolean; children: React.ReactNode }>): React.JSX.Element {
    return full ? <div className="jw-row">{children}</div> : <FieldRow>{children}</FieldRow>;
}

/**
 * One labeled row: the words, then the control, as the Fields rows draw them.
 * @param props - Component props
 * @param props.full - whether it is a join card's row
 * @param props.label - the row's words
 * @param props.children - the control, given the id its label points at
 * @returns the row
 */
function LabeledRow({
    full,
    label,
    children,
}: Readonly<{ full: boolean; label: string; children: (id: string) => React.ReactNode }>): React.JSX.Element {
    const id = useId();
    return (
        <StagedRow full={full}>
            <Text component="label" htmlFor={id} size="xs" truncate>
                {label}
            </Text>
            {children(id)}
        </StagedRow>
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
        <StagedRow full>
            <Text size="xs" truncate>
                {label}
            </Text>
            <Text size="xs" truncate aria-label={label}>
                {value}
            </Text>
        </StagedRow>
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
 * How a staged source's rows are read: Rows are, then Key for node rows and From and To for edge
 * rows. With `full` (the join workspace's card) it also shows each node or end's Space and Type,
 * the key's distinct and repeated values, and how many of an end's values meet a node in its
 * space. Edges picked in Rows are before both ends are wait in the store until both are, then are
 * written. Every fact is the element's; every change is `write` (`data.setMapping`, or the draft's
 * `setMapping` while a draft is open).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.reader - what reads the source's rows: `session.data` or the open draft
 * @param props.source - the staged source
 * @param props.full - also the Space, Type and key facts
 * @param props.write - writes a change
 * @returns the rows
 */
export function StagedRows({
    session,
    reader,
    source,
    full = false,
    write,
}: Readonly<{
    session: GraphSession;
    reader: Reader;
    source: LoadedSource;
    full?: boolean;
    write: (patch: SourceMappingPatch) => void;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const rowsLabel = useId();
    const pending = useWorkspaceState((state) => state.stagedEnds);
    const wanted = pending?.source === source.key ? pending : null;
    const setWanted = (next: { rows: "edges" | "both"; from: string | null; to: string | null } | null): void => {
        store.set({ stagedEnds: next === null ? null : { source: source.key, ...next } });
    };
    const facts = reader.sourceTable(source.key).summary();
    const { mapping } = facts;
    const nodeColumns = facts.tables.find((table) => table.table === "nodes")?.columns ?? [];
    const edgeColumns = facts.tables.find((table) => table.table === "edges")?.columns ?? nodeColumns;
    const pickRows = (next: string): void => {
        if (next === mapping.rows) {
            setWanted(null);
            return;
        }
        if (next === "nodes" || mapping.edges !== undefined) {
            setWanted(null);
            write({ rows: next as SourceTableMapping["rows"] });
            return;
        }
        setWanted({ rows: next === "both" ? "both" : "edges", from: null, to: null });
    };
    const pickEnd = (end: End, column: string): void => {
        if (wanted === null) {
            write({ edges: { [end]: column } });
            return;
        }
        const next = { ...wanted, [end === "source" ? "from" : "to"]: column };
        if (next.from !== null && next.to !== null) {
            setWanted(null);
            write({ rows: next.rows, edges: { source: next.from, target: next.to } });
        } else {
            setWanted(next);
        }
    };
    const shownRows = wanted?.rows ?? mapping.rows;
    const types = plain(
        session.data
            .types()
            .filter((type) => type.kind === "node")
            .map((type) => type.name),
    );
    const spaces = spaceChoices(session);
    const profile =
        full && mapping.key !== undefined && shownRows !== "edges"
            ? reader.sourceTable(source.key).profile(mapping.key, { table: "nodes" })
            : null;
    return (
        <>
            <Text size="xs" id={rowsLabel}>
                {STAGED_WORDS.rowsAre}
            </Text>
            {/* Each choice as wide as its words plus an even share of the rest (Mantine splits the
                width evenly), so "Nodes + edges" fits the 240px panel. */}
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
                <LabeledRow full={full} label={STAGED_WORDS.key}>
                    {(id) => (
                        <ColumnSelect
                            id={id}
                            name={STAGED_WORDS.key}
                            columns={nodeColumns}
                            value={mapping.key ?? null}
                            onPick={(key) => {
                                write({ nodes: { key } });
                            }}
                        />
                    )}
                </LabeledRow>
            )}
            {full && shownRows !== "edges" ? (
                <>
                    <StagedRow full>
                        <Text size="xs">{STAGED_WORDS.space}</Text>
                        <NamePicker
                            name={STAGED_WORDS.space}
                            choices={spaces}
                            value={mapping.space}
                            placeholder={STAGED_WORDS.unset}
                            onPick={(next) => {
                                if (next !== null) {
                                    write({ space: next });
                                }
                            }}
                        />
                    </StagedRow>
                    {profile === null ? null : (
                        <>
                            <FactRow label={STAGED_WORDS.distinct} value={distinctWords(profile.distinct)} />
                            <FactRow label={STAGED_WORDS.repeats} value={repeatsWords(profile.repeated)} />
                        </>
                    )}
                    <StagedRow full>
                        <Text size="xs">{STAGED_WORDS.type}</Text>
                        <NamePicker
                            name={STAGED_WORDS.type}
                            choices={types}
                            value={mapping.type}
                            placeholder={STAGED_WORDS.type}
                            onPick={(next) => {
                                write({ type: next });
                            }}
                        />
                    </StagedRow>
                </>
            ) : null}
            {shownRows === "nodes"
                ? null
                : (["source", "target"] as const).map((end) => {
                      const label = end === "source" ? STAGED_WORDS.from : STAGED_WORDS.to;
                      const column =
                          wanted === null ? (mapping.edges?.[end] ?? null) : wanted[end === "source" ? "from" : "to"];
                      const space = end === "source" ? mapping.edges?.sourceSpace : mapping.edges?.targetSpace;
                      let meets: number | null = null;
                      if (full && wanted === null && column !== null && space !== undefined) {
                          try {
                              meets = reader.matchCounts({
                                  from: { source: source.key, field: column },
                                  into: { space },
                              }).matched;
                          } catch {
                              meets = null;
                          }
                      }
                      return (
                          <React.Fragment key={end}>
                              <LabeledRow full={full} label={label}>
                                  {(id) => (
                                      <ColumnSelect
                                          id={id}
                                          name={label}
                                          columns={edgeColumns}
                                          value={column}
                                          onPick={(picked) => {
                                              pickEnd(end, picked);
                                          }}
                                      />
                                  )}
                              </LabeledRow>
                              {full && wanted === null && mapping.edges !== undefined ? (
                                  <StagedRow full>
                                      <NamePicker
                                          name={`${label} ${STAGED_WORDS.type.toLowerCase()}`}
                                          choices={types}
                                          value={mapping.endTypes?.[end]}
                                          placeholder={STAGED_WORDS.type}
                                          onPick={(next) => {
                                              write({ endTypes: { [end]: next } });
                                          }}
                                      />
                                      <NamePicker
                                          name={`${label} ${STAGED_WORDS.space.toLowerCase()}`}
                                          choices={spaces}
                                          value={space}
                                          placeholder={STAGED_WORDS.unset}
                                          onPick={(next) => {
                                              if (next !== null) {
                                                  write({
                                                      edges:
                                                          end === "source"
                                                              ? { sourceSpace: next }
                                                              : { targetSpace: next },
                                                  });
                                              }
                                          }}
                                      />
                                  </StagedRow>
                              ) : null}
                              {meets === null ? null : (
                                  <FactRow label={`${label} ${STAGED_WORDS.meets}`} value={formatNumber(meets)} />
                              )}
                          </React.Fragment>
                      );
                  })}
        </>
    );
}
