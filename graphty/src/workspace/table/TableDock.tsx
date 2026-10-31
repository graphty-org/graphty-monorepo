import "./table.css";

import {
    type DataTableColumn,
    type DataTableSort,
    MenuCheckItem,
    SegmentedControl,
    UiGlyph,
} from "@graphty/compact-mantine";
import type { DataIssue, GraphSession, IssueId, ScopeInput, SummaryGroup } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Chip, Menu, Pill, Tabs, Text, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import React, { useEffect, useRef, useState } from "react";

import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import { GLYPHS } from "../glyphs";
import { isPanelEscape, isTypingTarget } from "../keys/keys";
import { runName } from "../runWords";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    columnChoices,
    columnSummary,
    countOf,
    headerIconsLabel,
    headerWidth,
    ignoreAll,
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
    /** The reader's column order, ids first to last; ids missing from it keep their place after it. */
    readonly order: readonly string[];
    readonly sort: DataTableSort | null;
    /** Only the rows an open issue is on: one issue's ("Show rows"), or any ("With issues"); null for all. */
    readonly issue: IssueId | null;
}

/** The Nodes tab narrowed to one group's members. */
interface Members {
    readonly run: string;
    readonly runLabel: string;
    readonly name: string;
    readonly scope: ScopeInput;
}

const EMPTY_VIEW: View = { hidden: [], order: [], sort: null, issue: null };

/**
 * The columns a view shows, in the reader's order: the keys first, then the order the reader set.
 * @param choices - every column the table can show.
 * @param view - the reader's view.
 * @returns the shown columns, first to last.
 */
function shownColumns(choices: readonly TableColumnChoice[], view: View): TableColumnChoice[] {
    const rank = (choice: TableColumnChoice): number => {
        if (choice.group === "key") {
            return -1;
        }
        const at = view.order.indexOf(choice.id);
        return at === -1 ? view.order.length : at;
    };
    return choices.filter((choice) => !view.hidden.includes(choice.id)).sort((a, b) => rank(a) - rank(b));
}

/**
 * The reader's arrangement of the dock: each table's view, the members chip, and whether a filtered
 * graph lists every record (`all`) or only the shown ones. The tab is the store's.
 */
interface Arrangement {
    readonly views: Readonly<Record<RecordKind, View>>;
    readonly members: Members | null;
    readonly all: boolean;
}

const FIRST_ARRANGEMENT: Arrangement = { views: { node: EMPTY_VIEW, edge: EMPTY_VIEW }, members: null, all: false };

