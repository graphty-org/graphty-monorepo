import { MenuCheckItem } from "@graphty/compact-mantine";
import { Menu, Text } from "@mantine/core";
import React from "react";

import { formatKey } from "../keys/keys";
import { useCommand, useWorkspaceState } from "../state/WorkspaceContext";

/**
 * One check row of the View menu's Show section: the command's label, its key, and a check while
 * the thing it switches is showing. A disabled row stays focusable with its reason on a second
 * line.
 * @param props - Component props
 * @param props.command - The command the row runs
 * @param props.checked - Whether the thing it switches is showing
 * @returns The row, or nothing when the command is a stub
 */
function ShowItem({
    command: commandId,
    checked,
}: Readonly<{ command: string; checked: boolean }>): React.JSX.Element | null {
    const door = useCommand(commandId);
    if (door === null) {
        return null;
    }
    const { command, disabledReason: reason, run } = door;
    const key = command.keys?.[0];
    return (
        <MenuCheckItem
            checked={checked}
            onClick={reason === null ? run : undefined}
            closeMenuOnClick={reason === null}
            aria-disabled={reason !== null}
            data-disabled={reason === null ? undefined : true}
            rightSection={key === undefined ? undefined : formatKey(key)}
        >
            {command.label}
            {reason === null ? null : (
                <Text component="span" display="block" size="xs" c="var(--cm-text-menu-secondary)">
                    {reason}
                </Text>
            )}
        </MenuCheckItem>
    );
}

/**
 * The View menu's Show section, below the view rows: Legend and Table, each a check row, as
 * Figma's View menu lists its panels.
 * @returns The section
 */
export function ShowMenuRows(): React.JSX.Element {
    const legendShown = useWorkspaceState((state) => state.legendShown);
    const dockOpen = useWorkspaceState((state) => state.dockOpen);
    return (
        <>
            <Menu.Divider />
            <Menu.Label>Show</Menu.Label>
            <ShowItem command="view.legend" checked={legendShown} />
            <ShowItem command="table.toggle" checked={dockOpen} />
        </>
    );
}
