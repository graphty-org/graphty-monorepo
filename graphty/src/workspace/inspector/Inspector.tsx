import { PopoutManager } from "@graphty/compact-mantine";
import type { GraphSession, Run } from "@graphty/graphty-element/session";
import { ActionIcon, Anchor, ColorSwatch, Group, Menu, Stack, Tabs, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { wordsFor } from "../analyze/words";
import type { InspectedKind } from "../commands/registry";
import { useAttributeActions } from "../data-place/attributeActions";
import { SourceGlyph, TypeGlyphIcon } from "../data-place/DataPlace";
import { TIME_ROW } from "../data-place/filterCards";
import { AttributeMenuItems } from "../data-place/MenuItems";
import { useSourceActions } from "../data-place/sourceActions";
import { SourceValues } from "../data-place/SourceValues";
import { TimeCard } from "../data-place/TimeCard";
import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import {
    loadIndexOf,
    loadName,
    type SourceKind,
    sourceRowOf,
    sourcesWords,
    type TypeGlyph,
    typeOf,
} from "../data-place/words";
import { INSPECTOR_TITLE_ID } from "../frame/focus";
import { Sections } from "../frame/menus";
import { GLYPHS, KIND_GLYPHS } from "../glyphs";
import { orNotice } from "../graph-place/actions";
import { KindGlyph } from "../graph-place/KindGlyph";
import { RowMenuItems } from "../graph-place/RowMenu";
import { findTreeRow, layerKindWords, placeOf, rowName, rowsHeading, runRowKind } from "../graph-place/rows";
import { LayerRowPanel } from "../graph-place/StyleTree";
import { notesAbout } from "../notes/words";
import { runName } from "../runWords";
import { useNumberFormats } from "../settings/numberFormat";
import { tabFor, type WorkspaceState } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { FolderPanel } from "../style/FolderPanel";
import { MultiRowPanel } from "../style/MultiRowPanel";
import { GroupStyle, SelectionRowStyle, SelectionStyle, StylePanel } from "../style/StylePanel";
import { GraphSettings } from "./GraphSettings";
import { AttributeValues, Overview } from "./GraphValues";
import { useSessionVersion } from "./hooks";
import { identityOf, type InspectedKindId, type Resolved, resolveInspected } from "./inspected";
import { MENUS } from "./kindMenus";
import { EverythingRowValues, FolderValues, LayerValues } from "./LayerValues";
import { EdgeValues, NeighborList, NodeValues, SeveralValues } from "./NodeValues";
import { type Draft, swatchOf } from "./reads";
import { GroupValues, RunStateBar, RunValues } from "./RunValues";
import { WhyThisLook } from "./WhyThisLook";
import {
    count,
    edgeName,
    groupName,
    KIND_WORDS,
    leftOutOf,
    nodeName,
    PATH_WORD,
    runTime,
    selectionWords,
} from "./words";

/** A kind's two tab bodies, or its one body when it has no tabs. */
type Body = { readonly style: React.ReactNode; readonly values: React.ReactNode } | { readonly only: React.ReactNode };

/** The header's two lines. */
interface Header {
    readonly name: string;
    /** The second line's kind word, when it is not the kind's own (a left-out row's load). */
    readonly kind?: string;
    /** The color the element drew it in, for a node or an edge. */
    readonly swatch?: string;
    /** The provenance link: its words and what it opens. */
    readonly from?: { readonly words: string; readonly open?: () => void };
    /** For a Sources row, the row's kind, so the header draws the row's own icon. */
    readonly source?: SourceKind;
    /** For an attribute, its Attributes row's type, so the header draws the row's own icon. */
    readonly glyph?: TypeGlyph;
    /** The heading's spoken name, when it says more than the name drawn (the graph's size). */
    readonly spoken?: string;
}

/** What the header's provenance links open, and the project's name the graph's heading says. */
interface Doors {
    readonly projectName?: string;
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
 * The run a style tree row's layer paints, so its state bar (out of date, Rerun) shows there too.
 * @param session - the session.
 * @param resolved - what is inspected.
 * @returns the run, for a layer row bound to one.
 */
function layerRunOf(session: GraphSession | null, resolved: Resolved): Run | undefined {
    const source = resolved.kind === "layer-row" ? session?.styles.get(resolved.layer)?.source : undefined;
    return source?.by === "run" ? session?.runs.get(source.runId) : undefined;
}

/**
 * Whether an open row is gone from the session: its run, its style tree row, or its load.
 * @param session - the session.
 * @param resolved - what is open.
 * @returns true when the row names something the session no longer holds.
 */
function isGone(session: GraphSession | null, resolved: Resolved): boolean {
    if (session === null) {
        return false;
    }
    switch (resolved.kind) {
        case "measure-row":
        case "run-row":
        case "group-row":
            return session.runs.get(resolved.run) === undefined;
        case "layer-row":
            return findTreeRow(session.styles.tree(), resolved.layer) === undefined;
        case "folder-row":
            return findTreeRow(session.styles.tree(), resolved.row) === undefined;
        case "rows": {
            const tree = session.styles.tree();
            return resolved.rows.every((id) => findTreeRow(tree, id) === undefined);
        }
        case "source":
            return session.data.sources()[loadIndexOf(resolved.row) ?? -1] === undefined;
        default:
            return false;
    }
}

type Workspace = ReturnType<typeof useWorkspace>;

/** A row of the style tree the header draws its glyph and menu for, with the tree it is in. */
interface HeaderTree {
    readonly tree: ReturnType<GraphSession["styles"]["tree"]>;
    readonly treeRow: ReturnType<typeof findTreeRow>;
}

/**
 * The inspector shows the selected thing: a new selection closes an open row, and so does a click
 * on empty canvas, which lets go of a run or row selected while no node was.
 * @param session - the session.
 * @param store - the workspace store.
 */
function useCloseOnNewSelection(session: GraphSession | null, store: Workspace["store"]): void {
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        const close = (): void => {
            if (store.get().inspected !== null) {
                store.set({ inspected: null });
            }
        };
        // A click on the node or edge already selected changes no selection, yet the reader asked
        // for it again: its inspector comes back.
        const stops = [
            // A selection emptied (Escape, Clear selection) shows nothing new: the open row stays,
            // so one Escape does one thing.
            session.on("selection:changed", () => {
                if (session.selection.size > 0) {
                    close();
                }
            }),
            // A right-click on empty canvas asks for a menu and lets go of nothing.
            session.on("canvas:empty-click", (at) => {
                if (!at.secondary) {
                    close();
                }
            }),
            session.on("canvas:element-click", close),
            // A click on a group outline selects the layer that draws it, as a click on its tree row.
            session.on("canvas:group-outline-click", ({ layer }) => {
                const id = session.styles.get(layer)?.row ?? layer;
                store.set({ inspected: { kind: "layer-row", id } });
            }),
        ];
        return () => {
            for (const stop of stops) {
                stop();
            }
        };
    }, [session, store]);
}

