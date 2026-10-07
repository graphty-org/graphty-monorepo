import "./data-place.css";

import { ControlSection, SearchInput, Tree, type TreeNodeData } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { editSource } from "../data-page/request";
import { GLYPHS } from "../glyphs";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useAttributeActions } from "./attributeActions";
import { FiltersSection } from "./Filters";
import { AttributeMenuItems, ItemLabel } from "./MenuItems";
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
    file: <GLYPHS.file size={14} aria-hidden />,
    nodes: <GLYPHS.node size={14} aria-hidden />,
    edges: <GLYPHS.edge size={14} aria-hidden />,
};

const TYPE_GLYPHS: Record<TypeGlyph, React.ReactNode> = {
    category: <GLYPHS.category size={14} aria-hidden />,
    number: <GLYPHS.number size={14} aria-hidden />,
    ordinal: <GLYPHS.ordinal size={14} aria-hidden />,
    time: <GLYPHS.time size={14} aria-hidden />,
    unknown: <GLYPHS.unknown size={14} aria-hidden />,
    result: <GLYPHS.measure size={14} aria-hidden />,
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
 * @returns a number that changes with each reported change.
 */
function useProjectVersion(session: GraphSession | null): number {
    const [version, setVersion] = useState(0);
    useEffect(
        () =>
            session?.on("project:changed", () => {
                setVersion((v) => v + 1);
            }),
        [session],
    );
    return version;
}

/**
 * A row's quiet text at its end, drawn at rest (a pinned trailing slot of the Tree row).
 * @param props - Component props
 * @param props.children - The text
 * @returns The text
 */
function Quiet({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
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
        ...(row.quiet === "" ? {} : { description: row.quiet, actions: <Quiet>{row.quiet}</Quiet> }),
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
 * The Attributes tree: a Nodes and an Edges subhead, each drawn only when it has a row.
 * @param session - the element's session, or null.
 * @param needle - the find text, or "" for every attribute.
 * @returns the tree items.
 */
function attributeTree(session: GraphSession | null, needle: string): TreeNodeData[] {
    const attributes = session?.data.attributes() ?? [];
    const runLabel = (runId: string): string | undefined => session?.runs.get(runId)?.label;
    const subheads = [
        { id: "nodes", name: "Nodes", label: "Node attributes", kind: "node" },
        { id: "edges", name: "Edges", label: "Edge attributes", kind: "edge" },
    ] as const;
    return subheads.flatMap(({ kind, ...head }) => {
        const rows = attributeRows(attributes, kind, needle, runLabel);
        return rows.length > 0 ? [{ ...head, children: rows.map(attributeItem) }] : [];
    });
}

/**
 * The Data place's row menu, for Tree's rowMenu: Edit source on a source (and on its tables),
 * which opens the Data page on that load's own files and roles; on an attribute, the
 * attribute's verbs (the same as its inspector's "..."). Other rows (the Nodes and Edges
 * subheads) have none.
 * @returns the rowMenu function.
 */
function useRowMenu(): (node: TreeNodeData) => React.ReactNode {
    const { store, session } = useWorkspace();
    const actionsOf = useAttributeActions();
    return (node) => {
        if (node.id.startsWith("source")) {
            // Row ids are `source:<load>` and `source:<load>:<table>`.
            const index = Number(node.id.split(":")[1]);
            return (
                <Menu.Item
                    onClick={() => {
                        editSource(store, session?.data.sources()[index]);
                    }}
                >
                    Edit source...
                </Menu.Item>
            );
        }
        const actions = actionsOf(columnOf(node.id));
        return actions.length === 0 ? null : <AttributeMenuItems actions={actions} />;
    };
}

/**
 * The Attributes section: the find box once there are many, and the Nodes and Edges tree. Picking
 * an attribute opens it in the inspector.
 * @returns The section
 */
function AttributesSection(): React.JSX.Element {
    const { session, store } = useWorkspace();
    const rowMenu = useRowMenu();
    const inspected = useWorkspaceState((state) => state.inspected);
    const [filter, setFilter] = useState("");
    const findShown = (session?.data.attributes().length ?? 0) > FIND_PAST;
    const attributeItems = attributeTree(session, findShown ? filter : "");
    // The attribute kind's id is the attribute's path (`data.<name>`), as the inspector reads it;
    // the tree's own row ids carry the kind too, since a node and an edge attribute can share one.
    // ponytail: a path names no kind, so where a node and an edge attribute share one the node's
    // row is the one shown selected.
    const attributes = session?.data.attributes() ?? [];
    const shown = inspected?.kind === "attribute" ? attributes.find((a) => a.path === inspected.id) : undefined;
    const selectedAttribute = shown === undefined ? [] : [`${shown.kind}:${shown.name}`];
    return (
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
                    rowMenu={rowMenu}
                    onSelect={(ids) => {
                        const id = ids.at(-1);
                        const column = id === undefined ? null : columnOf(id);
                        const attribute = attributes.find((a) => a.kind === column?.kind && a.name === column.name);
                        if (attribute !== undefined) {
                            store.set({ inspected: { kind: "attribute", id: attribute.path } });
                        }
                    }}
                />
            )}
        </ControlSection>
    );
}

/**
 * The Data place (tier1-design.md section 2.6): the graph's name, then Sources, Filters
 * (tier2-design.md section 1) and Attributes.
 * Every fact is the element's: `data.sources()` and `data.lastImport()` for Sources,
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
    const addCommands = [useCommand(ADD_SOURCE[0]), useCommand(ADD_SOURCE[1]), useCommand(ADD_SOURCE[2])].filter(
        (door) => door !== null,
    );

    const sources = session === null ? [] : sourceRows(session.data.sources(), session.data.lastImport());

    const rowMenu = useRowMenu();
    const tableBuilt = useCommand("table.toggle") !== null;
    // A table row opens the table dock on that table: a file's Node table or Edge table, or a
    // source that produced one table (an edge list) and so has no children. A file holding both
    // tables only expands to them. Its menu's Edit source... opens the Data page.
    const openSource = (ids: string[]): void => {
        const id = ids.at(-1);
        const row = sources.flatMap((source) => [source, ...(source.children ?? [])]).find((r) => r.id === id);
        if (tableBuilt && row !== undefined && row.kind !== "file") {
            store.set({ dockOpen: true, dockTab: row.kind });
        }
    };

    const plus =
        addCommands.length === 0 ? null : (
            <Menu position="bottom-end">
                <Menu.Target>
                    <Tooltip label="Add data">
                        <ActionIcon variant="subtle" aria-label="Add data">
                            <GLYPHS.add size={14} aria-hidden />
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
            <ControlSection label="Sources" actions={plus} empty={sources.length === 0}>
                {sources.length === 0 ? null : (
                    <Tree
                        label="Sources"
                        items={sources.map(sourceItem)}
                        defaultExpanded={sources.map((row) => row.id)}
                        multiselect={false}
                        selected={[]}
                        onSelect={openSource}
                        rowMenu={rowMenu}
                    />
                )}
            </ControlSection>
            <FiltersSection />
            <AttributesSection />
        </section>
    );
}
