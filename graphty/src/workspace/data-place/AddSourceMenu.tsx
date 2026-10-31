import { ActionIcon, Menu, Tooltip } from "@mantine/core";
import React from "react";

import { CommandMenuItem } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { useCommand } from "../state/WorkspaceContext";

/**
 * The commands the Sources "+" offers, in menu order (spec section 3.2): File..., Samples...,
 * Server..., Network data... and Paste, registered by the loading and server packages. Each is
 * drawn only once its package registers it. Paste means what it means everywhere (`readPasted`):
 * the clipboard, opened as a web address when it is one, else read as data.
 */
export const ADD_SOURCE = [
    "data.add-file",
    "data.samples",
    "data.add-server",
    "data.add-network",
    "data.add-paste",
] as const;

/** Each item's glyph, drawn before its label as the Style "+" items are. */
const GLYPH: Readonly<Record<(typeof ADD_SOURCE)[number], React.ReactNode>> = {
    "data.add-file": <GLYPHS.file size={14} aria-hidden />,
    "data.samples": <GLYPHS.gridView size={14} aria-hidden />,
    "data.add-server": <GLYPHS.server size={14} aria-hidden />,
    "data.add-network": <GLYPHS.data size={14} aria-hidden />,
    "data.add-paste": <GLYPHS.paste size={14} aria-hidden />,
};

/**
 * The Sources "+": a menu of the ways to add a source, each with its glyph and its key. File...
 * shows Open's key, which opens the same chooser.
 * @returns the menu, or nothing until some way is registered
 */
export function AddSourceMenu(): React.JSX.Element | null {
    const open = useCommand("file.open");
    const doors = [
        useCommand(ADD_SOURCE[0]),
        useCommand(ADD_SOURCE[1]),
        useCommand(ADD_SOURCE[2]),
        useCommand(ADD_SOURCE[3]),
        useCommand(ADD_SOURCE[4]),
    ].filter((door) => door !== null);
    if (doors.length === 0) {
        return null;
    }
    // Each item opens a dialog, a pop-over or the file chooser that takes focus; handing focus back
    // to "+" as the menu closes would take it from them. The tooltip wraps the menu's target, so
    // the button itself carries the menu's aria-haspopup and aria-expanded.
    return (
        <Menu position="bottom-end" returnFocus={false}>
            <Tooltip label="Add source">
                <Menu.Target>
                    <ActionIcon variant="subtle" size="sm" aria-label="Add source">
                        <GLYPHS.add size={14} aria-hidden />
                    </ActionIcon>
                </Menu.Target>
            </Tooltip>
            <Menu.Dropdown>
                {doors.map((door) => {
                    const id = door.command.id as (typeof ADD_SOURCE)[number];
                    return (
                        <CommandMenuItem
                            key={id}
                            icon={GLYPH[id]}
                            label={door.command.label}
                            shortcut={
                                door.command.keys?.[0] ?? (id === "data.add-file" ? open?.command.keys?.[0] : undefined)
                            }
                            reason={door.disabledReason}
                            onRun={door.run}
                        />
                    );
                })}
            </Menu.Dropdown>
        </Menu>
    );
}
