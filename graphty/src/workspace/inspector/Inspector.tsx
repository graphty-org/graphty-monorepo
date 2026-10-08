import { PANEL_GRID, PopoutManager } from "@graphty/compact-mantine";
import type { GraphSession, Run } from "@graphty/graphty-element/session";
import { ActionIcon, Anchor, Box, ColorSwatch, Group, Menu, Stack, Tabs, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { runName, wordsFor } from "../analyze/words";
import { useAttributeActions } from "../data-place/attributeActions";
import { FilterStepEditor } from "../data-place/Filters";
import { stepEditorName } from "../data-place/filterSteps";
import { AttributeMenuItems } from "../data-place/MenuItems";
import { SourceValues } from "../data-place/SourceValues";
import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import { loadIndexOf, loadName, sourceRowOf, sourcesWords } from "../data-place/words";
import { INSPECTOR_TITLE_ID } from "../frame/focus";
import { Sections } from "../frame/menus";
import { GLYPHS, KIND_GLYPHS } from "../glyphs";
import { LayoutGroup } from "../layout/LayoutForm";
import { notesAbout } from "../notes/words";
import { tabFor } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { GroupStyle, SelectionRowStyle, SelectionStyle, StyleTab } from "../style/StyleTab";
import { AttributeValues, CanvasSection, EverythingValues, Overview } from "./GraphValues";
import { useSessionVersion } from "./hooks";
import { identityOf, type InspectedKindId, type Resolved, resolveInspected } from "./inspected";
import { MENUS } from "./kindMenus";
import { EdgeValues, NeighborList, NodeValues, SeveralValues } from "./NodeValues";
import { type Draft, rowKindOf, swatchOf } from "./reads";
import { GroupValues, RunStateBar, RunValues } from "./RunValues";
import { WhyThisLook } from "./WhyThisLook";
import { count, edgeName, groupName, KIND_WORDS, PATH_WORD, runTime, selectionWords } from "./words";

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
    // A filter step turned on or off changes its editor's header.
    useVisibilityVersion(session);
    const inspected = useWorkspaceState((state) => state.inspected);
    const remembered = useWorkspaceState((state) => state.tabs);
    const [picked, setPicked] = useState<{ identity: string; tab: "style" | "values" } | null>(null);
    const [draft, setDraft] = useState<{ run: string; values: Draft } | null>(null);
    const attributeActionsOf = useAttributeActions();

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
    // A path's answer is its nodes in order, so its run opens on Values, as a single node does.
    const isPath = run?.shape === "path";
    const opensOn = isPath ? "values" : tabFor(kind, remembered);
    const tab = picked?.identity === identity ? picked.tab : opensOn;
    // A path is not a measure, though its run row is one.
    const kindWord = isPath ? PATH_WORD : KIND_WORDS[kindId];
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
    // An attribute's verbs are the Data place's row menu's, so the two cannot drift apart.
    const attribute =
        resolved.kind === "attribute"
            ? session.data.attributes().find((candidate) => candidate.path === resolved.path)
            : undefined;
    const attributeActions = attributeActionsOf(
        attribute === undefined ? null : { kind: attribute.kind, name: attribute.name },
    );
    const KindIcon = KIND_GLYPHS[kindId];
    // How many notes are about this, as a link to the Notes place; the text stays there.
    const notes = notesAbout(session, resolved);

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
                        {/* Focusable from script only: where focus lands after a run or a find pick. */}
                        <Text
                            id={INSPECTOR_TITLE_ID}
                            tabIndex={-1}
                            className="cm-focus-outside"
                            size="sm"
                            fw={600}
                            truncate
                        >
                            {header.name}
                        </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                        {/* The built-in rows' kind is their name: one "Everything", not two. */}
                        {kindWord !== header.name && (
                            <Text size="xs" c="dimmed">
                                {kindWord}
                            </Text>
                        )}
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
                        {notes > 0 && (
                            <Anchor
                                component="button"
                                size="xs"
                                onClick={() => {
                                    runCommand("place.notes");
                                }}
                            >
                                {count(notes, "note")}
                            </Anchor>
                        )}
                        {menu.length + attributeActions.length > 0 && (
                            <Menu position="bottom-end">
                                <Menu.Target>
                                    <ActionIcon
                                        variant="subtle"
                                        size="sm"
                                        ml="auto"
                                        // Alone at the row's end, so a finger gets the full 44px.
                                        style={{ "--cm-ai-touch-target": "44px" }}
                                        aria-label={`${kindWord} actions`}
                                    >
                                        <GLYPHS.more size={14} />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Sections sections={[menu.map((command) => command.id)]} />
                                    <AttributeMenuItems actions={attributeActions} />
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
 * @param date - when it ran, or null.
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
        const date = runTime(made.startedAt);
        return {
            words: fromWords(runName(session, made), date),
            open: () => {
                open({ kind: "run-row", run: made.id });
            },
        };
    };
    switch (resolved.kind) {
        case "graph": {
            const words = sourcesWords(session.data.sources());
            return { name: "Graph", from: words === undefined ? undefined : { words, open: openData } };
        }
        // A node is named by its id until graphty-element publishes its name (#895).
        case "node":
            return { name: String(resolved.node), swatch: swatchOf(session, { node: resolved.node }) };
        case "neighborhood":
            return { name: String(resolved.node) };
        case "edge": {
            const edge = session.data.edge(resolved.edge);
            return {
                name: edge === undefined ? resolved.edge : edgeName(session, edge),
                swatch: swatchOf(session, { edge: resolved.edge }),
            };
        }
        case "several": {
            return { name: selectionWords(session.selection.nodes.length, session.selection.edges.length) };
        }
        case "measure-row":
        case "run-row": {
            if (run === undefined) {
                return { name: "Gone" };
            }
            const date = runTime(run.startedAt);
            const descriptor = session.catalog.algorithms().find((a) => a.key === run.algorithm);
            const name = runName(session, run);
            const made = descriptor === undefined ? run.algorithm : wordsFor(descriptor).name;
            // A row named after its analysis says only when it ran: "Path from Shortest path"
            // would read as a path starting at a node called Shortest path.
            return {
                name,
                from: {
                    words: made === name && date !== null ? `ran ${date}` : fromWords(made, date),
                    open: openAnalyze,
                },
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
        case "filter-step": {
            // Whether the step is on, as its row's checkbox says, so the editor alone tells.
            const step = session.visibility.steps.find((s) => s.id === resolved.step);
            return {
                name: stepEditorName(session, resolved.step),
                from: step === undefined ? undefined : { words: step.on ? "On" : "Off" },
            };
        }
        case "source": {
            const sources = session.data.sources();
            const load = sources[loadIndexOf(resolved.row) ?? -1];
            // A child row ("people.csv", "1 row left out") is named as its row reads.
            const child =
                resolved.row.split(":").length > 2
                    ? sourceRowOf(sources, session.data.lastImport(), resolved.row)
                    : undefined;
            return { name: load === undefined ? "Gone" : (child?.name ?? loadName(load)) };
        }
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
                        {/* The panel's content band, where every section's rows begin. */}
                        <Box pl={PANEL_GRID.PAD_LEFT} pr={PANEL_GRID.PAD_RIGHT}>
                            <LayoutGroup />
                        </Box>
                    </>
                ),
                values: <Overview />,
            };
        case "node":
            return {
                style: (
                    <>
                        <SelectionRowStyle />
                        <WhyThisLook target={{ node: resolved.node }} />
                    </>
                ),
                values: <NodeValues id={resolved.node} />,
            };
        case "edge":
            return {
                style: (
                    <>
                        <SelectionRowStyle />
                        <WhyThisLook target={{ edge: resolved.edge }} />
                    </>
                ),
                values: <EdgeValues id={resolved.edge} />,
            };
        case "several":
            return { style: <SelectionRowStyle />, values: <SeveralValues version={version} /> };
        case "neighborhood":
            return {
                only: <NeighborList center={resolved.node} hops={resolved.hops} direction={resolved.direction} />,
            };
        case "measure-row":
        case "run-row":
            return run === undefined
                ? { only: <Gone /> }
                : { style: <StyleTab />, values: <RunValues run={run} draft={draft} onDraft={onDraft} /> };
        case "group-row":
            return run === undefined
                ? { only: <Gone /> }
                : {
                      style: <GroupStyle run={run.id} group={resolved.group} />,
                      values: <GroupValues run={run} group={resolved.group} version={version} />,
                  };
        case "everything-row":
            return { style: <StyleTab />, values: <EverythingValues /> };
        // Style edits the highlight a selected node is drawn with; Values is what the selection holds.
        case "selection-row":
            return { style: <SelectionStyle />, values: <SeveralValues version={version} /> };
        case "layer-row":
            return { only: <StyleTab /> };
        case "filter-step":
            // Keyed by the step, so opening another step starts from its own fields.
            return { only: <FilterStepEditor key={resolved.step} id={resolved.step} /> };
        case "source":
            return { only: <SourceValues row={resolved.row} /> };
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
