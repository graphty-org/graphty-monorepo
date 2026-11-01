import { TargetTooltip, ToggleIconButton, Tree, type TreeNodeData } from "@graphty/compact-mantine";
import type { GraphSession, StaleNote, StyleRow } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Menu, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { resolveInspected } from "../inspector/inspected";
import { staleWords } from "../inspector/words";
import { isPanelEscape, matchesKey } from "../keys/keys";
import type { WorkspaceState, WorkspaceStore } from "../state/store";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { StylePanel } from "../style/StylePanel";
import { colorName, hexOf } from "../style/words";
import { unitOf } from "../time/timeActions";
import { openers } from "../toolbar/popover";
import { ADD_ROW_LABEL, addFolderOf, addHoverHighlight, addLayer, moveRows, orNotice } from "./actions";
import { ROW_COMMANDS } from "./commands";
import { KindGlyph } from "./KindGlyph";
import { RowMenuItems } from "./RowMenu";
import {
    builtParts,
    count,
    findTreeRow,
    groupRowOf,
    isBaseRow,
    isHidden,
    layerCount,
    layerKindWords,
    placeOf,
    rowName,
} from "./rows";

/** Longer than a closing menu takes to hand focus back to its opener. */
const MENU_FOCUS_RETURN_MS = 50;

/** What one layer row paints, read from the element's counts. */
interface Paints {
    readonly nodes: number | undefined;
    readonly edges: number | undefined;
    /** Every property it writes is painted over by rows above (and it is shown). */
    readonly paintedOver: boolean;
    /** The names of the layers the picture shows instead, the most elements first. */
    readonly paintedBy: readonly string[];
}

/**
 * What a layer row paints: how many nodes and edges its parts match, and whether every property
 * it writes is painted over above it (`styles.counts`).
 * @param session - the element's session.
 * @param row - the layer row.
 * @returns the facts.
 */
function paintsOf(session: GraphSession, row: StyleRow): Paints {
    // Only the halves the reader is building count: those that write, else those with a condition.
    const parts = builtParts(session, row.id);
    const read = (layer: string | undefined): ReturnType<GraphSession["styles"]["counts"]> | undefined =>
        layer === undefined ? undefined : session.styles.counts(layer);
    const node = read(parts?.node);
    const edge = read(parts?.edge);
    const painted = [node, edge].flatMap((c) => (c === undefined ? [] : Object.values(c.painted)));
    // A row that matches nothing paints nothing, so nothing of it is painted over.
    const matched = (node?.matched ?? 0) + (edge?.matched ?? 0);
    const by = [node, edge].flatMap((c) => c?.paintedBy ?? []).map((id) => session.styles.get(id)?.name ?? id);
    return {
        nodes: node?.matched,
        edges: edge?.matched,
        paintedOver: matched > 0 && painted.length > 0 && painted.every((n) => n === 0),
        paintedBy: [...new Set(by)],
    };
}

/**
 * The words for what a layer paints: "5 nodes, 4 edges".
 * @param paints - the facts.
 * @returns the words.
 */
function paintsWords(paints: Paints): string {
    const words = [
        ...(paints.nodes === undefined ? [] : [count(paints.nodes, "node")]),
        ...(paints.edges === undefined ? [] : [count(paints.edges, "edge")]),
    ];
    return words.length === 0 ? "paints nothing" : words.join(", ");
}

/**
 * The words for who paints over a layer: "Painted over by Degree".
 * @param paints - the facts.
 * @returns the words.
 */
function paintedOverWords(paints: Paints): string {
    const names = paints.paintedBy;
    if (names.length === 0) {
        return "Painted over";
    }
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
    return `Painted over by ${list}`;
}

/**
 * What a row's states say: pinned, locked, hidden.
 * @param row - the row.
 * @returns the states in words.
 */
function rowStates(row: StyleRow): string[] {
    return [
        ...(row.pin === "none" ? [] : [`pinned to the ${row.pin}`]),
        ...(row.locked ? ["locked"] : []),
        ...(row.hidden ? ["hidden"] : []),
    ];
}

/**
 * How many a layer row matches: its nodes, or with none its edges.
 * @param props - Component props
 * @param props.paints - what the layer paints
 * @returns The count
 */