/**
 * The kind the inspector draws: a run's kind is its paint tree row's, whichever door opened it,
 * so the two draw one glyph.
 * @param run - its run, for a run or measure row.
 * @param resolved - what is inspected.
 * @returns the kind.
 */
function kindIdOf(run: Run | undefined, resolved: Resolved): InspectedKindId {
    return run !== undefined && (resolved.kind === "measure-row" || resolved.kind === "run-row")
        ? runRowKind(run)
        : resolved.kind;
}

/**
 * The tab the inspector opens on: a path's run opens on Values, as a single node does; else the
 * tab a link names, else the one last chosen for the kind.
 * @param isPath - whether the run is a path.
 * @param kind - the kind.
 * @param inspected - the store's `inspected`.
 * @param remembered - the tab last chosen per kind.
 * @returns the tab, or null for a kind with no tabs.
 */
function opensOnOf(
    isPath: boolean,
    kind: InspectedKind | undefined,
    inspected: WorkspaceState["inspected"],
    remembered: WorkspaceState["tabs"],
): "style" | "values" | null {
    if (isPath) {
        return "values";
    }
    const asked = kind !== undefined && kind.tabs.length > 0 ? inspected?.tab : undefined;
    return asked ?? tabFor(kind, remembered);
}

/**
 * The style tree row a layer or folder row's header draws the tree's own glyph and menu for.
 * @param session - the session.
 * @param resolved - what is inspected.
 * @param selectsPaints - whether it is a style tree row.
 * @returns the tree and the row.
 */
