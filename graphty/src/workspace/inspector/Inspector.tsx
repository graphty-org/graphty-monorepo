import { PopoutManager } from "@graphty/compact-mantine";
import type { GraphSession, Run } from "@graphty/graphty-element/session";
import { ActionIcon, Anchor, Group, Menu, Stack, Tabs, Text } from "@mantine/core";
import { MoreHorizontal } from "lucide-react";
import React, { useEffect, useState } from "react";

import { LayoutGroup } from "../layout/LayoutGroup";
import { tabFor } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { StyleTab } from "../style/StyleTab";
import { AttributeValues, CanvasSection, EverythingValues, Overview } from "./GraphValues";
import { useSessionVersion } from "./hooks";
import { identityOf, nodeKey, type Resolved, resolveInspected } from "./inspected";
import { EdgeValues, NeighborList, NodeValues, SeveralValues } from "./NodeValues";
import type { Draft } from "./reads";
import { GroupValues, RunStateBar, RunValues } from "./RunValues";
import { WhyThisLook } from "./WhyThisLook";
import { KIND_WORDS, runDate } from "./words";

/** The commands the graph's "..." holds in tier 1 (tier1-design.md section 2.7). */
const GRAPH_MENU = ["layout.rerun", "layout.reshuffle"] as const;

/** A kind's two tab bodies, or its one body when it has no tabs. */
type Body = { readonly style: React.ReactNode; readonly values: React.ReactNode } | { readonly only: React.ReactNode };

/** The header's two lines. */
interface Header {
    readonly name: string;
    /** The provenance link: its words and what it opens. */
    readonly from?: { readonly words: string; readonly open?: () => void };
}

/**
 * The run a run or group row names, or undefined when the session holds none.
 * @param session - the session.
 * @param resolved - what is inspected.
 * @returns the run.
 */
function runOf(session: GraphSession | null, resolved: Resolved): Run | undefined {
    return "run" in resolved ? session?.runs.get(resolved.run) : undefined;
}

/**
 * The selection's center when it is a neighborhood, so a selection change that keeps it open
 * (the neighborhood itself arriving) does not close the list.
 * @param session - the session.
 * @param center - the center, as `inspected.id` holds it.
 * @returns whether the list stays open.
 */
function neighborhoodStillSelected(session: GraphSession, center: string | undefined): boolean {
    const {nodes} = session.selection;
    return nodes.length > 1 && nodes.some((id) => nodeKey(id) === center);
}

/**
 * The inspector (tier1-design.md section 2.7): the properties of what is selected, read and
 * edited in place. A header of two lines, a state bar when a run needs one, then the Style and
 * Values tabs, or one body for a kind with no tabs. The tab last chosen stays chosen per kind;
 * a single node always opens on Values.
 * @returns The inspector
 */
export function Inspector(): React.JSX.Element {
    const { session, store, registry, run: runCommand } = useWorkspace();
    const version = useSessionVersion(session);
    const inspected = useWorkspaceState((state) => state.inspected);
    const remembered = useWorkspaceState((state) => state.tabs);
    const [picked, setPicked] = useState<{ identity: string; tab: "style" | "values" } | null>(null);
    const [draft, setDraft] = useState<{ run: string; values: Draft } | null>(null);

    // The inspector shows the selected thing: a selection change closes an open row.
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        return session.on("selection:changed", () => {
            const open = store.get().inspected;
            if (open !== null && !(open.kind === "neighborhood" && neighborhoodStillSelected(session, open.id))) {
                store.set({ inspected: null });
            }
        });
    }, [session, store]);

    const resolved = resolveInspected(
        inspected,
        session === null ? null : { nodes: session.selection.nodes, edges: session.selection.edges },
    );
    const identity = identityOf(resolved);
    const kind = registry.kinds.get(resolved.kind);
    const tab = picked?.identity === identity ? picked.tab : tabFor(kind, remembered);
    const run = runOf(session, resolved);
    const runDraft = run !== undefined && draft?.run === run.id ? draft.values : {};
    const onDraft = (values: Draft): void => {
        if (run !== undefined) {
            setDraft({ run: run.id, values });
        }
    };

    if (session === null) {
        return <Stack />;
    }

    const open = (next: Resolved): void => {
        if ("run" in next && next.kind !== "group-row") {
            store.set({ inspected: { kind: next.kind, id: next.run } });
        }
    };
    const header = headerOf(session, resolved, run, open, () => {
        store.set({ page: "panels", place: "data" });
    });
    const body = bodyOf(resolved, run, runDraft, onDraft, version);
    const menu = resolved.kind === "graph" ? GRAPH_MENU.flatMap((id) => registry.built(id) ?? []) : [];

    let content: React.ReactNode;
    if ("only" in body) {
        content = body.only;
    } else if (tab === null) {
        content = body.values;
    } else {
        content = (
                <Tabs
                    value={tab}
                    onChange={(next) => {
                        if (next === "style" || next === "values") {
                            setPicked({ identity, tab: next });
                            store.set((state) => ({ tabs: { ...state.tabs, [resolved.kind]: next } }));
                        }
                    }}
                >
                    <Tabs.List>
                        <Tabs.Tab value="style">Style</Tabs.Tab>
                        <Tabs.Tab value="values">Values</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="style">{body.style}</Tabs.Panel>
                    <Tabs.Panel value="values">{body.values}</Tabs.Panel>
                </Tabs>
        );
    }

    return (
        // The Background color field opens its picker as a popout, which needs a manager above it.
        <PopoutManager>
        <Stack gap={0} data-inspected={resolved.kind} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <Stack gap={0} px="md" py={6}>
                <Text size="sm" fw={600} truncate>
                    {header.name}
                </Text>
                <Group gap={6} wrap="nowrap">
                    <Text size="xs" c="dimmed">
                        {KIND_WORDS[resolved.kind]}
                    </Text>
                    {header.from?.open === undefined ? (
                        header.from !== undefined && (
                            <Text size="xs" c="dimmed">
                                {header.from.words}
                            </Text>
                        )
                    ) : (
                        <Anchor component="button" size="xs" onClick={header.from.open}>
                            {header.from.words}
                        </Anchor>
                    )}
                    {menu.length > 0 && (
                        <Menu position="bottom-end">
                            <Menu.Target>
                                <ActionIcon variant="subtle" size="sm" ml="auto" aria-label="Graph actions">
                                    <MoreHorizontal size={14} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                {menu.map((command) => (
                                    <Menu.Item
                                        key={command.id}
                                        onClick={() => {
                                            runCommand(command.id);
                                        }}
                                    >
                                        {command.label}
                                    </Menu.Item>
                                ))}
                            </Menu.Dropdown>
                        </Menu>
                    )}
                </Group>
            </Stack>
            {run !== undefined && <RunStateBar run={run} draft={runDraft} onDraft={onDraft} />}
            {content}
        </Stack>
        </PopoutManager>
    );
}

