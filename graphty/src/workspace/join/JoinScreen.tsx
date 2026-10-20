import "./join.css";

import { DataTable, type DataTableColumn, EntityChip } from "@graphty/compact-mantine";
import type { GraphSession, JoinChoices, JoinReport } from "@graphty/graphty-element/session";
import { Button, Checkbox, HoverCard, Menu, SegmentedControl } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { ChevronDown, Combine, KeyRound } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

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
} from "./commands";
import { type JoinShow, MatchChips } from "./MatchChips";
import { MatchRow } from "./MatchRow";

/** The smallest table drawn, while its pane is being measured. */
const MIN_TABLE_HEIGHT = 32;

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

/** One incoming row as the table draws it: its place in the file, its values, its match. */
interface IncomingRow {
    readonly at: number;
    readonly values: Readonly<Record<string, unknown>>;
    readonly match: readonly (string | number)[];
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
 * @returns the button
 */
function JoinButton({
    how,
    hows,
    onHow,
    onRun,
    disabled,
}: Readonly<{
    how: JoinHow;
    hows: readonly JoinHow[];
    onHow: (how: JoinHow) => void;
    onRun: () => void;
    disabled: boolean;
}>): React.JSX.Element {
    return (
        <Button.Group>
            <Button size="xs" data-autofocus onClick={onRun} disabled={disabled && how === "join"}>
                {HOW_WORDS[how]}
            </Button>
            {hows.length > 1 ? (
                <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                        <Button size="xs" px={4} aria-label="Join choices">
                            <ChevronDown size={14} aria-hidden />
                        </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {hows.map((each) => (
                            <Menu.Item
                                key={each}
                                aria-checked={each === how}
                                onClick={() => {
                                    onHow(each);
                                }}
                            >
                                {HOW_WORDS[each]}
                            </Menu.Item>
                        ))}
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
 * @param props.rows - Its rows, narrowed by Show
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
        value: (row) => row.match.join(" - ") || undefined,
        cell: (row) =>
            row.match.length === 0 ? null : (
                <EntityChip kind={edges || choices.shape === "edge-values" ? "edge" : "node"}>
                    {row.match.join(" - ")}
                </EntityChip>
            ),
    };
    const columns = subject.columns.map((column): DataTableColumn<IncomingRow> => {
        const key = keyOf(column);
        const isKey = key >= 0;
        const rule = choices.clash?.[column] ?? "both";
        return {
            id: `c:${column}`,
            header: column,
            value: (row) => cellValue(row.values[column]),
            icon: isKey ? (
                <span className="jn-key-icon" data-key={column}>
                    <KeyRound size={14} aria-hidden />
                    {edges ? <span className="ws-th-role">{key === 0 ? "source" : "target"}</span> : null}
                </span>
            ) : undefined,
            ...(isKey ? { iconLabel: edges ? `key, ${key === 0 ? "source" : "target"}` : "key" } : {}),
            headerEnd: (
                <span className="jn-th-end">
                    {clashes.has(column) && brought.has(column) ? (
                        <HoverCard openDelay={100} closeDelay={250} position="bottom-end" shadow="md">
                            <HoverCard.Target>
                                <span className="jn-clash" role="img" aria-label={`${column} is in the graph`}>
                                    <Combine size={14} aria-hidden />
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
                            onClick={() => {
                                setInclude(column, !brought.has(column));
                            }}
                        >
                            {brought.has(column) ? "Leave out" : "Include"}
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
    /** The nodes Show narrows it to, or null for every one. */
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
 * @param props.only - The nodes Show narrows it to
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
                            <KeyRound size={14} aria-hidden />
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
    const [show, setShow] = useState<JoinShow>(null);
    const [repeatedIgnored, setRepeatedIgnored] = useState(false);
    const [rows, setRows] = useState<readonly Readonly<Record<string, unknown>>[]>([]);
    const [busy, setBusy] = useState(false);
    const graph = useElementSize();
    const incoming = useElementSize();
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
    // Esc cancels, unless a menu or list is open and takes it first. In the capture phase, so it
    // runs before the workspace's key map.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && !event.defaultPrevented && !inOpenPopup(event.target)) {
                event.preventDefault();
                event.stopPropagation();
                closeJoin(workspace, subject);
            }
        };
        globalThis.addEventListener("keydown", onKeyDown, true);
        return () => {
            globalThis.removeEventListener("keydown", onKeyDown, true);
        };
    }, [workspace, subject]);

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
    const shown = rows
        .map((values, at): IncomingRow => ({ at, values, match: counts?.rowMatches[at] ?? [] }))
        .filter((row) => show !== "not-in-graph" || row.match.length === 0);
    const onto = session.data.sources().find((each) => each.kind !== "join")?.name;
    const hows = howChoices(workspace, subject);
    return (
        <section className="jn-screen" aria-label="Join">
            <header className="jn-bar">
                <span className="jn-title">Join</span>
                <span className="jn-name">{subject.name}</span>
                {onto === undefined ? null : <span className="jn-onto">onto {onto}</span>}
                <span className="jn-spacer" />
                <JoinButton
                    how={how}
                    hows={hows}
                    onHow={setHow}
                    disabled={counts === null || busy}
                    onRun={() => {
                        setBusy(true);
                        finishJoin(workspace, subject, choices, how).catch((error: unknown) => {
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
                    />
                    {counts === null ? (
                        <p className="jn-refused" role="status">
                            {report as string}
                        </p>
                    ) : (
                        <MatchChips
                            report={counts}
                            choices={choices}
                            onChange={setChoices}
                            show={show}
                            onShow={setShow}
                            repeatedIgnored={repeatedIgnored}
                            onIgnoreRepeated={() => {
                                setRepeatedIgnored(true);
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
                            only={show === "without-value" ? (counts?.withoutValueIds ?? null) : null}
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
