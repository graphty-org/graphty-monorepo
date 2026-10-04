import "./data-place.css";

import { ContextMenu, ControlSection, SearchInput, Tree, type TreeNodeData } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import {
    Calendar,
    CaseSensitive,
    ChartColumn,
    CircleDashed,
    CircleDot,
    FileText,
    Hash,
    ListOrdered,
    Plus,
    Waypoints,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    type AttributeRow,
    attributeRows,
    columnOf,
    FIND_PAST,
    labelRefusalWords,
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
    result: <ChartColumn size={14} aria-hidden />,
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
 * A menu item's label, with a disabled item's reason on its second line (section 4, "Disabled").
 * @param props - Component props
 * @param props.label - The item's label
 * @param props.reason - Why it is disabled, or null
 * @returns The label
 */
function ItemLabel({ label, reason }: { label: string; reason: string | null }): React.JSX.Element {
    return (
        <>
            {label}
            {reason === null ? null : (
                <Text size="xs" c="dimmed">
                    {reason}
                </Text>
            )}
        </>
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
        description: row.quiet,
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
        label: row.label,
        // The type reaches a screen reader through the description; the tooltip is for a pointer.
        description: row.description,
        icon: (
            <Tooltip label={row.typeWord}>
                <span>{TYPE_GLYPHS[row.glyph]}</span>
            </Tooltip>
        ),
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
 * role tags, Key, Name and Weight (#893). A closed section's one-line summary waits for
 * compact-mantine's ControlSection (#916).
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
    const needle = findShown ? filter : "";
    const runLabel = (runId: string): string | undefined => session?.runs.get(runId)?.label;
    const nodeRows = attributeRows(attributes, "node", needle, runLabel);
    const edgeRows = attributeRows(attributes, "edge", needle, runLabel);
    const attributeItems: TreeNodeData[] = [
        ...(nodeRows.length > 0
            ? [{ id: "nodes", name: "Nodes", label: "Node attributes", children: nodeRows.map(attributeItem) }]
            : []),
        ...(edgeRows.length > 0
            ? [{ id: "edges", name: "Edges", label: "Edge attributes", children: edgeRows.map(attributeItem) }]
            : []),
    ];
    const selectedAttribute = inspected?.kind === "attribute" && inspected.id !== undefined ? [inspected.id] : [];

    const editSource = (): void => {
        store.set({ page: "data-page" });
    };
    const menuColumn = menuFor === null ? null : columnOf(menuFor);
    const labelSpec = menuColumn?.kind === "node" ? { column: menuColumn, channel: "node.label" as const } : null;
    let labelRefusal: string | null = null;
    if (labelSpec !== null && session !== null) {
        try {
            const proposal = session.styles.proposeEncoding(labelSpec);
            labelRefusal = proposal.ok ? null : labelRefusalWords(proposal.refusal);
        } catch {
            // The attribute went away under the open menu.
            labelRefusal = "No longer in the data";
        }
    }
    /**
     * Add label line (T10, the attribute menu's door): a new row on top whose label is bound to
     * the attribute. It lands selected, so the inspector shows it; a refusal is one Problem notice.
     * @param spec - the column and the label channel.
     */
    const addLabelLine = (spec: NonNullable<typeof labelSpec>): void => {
        session?.styles.encode(spec).then(
            (layer) => {
                store.set({ inspected: { kind: "layer-row", id: layer.id } });
            },
            () => {
                store.set({
                    notice: { message: `Could not add a label line from "${spec.column.name}". Pick another attribute.` },
                });
            },
        );
    };
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
                    <Tooltip label="Add data">
                        <ActionIcon variant="subtle" aria-label="Add data">
                            <Plus size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                    {addCommands.map((door) => (
                        <Menu.Item key={door.command.id} disabled={door.disabledReason !== null} onClick={door.run}>
                            <ItemLabel label={door.command.label} reason={door.disabledReason} />
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
                            {attributeItems.length === 0 && filter !== "" ? (
                                <Text size="xs" c="dimmed" className="dp-no-match">
                                    No match for &quot;{filter}&quot;
                                </Text>
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
                {labelSpec === null ? null : (
                    <Menu.Item
                        disabled={labelRefusal !== null}
                        onClick={() => {
                            addLabelLine(labelSpec);
                        }}
                    >
                        <ItemLabel label="Add label line" reason={labelRefusal} />
                    </Menu.Item>
                )}
                {menuColumn !== null && tableBuilt ? (
                    <Menu.Item
                        onClick={() => {
                            // Opens the dock; bringing the column into view is the Table dock's.
                            store.set({ dockOpen: true });
                        }}
                    >
                        Show in table
                    </Menu.Item>
                ) : null}
            </ContextMenu>
        </section>
    );
}
