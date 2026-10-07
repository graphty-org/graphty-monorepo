import { ModalFooter, PageList } from "@graphty/compact-mantine";
import { browserProjects } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Menu, Modal, Text } from "@mantine/core";
import React, { type RefObject, useEffect, useRef, useState } from "react";

import { focusIsLost } from "../frame/focus";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { locateRecent, openRecent, removeRecent } from "./actions";
import { type RecentProject, useRecentProjects } from "./recent";
import { sizeWords, whenWords } from "./words";

/**
 * A Recent projects row's menu: Open, and Remove from this browser (a browser-kept project) or
 * Remove from list (a remembered file).
 * @param props - Component props
 * @param props.entry - The entry
 * @param props.onOpen - Opens it, as a tap on the row does
 * @param props.onRemove - Removes it; a browser-kept project asks first
 * @returns The menu
 */
function RowMenu({
    entry,
    onOpen,
    onRemove,
}: Readonly<{ entry: RecentProject; onOpen: () => void; onRemove: () => void }>): React.JSX.Element {
    return (
        <Menu position="bottom-end" withinPortal>
            <Menu.Target>
                <ActionIcon variant="subtle" size="sm" aria-label={`More for ${entry.name}`}>
                    <GLYPHS.more size={14} aria-hidden />
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item onClick={onOpen}>Open</Menu.Item>
                <Menu.Item onClick={onRemove}>
                    {entry.stored === true ? "Remove from this browser" : "Remove from list"}
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * The question before a browser-kept project is deleted: it may be the only copy.
 * @param props - Component props
 * @param props.entry - The project to remove, or null when closed
 * @param props.onClose - Closes the dialog
 * @param props.onRemove - Removes the project
 * @returns The dialog
 */
function RemoveDialog({
    entry,
    onClose,
    onRemove,
}: Readonly<{
    entry: RecentProject | null;
    onClose: () => void;
    onRemove: (entry: RecentProject) => void;
}>): React.JSX.Element {
    return (
        <Modal opened={entry !== null} onClose={onClose} title={`Remove ${entry?.name ?? ""} from this browser?`}>
            <Text size="sm">The copy kept in this browser is deleted. A local copy you saved is not touched.</Text>
            <ModalFooter mt="md">
                <Button variant="default" onClick={onClose} data-autofocus>
                    Cancel
                </Button>
                <Button
                    color="red"
                    onClick={() => {
                        if (entry !== null) {
                            onRemove(entry);
                        }
                        onClose();
                    }}
                >
                    Remove
                </Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * Whether the browser may clear the projects kept here, as graphty-element reports it. Asked
 * only while a browser-kept project is listed.
 * @param asking - whether a browser-kept project is listed.
 * @returns true when the browser has not promised to keep them.
 */
function useMayBeCleared(asking: boolean): boolean {
    const [mayBeCleared, setMayBeCleared] = useState(false);
    useEffect(() => {
        if (!asking) {
            setMayBeCleared(false);
            return undefined;
        }
        let live = true;
        void browserProjects.persisted().then((kept) => {
            if (live) {
                setMayBeCleared(!kept);
            }
        });
        return () => {
            live = false;
        };
    }, [asking]);
    return mayBeCleared;
}

/**
 * The second line of a Recent projects row.
 * @param entry - the entry.
 * @param lost - its file can no longer be read.
 * @returns the line.
 */
function rowDescription(entry: RecentProject, lost: boolean): string {
    if (entry.stored === true) {
        return ["In this browser", sizeWords(entry.nodes), whenWords(entry.at)].filter(Boolean).join(" - ");
    }
    if (lost) {
        return "This file can no longer be read. Locate...";
    }
    return entry.handle === undefined ? `${whenWords(entry.at)} - Locate...` : whenWords(entry.at);
}

/**
 * The start screen's Recent projects list (tier1-design.md section 2.11), newest first: projects
 * kept in this browser and files the browser keeps a handle to. A tap opens one; a file the
 * browser can no longer read asks for it with Locate.... Under the list, when the browser has not
 * promised to keep its storage, a note to save a local copy. A removed row takes focus with it,
 * so focus goes to the row now in the list's tab stop, or to `emptyFocus` once the list is empty.
 * @param props - Component props
 * @param props.emptyFocus - Where focus goes when the last row is removed
 * @returns The list
 */
export function RecentProjects({
    emptyFocus,
}: Readonly<{ emptyFocus?: RefObject<HTMLElement | null> }>): React.JSX.Element {
    const workspace = useWorkspace();
    const entries = useRecentProjects();
    const list = useRef<HTMLDivElement>(null);
    const removed = useRef(false);
    useEffect(() => {
        if (!removed.current || !focusIsLost()) {
            return;
        }
        removed.current = false;
        // The grid hands focus on to the row in its tab stop.
        const grid = list.current?.querySelector<HTMLElement>("[role='grid']");
        (grid ?? emptyFocus?.current)?.focus();
    }, [entries, emptyFocus]);
    const remove = (entry: RecentProject): void => {
        removed.current = true;
        void removeRecent(entry);
    };
    const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
    const [removing, setRemoving] = useState<RecentProject | null>(null);
    const mayBeCleared = useMayBeCleared(entries.some((entry) => entry.stored === true));
    if (entries.length === 0) {
        return (
            <Text size="xs" c="dimmed">
                Projects you save appear here. They are kept in this browser.
            </Text>
        );
    }

    const open = (entry: RecentProject): void => {
        const wasMissing = missing.has(entry.id);
        const go =
            entry.stored !== true && (entry.handle === undefined || wasMissing)
                ? locateRecent(workspace, entry)
                : openRecent(workspace, entry);
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
        // display: contents keeps the rows and the note in the column's own spacing.
        <div ref={list} style={{ display: "contents" }}>
            <PageList
                label="Recent projects"
                items={entries.map((entry) => {
                    const lost = missing.has(entry.id) && entry.stored !== true;
                    return {
                        id: entry.id,
                        name: entry.name,
                        value: entry.stored === true ? undefined : sizeWords(entry.nodes),
                        description: rowDescription(entry, lost),
                        descriptionTone: lost ? "danger" : "default",
                        menu: (
                            <RowMenu
                                entry={entry}
                                onOpen={() => {
                                    open(entry);
                                }}
                                onRemove={() => {
                                    if (entry.stored === true) {
                                        setRemoving(entry);
                                    } else {
                                        remove(entry);
                                    }
                                }}
                            />
                        ),
                    };
                })}
                onCurrentChange={(id) => {
                    const entry = entries.find((candidate) => candidate.id === id);
                    if (entry !== undefined) {
                        open(entry);
                    }
                }}
            />
            {mayBeCleared && (
                <Text size="xs" c="dimmed" mt="xs">
                    This browser can clear projects kept here. Save a local copy of any project you need to keep.
                </Text>
            )}
            <RemoveDialog
                entry={removing}
                onClose={() => {
                    setRemoving(null);
                }}
                onRemove={remove}
            />
        </div>
    );
}
