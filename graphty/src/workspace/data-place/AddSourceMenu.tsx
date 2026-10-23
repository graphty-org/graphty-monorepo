import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { useCommand } from "../state/WorkspaceContext";

/**
 * The commands the Sources "+" offers, in menu order (spec section 3.2): File..., Samples...,
 * Server... and Paste, registered by the loading and server packages. Each is drawn only once its
 * package registers it. Paste means what it means everywhere (`readPasted`): the clipboard, opened
 * as a web address when it is one, else read as data.
 */
export const ADD_SOURCE = ["data.add-file", "data.samples", "data.add-server", "data.add-paste"] as const;

/**
 * The Sources "+": a menu of the ways to add a source.
 * @returns the menu, or nothing until some way is registered
 */
export function AddSourceMenu(): React.JSX.Element | null {
    const doors = [
        useCommand(ADD_SOURCE[0]),
        useCommand(ADD_SOURCE[1]),
        useCommand(ADD_SOURCE[2]),
        useCommand(ADD_SOURCE[3]),
    ].filter((door) => door !== null);
    if (doors.length === 0) {
        return null;
    }
    // Each item opens a dialog, a pop-over or the file chooser that takes focus; handing focus back
    // to "+" as the menu closes would take it from them.
    return (
        <Menu position="bottom-end" returnFocus={false}>
            <Menu.Target>
                <Tooltip label="Add source">
                    <ActionIcon variant="subtle" size="sm" aria-label="Add source">
                        <GLYPHS.add size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
                {doors.map((door) => (
                    <Menu.Item key={door.command.id} disabled={door.disabledReason !== null} onClick={door.run}>
                        {door.command.label}
                        {door.disabledReason === null ? null : (
                            <Text size="xs" c="dimmed">
                                {door.disabledReason}
                            </Text>
                        )}
                    </Menu.Item>
                ))}
            </Menu.Dropdown>
        </Menu>
    );
}
