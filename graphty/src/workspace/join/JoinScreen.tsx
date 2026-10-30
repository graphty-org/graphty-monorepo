import "./join.css";

import { DataTable, type DataTableColumn, EntityChip } from "@graphty/compact-mantine";
import type { GraphSession, JoinChoices, JoinReport, JoinRowFate } from "@graphty/graphty-element/session";
import { Badge, Button, Checkbox, HoverCard, Menu, SegmentedControl } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { columnChoices, headerIconsLabel, type RecordKind, type TableColumnChoice } from "../table/columns";
import { HeaderIcons } from "../table/HeaderCell";
import { RecordTable } from "../table/RecordTable";
import { useSessionVersion } from "../table/useSessionVersion";
import {
    closeJoin,
    draftSubject,
    editSubject,
    finishJoin,
    HOW_WORDS,
    howChoices,
    type JoinHow,
    type JoinSubject,
    type ReplaceTarget,
    replaceTargets,
} from "./commands";
import { MatchChips } from "./MatchChips";
import { MatchRow } from "./MatchRow";
import { type JoinShow, shownChips } from "./shownChips";

/** The smallest table drawn, while its pane is being measured. */
const MIN_TABLE_HEIGHT = 32;

/** About how wide one character of a table's text is drawn, in pixels. */
const CHAR_WIDTH = 7;
/** Room in an incoming header beside its name: type or key icon, include box, clash icon, caret. */
const HEADER_EXTRA = 96;
/** Room in a cell beside its text. */
const CELL_EXTRA = 16;
/** The narrowest and widest an incoming column is sized. */
const MIN_COLUMN = 88;
const MAX_COLUMN = 320;
/** How many rows a column's width is read from. */
const SIZED_ROWS = 200;

/**
 * An incoming column's width from its content: its name with the header's icons, or its longest
 * value in the first rows, whichever is wider, within bounds.
 * @param column - the column's name.
 * @param rows - the rows.
 * @returns the width, in pixels.
 */
function columnWidth(column: string, rows: readonly IncomingRow[]): number {
    let widest = column.length * CHAR_WIDTH + HEADER_EXTRA;
    for (const row of rows.slice(0, SIZED_ROWS)) {
        const value = cellValue(row.values[column]);
        widest = Math.max(widest, String(value ?? "").length * CHAR_WIDTH + CELL_EXTRA);
    }
    return Math.min(MAX_COLUMN, Math.max(MIN_COLUMN, widest));
}

/** A clash rule's words. */
const CLASH_RULES = [
    { value: "keep", label: "Keep" },
    { value: "overwrite", label: "Overwrite" },
    { value: "both", label: "Keep both" },
] as const;

/**
 * Whether a key went to an open menu or dropdown, which keeps its own Esc: focus is in the menu,
 * or on a dropdown's field while it reads expanded.
 * @param target - the key's target.
 * @returns true when an open menu or dropdown has it.
 */
function inOpenPopup(target: EventTarget | null): boolean {
    return (
        target instanceof Element &&
        (target.closest('[role="menu"], [role="listbox"]') !== null || target.getAttribute("aria-expanded") === "true")
    );
}

/** One incoming row as the table draws it: its place in the file, its values, its match, its fate. */
interface IncomingRow {
    readonly at: number;
    readonly values: Readonly<Record<string, unknown>>;
    readonly match: readonly (string | number)[];
    readonly fate: JoinRowFate | undefined;
}

/** What the join does with a row that adds nothing, in the row's tag. */
const FATE_WORDS: Readonly<Partial<Record<JoinRowFate, string>>> = {
    repeat: "Repeat, not added",
    "left-out": "Left out",
};

/**
 * A row's tag: what it joins to; for a new edge to an end the graph lacks, its two ends as given
 * and "new node".
 * @param row - the row.
 * @param choices - the join.
 * @returns the words, or "" for none.
 */
function tagWords(row: IncomingRow, choices: JoinChoices): string {
    if (row.fate === "new-end") {
        const ends = choices.keys.map((key) => String(cellValue(row.values[key.file]) ?? ""));
        return `${ends.join(" - ")}, new node`;
    }
    const quiet = row.fate === undefined ? undefined : FATE_WORDS[row.fate];
    return quiet ?? row.match.join(" - ");
}

