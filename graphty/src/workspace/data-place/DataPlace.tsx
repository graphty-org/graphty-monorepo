import "./data-place.css";

import { ContextMenu, ControlSection, SearchInput, Tree, type TreeNodeData } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Menu } from "@mantine/core";
import { Calendar, CaseSensitive, CircleDashed, CircleDot, FileText, Hash, ListOrdered, Plus, Waypoints } from "lucide-react";
import React, { useEffect, useState } from "react";

import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    type AttributeRow,
    attributeRows,
    columnOf,
    FIND_PAST,
    type SourceKind,
    type SourceRow,
    sourceRows,
    type TypeGlyph,
} from "./words";

const SOURCE_GLYPHS: Record<SourceKind, React.ReactNode> = {
    file: <FileText size={14} aria-hidden />,
    nodes: <CircleDot size={14} aria-hidden />,
    edges: <Waypoints size={14} aria-hidden />,
};

const TYPE_GLYPHS: Record<TypeGlyph, React.ReactNode> = {
    category: <CaseSensitive size={14} aria-hidden />,
    number: <Hash size={14} aria-hidden />,
    ordinal: <ListOrdered size={14} aria-hidden />,
    time: <Calendar size={14} aria-hidden />,
    unknown: <CircleDashed size={14} aria-hidden />,
};

/**
 * The commands the Sources "+" offers (File..., From a URL..., Paste...). The Data page package
 * registers them; until it does, the "+" is not drawn.
 */
const ADD_SOURCE = ["data.add-file", "data.add-url", "data.add-paste"] as const;

/**
 * Re-renders on every change the element reports to the project (an import, an undo, a
 * declaration), so the lists read the session fresh.
 * @param session - the element's session, or null.
 */
function useProjectVersion(session: GraphSession | null): void {
    const [, setVersion] = useState(0);
    useEffect(
        () =>
            session?.on("project:changed", () => {
                setVersion((v) => v + 1);
            }),
        [session],
    );
}

/**
 * A row's quiet text at its end, drawn at rest (a pinned trailing slot of the Tree row).
 * @param props - Component props
 * @param props.children - The text
 * @returns The text
 */
function Quiet({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <span className="dp-quiet" data-pinned="">
            {children}
        </span>
    );
}

/**
 * The tree item for a Sources row.
 * @param row - the row.
 * @returns the item.
 */
function sourceItem(row: SourceRow): TreeNodeData {
    return {
        id: row.id,
        name: row.name,
        icon: SOURCE_GLYPHS[row.kind],
        strong: false,
        actions: <Quiet>{row.quiet}</Quiet>,
        ...(row.children === undefined ? {} : { children: row.children.map(sourceItem) }),
    };
}

/**
 * The tree item for an Attributes row.
 * @param row - the row.
 * @returns the item.
 */
function attributeItem(row: AttributeRow): TreeNodeData {
    return {
        id: row.id,
        name: row.name,
        icon: <span title={row.typeWord}>{TYPE_GLYPHS[row.glyph]}</span>,
        ...(row.fill === null ? {} : { actions: <Quiet>{row.fill}</Quiet> }),
    };
}

/**
 * The id of the tree row an event landed on.
 * @param event - a context-menu or key event inside a Tree.
 * @returns the row's id, or null.
 */
function rowIdOf(event: React.SyntheticEvent): string | null {
    return (event.target as Element).closest<HTMLElement>("[data-id]")?.dataset.id ?? null;
}

/**
 * The Data place (tier1-design.md section 2.6): the graph's name, then Sources and Attributes.
 * Every fact is the element's: `data.source()` and `data.lastImport()` for Sources,
 * `data.attributes()` for Attributes.
 *
 * Not drawn until graphty-element provides them: Rename on a source (#894) and the attributes'
 * role tags, Key, Name and Weight (#893).
 * @returns The Data place
 */
