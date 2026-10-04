import "./table.css";

import { type DataTableSort, MenuCheckItem, UiGlyph } from "@graphty/compact-mantine";
import type { GraphSession, ScopeInput, SummaryGroup } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Menu, Pill, Tabs, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { columnChoices, countOf, type RecordKind, sortCaption, type TableColumnChoice } from "./columns";
import { GroupTable } from "./GroupTable";
import { RecordTable } from "./RecordTable";
import { useSessionVersion } from "./useSessionVersion";

/** The dock's chrome above the table: the tab strip and the caption line. */
const CHROME_HEIGHT = 64;

/** The reader's arrangement of one record table. */
interface View {
    /** Column ids the reader unchecked. */
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

/** The reader's arrangement of the dock: its tab, each table's view, and the members chip. */
interface Arrangement {
    readonly tab: string;
    readonly views: Readonly<Record<RecordKind, View>>;
    readonly members: Members | null;
}

const FIRST_ARRANGEMENT: Arrangement = { tab: "nodes", views: { node: EMPTY_VIEW, edge: EMPTY_VIEW }, members: null };

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
        return groups === undefined ? [] : [{ id: run.id, label: run.label, groups }];
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
    // WORKAROUND (temporary, #354): `run.fields[].path` does not name the field a result item
    // resolves, so the field's name is read from a zero-row page column instead. Read it from the
    // run's fields once #354 is fixed.
    const [column] = session.data.nodePage({ limit: 0, columns: [run] }).columns;
    return {
        define: {
            kind: "rule",
            where: { kind: "item", item: { result: run, key: { field: column.field, value: group.group } } },
            reading: "induced",
        },
    };
}

/** Props for the Columns chooser. */
interface ColumnsMenuProps {
    choices: readonly TableColumnChoice[];
    hidden: readonly string[];
    onHiddenChange: (hidden: string[]) => void;
}

/**
 * "Columns: 8 of 69": a checkbox per attribute and per run result; the keys always show.
 * @param props - Component props
 * @param props.choices - Every column
 * @param props.hidden - The unchecked column ids
 * @param props.onHiddenChange - Called with the new unchecked ids
 * @returns The chooser
 */