/**
 * A value the incoming table can draw.
 * @param value - a cell's value.
 * @returns text, a number, a boolean or nothing.
 */
function cellValue(value: unknown): string | number | boolean | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? value
        : JSON.stringify(value);
}

/**
 * The join's key column on the graph side, as the table names it: `id`, or `a:<attribute>`.
 * @param path - the key's graph value.
 * @returns the column id.
 */
function graphColumnId(path: string): string {
    return path === "id" ? "id" : `a:${path.replace(/^data\./, "")}`;
}

/**
 * The incoming columns the join brings: the choice, or every column but the keys.
 * @param choices - the join.
 * @param columns - the incoming columns.
 * @returns the columns.
 */
function included(choices: JoinChoices, columns: readonly string[]): readonly string[] {
    const keys = new Set(choices.keys.map((key) => key.file));
    return choices.columns ?? columns.filter((column) => !keys.has(column));
}

/**
 * The report for the choices, or the reason the element refused them.
 * @param subject - the table.
 * @param choices - the join.
 * @returns the report, or the refusal's message.
 */
function reportOf(subject: JoinSubject, choices: JoinChoices): JoinReport | string {
    try {
        return subject.report(choices);
    } catch (error: unknown) {
        return error instanceof Error ? error.message : String(error);
    }
}

/**
 * The top bar's Join button: its choice runs; the caret picks another.
 * @param props - Component props
 * @param props.how - the choice now
 * @param props.hows - the choices offered
 * @param props.onHow - takes another choice
 * @param props.onRun - runs the choice
 * @param props.disabled - whether the join cannot run now
 * @param props.targets - the sources Replace data can replace
 * @param props.target - the one picked, if any
 * @returns the button
 */
function JoinButton({
    how,
    hows,
    onHow,
    onRun,
    disabled,
    targets,
    target,
}: Readonly<{
    how: JoinHow;
    hows: readonly JoinHow[];
    onHow: (how: JoinHow, target?: ReplaceTarget) => void;
    onRun: (how: JoinHow, target: ReplaceTarget | undefined) => void;
    disabled: boolean;
    targets: readonly ReplaceTarget[];
    target: ReplaceTarget | undefined;
}>): React.JSX.Element {
    const words = (each: JoinHow, to?: ReplaceTarget): string =>
        each === "replace" && to !== undefined ? `Replace ${to.name}` : HOW_WORDS[each];
    return (
        <Button.Group>
            <Button
                size="xs"
                data-autofocus
                onClick={() => {
                    onRun(how, target);
                }}
                disabled={(disabled && how === "join") || (how === "replace" && target === undefined)}
            >
                {words(how, target)}
            </Button>
            {hows.length > 1 ? (
                <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                        <Button size="xs" px={4} aria-label="Join choices">
                            <GLYPHS.expand size={14} aria-hidden />
                        </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {hows.flatMap((each) =>
                            // Replace data asks which source: one item per source it can replace.
                            (each === "replace" ? targets : [undefined]).map((to) => (
                                <Menu.Item
                                    key={to === undefined ? each : `${each}:${to.key}`}
                                    aria-checked={each === how && to?.key === target?.key}
                                    leftSection={to === undefined ? undefined : <GLYPHS.data size={14} aria-hidden />}
                                    // Choosing an act from the menu does it, as the button would.
                                    onClick={() => {
                                        onHow(each, to);
                                        onRun(each, to);
                                    }}
                                >
                                    {words(each, to)}
                                </Menu.Item>
                            )),
                        )}
                    </Menu.Dropdown>
                </Menu>
            ) : null}
        </Button.Group>
    );
}

/** Props for the incoming table. */
interface IncomingTableProps {
    subject: JoinSubject;
    rows: readonly IncomingRow[];
    choices: JoinChoices;
    report: JoinReport | null;
    onChange: (choices: JoinChoices) => void;
    height: number;
}

/**
 * The incoming file's table: its graph match first, then each column with its include box, its
 * key icon, its clash icon (hover: Keep, Overwrite, Keep both) and a menu holding the same, plus
 * Match on this.
 * @param props - Component props
 * @param props.subject - The table
 * @param props.rows - Its rows, narrowed by a count chip
 * @param props.choices - The join as chosen
 * @param props.report - The element's counts, for the clashes
 * @param props.onChange - Takes changed choices
 * @param props.height - The table's height
 * @returns The table
 */