function RowCount({ paints }: Readonly<{ paints: Paints }>): React.JSX.Element {
    return (
        <span className="ws-row-count" aria-hidden>
            {paints.nodes === undefined || (paints.nodes === 0 && paints.edges !== undefined)
                ? (paints.edges ?? "")
                : paints.nodes}
        </span>
    );
}

/**
 * The mark on a layer row every property of which is painted over: a glyph, never cut short,
 * named and explained by its tooltip.
 * @param props - Component props
 * @param props.words - what paints over it, in words
 * @returns The mark
 */
function PaintedOverMark({ words }: Readonly<{ words: string }>): React.JSX.Element {
    return (
        <Tooltip label={words}>
            <span // NOSONAR(S6819): a span holding an SVG glyph, named as one image; an img needs a source
                role="img"
                aria-label={words}
                className="ws-row-over"
            >
                <GLYPHS.paintedOver size={12} aria-hidden />
            </span>
        </Tooltip>
    );
}

/**
 * The mark a layer row shows while the run it paints is out of date, with why in its tooltip and name.
 * @param props - Component props
 * @param props.words - why the run is out of date
 * @param props.children - the row's count, drawn after the mark
 * @returns the mark and the count
 */
function OutOfDateMark({ words, children }: Readonly<{ words: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <span className="ws-row-stale">
            <Tooltip label={words}>
                <span // NOSONAR(S6819): a span holding an SVG glyph, named as one image; an img needs a source
                    role="img"
                    aria-label={words}
                    className="ws-row-over"
                >
                    <GLYPHS.outOfDate size={12} aria-hidden />
                </span>
            </Tooltip>
            {children}
        </span>
    );
}

/**
 * What a grouping run's layer shows on its row: the color it paints (and its word), and how many nodes it
 * matches. Kept whatever conditions the layer is narrowed or widened by since the run made it.
 * Undefined for any other row.
 * @param session - the element's session.
 * @param row - the layer row.
 * @param nodes - how many nodes the row matches.
 * @returns the swatch and the count, or undefined.
 */
function groupMarks(
    session: GraphSession,
    row: StyleRow,
    nodes: number | undefined,
): { readonly swatch?: React.ReactNode; readonly color?: string; readonly count: React.ReactNode } | undefined {
    const id = session.styles.parts(row.id)?.node;
    const layer = id === undefined ? undefined : session.styles.get(id);
    if (layer?.source.by !== "run" || session.runs.get(layer.source.runId)?.record.summary?.groups === undefined) {
        return undefined;
    }
    // A fixed color, or the one color a rule copied into the layer keeps for its group.
    const bound = layer.encode?.["node.color"];
    const kept = bound !== undefined && "by" in bound ? Object.values(bound.map ?? {}) : [];
    const hex = hexOf(layer.set?.["node.color"] ?? (kept.length === 1 ? kept[0] : undefined));
    return {
        ...(hex === null
            ? {}
            : {
                  swatch: <span className="ws-row-swatch" style={{ background: hex }} data-row-swatch={hex} />,
                  // The swatch in words, so the row's color is heard as well as seen.
                  color: colorName(hex),
              }),
        count: (
            <span className="ws-row-count" aria-hidden>
                {nodes ?? ""}
            </span>
        ),
    };
}

/**
 * The tree's selection, read from what the inspector shows: a row, rows, or a run's group, which
 * marks the layer that paints it.
 * @param inspected - the store's `inspected`.
 * @param session - the element's session.
 * @returns the selected item ids.
 */
function selectedIds(inspected: WorkspaceState["inspected"], session: GraphSession): string[] {
    switch (inspected?.kind) {
        case "group-row": {
            const resolved = resolveInspected(inspected, null);
            const row = resolved.kind === "group-row" ? groupRowOf(session, resolved.run, resolved.group) : undefined;
            return row === undefined ? [] : [row];
        }
        case "layer-row":
        case "folder-row":
            return inspected.id === undefined ? [] : [inspected.id];
        case "rows": {
            try {
                const ids: unknown = JSON.parse(inspected.id ?? "[]");
                return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
            } catch {
                return [];
            }
        }
        default:
            return [];
    }
}

/**
 * Opens rows in the inspector: one row as a layer or a folder, several as one panel.
 * @param store - the chrome store.
 * @param tree - the element's tree.
 * @param ids - the rows.
 */
