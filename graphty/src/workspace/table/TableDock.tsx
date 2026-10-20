import "./table.css";

import {
    type DataTableColumn,
    type DataTableSort,
    MenuCheckItem,
    SegmentedControl,
    UiGlyph,
} from "@graphty/compact-mantine";
import type { DataIssue, GraphSession, ScopeInput, SummaryGroup } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Menu, Pill, Tabs, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { Maximize2, Minimize2 } from "lucide-react";
import React, { useEffect, useState } from "react";

import { runName } from "../runWords";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    columnChoices,
    columnSummary,
    countOf,
    headerIconsLabel,
    headerWidth,
    issuePlace,
    keyColumnOf,
    type RecordKind,
    sortCaption,
    type TableColumnChoice,
} from "./columns";
import { GroupTable } from "./GroupTable";
import { HeaderIcons, HeaderWarning, RenamePopover } from "./HeaderCell";
import { HeaderMenu, type HeaderMenuActions } from "./HeaderMenu";
import { MaximizedPanel } from "./MaximizedPanel";
import { RecordTable } from "./RecordTable";
import { useSessionVersion } from "./useSessionVersion";

/** The smallest table drawn, while the dock is being measured. */
const MIN_TABLE_HEIGHT = 32;

/** An open menu, list or pop-over keeps its own Esc. */
const OPEN_OVERLAY = '[role="menu"], [role="dialog"], [role="listbox"]';

/**
 * Whether a menu, list or pop-over is showing.
 * @returns true when one is open.
 */
function overlayOpen(): boolean {
    return [...document.querySelectorAll(OPEN_OVERLAY)].some((overlay) => overlay.checkVisibility());
}

/** The reader's arrangement of one record table. */
interface View {
    /**
     * Ids of the hidden columns graphty-element does not hide itself: the keys and the run
     * results. A data column is hidden in the element (`data.setHidden`), saved with the project.
     */
    readonly hidden: readonly string[];
    readonly sort: DataTableSort | null;
}

/** The Nodes tab narrowed to one group's members. */
interface Members {
    readonly run: string;
    readonly runLabel: string;
    readonly name: string;
    readonly scope: ScopeInput;
}

const EMPTY_VIEW: View = { hidden: [], sort: null };

/**
 * The reader's arrangement of the dock: its tab, each table's view, the members chip, and whether
 * a filtered graph lists every record (`all`) or only the shown ones.
 */
interface Arrangement {
    readonly tab: string;
    readonly views: Readonly<Record<RecordKind, View>>;
    readonly members: Members | null;
    readonly all: boolean;
}

const FIRST_ARRANGEMENT: Arrangement = {
    tab: "nodes",
    views: { node: EMPTY_VIEW, edge: EMPTY_VIEW },
    members: null,
    all: false,
};

/**
 * The arrangement per workspace, kept while the dock is closed: the Frame unmounts the dock, and
 * Shift+T twice must bring back the same tab, sort, columns and chip. Keyed by the workspace's
 * store, so each mounted workspace (each story, each test) keeps its own.
 */
const ARRANGEMENTS = new WeakMap<WorkspaceStore, Arrangement>();

/**
 * The runs that partition the graph into groups, each with its groups as graphty-element's result
 * summary lists them: one item tab each.
 * @param session - the element's session.
 * @returns the group runs.
 */
function groupRuns(session: GraphSession): { id: string; label: string; groups: readonly SummaryGroup[] }[] {
    return session.runs.list().flatMap((run) => {
        const groups = run.result?.summary().groups;
        return groups === undefined ? [] : [{ id: run.id, label: runName(session, run), groups }];
    });
}

/**
 * The scope that holds one group of a run: the element's result item for it.
 * @param session - the element's session.
 * @param run - the run's id.
 * @param group - the group.
 * @returns the scope.
 */
function membersScope(session: GraphSession, run: string, group: SummaryGroup): ScopeInput {
    const field = session.data.resultColumns("node").find((column) => column.run === run)?.field ?? "group";
    return {
        define: {
            kind: "rule",
            where: { kind: "item", item: { result: run, key: { field, value: group.group } } },
            reading: "induced",
        },
    };
}

/** Props for the Columns chooser. */
interface ColumnsMenuProps {
    choices: readonly TableColumnChoice[];
    /** The hidden column ids, the element's and the table's. */
    hidden: readonly string[];
    /** Hides a column, or shows it again. */
    onToggle: (column: TableColumnChoice) => void;
}