function IncomingTable({
    subject,
    rows,
    choices,
    report,
    onChange,
    height,
}: Readonly<IncomingTableProps>): React.JSX.Element {
    const edges = choices.shape === "edges";
    const brought = new Set(included(choices, subject.columns));
    const clashes = new Set(report?.clashes.map((clash) => clash.column) ?? []);
    const keyOf = (column: string): number => choices.keys.findIndex((key) => key.file === column);
    const setInclude = (column: string, on: boolean): void => {
        const now = included(choices, subject.columns);
        onChange({ ...choices, columns: on ? [...now, column] : now.filter((each) => each !== column) });
    };
    const setClash = (column: string, rule: "keep" | "overwrite" | "both"): void => {
        onChange({ ...choices, clash: { ...choices.clash, [column]: rule } });
    };
    const matchOn = (column: string, at: number): void => {
        onChange({ ...choices, keys: choices.keys.map((key, i) => (i === at ? { ...key, file: column } : key)) });
    };
    const matchColumn: DataTableColumn<IncomingRow> = {
        id: "graph-match",
        header: edges ? "Edge" : "Graph",
        pinned: "start",
        sortable: false,
        width: Math.min(
            MAX_COLUMN,
            Math.max(
                MIN_COLUMN,
                ...rows.slice(0, SIZED_ROWS).map((row) => row.match.join(" - ").length * CHAR_WIDTH + HEADER_EXTRA),
            ),
        ),
        value: (row) => tagWords(row, choices) || undefined,
        // The tag says what Join does with the row: what it joins to, a new node, or nothing.
        cell: (row) => {
            const quiet = row.fate === undefined ? undefined : FATE_WORDS[row.fate];
            if (quiet !== undefined) {
                return <span className="jn-fate">{quiet}</span>;
            }
            const words = tagWords(row, choices);
            return words === "" ? null : (
                <EntityChip kind={edges || choices.shape === "edge-values" ? "edge" : "node"}>{words}</EntityChip>
            );
        },
    };
    const columns = subject.columns.map((column): DataTableColumn<IncomingRow> => {
        const key = keyOf(column);
        const isKey = key >= 0;
        const keyEnd = key === 0 ? "source" : "target";
        const rule = choices.clash?.[column] ?? "both";
        return {
            id: `c:${column}`,
            header: column,
            width: columnWidth(column, rows),
            value: (row) => cellValue(row.values[column]),
            icon: isKey ? (
                <span className="jn-key-icon" data-key={column}>
                    <GLYPHS.key size={14} aria-hidden />
                    {edges ? <span className="ws-th-role">{keyEnd}</span> : null}
                </span>
            ) : undefined,
            ...(isKey ? { iconLabel: edges ? `key, ${keyEnd}` : "key" } : {}),
            headerEnd: (
                <span className="jn-th-end">
                    {clashes.has(column) && brought.has(column) ? (
                        <HoverCard openDelay={100} closeDelay={250} position="bottom-end" shadow="md">
                            <HoverCard.Target>
                                <span // NOSONAR(S6819): a glyph inside a hover target, named by aria-label; an <img> cannot hold the icon component
                                    className="jn-clash"
                                    role="img"
                                    aria-label={`${column} is in the graph`}
                                >
                                    <GLYPHS.join size={14} aria-hidden />
                                </span>
                            </HoverCard.Target>
                            <HoverCard.Dropdown>
                                <SegmentedControl
                                    size="xs"
                                    aria-label={`When ${column} is in the graph`}
                                    data={[...CLASH_RULES]}
                                    value={rule}
                                    onChange={(value) => {
                                        setClash(column, value as "keep" | "overwrite" | "both");
                                    }}
                                />
                            </HoverCard.Dropdown>
                        </HoverCard>
                    ) : null}
                    {isKey ? null : (
                        // Out of the tab order like every header control (the grid has one tab
                        // stop); the header's menu holds the same box: Alt+ArrowDown, Include.
                        <Checkbox
                            size="xs"
                            tabIndex={-1}
                            aria-label={`Include ${column}`}
                            checked={brought.has(column)}
                            onChange={(event) => {
                                setInclude(column, event.currentTarget.checked);
                            }}
                        />
                    )}
                </span>
            ),
            menu: (
                <>
                    {edges ? (
                        <>
                            <Menu.Item
                                onClick={() => {
                                    matchOn(column, 0);
                                }}
                            >
                                Match as source
                            </Menu.Item>
                            <Menu.Item
                                onClick={() => {
                                    matchOn(column, 1);
                                }}
                            >
                                Match as target
                            </Menu.Item>
                        </>
                    ) : (
                        <Menu.Item
                            onClick={() => {
                                matchOn(column, 0);
                            }}
                        >
                            Match on this
                        </Menu.Item>
                    )}
                    {isKey ? null : (
                        <Menu.Item
                            aria-checked={brought.has(column)}
                            leftSection={
                                <Checkbox size="xs" tabIndex={-1} readOnly checked={brought.has(column)} aria-hidden />
                            }
                            onClick={() => {
                                setInclude(column, !brought.has(column));
                            }}
                        >
                            Include
                        </Menu.Item>
                    )}
                    {clashes.has(column) && brought.has(column) ? (
                        <>
                            <Menu.Divider />
                            {CLASH_RULES.map((each) => (
                                <Menu.Item
                                    key={each.value}
                                    aria-checked={rule === each.value}
                                    onClick={() => {
                                        setClash(column, each.value);
                                    }}
                                >
                                    {each.label}
                                </Menu.Item>
                            ))}
                        </>
                    ) : null}
                </>
            ),
        };
    });
    return (
        <DataTable<IncomingRow>
            label={subject.name}
            data={rows}
            columns={[matchColumn, ...columns]}
            getRowId={(row) => String(row.at)}
            height={height}
            selectionMode="none"
        />
    );
}

