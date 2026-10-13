import type { StyleRow } from "@graphty/graphty-element/session";
import { Menu } from "@mantine/core";
import React, { Fragment } from "react";

import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ROW_COMMANDS, type RowCommand } from "./commands";

/** The row menu's groups, top to bottom; a divider falls between two that draw something. */
const GROUPS: readonly RowCommand["group"][] = ["edit", "pin", "view", "remove"];

/**
 * A style row's menu, the same wherever it opens (the tree's right click and Shift+F10, the
 * inspector header's "..."): Rename, Duplicate, Move to folder | the pins | Hide, Lock, Select what
 * it paints | Ungroup, Delete. Every item has its icon and its key; Unpin shows only on a pinned
 * row, and Hide and Lock say what they will do to this row ("Show" on a hidden one).
 * @param props - Component props
 * @param props.tree - the element's tree
 * @param props.row - the row
 * @param props.parent - the folder holding it, if any
 * @param props.onMoveTo - moves the row to the top of a folder, or out to the top level (null)
 * @returns The menu's items
 */
export function RowMenuItems({
    tree,
    row,
    parent,
    onMoveTo,
}: Readonly<{
    tree: readonly StyleRow[];
    row: StyleRow;
    parent: StyleRow | undefined;
    onMoveTo: (folderId: string | null) => void;
}>): React.JSX.Element {
    const workspace = useWorkspace();
    const groups = GROUPS.map((group) => {
        const items = ROW_COMMANDS.filter((command) => command.group === group && command.applies(row)).map(
            (command) => {
                const icon = typeof command.icon === "function" ? command.icon(row) : command.icon;
                const Glyph = GLYPHS[icon];
                return (
                    <CommandMenuItem
                        key={command.id}
                        label={command.rowLabel?.(row) ?? command.label}
                        icon={<Glyph size={14} aria-hidden />}
                        shortcut={command.rowKeys[0]}
                        reason={command.disabled(row)}
                        onRun={() => {
                            void command.run(workspace, row); // NOSONAR(S3735): a deliberately unawaited promise, marked as no-floating-promises asks
                        }}
                    />
                );
            },
        );
        if (group === "edit") {
            // Move to folder follows Duplicate, as in Figma's layer menu.
            items.push(<MoveToFolder key="row.move" tree={tree} row={row} parent={parent} onMoveTo={onMoveTo} />);
        }
        return { group, items };
    }).filter(({ items }) => items.length > 0);
    return (
        <>
            {groups.map(({ group, items }, index) => (
                <Fragment key={group}>
                    {index > 0 ? <Menu.Divider /> : null}
                    {items}
                </Fragment>
            ))}
        </>
    );
}

/**
 * Move to folder: a submenu of the folders the row can go into, and the top level when it is in
 * one.
 * @param props - Component props
 * @param props.tree - the element's tree.
 * @param props.row - the row.
 * @param props.parent - the folder holding it, if any.
 * @param props.onMoveTo - moves it.
 * @returns The submenu
 */
function MoveToFolder({
    tree,
    row,
    parent,
    onMoveTo,
}: Readonly<{
    tree: readonly StyleRow[];
    row: StyleRow;
    parent: StyleRow | undefined;
    onMoveTo: (folderId: string | null) => void;
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
                        leftSection={<GLYPHS.folder size={14} aria-hidden />}
                        onClick={() => {
                            onMoveTo(folder.id);
                        }}
                    >
                        {folder.name}
                    </Menu.Item>
                ))}
                {parent === undefined ? null : (
                    <Menu.Item
                        leftSection={<GLYPHS.folder size={14} aria-hidden />}
                        onClick={() => {
                            onMoveTo(null);
                        }}
                    >
                        Out of {parent.name}
                    </Menu.Item>
                )}
            </Menu.Sub.Dropdown>
        </Menu.Sub>
    );
}