function headerTreeOf(session: GraphSession, resolved: Resolved, selectsPaints: boolean): HeaderTree {
    const tree = selectsPaints ? session.styles.tree() : [];
    if (resolved.kind === "layer-row") {
        return { tree, treeRow: findTreeRow(tree, resolved.layer) };
    }
    if (resolved.kind === "folder-row") {
        return { tree, treeRow: findTreeRow(tree, resolved.row) };
    }
    return { tree, treeRow: undefined };
}

/**
 * The verbs of an attribute's or a source's header: the Data place's row menu's, so the two
 * cannot drift apart.
 * @param session - the session.
 * @param resolved - what is inspected.
 * @param attributeActionsOf - an attribute's row menu verbs.
 * @param sourceActionsOf - a source's row menu verbs.
 * @returns the verbs.
 */
function dataActionsOf(
    session: GraphSession,
    resolved: Resolved,
    attributeActionsOf: ReturnType<typeof useAttributeActions>,
    sourceActionsOf: ReturnType<typeof useSourceActions>,
): ReturnType<ReturnType<typeof useAttributeActions>> {
    const attribute =
        resolved.kind === "attribute"
            ? session.data.attributes().find((candidate) => candidate.path === resolved.path)
            : undefined;
    const attributeActions = attributeActionsOf(
        attribute === undefined ? null : { kind: attribute.kind, name: attribute.name },
    );
    // A source's verbs are its Sources row's menu's, the same way.
    if (resolved.kind === "source") {
        attributeActions.push(...sourceActionsOf());
    }
    return attributeActions;
}

/**
 * The inspector's body: the Style and Values tabs, or one body for a kind with no tabs.
 * @param props - Component props
 * @param props.body - the bodies.
 * @param props.tab - the tab shown, or null for a kind with no tabs.
 * @param props.onPick - takes the tab the reader chose.
 * @returns the body.
 */