/**
 * The arrangement per workspace, kept while the dock is closed: the Frame unmounts the dock, and
 * Shift+T twice must bring back the same sort, columns and chip (the store keeps the tab). Keyed by the workspace's
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

/** Why the Columns chooser has nothing to offer: the table has no column but the ones that always show. */
const ONLY_KEYS_WORDS = "No other columns to show or hide";

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
    const words = `Columns: ${String(shown)} of ${String(choices.length)}`;
    // Only the key columns, which always show: nothing to choose, so no empty list opens. Drawn
    // disabled but focusable, so hover and focus say why.
    if (choices.every((choice) => choice.group === "key")) {
        return (
            <Tooltip label={ONLY_KEYS_WORDS}>
                <Button
                    variant="subtle"
                    size="compact-xs"
                    className="ws-table-columns"
                    aria-disabled
                    data-disabled
                    aria-description={ONLY_KEYS_WORDS}
                >
                    <span className="ws-table-ellipsis">{words}</span>
                </Button>
            </Tooltip>
        );
    }
    return (
        <Menu closeOnItemClick={false} position="bottom-end">
            <Menu.Target>
                <Button variant="subtle" size="compact-xs" className="ws-table-columns">
                    <span className="ws-table-ellipsis">{words}</span>
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
 * @param issue - only the records an open issue is on, or null.
 * @returns the count.
 */
function recordTotal(session: GraphSession, kind: RecordKind, scope: ScopeInput, issue: IssueId | null = null): number {
    const counted = { limit: 0, scope, ...(issue === null ? {} : { issue }) };
    return kind === "node" ? session.data.nodePage(counted).total : session.data.edgePage(counted).total;
}

/**
 * The tab's count: "41 edges", or "12 of 41 edges" while a filter step hides some, in the
 * filter chip's words.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @param scope - the records showing.
 * @returns the words.
 */
function recordCount(session: GraphSession, kind: RecordKind, scope: ScopeInput): string {
    const shown = recordTotal(session, kind, scope);
    const all = scope === "visible" ? recordTotal(session, kind, "graph") : shown;
    return shown === all ? countOf(all, kind) : `${shown.toLocaleString("en-US")} of ${countOf(all, kind)}`;
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
                        store.set({
                            dialog: "export",
                            exportOn: kind === "edge" ? "edges" : "nodes",
                            exportSource: null,
                        });
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
 * @param issue - the issue filter, or null.
 * @returns the key.
 */
function tableKey(kind: RecordKind, members: Members | null, shown: number | null, issue: string | null): string {
    const base = members === null || kind === "edge" ? kind : `node:${members.run}:${members.name}`;
    const narrowed = issue === null ? base : `${base}:issue:${issue}`;
    return shown === null ? narrowed : `${narrowed}:shown:${String(shown)}`;
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
    "icon" | "iconLabel" | "headerTooltip" | "headerEnd" | "menu" | "minWidth"
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
                {issues.length === 0 ? null : (
                    <HeaderWarning
                        header={column.header}
                        issues={issues}
                        onShowRows={actions.showRows}
                        onIgnoreAll={actions.ignoreAll}
                    />
                )}
                {renaming ? <RenamePopover name={column.header} onDone={onRenamed} /> : null}
            </>
        );
    return {
        // A floor for the content's width: the name beside its icons, badge and warning.
        minWidth: headerWidth(column, issues.length > 0),
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
            for (const id of place.columns) {
                const column = keyColumnOf(id, choices);
                byColumn.set(column, [...(byColumn.get(column) ?? []), issue]);
            }
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
        // selection). A field's Escape is the field's (a Sources row's name cancels its rename).
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && !event.defaultPrevented && !overlayOpen() && !isTypingTarget(event.target)) {
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
            {maximized ? <GLYPHS.minimize size={16} aria-hidden /> : <GLYPHS.maximize size={16} aria-hidden />}
        </ActionIcon>
    );
}

/**
 * Escape in the table's grid: focus goes to the toolbar's Table button. A cell's own control that
 * used the Escape (a list it closed) keeps it.
 * @param event - the key press inside the dock.
 */
function leaveGrid(event: React.KeyboardEvent): void {
    if (!isPanelEscape(event) || !(event.target instanceof Element) || event.target.closest('[role="grid"]') === null) {
        return;
    }
    const button = document.querySelector<HTMLElement>('[data-command="table.toggle"]');
    if (button !== null) {
        event.preventDefault();
        button.focus();
    }
}

/**
 * The table's tab values, in order: Nodes, Edges when there are edges, then one per group run.
 * @param hasEdges - whether the graph has edges
 * @param groups - the group runs
 * @returns the values
 */
function tabValuesOf(hasEdges: boolean, groups: readonly { readonly id: string }[]): string[] {
    const edges = hasEdges ? ["edges"] : [];
    return ["nodes", ...edges, ...groups.map((run) => `g:${run.id}`)];
}

/**
 * Show rows from an issue list outside the table: narrows the asked-for tab to the issue's rows,
 * then forgets the ask.
 * @param store - the chrome store, which holds the ask
 * @param setArrangement - sets the dock's arrangement
 */
function useAskedIssue(store: WorkspaceStore, setArrangement: React.Dispatch<React.SetStateAction<Arrangement>>): void {
    const issueAsked = useWorkspaceState((state) => state.dockIssue);
    useEffect(() => {
        if (issueAsked === null) {
            return;
        }
        const askedKind: RecordKind = store.get().dockTab === "edges" ? "edge" : "node";
        setArrangement((now) => ({
            ...now,
            views: { ...now.views, [askedKind]: { ...now.views[askedKind], issue: issueAsked } },
        }));
        store.set({ dockIssue: null });
    }, [issueAsked, store, setArrangement]);
}

/**
 * The table dock (data prototype spec section 3.5): Nodes, Edges and one item tab per group run;
 * the count; the Columns chooser; the options menu with Export...; Maximize and Close. Every
 * column's configuration is in its header: type, role, warning and origin icons, the issue's
 * fixes on hover, and the header menu. Maximized, it fills the canvas area with the Issues list
 * beside the table, and the left panel shows the Data place's Sources, Fields and Filters; Esc
 * minimizes. A filter that hides records narrows the table to the shown ones (Shown / All); Esc in
 * the grid otherwise goes to the toolbar's Table button. Canvas, table and inspector share
 * graphty-element's one selection.
 * @returns The dock's contents
 */
export function TableDock(): React.JSX.Element {
    const { session, store } = useWorkspace();
    const tab = useWorkspaceState((state) => state.dockTab);
    const maximized = useWorkspaceState((state) => state.dockMaximized);
    useSessionVersion(session);
    // A filter step changes which records the table lists.
    useVisibilityVersion(session);
    const { ref: bodyRef, height: bodyHeight } = useElementSize();
    const [renaming, setRenaming] = useState<string | null>(null);
    const [arrangement, setArrangement] = useState<Arrangement>(() => ARRANGEMENTS.get(store) ?? FIRST_ARRANGEMENT);
    useEffect(() => {
        ARRANGEMENTS.set(store, arrangement);
    }, [store, arrangement]);
    const { views, members, all } = arrangement;

    // Show in table: bring the asked-for column into view, checking it first if the reader
    // unchecked it, then forget the ask.
    const wanted = useWorkspaceState((state) => state.dockColumn);
    const root = useRef<HTMLDivElement>(null);
    const nodesTab = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (wanted === null || session === null) {
            return;
        }
        const kind: RecordKind = store.get().dockTab === "edges" ? "edge" : "node";
        const view = arrangement.views[kind];
        const { hidden } = view;
        // A data column the element hides is shown again there, one undo step.
        const ref = columnChoices(session, kind).find((choice) => choice.id === wanted && choice.hidden === true)?.ref;
        if (ref !== undefined) {
            void session.data.setHidden([ref], false);
            return;
        }
        if (hidden.includes(wanted)) {
            // The next render draws it, and this runs again to scroll to it.
            setArrangement((now) => ({
                ...now,
                views: { ...now.views, [kind]: { ...now.views[kind], hidden: hidden.filter((h) => h !== wanted) } },
            }));
            return;
        }
        const at = shownColumns(columnChoices(session, kind), view).findIndex((choice) => choice.id === wanted);
        if (at >= 0) {
            root.current
                ?.querySelector(`.cm-dt-head [aria-colindex="${String(at + 1)}"]`)
                ?.scrollIntoView({ block: "nearest", inline: "center" });
        }
        store.set({ dockColumn: null });
    }, [wanted, session, store, arrangement]);
    const arrange = (change: Partial<Arrangement>): void => {
        setArrangement((now) => ({ ...now, ...change }));
    };
    useAskedIssue(store, setArrangement);

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
    const visible = shownColumns(
        choices.filter((choice) => !isHidden(choice)),
        view,
    );
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
    const issueColumns = new Map([...issues].map(([column, list]) => [column, list.map((issue) => issue.id)]));
    // "With issues": how many rows an open issue is on, or the ones the filter shows.
    const withIssues = recordTotal(session, kind, scope, view.issue ?? "any");
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
        showRows: (issue) => {
            setView({ issue: issue.id });
        },
        ignoreAll: () => {
            ignoreAll(session, store, issues.get(column.id) ?? []);
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

    const count = groupRun === undefined ? recordCount(session, kind, scope) : countOf(groupRun.groups.length, "group");

    // Every tab names a rendered tab panel (aria-controls); the showing one holds the table.
    const tabValues = tabValuesOf(hasEdges, groups);
    const table = (
        <Tabs
            className="ws-table-main"
            value={active}
            onChange={(value) => {
                if (value !== null) {
                    store.set({ dockTab: value });
                }
            }}
        >
            <div className="ws-table-strip">
                <Tabs.List className="ws-table-tabs">
                    <Tabs.Tab ref={nodesTab} value="nodes">
                        Nodes
                    </Tabs.Tab>
                    {hasEdges ? <Tabs.Tab value="edges">Edges</Tabs.Tab> : null}
                    {groups.map((run) => (
                        <Tabs.Tab key={run.id} value={`g:${run.id}`}>
                            {run.label}
                        </Tabs.Tab>
                    ))}
                </Tabs.List>
                <Text size="xs" c="dimmed" className="ws-table-count ws-table-ellipsis">
                    {count}
                </Text>
                {active === "nodes" && shownMembers !== null ? (
                    <MembersChip
                        members={shownMembers}
                        onRemove={() => {
                            arrange({ members: null });
                            // The chip and its x go; focus goes to the tab it narrowed.
                            nodesTab.current?.focus();
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
                {groupRun === undefined && (withIssues > 0 || view.issue !== null) ? (
                    <Chip
                        size="xs"
                        checked={view.issue !== null}
                        onChange={(checked) => {
                            setView({ issue: checked ? "any" : null });
                        }}
                    >
                        {`With issues ${withIssues.toLocaleString("en-US")}`}
                    </Chip>
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
            {tabValues
                .filter((value) => value !== active)
                .map((value) => (
                    <Tabs.Panel key={value} value={value}>
                        {null}
                    </Tabs.Panel>
                ))}
            <Tabs.Panel value={active} className="ws-table-body" ref={bodyRef}>
                {groupRun === undefined ? (
                    <RecordTable
                        key={tableKey(kind, shownMembers, scope === "visible" ? shownCount : null, view.issue)}
                        session={session}
                        kind={kind}
                        columns={visible}
                        scope={scope}
                        issue={view.issue}
                        issueColumns={issueColumns}
                        sort={sorted === undefined ? null : view.sort}
                        onSortChange={(next) => {
                            setView({ sort: next });
                            // The caption changes with the sort; a reader hears it.
                            const column = visible.find((choice) => choice.id === next?.id);
                            store.set({ announcement: sortCaption(column, next?.desc ?? false) });
                        }}
                        height={tableHeight}
                        header={header}
                        onMoveColumn={(id, by) => {
                            const ids = visible.filter((choice) => choice.group !== "key").map((choice) => choice.id);
                            const from = ids.indexOf(id);
                            const to = from + by;
                            if (from === -1 || to < 0 || to >= ids.length) {
                                return;
                            }
                            [ids[from], ids[to]] = [ids[to], ids[from]];
                            setView({ order: ids });
                        }}
                    />
                ) : (
                    <GroupTable
                        runLabel={groupRun.label}
                        groups={groupRun.groups}
                        height={tableHeight}
                        onShowMembers={(group, name) => {
                            store.set({ dockTab: "nodes" });
                            arrange({
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
            </Tabs.Panel>
        </Tabs>
    );

    return (
        // Escape in the grid leaves it for the toolbar's Table button, which opened it: a key that
        // always does its job, where nothing in the grid has an Escape of its own.
        <div // NOSONAR(S6848): catches Escape as it bubbles from the grid's own focusable cells; the div takes no focus
            className="ws-table"
            ref={root}
            onKeyDown={leaveGrid}
            data-maximized={maximized ? "" : undefined}
        >
            {maximized ? <MaximizedPanel /> : null}
            {table}
        </div>
    );
}
