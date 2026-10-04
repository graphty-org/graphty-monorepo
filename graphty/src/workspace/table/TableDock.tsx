import "./table.css";

import { type DataTableSort, MenuCheckItem, UiGlyph } from "@graphty/compact-mantine";
import type { GraphSession, ScopeInput, SummaryGroup } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Menu, Pill, Tabs, Text } from "@mantine/core";
import React, { useCallback, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { columnChoices, countOf, groupName, type RecordKind, sortCaption, type TableColumnChoice } from "./columns";
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
    // The page column names the run's primary field (a community's `group`) as the element reads it.
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
export function TableDock(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const dockHeight = useWorkspaceState((state) => state.dockHeight);
    useSessionVersion(session);
    const [tab, setTab] = useState<string>("nodes");
    const [views, setViews] = useState<Record<RecordKind, View>>({ node: EMPTY_VIEW, edge: EMPTY_VIEW });
    const [members, setMembers] = useState<Members | null>(null);
    const [total, setTotal] = useState(0);
    const onTotal = useCallback((count: number) => {
        setTotal(count);
    }, []);

    if (session === null) {
        return null;
    }

    const groups = groupRuns(session);
    // A group tab whose run went away (undo, remove) falls back to Nodes.
    const active = tab.startsWith("g:") && !groups.some((run) => `g:${run.id}` === tab) ? "nodes" : tab;
    const groupRun = groups.find((run) => `g:${run.id}` === active);
    const kind: RecordKind = active === "edges" ? "edge" : "node";
    const view = views[kind];
    const choices = columnChoices(session, kind);
    const visible = choices.filter((choice) => !view.hidden.includes(choice.id));
    const sorted = visible.find((choice) => choice.id === view.sort?.id);
    const shownMembers = members !== null && groups.some((run) => run.id === members.run) ? members : null;
    const tableHeight = Math.max(32, dockHeight - CHROME_HEIGHT);

    const setView = (change: Partial<View>): void => {
        setViews((all) => ({ ...all, [kind]: { ...all[kind], ...change } }));
    };

    let count = countOf(total, kind);
    if (groupRun !== undefined) {
        count = countOf(groupRun.groups.length, "group");
    }

    return (
        <div className="ws-table">
            <div className="ws-table-strip">
                <Tabs
                    value={active}
                    onChange={(value) => {
                        if (value !== null) {
                            setTab(value);
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
                        // Mantine hides a Pill's remove button from the keyboard and screen readers;
                        // this one is the chip's only control, so it is made reachable.
                        removeButtonProps={{
                            "aria-label": `Show every node, not only ${shownMembers.name}`,
                            "aria-hidden": false,
                            tabIndex: 0,
                        }}
                        onRemove={() => {
                            setMembers(null);
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
                                store.set({ dialog: "export", exportOn: kind === "edge" ? "edges" : "nodes" });
                            }}
                        >
                            Export...
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
                <ActionIcon
                    variant="subtle"
                    aria-label="Close table"
                    onClick={() => {
                        store.set({ dockOpen: false });
                    }}
                >
                    <UiGlyph name="close" />
                </ActionIcon>
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
                    scope={kind === "node" && shownMembers !== null ? shownMembers.scope : "graph"}
                    sort={sorted === undefined ? null : view.sort}
                    onSortChange={(sort) => {
                        setView({ sort });
                    }}
                    height={tableHeight}
                    onTotal={onTotal}
                />
            ) : (
                <GroupTable
                    runLabel={groupRun.label}
                    groups={groupRun.groups}
                    height={tableHeight}
                    onShowMembers={(group) => {
                        setMembers({
                            run: groupRun.id,
                            runLabel: groupRun.label,
                            name: groupName(group),
                            scope: membersScope(session, groupRun.id, group),
                        });
                        setTab("nodes");
                    }}
                />
            )}
        </div>
    );
}