function InspectorBody({
    body,
    tab,
    onPick,
}: Readonly<{
    body: Body;
    tab: "style" | "values" | null;
    onPick: (tab: "style" | "values") => void;
}>): React.ReactNode {
    if ("only" in body) {
        return body.only;
    }
    if (tab === null) {
        return body.values;
    }
    return (
        // The underline tabs: the pill form drew the chosen tab as a filled button beside a
        // plain word, which read as a label ("Style:") and a button that did nothing.
        // Only the chosen tab is drawn: a row's Values walk the graph, and Style edits it.
        <Tabs
            variant="default"
            keepMounted={false}
            value={tab}
            onChange={(next) => {
                if (next === "style" || next === "values") {
                    onPick(next);
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

/**
 * The header's glyph: the tree's own for a style tree row, the row's type or source glyph, else
 * the kind's.
 * @param props - Component props
 * @param props.session - the session.
 * @param props.header - the header.
 * @param props.treeRow - the style tree row, if it is one.
 * @param props.kindId - the kind.
 * @returns the glyphs.
 */
function HeaderGlyph({
    session,
    header,
    treeRow,
    kindId,
}: Readonly<{
    session: GraphSession;
    header: Header;
    treeRow: HeaderTree["treeRow"];
    kindId: InspectedKindId;
}>): React.JSX.Element {
    // A neighborhood is headed by its center node, so it draws the node's glyph.
    const KindIcon = KIND_GLYPHS[kindId === "neighborhood" ? "node" : kindId];
    return (
        <>
            {treeRow !== undefined && <KindGlyph session={session} row={treeRow.row} />}
            {header.glyph !== undefined && <TypeGlyphIcon glyph={header.glyph} />}
            {treeRow === undefined && header.source === undefined && header.glyph === undefined && (
                // A long name never squeezes the glyph.
                <KindIcon size={14} aria-hidden style={{ flexShrink: 0 }} />
            )}
            {header.source !== undefined && <SourceGlyph kind={header.source} />}
            {header.swatch !== undefined && (
                <ColorSwatch color={header.swatch} size={12} withShadow={false} aria-hidden />
            )}
        </>
    );
}

/**
 * The header's provenance: a link when it opens something, else plain words.
 * @param props - Component props
 * @param props.from - the provenance.
 * @returns the line, or nothing.
 */
function HeaderFrom({ from }: Readonly<{ from: Header["from"] }>): React.ReactNode {
    if (from === undefined) {
        return null;
    }
    return from.open === undefined ? (
        <Text size="xs" c="dimmed">
            {from.words}
        </Text>
    ) : (
        <Anchor component="button" size="xs" onClick={from.open}>
            {from.words}
        </Anchor>
    );
}

/**
 * The header's actions menu: the style tree's row menu for a style tree row, else the kind's
 * commands, then the Data place's verbs.
 * @param props - Component props
 * @param props.kindWord - the kind in words.
 * @param props.selectsPaints - whether Select what it paints sits before it.
 * @param props.tree - the style tree.
 * @param props.treeRow - the style tree row, if it is one.
 * @param props.menu - the kind's commands.
 * @param props.attributeActions - the Data place's verbs.
 * @param props.moveTo - moves a style tree row into a folder.
 * @returns the menu.
 */
function HeaderMenu({
    kindWord,
    selectsPaints,
    tree,
    treeRow,
    menu,
    attributeActions,
    moveTo,
}: Readonly<{
    kindWord: string;
    selectsPaints: boolean;
    tree: HeaderTree["tree"];
    treeRow: HeaderTree["treeRow"];
    menu: readonly { id: string }[];
    attributeActions: ReturnType<typeof dataActionsOf>;
    moveTo: (row: { id: string; name: string }, folderId: string | null) => void;
}>): React.JSX.Element {
    return (
        <Menu position="bottom-end">
            <Menu.Target>
                <Tooltip label={`${kindWord} actions`}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        ml={selectsPaints ? undefined : "auto"}
                        // Alone at the row's end, so a finger gets the full 44px.
                        style={{ "--cm-ai-touch-target": "44px" }}
                        aria-label={`${kindWord} actions`}
                    >
                        <GLYPHS.more size={14} />
                    </ActionIcon>
                </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
                {treeRow === undefined ? (
                    <Sections sections={[menu.map((command) => command.id)]} />
                ) : (
                    <RowMenuItems
                        tree={tree}
                        row={treeRow.row}
                        parent={treeRow.folders.at(-1)}
                        onMoveTo={(folderId) => {
                            moveTo(treeRow.row, folderId);
                        }}
                    />
                )}
                <AttributeMenuItems actions={attributeActions} />
            </Menu.Dropdown>
        </Menu>
    );
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
    // The reader's Number format respells every value the inspector draws.
    useNumberFormats();
    // A filter step turned on or off changes its editor's header.
    useVisibilityVersion(session);
    const inspected = useWorkspaceState((state) => state.inspected);
    const projectName = useWorkspaceState((state) => state.project?.name);
    const remembered = useWorkspaceState((state) => state.tabs);
    const [picked, setPicked] = useState<{ identity: string; tab: "style" | "values" } | null>(null);
    // A link that names the tab it opens on (a layer's look opens on Style) overrides the last pick.
    const [seen, setSeen] = useState(inspected);
    if (seen !== inspected) {
        setSeen(inspected);
        if (inspected?.tab !== undefined) {
            setPicked(null);
        }
    }
    const [draft, setDraft] = useState<{ run: string; values: Draft } | null>(null);
    const attributeActionsOf = useAttributeActions();
    const sourceActionsOf = useSourceActions();
    useCloseOnNewSelection(session, store);

    const selection = session === null ? null : { nodes: session.selection.nodes, edges: session.selection.edges };
    // An open row the session no longer holds (an undo took it away) gives way to the selection,
    // or the graph: the inspector never shows a page about nothing.
    const opened = resolveInspected(inspected, selection);
    const gone = isGone(session, opened);
    const resolved = gone ? resolveInspected(null, selection) : opened;
    useEffect(() => {
        if (gone) {
            store.set({ inspected: null });
        }
    }, [gone, store]);
    const identity = identityOf(resolved);
    const run = runOf(session, resolved);
    const barRun = run ?? layerRunOf(session, resolved);
    const kindId = kindIdOf(run, resolved);
    const kind = registry.kinds.get(kindId);
    // A path's answer is its nodes in order, so its run opens on Values, as a single node does.
    const isPath = run?.shape === "path";
    const opensOn = opensOnOf(isPath, kind, inspected, remembered);
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
    const analyze = registry.built("analyze.open");
    const header = headerOf(session, resolved, run, {
        projectName,
        open,
        openData: () => {
            store.set({ page: "panels", place: "data" });
        },
        openAnalyze:
            analyze === undefined
                ? undefined
                : () => {
                      runCommand("analyze.open");
                  },
    });
    const body = bodyOf(resolved, run, runDraft, onDraft, version);
    const menu = (MENUS[kindId] ?? []).flatMap((id) => registry.built(id) ?? []);
    const attributeActions = dataActionsOf(session, resolved, attributeActionsOf, sourceActionsOf);
    // A style tree row's header carries Select what it paints (Figma's Select matching layers).
    const selectsPaints = kindId === "layer-row" || kindId === "folder-row";
    // ... and draws the tree's own glyph and menu for the row.
    const { tree, treeRow } = headerTreeOf(session, resolved, selectsPaints);
    const moveTo = (row: { id: string; name: string }, folderId: string | null): void => {
        const place = placeOf(tree, { id: row.id, parentId: folderId, index: 0 });
        if (place !== undefined) {
            void orNotice(store, `move ${row.name}`, session.styles.moveRow(row.id, place));
        }
    };
    // How many notes are about this, as a link to the Notes place; the text stays there.
    const notes = notesAbout(session, resolved);
    const onPick = (next: "style" | "values"): void => {
        setPicked({ identity, tab: next });
        store.set((state) => ({ tabs: { ...state.tabs, [kindId]: next } }));
    };

    return (
        // The Background color field opens its picker as a popout, which needs a manager above it.
        <PopoutManager>
            <Stack
                gap={0}
                data-inspected={kindId}
                // The scrollbar takes its own room, so the content never runs under it and scrolls sideways.
                style={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarGutter: "stable" }}
            >
                <Stack gap={0} px="md" py={6}>
                    <Group gap={6} wrap="nowrap">
                        <HeaderGlyph session={session} header={header} treeRow={treeRow} kindId={kindId} />
                        {/* Focusable from script only: where focus lands after a graph opens, a run
                            or a find pick, so a screen reader starts here. A heading, not a control
                            and not in the Tab order; on keyboard focus it draws the app's shared
                            inset ring, so a keyboard reader sees where the next key goes (WCAG
                            2.4.7). The next Tab reaches the first control. */}
                        <Text
                            id={INSPECTOR_TITLE_ID}
                            className="cm-focus-inside"
                            tabIndex={-1}
                            role="heading"
                            aria-level={2}
                            aria-label={header.spoken}
                            size="sm"
                            fw={600}
                            truncate
                        >
                            {header.name}
                        </Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                        {/* The built-in rows' kind is their name: one "Everything", not two. */}
                        {(header.kind ?? kindWord) !== header.name && (
                            <Text size="xs" c="dimmed">
                                {header.kind ?? kindWord}
                            </Text>
                        )}
                        <HeaderFrom from={header.from} />
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
                        {selectsPaints && (
                            <Tooltip label="Select what it paints">
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    ml="auto"
                                    aria-label="Select what it paints"
                                    onClick={() => {
                                        runCommand("row.select-paints");
                                    }}
                                >
                                    <GLYPHS.selection size={14} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                        {menu.length + attributeActions.length > 0 && (
                            <HeaderMenu
                                kindWord={kindWord}
                                selectsPaints={selectsPaints}
                                tree={tree}
                                treeRow={treeRow}
                                menu={menu}
                                attributeActions={attributeActions}
                                moveTo={moveTo}
                            />
                        )}
                    </Group>
                </Stack>
                {barRun !== undefined && <RunStateBar run={barRun} draft={runDraft} onDraft={onDraft} />}
                <InspectorBody body={body} tab={tab} onPick={onPick} />
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
 * The provenance of a thing a run made, as a link to the run's row.
 * @param session - the session.
 * @param made - the run.
 * @param open - opens another row.
 * @returns the provenance.
 */
function fromRun(session: GraphSession, made: Run, open: Doors["open"]): Header["from"] {
    const date = runTime(made.startedAt);
    return {
        words: fromWords(runName(session, made), date),
        open: () => {
            open({ kind: "run-row", run: made.id });
        },
    };
}

/**
 * The graph's header: spoken where focus lands as a graph opens, which graph, and how big.
 * @param session - the session.
 * @param doors - what the provenance links open.
 * @returns the header.
 */
function graphHeader(session: GraphSession, doors: Doors): Header {
    const words = sourcesWords(session.data.sources());
    const { nodeCount, edgeCount } = session.data.statistics();
    const size = `${count(nodeCount, "node")}, ${count(edgeCount, "edge")}`;
    return {
        name: "Graph",
        spoken: doors.projectName === undefined ? `Graph, ${size}` : `Graph, ${doors.projectName}: ${size}`,
        from: words === undefined ? undefined : { words, open: doors.openData },
    };
}

/**
 * A run or measure row's header: its name, and what made it and when.
 * @param session - the session.
 * @param run - the run.
 * @param openAnalyze - opens Analyze, when it is built.
 * @returns the header.
 */
function runRowHeader(session: GraphSession, run: Run | undefined, openAnalyze: Doors["openAnalyze"]): Header {
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

/**
 * A source row's header: a child row ("people.csv", "1 row left out") is named as its row reads.
 * @param session - the session.
 * @param row - the source row's id.
 * @returns the header.
 */
function sourceHeader(session: GraphSession, row: string): Header {
    const sources = session.data.sources();
    const load = sources[loadIndexOf(row) ?? -1];
    const child = row.split(":").length > 2 ? sourceRowOf(sources, session.data.lastImport(), row) : undefined;
    if (load === undefined) {
        return { name: "Gone" };
    }
    // The left-out row is not a source of its own: its subtitle names the load it came from.
    return {
        name: child?.name ?? loadName(load),
        source: child?.kind ?? "file",
        ...(child?.kind === "left-out" ? { kind: leftOutOf(loadName(load)) } : {}),
    };
}

/**
 * The glyph the Data place's row draws for a column: free text as text, not as groups.
 * @param session - the session.
 * @param column - the column.
 * @returns the glyph.
 */
function columnGlyph(session: GraphSession, column: ReturnType<GraphSession["data"]["attributes"]>[number]): TypeGlyph {
    if (column.origin === "result") {
        return "result";
    }
    const readable = session.data
        .readableValues()
        .find((value) => value.on === column.kind && value.path === column.path);
    return typeOf(column.measurement, column.type, readable?.kind).glyph;
}

/**
 * An attribute's header: its name, the run that made it, and its row's glyph.
 * @param session - the session.
 * @param path - the attribute's path.
 * @param open - opens another row.
 * @returns the header.
 */
function attributeHeader(session: GraphSession, path: string, open: Doors["open"]): Header {
    const column = session.data.attributes().find((candidate) => candidate.path === path);
    const made = column?.runId === undefined ? undefined : session.runs.get(column.runId);
    return {
        name: column?.plainName ?? path,
        from: made === undefined ? undefined : fromRun(session, made, open),
        ...(column === undefined ? {} : { glyph: columnGlyph(session, column) }),
    };
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
    switch (resolved.kind) {
        case "graph":
            return graphHeader(session, doors);
        // A node is named by its id until graphty-element publishes its name (#895).
        case "node":
            return {
                // A node is called by its label, else its id.
                name: nodeName(session, resolved.node),
                swatch: swatchOf(session, { node: resolved.node }),
                // A node a filter hides is still selected; the header says why it is not drawn.
                ...(session.visibility.isVisible(resolved.node) ? {} : { kind: "Node, hidden by a filter" }),
            };
        // The center node's own header: its name and the color it is drawn in.
        case "neighborhood":
            return { name: String(resolved.node), swatch: swatchOf(session, { node: resolved.node }) };
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
        case "run-row":
            return runRowHeader(session, run, doors.openAnalyze);
        case "group-row": {
            const group = run?.result?.summary().groups?.find((g) => g.group === resolved.group);
            return {
                name: group === undefined ? String(resolved.group) : groupName(group),
                from: run === undefined ? undefined : fromRun(session, run, doors.open),
            };
        }
        case "everything-row":
            return { name: "Everything" };
        case "selection-row":
            return { name: "Selection" };
        case "layer-row":
            return { name: rowName(session, resolved.layer), kind: layerKindWords(session, resolved.layer) };
        case "folder-row":
            return { name: rowName(session, resolved.row) };
        case "rows":
            return { name: rowsHeading(session, resolved.rows) };
        case "filter-step":
            // Only the time window's card opens here: a filter card is edited in the Filters section.
            return { name: resolved.step === TIME_ROW ? "Time window" : "Filter" };
        case "source":
            return sourceHeader(session, resolved.row);
        default:
            return attributeHeader(session, resolved.path, doors.open);
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
                style: <GraphSettings />,
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
                : { style: <StylePanel />, values: <RunValues run={run} draft={draft} onDraft={onDraft} /> };
        case "group-row":
            return run === undefined
                ? { only: <Gone /> }
                : {
                      style: <GroupStyle run={run.id} group={resolved.group} />,
                      values: <GroupValues run={run} group={resolved.group} version={version} />,
                  };
        case "everything-row":
            return { style: <StylePanel />, values: <EverythingRowValues /> };
        // Style edits the highlight a selected node is drawn with; Values is what the selection holds.
        case "selection-row":
            return { style: <SelectionStyle />, values: <SeveralValues version={version} /> };
        case "layer-row":
            // Keyed by the row, so the side and an empty line are dropped when another opens.
            return {
                style: <LayerRowPanel key={resolved.layer} id={resolved.layer} />,
                values: <LayerValues key={resolved.layer} id={resolved.layer} />,
            };
        case "folder-row":
            return {
                style: <FolderPanel key={resolved.row} id={resolved.row} />,
                values: <FolderValues key={resolved.row} id={resolved.row} />,
            };
        case "rows":
            // Keyed by the rows, so another selection starts with no receipt of the last one's edit.
            return { only: <MultiRowPanel key={resolved.rows.join(" ")} ids={resolved.rows} /> };
        case "filter-step":
            // The time window's card; a filter card is edited in place in the Filters section.
            return { only: resolved.step === TIME_ROW ? <TimeCard /> : <Gone /> };
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