/** Props for the graph table. */
interface GraphTableProps {
    session: GraphSession;
    kind: RecordKind;
    choices: JoinChoices;
    onChange: (choices: JoinChoices) => void;
    /** The nodes a count chip narrows it to, or null for every one. */
    only: readonly (string | number)[] | null;
    height: number;
}

/**
 * The graph's node (or edge) table, the key's column marked, each header's menu offering Match on
 * this.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.kind - Nodes or edges
 * @param props.choices - The join as chosen
 * @param props.onChange - Takes changed choices
 * @param props.only - The nodes a count chip narrows it to
 * @param props.height - The table's height
 * @returns The table
 */
function GraphTable({ session, kind, choices, onChange, only, height }: Readonly<GraphTableProps>): React.JSX.Element {
    const [sort, setSort] = useState<{ id: string; desc: boolean } | null>(null);
    const columns = columnChoices(session, kind).filter(
        (column) => column.hidden !== true && column.group !== "result",
    );
    const keyed = new Set(choices.keys.map((key) => graphColumnId(key.graph)));
    const pathOf = (column: TableColumnChoice): string | null => {
        if (column.id === "id") {
            return "id";
        }
        return column.attribute === undefined ? null : `data.${column.attribute}`;
    };
    return (
        <RecordTable
            session={session}
            kind={kind}
            columns={columns}
            scope={only === null ? "graph" : { nodes: only }}
            sort={sort}
            onSortChange={setSort}
            height={height}
            header={(column) => {
                const path = pathOf(column);
                return {
                    icon: keyed.has(column.id) ? (
                        <span className="jn-key-icon" data-key={column.header}>
                            <GLYPHS.key size={14} aria-hidden />
                        </span>
                    ) : (
                        <HeaderIcons column={column} />
                    ),
                    iconLabel: keyed.has(column.id) ? "key" : headerIconsLabel(column),
                    ...(path === null
                        ? {}
                        : {
                              menu: (
                                  <Menu.Item
                                      onClick={() => {
                                          onChange({
                                              ...choices,
                                              keys: choices.keys.map((key) => ({ ...key, graph: path })),
                                          });
                                      }}
                                  >
                                      Match on this
                                  </Menu.Item>
                              ),
                          }),
                };
            }}
        />
    );
}

