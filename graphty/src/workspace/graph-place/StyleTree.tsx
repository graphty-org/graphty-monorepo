import { ToggleIconButton, Tree, type TreeNodeData } from "@graphty/compact-mantine";
import type { GraphSession, StyleRow } from "@graphty/graphty-element/session";
import { ActionIcon, Menu, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React from "react";

import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { matchesKey } from "../keys/keys";
import type { WorkspaceState, WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { StylePanel } from "../style/StylePanel";
import { orNotice } from "./actions";
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
    return {
        nodes: node?.matched,
        edges: edge?.matched,
        paintedOver: painted.length > 0 && painted.every((n) => n === 0),
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
        store.set({ inspected: ids.includes(DRAFT_ID) ? { kind: "draft-row" } : null });
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
        const marks = (
            <span className="ws-row-marks" aria-hidden>
                {paints.nodes === undefined ? null : <GLYPHS.node size={10} />}
                {paints.edges === undefined ? null : <GLYPHS.edge size={10} />}
            </span>
        );
        const description = [...states, ...(over ? ["painted over by the layers above"] : [])];
        return {
            id: row.id,
            name: row.name,
            label: `${row.name}, layer, ${paintsWords(paints)}`,
            icon: <GLYPHS.layer size={14} />,
            swatch: marks,
            dimmed: hidden,
            count: over ? "Painted over" : undefined,
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
            icon: <GLYPHS.layer size={14} />,
            dimmed: true,
            movable: false,
        });
    }

    // The tree control counts the draft among the top-level rows; the element does not.
    const placeFor = (move: { id: string; parentId: string | null; index: number }): ReturnType<typeof placeOf> => {
        const index = drafting && move.parentId === null && move.index > draftAt ? move.index - 1 : move.index;
        return placeOf(tree, { ...move, index });
    };

    const rowMenu = (node: TreeNodeData): React.ReactNode => {
        const row = findTreeRow(tree, node.id)?.row;
        if (row === undefined) {
            return null;
        }
        return ROW_COMMANDS.filter((command) => command.applies(row)).map((command) => (
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
    };

    const onRowKeyDown = (id: string, event: React.KeyboardEvent): void => {
        const row = findTreeRow(tree, id)?.row;
        if (row === undefined) {
            return;
        }
        if (event.key === " ") {
            event.preventDefault();
            void orNotice(store, `hide ${row.name}`, session.styles.hideRow(row.id, !row.hidden));
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
                <Tooltip label="Add a layer or a folder">
                    <ActionIcon variant="subtle" size="sm" aria-label="Add a layer or a folder">
                        <GLYPHS.add size={14} />
                    </ActionIcon>
                </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item
                    onClick={() => {
                        store.set({ inspected: { kind: "draft-row" } });
                    }}
                >
                    Add layer
                </Menu.Item>
                <Menu.Item
                    onClick={() => {
                        void (async () => {
                            try {
                                const folder = await session.styles.addFolder("New folder");
                                store.set({ inspected: { kind: "folder-row", id: folder.id } });
                                setTimeout(() => {
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
                    store.set({ inspected: { kind: "graph" } });
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
