import { PopoutManager } from "@graphty/compact-mantine";
import type { GraphSession, Run } from "@graphty/graphty-element/session";
import { ActionIcon, Anchor, ColorSwatch, Group, Menu, Stack, Tabs, Text } from "@mantine/core";
import {
    ChartColumn,
    Circle,
    Columns3,
    Component,
    Group as GroupIcon,
    Layers,
    type LucideIcon,
    MoreHorizontal,
    MousePointer2,
    Paintbrush,
    Shapes,
    Share2,
    Spline,
    Workflow,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import { LayoutGroup } from "../layout/LayoutGroup";
import { tabFor } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { StyleTab } from "../style/StyleTab";
import { AttributeValues, CanvasSection, EverythingValues, Overview } from "./GraphValues";
import { useSessionVersion } from "./hooks";
import { identityOf, type InspectedKindId, type Resolved, resolveInspected } from "./inspected";
import { EdgeValues, NeighborList, NodeValues, SeveralValues } from "./NodeValues";
import { type Draft, rowKindOf, swatchOf } from "./reads";
import { GroupValues, RunStateBar, RunValues } from "./RunValues";
import { WhyThisLook } from "./WhyThisLook";
import { groupName, KIND_WORDS, runDate } from "./words";

/**
 * The commands each kind's "..." holds (tier1-design.md section 2.7), the same list as its
 * context menu. A command another package has not built is left out, and a kind with none draws
 * no "...": a row's verbs (rerun, remove, rename) arrive with the Graph place's row menus.
 */
const MENUS: Partial<Readonly<Record<InspectedKindId, readonly string[]>>> = {
    graph: ["layout.rerun", "layout.reshuffle"],
    node: ["selection.neighborhood", "view.frame-selection"],
    edge: ["view.frame-selection"],
    several: ["view.frame-selection"],
    neighborhood: ["view.frame-selection"],
};

/** The kind icon on the header's first line. */
const KIND_ICONS: Readonly<Record<InspectedKindId, LucideIcon>> = {
    graph: Workflow,
    node: Circle,
    edge: Spline,
    several: GroupIcon,
    neighborhood: Share2,
    "measure-row": ChartColumn,
    "run-row": Shapes,
    "group-row": Component,
    "everything-row": Layers,
    "selection-row": MousePointer2,
    "layer-row": Paintbrush,
    attribute: Columns3,
};

/** A kind's two tab bodies, or its one body when it has no tabs. */
type Body = { readonly style: React.ReactNode; readonly values: React.ReactNode } | { readonly only: React.ReactNode };

/** The header's two lines. */
interface Header {
    readonly name: string;
    /** The color the element drew it in, for a node or an edge. */
    readonly swatch?: string;
    /** The provenance link: its words and what it opens. */
    readonly from?: { readonly words: string; readonly open?: () => void };
}

/** What the header's provenance links open. */
interface Doors {
    readonly open: (next: Resolved) => void;
    readonly openData: () => void;
    readonly openAnalyze: (() => void) | undefined;
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
            if (store.get().inspected !== null) {
                store.set({ inspected: null });
            }
        });
    }, [session, store]);

    const resolved = resolveInspected(
        inspected,
        session === null ? null : { nodes: session.selection.nodes, edges: session.selection.edges },
    );
    const identity = identityOf(resolved);
    const run = runOf(session, resolved);
    // A run's row is a measure or a grouping by its result, whichever door opened it.
    const kindId: InspectedKindId =
        run !== undefined && (resolved.kind === "measure-row" || resolved.kind === "run-row")
            ? (rowKindOf(run) ?? resolved.kind)
            : resolved.kind;
    const kind = registry.kinds.get(kindId);
    const tab = picked?.identity === identity ? picked.tab : tabFor(kind, remembered);
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
    const header = headerOf(session, resolved, run, {
        open,
        openData: () => {
            store.set({ page: "panels", place: "data" });
        },
        openAnalyze:
            registry.built("analyze.open") === undefined
                ? undefined
                : () => {
                      runCommand("analyze.open");
                  },
    });
    const body = bodyOf(resolved, run, runDraft, onDraft, version);
    const menu = (MENUS[kindId] ?? []).flatMap((id) => registry.built(id) ?? []);
    const KindIcon = KIND_ICONS[kindId];

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
                        store.set((state) => ({ tabs: { ...state.tabs, [kindId]: next } }));
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
            <Stack gap={0} data-inspected={kindId} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                <Stack gap={0} px="md" py={6}>
                    <Group gap={6} wrap="nowrap">
                        <KindIcon size={14} aria-hidden />
                        {header.swatch !== undefined && (
                            <ColorSwatch color={header.swatch} size={12} withShadow={false} aria-hidden />
                        )}
                        <Text size="sm" fw={600} truncate>
                            {header.name}
                        </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                        <Text size="xs" c="dimmed">
                            {KIND_WORDS[kindId]}
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
                                    <ActionIcon
                                        variant="subtle"
                                        size="sm"
                                        ml="auto"
                                        aria-label={`${KIND_WORDS[kindId]} actions`}
                                    >
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
 * The "from" line of a header: what made the thing, and when when that is known.
 * @param name - what made it.
 * @param date - the day it ran, or null.
 * @returns the words.
 */
