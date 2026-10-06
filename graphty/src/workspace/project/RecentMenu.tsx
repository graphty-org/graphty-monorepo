import { Menu } from "@mantine/core";
import React from "react";

import { useWorkspace, type WorkspaceValue } from "../state/WorkspaceContext";
import { locateRecent, openRecent } from "./actions";
import { type RecentProject, useRecentProjects } from "./recent";
import { sizeWords } from "./words";

/**
 * Opens a recent project from the menu; a file the browser can no longer read puts up a notice
 * with Locate...
 * @param workspace - the workspace.
 * @param entry - the recent project.
 */
async function openFromMenu(workspace: WorkspaceValue, entry: RecentProject): Promise<void> {
    if ((await openRecent(workspace, entry)) !== "missing") {
        return;
    }
    workspace.store.set({
        notice: {
            message: `${entry.name} can no longer be read.`,
            action: {
                label: "Locate...",
                run: () => {
                    void locateRecent(workspace, entry);
                },
            },
        },
    });
}

/**
 * The main menu's "Open recent" submenu (tier1-design.md section 2.1), one row per recent
 * project, newest first. Opening one over unsaved changes asks first; a file the browser can no
 * longer read says so, with Locate... on the notice. Not drawn while the list is empty.
 * @returns The submenu, or nothing
 */
export function RecentMenu(): React.JSX.Element | null {
    const workspace = useWorkspace();
    const entries = useRecentProjects();
    if (entries.length === 0) {
        return null;
    }
    return (
        <Menu.Sub>
            <Menu.Sub.Target>
                <Menu.Sub.Item>Open recent</Menu.Sub.Item>
            </Menu.Sub.Target>
            <Menu.Sub.Dropdown>
                {entries.map((entry) => (
                    <Menu.Item
                        key={entry.id}
                        rightSection={sizeWords(entry.nodes)}
                        onClick={() => {
                            void openFromMenu(workspace, entry);
                        }}
                    >
                        {entry.name}
                    </Menu.Item>
                ))}
            </Menu.Sub.Dropdown>
        </Menu.Sub>
    );
}
