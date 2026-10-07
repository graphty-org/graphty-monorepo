import "./project.css";

import { ActionIcon, Group, Menu, Stack, Text, UnstyledButton } from "@mantine/core";
import { MoreHorizontal } from "lucide-react";
import React, { useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { locateRecent, openRecent, removeRecent } from "./actions";
import { type RecentProject, useRecentProjects } from "./recent";
import { sizeWords, whenWords } from "./words";

/**
 * One Recent projects row (built from Mantine parts until compact-mantine's PageList rows can
 * carry a second line, a size and a row menu, #920): a click reopens the file (or asks for it with Locate... where the
 * browser keeps no handle, or can no longer read the file); its menu offers Locate... and Remove
 * from list.
 * @param props - Component props
 * @param props.entry - The entry
 * @returns The row
 */
function RecentRow({ entry }: Readonly<{ entry: RecentProject }>): React.JSX.Element {
    const workspace = useWorkspace();
    const [missing, setMissing] = useState(false);
    const locate = entry.handle === undefined || missing;
    let second = whenWords(entry.at);
    if (missing) {
        second = "This file can no longer be read. Locate...";
    } else if (locate) {
        second = `${second} - Locate...`;
    }

    return (
        <Group gap={4} wrap="nowrap" className="ws-recent-row">
            <UnstyledButton
                className="ws-recent-open"
                onClick={() => {
                    const go = locate ? locateRecent(workspace, entry) : openRecent(workspace, entry);
                    void go.then((outcome) => {
                        setMissing(outcome === "missing" || (outcome === "cancelled" && missing));
                    });
                }}
            >
                <Group gap={8} wrap="nowrap" justify="space-between">
                    <Text span size="sm" fw={550} truncate="end">
                        {entry.name}
                    </Text>
                    <Text span size="xs" c="dimmed">
                        {sizeWords(entry.nodes)}
                    </Text>
                </Group>
                <Text size="xs" c={missing ? "red" : "dimmed"}>
                    {second}
                </Text>
            </UnstyledButton>
            <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                    <ActionIcon variant="subtle" size="sm" aria-label={`More for ${entry.name}`}>
                        <MoreHorizontal size={14} aria-hidden />
                    </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item
                        onClick={() => {
                            void locateRecent(workspace, entry);
                        }}
                    >
                        Locate...
                    </Menu.Item>
                    <Menu.Item
                        onClick={() => {
                            void removeRecent(entry);
                        }}
                    >
                        Remove from list
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Group>
    );
}

/**
 * The start screen's Recent projects list (tier1-design.md section 2.11): each project's name,
 * size and time, newest first. No folder is shown, because no browser tells a page where a file is.
 * @returns The list
 */
export function RecentProjects(): React.JSX.Element {
    const entries = useRecentProjects();
    if (entries.length === 0) {
        return (
            <Text size="xs" c="dimmed">
                Projects you open or create appear here. They are kept in this browser.
            </Text>
        );
    }
    return (
        <Stack gap={2}>
            {entries.map((entry) => (
                <RecentRow key={entry.id} entry={entry} />
            ))}
            <Text size="xs" c="dimmed" mt="xs">
                Recent projects are remembered in this browser; each project is a file saved where you chose.
            </Text>
        </Stack>
    );
}