/**
 * One section of the Columns chooser, under its title; nothing when it has no columns.
 * @param props - Component props
 * @param props.title - The section's title
 * @param props.choices - The section's columns
 * @param props.hidden - The hidden column ids
 * @param props.onToggle - Hides or shows a column
 * @returns The section
 */
function ColumnSection({
    title,
    choices,
    hidden,
    onToggle,
}: Readonly<ColumnsMenuProps & { title: string }>): React.JSX.Element | null {
    if (choices.length === 0) {
        return null;
    }
    return (
        <>
            <Menu.Label>{title}</Menu.Label>
            {choices.map((choice) => (
                <MenuCheckItem
                    key={choice.id}
                    checked={!hidden.includes(choice.id)}
                    onClick={() => {
                        onToggle(choice);
                    }}
                >
                    {choice.header}
                </MenuCheckItem>
            ))}
        </>
    );
}

/**
 * "Columns: 8 of 69": a checkbox per key, attribute and run result.
 * @param props - Component props
 * @param props.choices - Every column
 * @param props.hidden - The hidden column ids
 * @param props.onToggle - Hides or shows a column
 * @returns The chooser
 */
function ColumnsMenu({ choices, hidden, onToggle }: Readonly<ColumnsMenuProps>): React.JSX.Element {
    const shown = choices.filter((choice) => !hidden.includes(choice.id)).length;
    return (
        <Menu closeOnItemClick={false} position="bottom-end">
            <Menu.Target>
                <Button variant="subtle" size="compact-xs">
                    {`Columns: ${String(shown)} of ${String(choices.length)}`}
                </Button>
            </Menu.Target>
            <Menu.Dropdown mah={320} style={{ overflowY: "auto" }}>
                <ColumnSection
                    title="Ids"
                    choices={choices.filter((choice) => choice.group === "key")}
                    hidden={hidden}
                    onToggle={onToggle}
                />
                <ColumnSection
                    title="Attributes"
                    choices={choices.filter((choice) => choice.group === "attribute")}
                    hidden={hidden}
                    onToggle={onToggle}
                />
                <ColumnSection
                    title="Results"
                    choices={choices.filter((choice) => choice.group === "result")}
                    hidden={hidden}
                    onToggle={onToggle}
                />
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * How many records the table lists: the element's count for the records showing, so it never
 * lags a tab change.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @param scope - the records showing.
 * @returns the count.
 */
function recordTotal(session: GraphSession, kind: RecordKind, scope: ScopeInput): number {
    const counted = { limit: 0, scope };
    return kind === "node" ? session.data.nodePage(counted).total : session.data.edgePage(counted).total;
}

/**
 * The chip naming the group the Nodes tab is narrowed to; its x shows every node again.
 * @param props - Component props
 * @param props.members - The group shown
 * @param props.onRemove - Shows every node again
 * @returns The chip
 */
function MembersChip({ members, onRemove }: Readonly<{ members: Members; onRemove: () => void }>): React.JSX.Element {
    return (
        <Pill
            withRemoveButton
            removeButtonProps={{ "aria-label": `Show every node, not only ${members.name}` }}
            onRemove={onRemove}
        >
            {`${members.runLabel}: ${members.name}`}
        </Pill>
    );
}

/**
 * The dock's options menu, holding Export....
 * @param props - Component props
 * @param props.kind - The records showing
 * @param props.store - The workspace store
 * @returns The menu
 */
function TableOptions({ kind, store }: Readonly<{ kind: RecordKind; store: WorkspaceStore }>): React.JSX.Element {
    return (
        <Menu position="bottom-end">
            <Menu.Target>
                <ActionIcon variant="subtle" aria-label="Table options">
                    <UiGlyph name="more" />
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item
                    onClick={() => {
                        // The file holds every column and every record of the table that is
                        // showing: the element's export cannot be limited to the visible
                        // columns (#875) or to a group's members (#820) yet.
                        store.set({ dialog: "export", exportOn: kind === "edge" ? "edges" : "nodes" });
                    }}
                >
                    Export...
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * The record table's key: a new table, scrolled to the top, for each kind, each group shown, and
 * each change of what a filter shows.
 * @param kind - nodes or edges.
 * @param members - the group the Nodes tab is narrowed to, or null.
 * @param shown - how many records the filters show, or null when the table lists them all.
 * @returns the key.
 */
function tableKey(kind: RecordKind, members: Members | null, shown: number | null): string {
    const base = members === null || kind === "edge" ? kind : `node:${members.run}:${members.name}`;
    return shown === null ? base : `${base}:shown:${String(shown)}`;
}

/**
 * Hides or shows columns: a data column in graphty-element (one undo step, saved with the
 * project), a key or a result in the table's own arrangement.
 * @param session - the element's session.
 * @param columns - the columns.
 * @param hidden - true to hide.
 * @param setLocal - changes the table's own hidden ids.
 * @param fail - says a refusal on the notice.
 */
function setColumnsHidden(
    session: GraphSession,
    columns: readonly TableColumnChoice[],
    hidden: boolean,
    setLocal: (change: (ids: readonly string[]) => string[]) => void,
    fail: () => void,
): void {
    const refs = columns.flatMap((column) => (column.ref === undefined ? [] : [column.ref]));
    if (refs.length > 0) {
        session.data.setHidden(refs, hidden).catch(fail);
    }
    const local = columns.filter((column) => column.ref === undefined).map((column) => column.id);
    if (local.length > 0) {
        setLocal((ids) => (hidden ? [...new Set([...ids, ...local])] : ids.filter((id) => !local.includes(id))));
    }
}

/** What one header shows and offers. */
interface HeaderCellProps {
    readonly column: TableColumnChoice;
    readonly kind: RecordKind;
    /** The issues whose warning this header carries, ignored ones left out. */
    readonly issues: readonly DataIssue[];
    /** The table's hidden columns, for Unhide. */
    readonly hidden: readonly TableColumnChoice[];
    /** Whether the column's name is being edited. */
    readonly renaming: boolean;
    /** Takes the new name, or null to stop renaming. */
    readonly onRenamed: (name: string | null) => void;
    readonly actions: HeaderMenuActions;
}

/** The header's parts of a table column. */
type HeaderParts = Pick<
    DataTableColumn<object>,
    "icon" | "iconLabel" | "headerTooltip" | "headerEnd" | "menu" | "width"
>;

/**
 * A column header's configuration (spec section 3.5.1), as the table's header slots: the type
 * icon, role badge and origin icon before the name; the summary on hover of the name; the warning
 * with its fixes at the end; and the one-level header menu. No configuration is drawn in the body.
 * @param props - what the header shows and offers
 * @returns the header's parts of the table column
 */
function headerCell(props: HeaderCellProps): HeaderParts {
    const { column, kind, issues, hidden, renaming, onRenamed, actions } = props;
    const end =
        issues.length === 0 && !renaming ? undefined : (
            <>
                {issues.length === 0 ? null : <HeaderWarning header={column.header} issues={issues} />}
                {renaming ? <RenamePopover name={column.header} onDone={onRenamed} /> : null}
            </>
        );
    return {
        width: headerWidth(column, issues.length > 0),
        icon: <HeaderIcons column={column} />,
        iconLabel: headerIconsLabel(column),
        ...(column.descriptor === undefined ? {} : { headerTooltip: columnSummary(column.descriptor) }),
        ...(end === undefined ? {} : { headerEnd: end }),
        menu: <HeaderMenu column={column} kind={kind} issues={issues} hidden={hidden} actions={actions} />,
    };
}

/**
 * The issues each header of a table carries, by column id: the element's issues not ignored, each
 * at its place; a key column's issue on the loaded column that holds the keys.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @param choices - the table's columns.
 * @returns the issues by column id.
 */
function issuesByColumn(
    session: GraphSession,
    kind: RecordKind,
    choices: readonly TableColumnChoice[],
): Map<string, DataIssue[]> {
    const byColumn = new Map<string, DataIssue[]>();
    for (const issue of session.data.issues()) {
        const place = issuePlace(issue, session);
        if (place.kind === kind) {
            const column = keyColumnOf(place.column, choices);
            byColumn.set(column, [...(byColumn.get(column) ?? []), issue]);
        }
    }
    return byColumn;
}

/**
 * The dock's Maximize or Minimize button, and Esc to minimize while maximized (unless a menu,
 * list or pop-over is open, which takes its own Esc first).
 * @param props - Component props
 * @param props.store - The workspace store
 * @param props.maximized - Whether the dock fills the canvas area
 * @returns The button
 */
function MaximizeButton({
    store,
    maximized,
}: Readonly<{ store: WorkspaceStore; maximized: boolean }>): React.JSX.Element {
    useEffect(() => {
        if (!maximized) {
            return undefined;
        }
        // In the capture phase, so it runs before the workspace's key map (whose Esc clears the
        // selection).
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && !event.defaultPrevented && !overlayOpen()) {
                event.preventDefault();
                event.stopPropagation();
                store.set({ dockMaximized: false });
            }
        };
        globalThis.addEventListener("keydown", onKeyDown, true);
        return () => {
            globalThis.removeEventListener("keydown", onKeyDown, true);
        };
    }, [store, maximized]);
    // One name, pressed or not: a toggle's name never changes with its state.
    return (
        <ActionIcon
            variant="subtle"
            aria-label="Maximize table"
            aria-pressed={maximized}
            onClick={() => {
                // Maximized, the configuration (Sources, Fields, Filters) is the Data place's.
                store.set(maximized ? { dockMaximized: false } : { dockMaximized: true, place: "data" });
            }}
        >
            {maximized ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
        </ActionIcon>
    );
}

/**
 * The table dock (data prototype spec section 3.5): Nodes, Edges and one item tab per group run;
 * the count; the Columns chooser; the options menu with Export...; Maximize and Close. Every
 * column's configuration is in its header: type, role, warning and origin icons, the issue's
 * fixes on hover, and the header menu. Maximized, it fills the canvas area with the Issues list
 * beside the table, and the left panel shows the Data place's Sources, Fields and Filters; Esc
 * minimizes. A filter that hides records narrows the table to the shown ones (Shown / All). Canvas, table and inspector share
 * graphty-element's one selection.
 * @returns The dock's contents
 */
export function TableDock(): React.JSX.Element {
    const { session, store } = useWorkspace();
    const maximized = useWorkspaceState((state) => state.dockMaximized);
    useSessionVersion(session);
    const { ref: bodyRef, height: bodyHeight } = useElementSize();
    const [renaming, setRenaming] = useState<string | null>(null);
    const [arrangement, setArrangement] = useState<Arrangement>(() => ARRANGEMENTS.get(store) ?? FIRST_ARRANGEMENT);
    useEffect(() => {
        ARRANGEMENTS.set(store, arrangement);
    }, [store, arrangement]);
    const { tab, views, members, all } = arrangement;
    const arrange = (change: Partial<Arrangement>): void => {
        setArrangement((now) => ({ ...now, ...change }));
    };

    const close = (
        <ActionIcon
            variant="subtle"
            aria-label="Close table"
            onClick={() => {
                store.set({ dockOpen: false, dockMaximized: false });
            }}
        >
            <UiGlyph name="close" />
        </ActionIcon>
    );
    if (session === null) {
        // Before the element has come up there is nothing to list; the dock can still be closed.
        return (
            <div className="ws-table">
                <div className="ws-table-strip">
                    <span className="ws-table-spacer" />
                    {close}
                </div>
            </div>
        );
    }

    // Cheap reads: the element caches each run's summary, and a zero-row page reads no values.
    const groups = groupRuns(session);
    // No Edges tab for a graph without edges.
    const hasEdges = recordTotal(session, "edge", "graph") > 0;
    // A group tab whose run went away (undo, remove), or Edges once none are left, falls back to Nodes.
    const known = tab.startsWith("g:") ? groups.some((run) => `g:${run.id}` === tab) : tab !== "edges" || hasEdges;
    const active = known ? tab : "nodes";
    const kind: RecordKind = active === "edges" ? "edge" : "node";
    const choices = columnChoices(session, kind);
    const groupRun = groups.find((run) => `g:${run.id}` === active);
    const view = views[kind];
    const isHidden = (choice: TableColumnChoice): boolean => choice.hidden === true || view.hidden.includes(choice.id);
    const hiddenIds = choices.filter(isHidden).map((choice) => choice.id);
    const visible = choices.filter((choice) => !isHidden(choice));
    const sorted = visible.find((choice) => choice.id === view.sort?.id);
    // A chip whose run went away (undo, remove) goes with it.
    const shownMembers = groups.some((run) => run.id === members?.run) ? members : null;
    // A filter that hides records narrows the table to the shown ones, unless the reader asks for all.
    const { summary } = session.visibility;
    const shownCount = kind === "node" ? summary.visibleNodes : summary.visibleEdges;
    const filtered = shownCount < (kind === "node" ? summary.totalNodes : summary.totalEdges);
    const narrowed: ScopeInput = filtered && !all ? "visible" : "graph";
    const scope = kind === "node" && shownMembers !== null ? shownMembers.scope : narrowed;
    const tableHeight = Math.max(MIN_TABLE_HEIGHT, bodyHeight);
    const issues = issuesByColumn(session, kind, choices);
    const hiddenChoices = choices.filter(isHidden);

    const setView = (change: Partial<View>): void => {
        setArrangement((now) => ({ ...now, views: { ...now.views, [kind]: { ...now.views[kind], ...change } } }));
    };
    const setLocalHidden = (change: (ids: readonly string[]) => string[]): void => {
        setArrangement((now) => ({
            ...now,
            views: { ...now.views, [kind]: { ...now.views[kind], hidden: change(now.views[kind].hidden) } },
        }));
    };
    const fail = (): void => {
        store.set({ notice: { message: "Column not changed" } });
    };
    const hide = (columns: readonly TableColumnChoice[], hidden: boolean): void => {
        setColumnsHidden(session, columns, hidden, setLocalHidden, fail);
    };
    const actionsFor = (column: TableColumnChoice): HeaderMenuActions => ({
        sort: (descending) => {
            setView({ sort: { id: column.id, desc: descending } });
        },
        rename: () => {
            setRenaming(column.id);
        },
        hide: () => {
            hide([column], true);
        },
        hideOthers: () => {
            hide(
                choices.filter((choice) => choice.id !== column.id && !isHidden(choice)),
                true,
            );
        },
        unhide: (columns) => {
            hide(columns, false);
        },
    });
    const header = (column: TableColumnChoice): HeaderParts =>
        headerCell({
            column,
            kind,
            issues: issues.get(column.id) ?? [],
            hidden: hiddenChoices,
            renaming: renaming === column.id,
            onRenamed: (name) => {
                setRenaming(null);
                const next = name?.trim() ?? "";
                if (column.ref !== undefined && next !== "" && next !== column.header) {
                    session.data.renameColumn(column.ref, next).catch(fail);
                }
            },
            actions: actionsFor(column),
        });

    const count =
        groupRun === undefined
            ? countOf(recordTotal(session, kind, scope), kind)
            : countOf(groupRun.groups.length, "group");

    const table = (
        <div className="ws-table-main">
            <div className="ws-table-strip">
                <Tabs
                    value={active}
                    onChange={(value) => {
                        if (value !== null) {
                            arrange({ tab: value });
                        }
                    }}
                >
                    <Tabs.List>
                        <Tabs.Tab value="nodes">Nodes</Tabs.Tab>
                        {hasEdges ? <Tabs.Tab value="edges">Edges</Tabs.Tab> : null}
                        {groups.map((run) => (
                            <Tabs.Tab key={run.id} value={`g:${run.id}`}>
                                {run.label}
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>
                </Tabs>
                <Text size="xs" c="dimmed" className="ws-table-count">
                    {count}
                </Text>
                {active === "nodes" && shownMembers !== null ? (
                    <MembersChip
                        members={shownMembers}
                        onRemove={() => {
                            arrange({ members: null });
                        }}
                    />
                ) : null}
                {filtered && groupRun === undefined && (kind === "edge" || shownMembers === null) ? (
                    <SegmentedControl
                        size="xs"
                        aria-label="Records"
                        value={all ? "all" : "shown"}
                        data={[
                            { value: "shown", label: "Shown" },
                            { value: "all", label: "All" },
                        ]}
                        onChange={(value) => {
                            arrange({ all: value === "all" });
                        }}
                    />
                ) : null}
                <span className="ws-table-spacer" />
                {groupRun === undefined ? (
                    <ColumnsMenu
                        choices={choices}
                        hidden={hiddenIds}
                        onToggle={(choice) => {
                            hide([choice], !isHidden(choice));
                        }}
                    />
                ) : null}
                <TableOptions kind={kind} store={store} />
                <MaximizeButton store={store} maximized={maximized} />
                {close}
            </div>
            <Text size="xs" c="dimmed" className="ws-table-caption">
                {groupRun === undefined ? sortCaption(sorted, view.sort?.desc ?? false) : "Largest group first"}
            </Text>
            <div className="ws-table-body" ref={bodyRef}>
                {groupRun === undefined ? (
                    <RecordTable
                        key={tableKey(kind, shownMembers, scope === "visible" ? shownCount : null)}
                        session={session}
                        kind={kind}
                        columns={visible}
                        scope={scope}
                        sort={sorted === undefined ? null : view.sort}
                        onSortChange={(next) => {
                            setView({ sort: next });
                        }}
                        height={tableHeight}
                        header={header}
                    />
                ) : (
                    <GroupTable
                        runLabel={groupRun.label}
                        groups={groupRun.groups}
                        height={tableHeight}
                        onShowMembers={(group, name) => {
                            arrange({
                                tab: "nodes",
                                members: {
                                    run: groupRun.id,
                                    runLabel: groupRun.label,
                                    name,
                                    scope: membersScope(session, groupRun.id, group),
                                },
                            });
                        }}
                    />
                )}
            </div>
        </div>
    );

    return (
        <div className="ws-table" data-maximized={maximized ? "" : undefined}>
            {maximized ? <MaximizedPanel /> : null}
            {table}
        </div>
    );
}