export function DataPlace(): React.JSX.Element {
    const { session, store } = useWorkspace();
    useProjectVersion(session);
    const graphName = useWorkspaceState((state) => state.project?.name ?? "");
    const inspected = useWorkspaceState((state) => state.inspected);
    const [filter, setFilter] = useState("");
    const tableBuilt = useCommand("table.toggle") !== null;
    const addCommands = [useCommand(ADD_SOURCE[0]), useCommand(ADD_SOURCE[1]), useCommand(ADD_SOURCE[2])].filter(
        (door) => door !== null,
    );
    const [menuFor, setMenuFor] = useState<string | null>(null);

    const sources = session === null ? [] : sourceRows(session.data.source(), session.data.lastImport());
    const attributes = session?.data.attributes() ?? [];
    const findShown = attributes.length > FIND_PAST;
    const nodeRows = attributeRows(attributes, "node", findShown ? filter : "");
    const edgeRows = attributeRows(attributes, "edge", findShown ? filter : "");
    const attributeItems: TreeNodeData[] = [
        ...(nodeRows.length > 0 ? [{ id: "nodes", name: "Nodes", children: nodeRows.map(attributeItem) }] : []),
        ...(edgeRows.length > 0 ? [{ id: "edges", name: "Edges", children: edgeRows.map(attributeItem) }] : []),
    ];
    const selectedAttribute = inspected?.kind === "attribute" && inspected.id !== undefined ? [inspected.id] : [];

    const editSource = (): void => {
        store.set({ page: "data-page" });
    };
    const menuColumn = menuFor === null ? null : columnOf(menuFor);
    /**
     * Whether a row has a menu: a source, a node attribute (Add label line), or an edge attribute
     * once the table dock is built (Show in table). A subhead has none.
     * @param id - the row's id, or null off any row.
     * @returns true when the row has at least one item.
     */
    const hasMenu = (id: string | null): boolean => {
        const column = id === null ? null : columnOf(id);
        return id?.startsWith("source") === true || column?.kind === "node" || (column !== null && tableBuilt);
    };

    const plus =
        addCommands.length === 0 ? null : (
            <Menu position="bottom-end">
                <Menu.Target>
                    <ActionIcon variant="subtle" aria-label="Add data" title="Add data">
                        <Plus size={14} aria-hidden />
                    </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                    {addCommands.map((door) => (
                        <Menu.Item key={door.command.id} disabled={door.disabledReason !== null} onClick={door.run}>
                            {door.command.label}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
        );

    return (
        <section className="dp" aria-label="Data place">
            <h2 className="dp-title">{graphName}</h2>
            <ContextMenu
                target={
                    <div
                        onContextMenu={(event) => {
                            const id = rowIdOf(event);
                            setMenuFor(id);
                            if (!hasMenu(id)) {
                                // Opens nothing, and keeps the browser's own menu away too.
                                event.preventDefault();
                            }
                        }}
                        onKeyDown={(event) => {
                            const id = rowIdOf(event);
                            setMenuFor(id);
                            if (((event.shiftKey && event.key === "F10") || event.key === "ContextMenu") && !hasMenu(id)) {
                                event.preventDefault();
                            }
                        }}
                    >
                        <ControlSection label="Sources" actions={plus} empty={sources.length === 0}>
                            {sources.length === 0 ? null : (
                                <Tree
                                    label="Sources"
                                    items={sources.map(sourceItem)}
                                    defaultExpanded={["source"]}
                                    multiselect={false}
                                    selected={[]}
                                    onSelect={editSource}
                                />
                            )}
                        </ControlSection>
                        <ControlSection label="Attributes" empty={attributeItems.length === 0 && filter === ""}>
                            {findShown ? (
                                <SearchInput
                                    className="dp-find"
                                    aria-label="Find attribute"
                                    placeholder="Find"
                                    value={filter}
                                    onChange={setFilter}
                                />
                            ) : null}
                            {attributeItems.length === 0 ? null : (
                                <Tree
                                    label="Attributes"
                                    items={attributeItems}
                                    defaultExpanded={["nodes", "edges"]}
                                    multiselect={false}
                                    selected={selectedAttribute}
                                    onSelect={(ids) => {
                                        const id = ids.at(-1);
                                        if (id !== undefined && columnOf(id) !== null) {
                                            store.set({ inspected: { kind: "attribute", id } });
                                        }
                                    }}
                                />
                            )}
                        </ControlSection>
                    </div>
                }
            >
                {menuFor?.startsWith("source") === true ? <Menu.Item onClick={editSource}>Edit source...</Menu.Item> : null}
                {menuColumn?.kind === "node" ? (
                    <Menu.Item
                        onClick={() => {
                            // A door that is not on a row makes a new row on top (tier1-design.md T9).
                            void session?.styles.encode({ column: menuColumn, channel: "node.label" });
                        }}
                    >
                        Add label line
                    </Menu.Item>
                ) : null}
                {menuColumn !== null && tableBuilt ? (
                    <Menu.Item
                        onClick={() => {
                            store.set({ dockOpen: true, tableShow: menuColumn });
                        }}
                    >
                        Show in table
                    </Menu.Item>
                ) : null}
            </ContextMenu>
        </section>
    );
}