function ColumnsMenu({ choices, hidden, onHiddenChange }: ColumnsMenuProps): React.JSX.Element {
    const shown = choices.filter((choice) => !hidden.includes(choice.id)).length;
    const section = (group: "attribute" | "result", title: string): React.ReactNode => {
        const rows = choices.filter((choice) => choice.group === group);
        if (rows.length === 0) {
            return null;
        }
        return (
            <>
                <Menu.Label>{title}</Menu.Label>
                {rows.map((choice) => {
                    const checked = !hidden.includes(choice.id);
                    return (
                        <MenuCheckItem
                            key={choice.id}
                            checked={checked}
                            onClick={() => {
                                onHiddenChange(
                                    checked ? [...hidden, choice.id] : hidden.filter((id) => id !== choice.id),
                                );
                            }}
                        >
                            {choice.header}
                        </MenuCheckItem>
                    );
                })}
            </>
        );
    };
    return (
        <Menu closeOnItemClick={false} position="bottom-end">
            <Menu.Target>
                <Button variant="subtle" size="compact-xs">
                    {`Columns: ${String(shown)} of ${String(choices.length)}`}
                </Button>
            </Menu.Target>
            <Menu.Dropdown mah={320} style={{ overflowY: "auto" }}>
                {section("attribute", "Attributes")}
                {section("result", "Results")}
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * The table dock (tier1-design.md section 2.9): Nodes, Edges and one item tab per group run;
 * the count; the Columns chooser; the options menu with Export...; the sort caption. Canvas, table
 * and inspector share graphty-element's one selection.
 * @returns The dock's contents
 */
export function TableDock(): React.JSX.Element {
    const { session, store } = useWorkspace();
    const dockHeight = useWorkspaceState((state) => state.dockHeight);
    useSessionVersion(session);
    const [arrangement, setArrangement] = useState<Arrangement>(() => ARRANGEMENTS.get(store) ?? FIRST_ARRANGEMENT);
    useEffect(() => {
        ARRANGEMENTS.set(store, arrangement);
    }, [store, arrangement]);
    const { tab, views, members } = arrangement;
    const arrange = (change: Partial<Arrangement>): void => {
        setArrangement((now) => ({ ...now, ...change }));
    };

    // Cheap reads: the element caches each run's summary, and a zero-row page reads no values.
    const groups = session === null ? [] : groupRuns(session);
    // A group tab whose run went away (undo, remove) falls back to Nodes.
    const active = tab.startsWith("g:") && !groups.some((run) => `g:${run.id}` === tab) ? "nodes" : tab;
    const kind: RecordKind = active === "edges" ? "edge" : "node";
    const choices = session === null ? [] : columnChoices(session, kind);

    const close = (
        <ActionIcon
            variant="subtle"
            aria-label="Close table"
            onClick={() => {
                store.set({ dockOpen: false });
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

    const groupRun = groups.find((run) => `g:${run.id}` === active);
    const view = views[kind];
    const visible = choices.filter((choice) => !view.hidden.includes(choice.id));
    const sorted = visible.find((choice) => choice.id === view.sort?.id);
    const shownMembers = members !== null && groups.some((run) => run.id === members.run) ? members : null;
    const scope = kind === "node" && shownMembers !== null ? shownMembers.scope : "graph";
    const tableHeight = Math.max(32, dockHeight - CHROME_HEIGHT);

    const setView = (change: Partial<View>): void => {
        setArrangement((now) => ({ ...now, views: { ...now.views, [kind]: { ...now.views[kind], ...change } } }));
    };

    // The count is the element's, read for the records showing, so it never lags a tab change.
    let count = countOf(groupRun?.groups.length ?? 0, "group");
    if (groupRun === undefined) {
        const counted = { limit: 0, scope };
        const total = kind === "node" ? session.data.nodePage(counted).total : session.data.edgePage(counted).total;
        count = countOf(total, kind);
    }

    return (
        <div className="ws-table">
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
                        <Tabs.Tab value="edges">Edges</Tabs.Tab>
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
                    <Pill
                        withRemoveButton
                        // WORKAROUND (temporary, #925): Mantine's Pill hides its remove button from
                        // the keyboard and screen readers; this one is the chip's only control.
                        // Delete these props when compact-mantine's Pill theme makes it reachable.
                        removeButtonProps={{
                            "aria-label": `Show every node, not only ${shownMembers.name}`,
                            "aria-hidden": false,
                            tabIndex: 0,
                        }}
                        onRemove={() => {
                            arrange({ members: null });
                        }}
                    >
                        {`${shownMembers.runLabel}: ${shownMembers.name}`}
                    </Pill>
                ) : null}
                <span className="ws-table-spacer" />
                {groupRun === undefined ? (
                    <ColumnsMenu
                        choices={choices}
                        hidden={view.hidden}
                        onHiddenChange={(hidden) => {
                            setView({ hidden });
                        }}
                    />
                ) : null}
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
                {close}
            </div>
            <Text size="xs" c="dimmed" className="ws-table-caption">
                {groupRun === undefined ? sortCaption(sorted, view.sort?.desc ?? false) : "Largest group first"}
            </Text>
            {groupRun === undefined ? (
                <RecordTable
                    key={shownMembers === null || kind === "edge" ? kind : `node:${shownMembers.run}:${shownMembers.name}`}
                    session={session}
                    kind={kind}
                    columns={visible}
                    scope={scope}
                    sort={sorted === undefined ? null : view.sort}
                    onSortChange={(sort) => {
                        setView({ sort });
                    }}
                    height={tableHeight}
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
    );
}