/**
 * The header's name and provenance for what is inspected.
 * @param session - the session.
 * @param resolved - what is inspected.
 * @param run - its run, for a run or group row.
 * @param open - opens another row.
 * @param openData - opens the Data place.
 * @returns the header.
 */
function headerOf(
    session: GraphSession,
    resolved: Resolved,
    run: Run | undefined,
    open: (next: Resolved) => void,
    openData: () => void,
): Header {
    switch (resolved.kind) {
        case "graph": {
            const source = session.data.source()?.name;
            return { name: "Graph", from: source === undefined ? undefined : { words: `From ${source}`, open: openData } };
        }
        // A node is named by its id until graphty-element publishes its name (#895).
        case "node":
        case "neighborhood":
            return { name: String(resolved.node) };
        case "edge": {
            const edge = session.data.edge(resolved.edge);
            return { name: edge === undefined ? resolved.edge : `${String(edge.source)} to ${String(edge.target)}` };
        }
        case "several": {
            const { nodes, edges } = session.selection;
            return { name: `${String(nodes.length)} nodes, ${String(edges.length)} edges` };
        }
        case "measure-row":
        case "run-row": {
            const date = runDate(run?.startedAt ?? null);
            return { name: run?.label ?? "Gone", from: date === null ? undefined : { words: `run ${date}` } };
        }
        case "group-row": {
            const group = run?.result?.summary().groups?.find((g) => g.group === resolved.group);
            return {
                name: group?.name ?? String(resolved.group),
                from:
                    run === undefined
                        ? undefined
                        : {
                              words: `from ${run.label}`,
                              open: () => {
                                  open({ kind: "run-row", run: run.id });
                              },
                          },
            };
        }
        case "everything-row":
            return { name: "Everything" };
        case "selection-row":
            return { name: "Selection" };
        default: {
            const column = session.data.attributes().find((candidate) => candidate.path === resolved.path);
            const from = column?.runId === undefined ? undefined : session.runs.get(column.runId);
            return {
                name: column?.plainName ?? resolved.path,
                from:
                    from === undefined
                        ? undefined
                        : {
                              words: `from ${from.label}`,
                              open: () => {
                                  open({ kind: "run-row", run: from.id });
                              },
                          },
            };
        }
    }
}

/**
 * The tabs' bodies for what is inspected, or the one body of a kind with no tabs.
 * @param resolved - what is inspected.
 * @param run - its run, for a run or group row.
 * @param draft - the reader's changes to the run's settings.
 * @param onDraft - replaces them.
 * @param version - changes whenever the element reports a change.
 * @returns the bodies.
 */
function bodyOf(
    resolved: Resolved,
    run: Run | undefined,
    draft: Draft,
    onDraft: (draft: Draft) => void,
    version: number,
): Body {
    switch (resolved.kind) {
        case "graph":
            return {
                style: (
                    <>
                        <CanvasSection />
                        <LayoutGroup />
                    </>
                ),
                values: <Overview version={version} />,
            };
        case "node":
            return { style: <WhyThisLook target={{ node: resolved.node }} />, values: <NodeValues id={resolved.node} /> };
        case "edge":
            return { style: <WhyThisLook target={{ edge: resolved.edge }} />, values: <EdgeValues id={resolved.edge} /> };
        case "several":
            return { only: <SeveralValues version={version} /> };
        case "neighborhood":
            return { only: <NeighborList center={resolved.node} /> };
        case "measure-row":
        case "run-row":
            return run === undefined ? { only: <Gone /> } : { style: <StyleTab />, values: <RunValues run={run} draft={draft} onDraft={onDraft} /> };
        case "group-row":
            return run === undefined
                ? { only: <Gone /> }
                : { style: <StyleTab />, values: <GroupValues run={run} group={resolved.group} version={version} /> };
        case "everything-row":
            return { style: <StyleTab />, values: <EverythingValues /> };
        case "selection-row":
            return { only: <StyleTab /> };
        default:
            return { only: <AttributeValues path={resolved.path} /> };
    }
}

/**
 * A row whose run the session no longer holds (an undo took it away).
 * @returns One gray line
 */
function Gone(): React.JSX.Element {
    return (
        <Text size="xs" c="dimmed" p="md">
            This row is gone
        </Text>
    );
}