function openRows(store: WorkspaceStore, tree: readonly StyleRow[], ids: readonly string[]): void {
    const rows = ids;
    if (rows.length === 0) {
        store.set({ inspected: null });
        return;
    }
    if (rows.length > 1) {
        store.set({ inspected: { kind: "rows", id: JSON.stringify(rows) } });
        return;
    }
    const kind = findTreeRow(tree, rows[0])?.row.kind === "folder" ? "folder-row" : "layer-row";
    store.set({ inspected: { kind, id: rows[0] } });
}

/** Props for StyleTree. */
interface StyleTreeProps {
    readonly session: GraphSession;
}

/**
 * The style tree (tier 3 design section 2.1): graphty-element's `styles.tree()` in paint order,
 * the topmost first. Two row kinds, a layer and a folder, each with its glyph; a layer's marks say
 * what it paints and whether it is painted over. The eye and lock sit on the row (on hover, focus,
 * and always when on); a pin shows as a mark. Click selects one row, Shift- or Control-click
 * several. "+" adds a layer or a folder, or opens Analyze. Every row
 * has the same menu. Rows drag to reorder or into a folder; a drop out of a pin band is refused.
 * @param props - Component props
 * @param props.session - the element's session
 * @returns The tree, its "+" and its footer
 */
export function StyleTree({ session }: StyleTreeProps): React.JSX.Element {
    const workspace = useWorkspace();
    const { store } = workspace;
    const inspected = useWorkspaceState((state) => state.inspected);
    const renamingRow = useWorkspaceState((state) => state.renamingRow);
    // The row menu's "Select more": a checkbox on every row, and a tap adds a row or takes it out
    // (touch).
    const [selecting, setSelecting] = useState(false);
    // Done or Escape leaves the mode, keeps the selection and says once how many it holds.
    const leaveSelecting = useCallback((): void => {
        setSelecting(false);
        const picked = selectedIds(store.get().inspected, session).length;
        store.set({ announcement: `${count(picked, "layer")} selected` });
    }, [store, session]);
    // Escape leaves the mode first, wherever focus is, before it clears a selection: the window's
    // command keys skip a key used up here.
    useEffect(() => {
        if (!selecting) {
            return undefined;
        }
        const onKeyDown = (event: KeyboardEvent): void => {
            if (isPanelEscape(event)) {
                event.preventDefault();
                leaveSelecting();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [selecting, leaveSelecting]);
    // Hovered counts the node under the pointer, which no style or data change reports: read the
    // counts again whenever the pointer reaches a node, moves to another or leaves.
    const [, setHoverMoves] = useState(0);
    useEffect(
        () =>
            session.on("selection:hover-changed", () => {
                setHoverMoves((n) => n + 1);
            }),
        [session],
    );
    const tree = session.styles.tree();
    // With no row open, Tab into the tree lands on Everything (else the first row no pin holds),
    // never on a pinned built-in row such as Hovered that paints nothing until a pointer moves.
    const restingId = (tree.find((row) => isBaseRow(session, row.id)) ?? tree.find((row) => row.pin === "none"))?.id;

    const toItem = (row: StyleRow, folders: readonly StyleRow[]): TreeNodeData => {
        const hidden = isHidden({ row, folders });
        const states = rowStates(row);
        const toggles = [
            <ToggleIconButton
                key="lock"
                variant="swap"
                label={`Lock ${row.name}`}
                checked={row.locked}
                icon={<GLYPHS.unlock size={14} />}
                checkedIcon={<GLYPHS.lock size={14} />}
                onChange={(locked) => {
                    void orNotice(store, `lock ${row.name}`, session.styles.lockRow(row.id, locked));
                }}
            />,
            <ToggleIconButton
                key="eye"
                variant="swap"
                // Drawn at rest on every row, and named for what it does now.
                data-at-rest=""
                // Its tooltip is its name, as every icon button's is (decided.md, Names and looks).
                label={row.hidden ? `Show ${row.name}` : `Hide ${row.name}`}
                checked={row.hidden}
                icon={<GLYPHS.show size={14} />}
                checkedIcon={<GLYPHS.hide size={14} />}
                onChange={(hide) => {
                    void orNotice(store, `hide ${row.name}`, session.styles.hideRow(row.id, hide));
                }}
            />,
        ];
        const actions = (
            <>
                {row.pin === "none" ? null : (
                    <span data-pinned="" aria-hidden className="ws-row-pin">
                        <GLYPHS.pin size={12} />
                    </span>
                )}
                {toggles}
            </>
        );
        if (row.kind === "folder") {
            const children = [...row.children].reverse().map((child) => toItem(child, [...folders, row]));
            return {
                id: row.id,
                name: row.name,
                label: `${row.name}, folder, ${count(layerCount(row), "layer")}`,
                icon: <GLYPHS.folder size={14} />,
                dimmed: hidden,
                strong: false,
                children,
                actions,
                description: states.length === 0 ? undefined : states.join(", "),
            };
        }
        const paints = paintsOf(session, row);
        const over = paints.paintedOver && !hidden;
        // What it paints is its glyph: a dot for nodes, a line for edges, a dot on a line for both.
        const marks = (
            <span className="ws-row-marks">
                <KindGlyph session={session} row={row} />
            </span>
        );
        const overWords = paintedOverWords(paints);
        const group = groupMarks(session, row, paints.nodes);
        const stale = staleOf(session, row);
        const description = [
            ...(group?.color === undefined ? [] : [group.color]),
            ...(stale === null ? [] : [staleWords(stale, unitOf(session))]),
            ...states,
            ...(over ? [overWords] : []),
        ];
        const name = rowName(session, row.id);
        const plainCount = group?.count ?? <RowCount paints={paints} />;
        const counted =
            stale === null ? (
                plainCount
            ) : (
                <OutOfDateMark words={staleWords(stale, unitOf(session))}>{plainCount}</OutOfDateMark>
            );
        return {
            id: row.id,
            name,
            label: `${name}, ${(layerKindWords(session, row.id) ?? "Layer").toLowerCase()}, ${paintsWords(paints)}`,
            icon: marks,
            // Everything holding the base look stays at the bottom.
            movable: !isBaseRow(session, row.id),
            dimmed: hidden,
            // Every layer row says how many it matches: its nodes, or with none its edges.
            count: over ? <PaintedOverMark words={overWords} /> : counted,
            swatch: group?.swatch,
            actions,
            description: description.length === 0 ? undefined : description.join(", "),
        };
    };

    const items = [...tree].reverse().map((row) => toItem(row, []));
    const placeFor = (move: { id: string; parentId: string | null; index: number }): ReturnType<typeof placeOf> =>
        placeOf(tree, move);

    const rowMenu = (node: TreeNodeData): React.ReactNode => {
        const found = findTreeRow(tree, node.id);
        if (found === undefined) {
            return null;
        }
        return (
            <>
                {/* First, so touch has a way to select several rows, and everyone sees one. */}
                <CommandMenuItem
                    label="Select more"
                    icon={<GLYPHS.check size={14} aria-hidden />}
                    shortcut={undefined}
                    reason={null}
                    onRun={() => {
                        const picked = selectedIds(inspected, session);
                        openRows(store, tree, picked.includes(found.row.id) ? picked : [...picked, found.row.id]);
                        setSelecting(true);
                    }}
                />
                <Menu.Divider />
                <RowMenuItems
                    tree={tree}
                    row={found.row}
                    parent={found.folders.at(-1)}
                    onMoveTo={(folderId) => {
                        // The row's menu acts on every selected row when the row is one of them.
                        const picked = selectedIds(inspected, session);
                        const ids = picked.includes(found.row.id) ? picked : [found.row.id];
                        void orNotice(store, `move ${found.row.name}`, moveRows(session, ids, folderId));
                    }}
                />
            </>
        );
    };

    const onRowKeyDown = (id: string, event: React.KeyboardEvent): void => {
        if (selecting && event.key === "Escape") {
            event.preventDefault();
            leaveSelecting();
            return;
        }
        const row = findTreeRow(tree, id)?.row;
        if (row === undefined) {
            return;
        }
        const command = ROW_COMMANDS.find(
            (candidate) => candidate.applies(row) && candidate.rowKeys.some((key) => matchesKey(event, key)),
        );
        if (command?.disabled(row, session) === null) {
            event.preventDefault();
            void command.run(workspace, row); // NOSONAR(S3735): a deliberately unawaited promise, marked as no-floating-promises asks
        }
    };

    return (
        <>
            <div className="ws-style-tree-head">
                <Text span className="ws-style-tree-title">
                    Style layers
                </Text>
                <AddMenu session={session} store={store} selected={selectedIds(inspected, session)} />
            </div>
            {selecting && (
                <Group className="ws-style-tree-selecting" gap={4} wrap="nowrap" px={8} justify="space-between">
                    <Text size="xs">{selectedIds(inspected, session).length} selected</Text>
                    <Button size="compact-xs" variant="subtle" onClick={leaveSelecting}>
                        Done
                    </Button>
                </Group>
            )}
            <Tree
                label="Style layers"
                items={items}
                checkboxes={selecting}
                childBand={false}
                height="100%"
                selected={selectedIds(inspected, session)}
                // A row opened from elsewhere ("Why this look", a membership) is shown: its
                // folders open and it scrolls into view.
                revealSelected
                restingId={restingId}
                onSelect={(ids) => {
                    openRows(store, tree, ids);
                }}
                canDrop={(move) => placeFor(move) !== undefined}
                onMove={(move) => {
                    const place = placeFor(move);
                    const row = findTreeRow(tree, move.id)?.row;
                    if (place !== undefined && row !== undefined) {
                        void orNotice(store, `move ${row.name}`, session.styles.moveRow(row.id, place));
                    }
                }}
                rowMenu={rowMenu}
                onRowKeyDown={onRowKeyDown}
                // Named for what is being renamed: a layer's name, or a folder's.
                renameLabel={
                    renamingRow !== null && findTreeRow(tree, renamingRow)?.row.kind === "folder"
                        ? "Folder name"
                        : "Layer name"
                }
                renaming={renamingRow}
                onRenamingChange={(id) => {
                    store.set({ renamingRow: id });
                }}
                onRename={(id, name) => {
                    void orNotice(store, `rename ${name}`, session.styles.renameRow(id, name));
                }}
            />
            <Footer session={session} store={store} />
        </>
    );
}

/**
 * The "+" beside the tree's title, where layers come from: Layer makes a real layer at once with
 * its name ready to type; Folder makes "New folder" the same way; Analyze... opens the toolbar's
 * Analyze popover (the one Analyze), and closing it gives focus back to this "+".
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.selected - the rows selected in the tree; Folder puts two or more of them in it
 * @returns The button and its menu
 */
function AddMenu({
    session,
    store,
    selected,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    selected: readonly string[];
}>): React.JSX.Element {
    const button = useRef<HTMLButtonElement>(null);
    const analyze = useCommand("analyze.open");
    return (
        <Menu position="bottom-end">
            <Menu.Target>
                <TargetTooltip label={ADD_ROW_LABEL}>
                    <ActionIcon ref={button} variant="subtle" size="sm" aria-label={ADD_ROW_LABEL}>
                        <GLYPHS.add size={14} />
                    </ActionIcon>
                </TargetTooltip>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item
                    leftSection={<GLYPHS.layer size={14} aria-hidden />}
                    onClick={() => {
                        void orNotice(store, "add a layer", addLayer(session, store, MENU_FOCUS_RETURN_MS));
                    }}
                >
                    Layer
                </Menu.Item>
                <Menu.Item
                    leftSection={<GLYPHS.folder size={14} aria-hidden />}
                    onClick={() => {
                        void (async () => {
                            try {
                                // Several selected rows go into it, as Figma groups a selection;
                                // the starting rows and pinned rows stay where they are.
                                const tree = session.styles.tree();
                                const rows = selected.filter(
                                    (id) => !isBaseRow(session, id) && findTreeRow(tree, id)?.row.pin === "none",
                                );
                                const folder = await addFolderOf(session, "New folder", rows.length > 1 ? rows : []);
                                store.set({ inspected: { kind: "folder-row", id: folder } });
                                setTimeout(() => {
                                    // Focus the row first: the name field hands focus back to
                                    // what held it when it opened, so naming ends on the folder.
                                    focusRow(folder);
                                    store.set({ renamingRow: folder });
                                }, MENU_FOCUS_RETURN_MS);
                            } catch (error) {
                                const why = error instanceof Error ? ` ${error.message}` : "";
                                store.set({ notice: { message: `Could not add a folder.${why}`, error: true } });
                            }
                        })();
                    }}
                >
                    Folder
                </Menu.Item>
                <Menu.Item
                    leftSection={<GLYPHS.pick size={14} aria-hidden />}
                    onClick={() => {
                        void orNotice(store, "add Hover highlight", addHoverHighlight(session, store));
                    }}
                >
                    Hover highlight
                </Menu.Item>
                {analyze !== null && (
                    <CommandMenuItem
                        icon={<GLYPHS.analyze size={14} aria-hidden />}
                        label="Analyze..."
                        shortcut={analyze.command.keys?.[0]}
                        reason={analyze.disabledReason}
                        onRun={() => {
                            if (button.current !== null) {
                                openers.analyze = button.current;
                            }
                            analyze.run();
                        }}
                    />
                )}
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * Why a row's run is out of date, when the row paints a run's result and the run is.
 * @param session - the element's session.
 * @param row - the row.
 * @returns the run's stale note, or null.
 */
function staleOf(session: GraphSession, row: StyleRow): StaleNote | null {
    const parts = session.styles.parts(row.id);
    for (const id of [parts?.node, parts?.edge]) {
        const source = id === undefined ? undefined : session.styles.get(id)?.source;
        const stale = source?.by === "run" ? (session.runs.get(source.runId)?.stale ?? null) : null;
        if (stale !== null) {
            return stale;
        }
    }
    return null;
}

/**
 * Whether the tree lacks one of the starting rows (Everything, Selected, Hovered) while the
 * project draws them. TEMPORARY: it reads the element's template ids, which graphty-element does
 * not publish as a fact; owed there as a read of which starting rows are missing.
 * @param session - the element's session.
 * @returns true when Restore starting layers has something to restore.
 */
function lacksStartingRows(session: GraphSession): boolean {
    if (!session.config.startingRows) {
        return false;
    }
    const present = new Set(
        session.styles
            .list()
            .flatMap((layer) =>
                layer.source.by === "template" && layer.source.templateId.startsWith("graphty:starting-")
                    ? [layer.source.templateId]
                    : [],
            ),
    );
    return present.size < 3;
}

/**
 * Puts focus on a row of the style tree.
 * @param id - the row's id.
 */
function focusRow(id: string): void {
    document
        .querySelector<HTMLElement>(
            `[role="tree"][aria-label="Style layers"] .cm-tree-row[data-id="${CSS.escape(id)}"]`,
        )
        ?.focus();
}

/**
 * Graph settings: the inspector shows the graph on its Style tab, says so, and focus moves to the
 * tab's first section once it is drawn.
 * @param store - the chrome store.
 */
function openGraphSettings(store: WorkspaceStore): void {
    store.set((state) => ({
        inspected: { kind: "graph" },
        tabs: { ...state.tabs, graph: "style" },
        announcement: "Graph settings, Style",
    }));
    requestAnimationFrame(() => {
        document
            .querySelector<HTMLElement>('[data-inspected="graph"] [role="tabpanel"] :is(button, input, [tabindex="0"])')
            ?.focus();
    });
}

/**
 * The tree's footer: Graph settings, and Restore starting layers while a starting row is gone.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @returns The footer
 */
function Footer({ session, store }: Readonly<{ session: GraphSession; store: WorkspaceStore }>): React.JSX.Element {
    return (
        <Stack gap={0} className="ws-style-tree-foot">
            <UnstyledButton
                className="ws-style-tree-foot-row cm-focus-inside"
                onClick={() => {
                    openGraphSettings(store);
                }}
            >
                <GLYPHS.settings size={14} aria-hidden /> Graph settings
            </UnstyledButton>
            {lacksStartingRows(session) && (
                <UnstyledButton
                    className="ws-style-tree-foot-row cm-focus-inside"
                    onClick={() => {
                        void orNotice(store, "restore the starting layers", session.styles.restoreStartingRows());
                    }}
                >
                    <GLYPHS.undo size={14} aria-hidden /> Restore starting layers
                </UnstyledButton>
            )}
        </Stack>
    );
}

/**
 * A layer row's panel: its header and Style tab (the Style tab reads the row's lock and eye).
 * @param props - Component props
 * @param props.id - the row's id
 * @returns The panel
 */
export function LayerRowPanel({ id }: Readonly<{ id: string }>): React.JSX.Element {
    return <StylePanel rowId={id} />;
}