function fromWords(name: string, date: string | null): string {
    return date === null ? `from ${name}` : `from ${name}, ${date}`;
}

/**
 * The header's name and provenance for what is inspected.
 * @param session - the session.
 * @param resolved - what is inspected.
 * @param run - its run, for a run or group row.
 * @param doors - what the provenance links open: another row, the Data place, and Analyze when
 * it is built.
 * @returns the header.
 */
function headerOf(session: GraphSession, resolved: Resolved, run: Run | undefined, doors: Doors): Header {
    const { open, openData, openAnalyze } = doors;
    const from = (made: Run): Header["from"] => {
        const date = runDate(made.startedAt);
        return {
            words: fromWords(made.label, date),
            open: () => {
                open({ kind: "run-row", run: made.id });
            },
        };
    };
    switch (resolved.kind) {
        case "graph": {
            const source = session.data.source()?.name;
            return {
                name: "Graph",
                from: source === undefined ? undefined : { words: `From ${source}`, open: openData },
            };
        }
        // A node is named by its id until graphty-element publishes its name (#895).
        case "node":
            return { name: String(resolved.node), swatch: swatchOf(session, { node: resolved.node }) };
        case "neighborhood":
            return { name: String(resolved.node) };
        case "edge": {
            const edge = session.data.edge(resolved.edge);
            return {
                name: edge === undefined ? resolved.edge : `${String(edge.source)} to ${String(edge.target)}`,
                swatch: swatchOf(session, { edge: resolved.edge }),
            };
        }
        case "several": {
            const { nodes, edges } = session.selection;
            return { name: `${String(nodes.length)} nodes, ${String(edges.length)} edges` };
        }
        case "measure-row":
        case "run-row": {
            if (run === undefined) {
                return { name: "Gone" };
            }
            const date = runDate(run.startedAt);
            const analysis = session.catalog.algorithms().find((a) => a.key === run.algorithm)?.plainName ?? run.label;
            return {
                name: run.label,
                from: { words: fromWords(analysis, date), open: openAnalyze },
            };
        }
        case "group-row": {
            const group = run?.result?.summary().groups?.find((g) => g.group === resolved.group);
            return {
                name: group === undefined ? String(resolved.group) : groupName(group),
                from: run === undefined ? undefined : from(run),
            };
        }
        case "everything-row":
            return { name: "Everything" };
        case "selection-row":
            return { name: "Selection" };
        case "layer-row":
            return { name: session.styles.get(resolved.layer)?.name ?? "Gone" };
        default: {
            const column = session.data.attributes().find((candidate) => candidate.path === resolved.path);
            const made = column?.runId === undefined ? undefined : session.runs.get(column.runId);
            return { name: column?.plainName ?? resolved.path, from: made === undefined ? undefined : from(made) };
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
                values: <Overview />,
            };
        case "node":
            return {
                style: <WhyThisLook target={{ node: resolved.node }} />,
                values: <NodeValues id={resolved.node} />,
            };
        case "edge":
            return {
                style: <WhyThisLook target={{ edge: resolved.edge }} />,
                values: <EdgeValues id={resolved.edge} />,
            };
        case "several":
            return { only: <SeveralValues version={version} /> };
        case "neighborhood":
            return { only: <NeighborList center={resolved.node} /> };
        case "measure-row":
        case "run-row":
            return run === undefined
                ? { only: <Gone /> }
                : { style: <StyleTab />, values: <RunValues run={run} draft={draft} onDraft={onDraft} /> };
        case "group-row":
            return run === undefined
                ? { only: <Gone /> }
                : // A group is not a style layer, so it has nothing for the Style tab to edit.
                  { only: <GroupValues run={run} group={resolved.group} version={version} /> };
        case "everything-row":
            return { style: <StyleTab />, values: <EverythingValues /> };
        case "selection-row":
        case "layer-row":
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
