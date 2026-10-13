import { ToggleIconButton, Tree, type TreeNodeData, type TreeRowActions } from "@graphty/compact-mantine";
import type { GraphSession, StyleRow } from "@graphty/graphty-element/session";
import { ActionIcon, Menu, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React from "react";

import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { matchesKey } from "../keys/keys";
import type { WorkspaceState, WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { StylePanel } from "../style/StylePanel";
import { ADD_ROW_LABEL, openDraft, orNotice } from "./actions";
import { ROW_COMMANDS } from "./commands";
import { count, findTreeRow, isHidden, layerCount, placeOf } from "./rows";

/** The tree item id of the new layer "+" adds before it is written. */
const DRAFT_ID = "draft";

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
    const parts = session.styles.parts(row.id);
    const read = (layer: string | undefined): ReturnType<GraphSession["styles"]["counts"]> | undefined =>
        layer === undefined ? undefined : session.styles.counts(layer);
    const node = read(parts?.node);
    const edge = read(parts?.edge);
    const painted = [node, edge].flatMap((c) => (c === undefined ? [] : Object.values(c.painted)));
    const by = [node, edge].flatMap((c) => c?.paintedBy ?? []).map((id) => session.styles.get(id)?.name ?? id);
    return {
        nodes: node?.matched,
        edges: edge?.matched,
        paintedOver: painted.length > 0 && painted.every((n) => n === 0),
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
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return `Painted over by ${list}`;
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
            <span role="img" aria-label={words} className="ws-row-over">
                <GLYPHS.paintedOver size={12} aria-hidden />
            </span>
        </Tooltip>
    );
}

/**
 * The tree's selection, read from what the inspector shows.
 * @param inspected - the store's `inspected`.
 * @returns the selected item ids.
 */
function selectedIds(inspected: WorkspaceState["inspected"]): string[] {
    switch (inspected?.kind) {
        case "layer-row":
        case "folder-row":
            return inspected.id === undefined ? [] : [inspected.id];
        case "draft-row":
            return [DRAFT_ID];
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
    const rows = ids.filter((id) => id !== DRAFT_ID);
    if (rows.length === 0) {
        // A click on the draft's own row keeps it as it is (its kind and where Escape goes back to).
        const now = store.get().inspected;
        store.set({ inspected: ids.includes(DRAFT_ID) && now?.kind === "draft-row" ? now : null });
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
 * several. "+" adds a layer (a draft, not written until its first value) or a folder. Every row
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
    const tree = session.styles.tree();
    const drafting = inspected?.kind === "draft-row";

    const toItem = (row: StyleRow, folders: readonly StyleRow[]): TreeNodeData => {
        const hidden = isHidden({ row, folders });
        const states = [
            ...(row.pin === "none" ? [] : [`pinned to the ${row.pin}`]),
            ...(row.locked ? ["locked"] : []),
            ...(row.hidden ? ["hidden"] : []),
        ];
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
                label={`Hide ${row.name}`}
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
        // What it paints is its glyph: a dot for nodes, a line for edges, both for both.
        const both = paints.nodes !== undefined && paints.edges !== undefined;
        const mark = both ? 8 : 14;
        const marks = (
            <span className="ws-row-marks">
                {paints.nodes === undefined ? null : <GLYPHS.node size={mark} />}
                {paints.edges === undefined ? null : <GLYPHS.edge size={mark} />}
            </span>
        );
        const overWords = paintedOverWords(paints);
        const description = [...states, ...(over ? [overWords] : [])];
        return {
            id: row.id,
            name: row.name,
            label: `${row.name}, layer, ${paintsWords(paints)}`,
            icon: marks,
            dimmed: hidden,
            count: over ? <PaintedOverMark words={overWords} /> : undefined,
            actions,
            description: description.length === 0 ? undefined : description.join(", "),
        };
    };

    const items = [...tree].reverse().map((row) => toItem(row, []));
    // The draft sits at the top of the unpinned rows, where "+" adds a layer.
    const draftAt = tree.filter((row) => row.pin === "top").length;
    if (drafting) {
        items.splice(draftAt, 0, {
            id: DRAFT_ID,
            name: "New layer",
            label: "New layer, layer, not written yet",
            dimmed: true,
            movable: false,
        });
    }

    // The tree control counts the draft among the top-level rows; the element does not.
    const placeFor = (move: { id: string; parentId: string | null; index: number }): ReturnType<typeof placeOf> => {
        const index = drafting && move.parentId === null && move.index > draftAt ? move.index - 1 : move.index;
        return placeOf(tree, { ...move, index });
    };

    const rowMenu = (node: TreeNodeData, actions: TreeRowActions): React.ReactNode => {
        const found = findTreeRow(tree, node.id);
        if (found === undefined) {
            return null;
        }
        const { row } = found;
        const items = ROW_COMMANDS.filter((command) => command.applies(row)).map((command) => (
            <CommandMenuItem
                key={command.id}
                label={command.label}
                shortcut={command.rowKeys[0]}
                reason={command.disabled(row)}
                onRun={() => {
                    void command.run(workspace, row); // NOSONAR(S3735): a deliberately unawaited promise, marked as no-floating-promises asks
                }}
            />
        ));
        // Move to folder sits after Duplicate, as in Figma's layer menu.
        const at = items.findIndex((item) => item.key === "row.duplicate") + 1;
        items.splice(
            at,
            0,
            <MoveToFolder key="row.move" tree={tree} row={row} parent={found.folders.at(-1)} actions={actions} />,
        );
        return items;
    };

    const onRowKeyDown = (id: string, event: React.KeyboardEvent): void => {
        const row = findTreeRow(tree, id)?.row;
        if (row === undefined) {
            return;
        }
        const command = ROW_COMMANDS.find(
            (candidate) => candidate.applies(row) && candidate.rowKeys.some((key) => matchesKey(event, key)),
        );
        if (command !== undefined && command.disabled(row) === null) {
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
                <AddMenu session={session} store={store} />
            </div>
            <Tree
                label="Style layers"
                items={items}
                childBand={false}
                height="100%"
                selected={selectedIds(inspected)}
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
                renameLabel="Row name"
                renaming={renamingRow}
                onRenamingChange={(id) => {
                    if (id !== DRAFT_ID) {
                        store.set({ renamingRow: id });
                    }
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
 * The "+" beside the tree's title: Add layer opens a draft; Add folder makes "New folder" with its
 * name ready to type.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @returns The button and its menu
 */
function AddMenu({ session, store }: Readonly<{ session: GraphSession; store: WorkspaceStore }>): React.JSX.Element {
    return (
        <Menu position="bottom-end">
            <Menu.Target>
                <Tooltip label={ADD_ROW_LABEL}>
                    <ActionIcon variant="subtle" size="sm" aria-label={ADD_ROW_LABEL}>
                        <GLYPHS.add size={14} />
                    </ActionIcon>
                </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item
                    leftSection={<GLYPHS.layer size={14} aria-hidden />}
                    onClick={() => {
                        openDraft(session, store);
                    }}
                >
                    Add layer
                </Menu.Item>
                <Menu.Item
                    leftSection={<GLYPHS.folder size={14} aria-hidden />}
                    onClick={() => {
                        void (async () => {
                            try {
                                const folder = await session.styles.addFolder("New folder");
                                store.set({ inspected: { kind: "folder-row", id: folder.id } });
                                setTimeout(() => {
                                    // Focus the row first: the name field hands focus back to
                                    // what held it when it opened, so naming ends on the folder.
                                    focusRow(folder.id);
                                    store.set({ renamingRow: folder.id });
                                }, MENU_FOCUS_RETURN_MS);
                            } catch (error) {
                                const why = error instanceof Error ? ` ${error.message}` : "";
                                store.set({ notice: { message: `Could not add a folder.${why}`, error: true } });
                            }
                        })();
                    }}
                >
                    Add folder
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
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
 * Move to folder: a submenu of the folders the row can go into, and the top level when it is in
 * one. The tree moves it (`actions.moveTo`), checking the move as it checks a drop.
 * @param props - Component props
 * @param props.tree - the element's tree.
 * @param props.row - the row.
 * @param props.parent - the folder holding it, if any.
 * @param props.actions - the tree's moves for the row.
 * @returns The submenu
 */
function MoveToFolder({
    tree,
    row,
    parent,
    actions,
}: Readonly<{
    tree: readonly StyleRow[];
    row: StyleRow;
    parent: StyleRow | undefined;
    actions: TreeRowActions;
}>): React.JSX.Element {
    const folders: StyleRow[] = [];
    const walk = (rows: readonly StyleRow[]): void => {
        for (const each of [...rows].reverse()) {
            // Never into itself or a folder inside it, nor where it already is.
            if (each.kind === "folder" && each.id !== row.id) {
                if (each.id !== parent?.id) {
                    folders.push(each);
                }
                walk(each.children);
            }
        }
    };
    walk(tree);
    return (
        <Menu.Sub>
            <Menu.Sub.Target>
                <Menu.Sub.Item leftSection={<GLYPHS.folder size={14} aria-hidden />}>Move to folder</Menu.Sub.Item>
            </Menu.Sub.Target>
            <Menu.Sub.Dropdown>
                {folders.length === 0 && parent === undefined ? <Menu.Item disabled>No folders yet</Menu.Item> : null}
                {folders.map((folder) => (
                    <Menu.Item
                        key={folder.id}
                        onClick={() => {
                            actions.moveTo(folder.id);
                        }}
                    >
                        {folder.name}
                    </Menu.Item>
                ))}
                {parent === undefined ? null : (
                    <Menu.Item
                        onClick={() => {
                            actions.moveTo(null);
                        }}
                    >
                        Out of {parent.name}
                    </Menu.Item>
                )}
            </Menu.Sub.Dropdown>
        </Menu.Sub>
    );
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
