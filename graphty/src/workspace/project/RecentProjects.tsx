import { PageList } from "@graphty/compact-mantine";
import { ActionIcon, Menu, Text } from "@mantine/core";
import { MoreHorizontal } from "lucide-react";
import React, { useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { locateRecent, openRecent, removeRecent } from "./actions";
import { type RecentProject, useRecentProjects } from "./recent";
import { sizeWords, whenWords } from "./words";

/**
 * A Recent projects row's menu: Locate... and Remove from list.
 * @param props - Component props
 * @param props.entry - The entry
 * @returns The menu
 */
function RowMenu({ entry }: Readonly<{ entry: RecentProject }>): React.JSX.Element {
    const workspace = useWorkspace();
    return (
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
    );
}

/**
 * The start screen's Recent projects list (tier1-design.md section 2.11): each project's name,
 * size and time, newest first. A click reopens the file, or asks for it with Locate... where the
 * browser keeps no handle or can no longer read it. No folder is shown, because no browser tells
 * a page where a file is.
 * @returns The list
 */
export function RecentProjects(): React.JSX.Element {
    const workspace = useWorkspace();
    const entries = useRecentProjects();
    const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
    if (entries.length === 0) {
        return (
            <Text size="xs" c="dimmed">
                Projects you open or create appear here. They are kept in this browser.
            </Text>
        );
    }

    const open = (entry: RecentProject): void => {
        const wasMissing = missing.has(entry.id);
        const go =
            entry.handle === undefined || wasMissing ? locateRecent(workspace, entry) : openRecent(workspace, entry);
        void go.then((outcome) => {
            const now = new Set(missing);
            if (outcome === "missing" || (outcome === "cancelled" && wasMissing)) {
                now.add(entry.id);
            } else {
                now.delete(entry.id);
            }
            setMissing(now);
        });
    };

    return (
        <>
            <PageList
                label="Recent projects"
                items={entries.map((entry) => {
                    const lost = missing.has(entry.id);
                    let description = whenWords(entry.at);
                    if (lost) {
                        description = "This file can no longer be read. Locate...";
                    } else if (entry.handle === undefined) {
                        description = `${description} - Locate...`;
                    }
                    return {
                        id: entry.id,
                        name: entry.name,
                        value: sizeWords(entry.nodes),
                        description,
                        descriptionTone: lost ? "danger" : "default",
                        menu: <RowMenu entry={entry} />,
                    };
                })}
                onCurrentChange={(id) => {
                    const entry = entries.find((candidate) => candidate.id === id);
                    if (entry !== undefined) {
                        open(entry);
                    }
                }}
            />
            <Text size="xs" c="dimmed" mt="xs">
                Recent projects are remembered in this browser; each project is a file saved where you chose.
            </Text>
        </>
    );
}