/**
 * The join screen's body for one table: the top bar, the Match row, the chips, and the two tables
 * side by side.
 * @param props - Component props
 * @param props.subject - The table to join
 * @param props.session - The element's session
 * @returns The screen
 */
function JoinBody({ subject, session }: Readonly<{ subject: JoinSubject; session: GraphSession }>): React.JSX.Element {
    const workspace = useWorkspace();
    useSessionVersion(session);
    const [choices, setChoices] = useState<JoinChoices>(subject.initial);
    const [how, setHow] = useState<JoinHow>(subject.how);
    const [chosenShow, setShow] = useState<JoinShow>(null);
    const chipsId = useId();
    const [rows, setRows] = useState<readonly Readonly<Record<string, unknown>>[]>([]);
    const [busy, setBusy] = useState(false);
    const graph = useElementSize();
    const incoming = useElementSize();
    const screenRef = useRef<HTMLElement>(null);
    const targets = replaceTargets(workspace);
    // Replace data names the source it replaces; with one there is nothing to pick.
    const [target, setTarget] = useState<ReplaceTarget | undefined>(targets.length === 1 ? targets[0] : undefined);
    // The screen takes focus as it opens, on its Join button, so Esc and Tab work in it at once.
    useEffect(() => {
        const screenEl = screenRef.current;
        (screenEl?.querySelector<HTMLElement>("[data-autofocus]:not(:disabled)") ?? screenEl)?.focus();
    }, []);
    useEffect(() => {
        let live = true;
        void subject.rows().then((read) => {
            if (live) {
                setRows(read);
            }
        });
        return () => {
            live = false;
        };
    }, [subject]);
    // Esc in the screen cancels (Undo brings it back), unless a menu or list is open and takes it
    // first. Only in the screen: an Esc anywhere else is not the join's.
    const onKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === "Escape" && !event.defaultPrevented && !inOpenPopup(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            closeJoin(workspace, subject);
        }
    };

    const report = reportOf(subject, choices);
    const counts = typeof report === "string" ? null : report;
    const kind: RecordKind = choices.shape === "edge-values" ? "edge" : "node";
    const graphPaths = [
        { value: "id", label: "Id" },
        ...session.data
            .attributes()
            .filter((each) => each.kind === kind && each.origin !== "result" && each.hidden !== true)
            .map((each) => ({ value: `data.${each.name}`, label: each.name })),
    ];
    const mappings = session.data
        .joins()
        .filter((each) => each.source !== subject.edit)
        .map((each) => ({ value: each.source, label: each.table.name }));
    // A narrowing whose chip is gone stops narrowing.
    const show = counts !== null && shownChips(counts, choices).includes(chosenShow) ? chosenShow : null;
    const shown = rows
        .map((values, at): IncomingRow => ({
            at,
            values,
            match: counts?.rowMatches[at] ?? [],
            fate: counts?.rowFates[at],
        }))
        .filter((row) => {
            if (show === "not-in-graph") {
                return row.match.length === 0;
            }
            return show !== "matched" || row.match.length > 0;
        });
    const matchedIds = show === "matched" ? [...new Set(counts?.rowMatches.flat() ?? [])] : null;
    const hows = howChoices(workspace, subject);
    return (
        <section // NOSONAR(S6847): the screen's own keys, caught as they bubble from its controls; it takes focus (tabIndex -1)
            className="jn-screen"
            aria-label={`Join ${subject.name}`}
            aria-describedby={how === "join" ? chipsId : undefined}
            ref={screenRef}
            tabIndex={-1}
            onKeyDown={onKeyDown}
        >
            <header className="jn-bar">
                <span className="jn-title">Join</span>
                <Badge variant="default" leftSection={<GLYPHS.file size={12} aria-hidden />}>
                    {subject.name}
                </Badge>
                <GLYPHS.go size={14} aria-hidden className="jn-onto" />
                {targets.map((each) => (
                    <Badge key={each.key} variant="default" leftSection={<GLYPHS.data size={12} aria-hidden />}>
                        {each.name}
                    </Badge>
                ))}
                <span className="jn-spacer" />
                <JoinButton
                    how={how}
                    hows={hows}
                    onHow={(next, to) => {
                        setHow(next);
                        if (to !== undefined) {
                            setTarget(to);
                        }
                    }}
                    targets={targets}
                    target={target}
                    disabled={counts === null || busy}
                    onRun={(runHow, runTarget) => {
                        if (
                            (runHow === "join" && (counts === null || busy)) ||
                            (runHow === "replace" && runTarget === undefined)
                        ) {
                            return;
                        }
                        setBusy(true);
                        finishJoin(workspace, subject, choices, runHow, runTarget?.key).catch((error: unknown) => {
                            setBusy(false);
                            const reason = error instanceof Error ? error.message : String(error);
                            workspace.store.set({
                                notice: { message: `${subject.name} could not be joined. ${reason}` },
                            });
                        });
                    }}
                />
                <Button
                    size="xs"
                    variant="default"
                    onClick={() => {
                        closeJoin(workspace, subject);
                    }}
                >
                    Cancel
                </Button>
            </header>
            {how === "join" ? (
                <>
                    <MatchRow
                        choices={choices}
                        columns={subject.columns}
                        graphPaths={graphPaths}
                        mappings={mappings}
                        onChange={setChoices}
                        extra={{
                            ignoringCase: counts?.extraIgnoringCase ?? 0,
                            ignoringSpaces: counts?.extraIgnoringSpaces ?? 0,
                        }}
                    />
                    {counts === null ? (
                        <p // NOSONAR(S6819): a live announcement of why the join was refused; <output> is for a form's computed result
                            id={chipsId}
                            className="jn-refused"
                            role="status"
                        >
                            {report as string}
                        </p>
                    ) : (
                        <MatchChips
                            id={chipsId}
                            report={counts}
                            choices={choices}
                            onChange={setChoices}
                            show={show}
                            onShow={setShow}
                            repeatedIgnored={choices.ignore?.includes("repeatedKeys") === true}
                            onIgnoreRepeated={() => {
                                setChoices({ ...choices, ignore: [...(choices.ignore ?? []), "repeatedKeys"] });
                            }}
                        />
                    )}
                </>
            ) : null}
            <div className="jn-panes">
                <div className="jn-pane" aria-label="Graph">
                    <div className="jn-pane-head">
                        <EntityChip kind={kind}>
                            {kind === "node"
                                ? `${formatNumber(session.data.nodes().length)} nodes`
                                : `${formatNumber(session.data.edges().length)} edges`}
                        </EntityChip>
                    </div>
                    <div className="jn-pane-body" ref={graph.ref}>
                        <GraphTable
                            session={session}
                            kind={kind}
                            choices={choices}
                            onChange={setChoices}
                            only={show === "without-value" ? (counts?.withoutValueIds ?? null) : matchedIds}
                            height={Math.max(MIN_TABLE_HEIGHT, graph.height)}
                        />
                    </div>
                </div>
                <div className="jn-pane" aria-label={subject.name}>
                    <div className="jn-pane-head">
                        <span>{subject.name}</span>
                        <span className="jn-rows">{formatNumber(rows.length)} rows</span>
                    </div>
                    <div className="jn-pane-body" ref={incoming.ref}>
                        <IncomingTable
                            subject={subject}
                            rows={shown}
                            choices={choices}
                            report={counts}
                            onChange={setChoices}
                            height={Math.max(MIN_TABLE_HEIGHT, incoming.height)}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

/**
 * The join screen (data prototype spec section 3.6): over the canvas area while a second file waits
 * to be joined or a joined table's join is being edited; nothing otherwise.
 * @returns The screen, or null.
 */
export function JoinScreen(): React.JSX.Element | null {
    const workspace = useWorkspace();
    const joining = useWorkspaceState((state) => state.joining);
    const editing = useWorkspaceState((state) => state.editingJoin);
    const { session } = workspace;
    const subject = useMemo(() => {
        if (joining !== null) {
            return draftSubject(joining);
        }
        const record =
            editing === null ? undefined : workspace.session?.data.joins().find((each) => each.source === editing);
        return record === undefined ? null : editSubject(workspace, record);
    }, [joining, editing, workspace]);
    if (session === null || subject === null) {
        return null;
    }
    return <JoinBody key={subject.edit ?? subject.name} subject={subject} session={session} />;
}
