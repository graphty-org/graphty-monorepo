import { Popout, PopoutManager } from "@graphty/compact-mantine";
import type { NodeId } from "@graphty/graphty-element/session";
import { Button, Menu } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    collapseNode,
    collapsible,
    EXPAND_DEFAULTS,
    EXPAND_DIALOG,
    expandableSource,
    hiddenNeighbors,
    type ServerFormState,
    splitList,
} from "./commands";
import { ExpandFields } from "./ServerForm";

/** Where the menu is open: the node, the point in the window, and which step. */
interface Opened {
    readonly id: NodeId;
    readonly x: number;
    readonly y: number;
    readonly step: "menu" | "expand";
}

/**
 * The canvas node menu for a node a server load brought (spec section 3.9): right-click a node
 * for Expand... (with the node's `+N` more neighbors on the server) and Collapse. Expand... opens
 * its depth, direction, edge types and limit beside the node. Quick actions' Expand... opens the
 * same rows for the selected node.
 * @returns the menu, drawn only while open.
 */
export function NodeMenu(): React.JSX.Element | null {
    const { element, session, store } = useWorkspace();
    const dialog = useWorkspaceState((state) => state.dialog);
    const [opened, setOpened] = useState<Opened | null>(null);
    const [expandWith, setExpandWith] = useState<ServerFormState["expandWith"]>(EXPAND_DEFAULTS);
    const point = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        const onMenu = (event: MouseEvent): void => {
            const rect = element.getBoundingClientRect();
            const hit = element.elementAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
            if (hit?.kind !== "node") {
                return;
            }
            if (expandableSource(session, hit.id) === undefined && !collapsible(session, hit.id)) {
                return;
            }
            event.preventDefault();
            setOpened({ id: hit.id, x: event.clientX, y: event.clientY, step: "menu" });
        };
        element.addEventListener("contextmenu", onMenu);
        return () => {
            element.removeEventListener("contextmenu", onMenu);
        };
    }, [element, session]);

    // Quick actions' Expand...: the selected node's rows, beside the node.
    useEffect(() => {
        if (dialog !== EXPAND_DIALOG || element === null || session === null) {
            return;
        }
        store.set({ dialog: null });
        const [id] = session.selection.nodes;
        if (id === undefined) {
            return;
        }
        const rect = element.getBoundingClientRect();
        const at = element.nodeScreenPosition(id);
        setOpened({
            id,
            x: rect.left + (at?.x ?? rect.width / 2),
            y: rect.top + (at?.y ?? rect.height / 2),
            step: "expand",
        });
    }, [dialog, element, session, store]);

    if (opened === null || session === null) {
        return null;
    }
    const close = (): void => {
        setOpened(null);
    };
    const anchor = <span className="sv-point" style={{ left: opened.x, top: opened.y }} />;

    if (opened.step === "expand") {
        return (
            <>
                <span ref={point} className="sv-point" style={{ left: opened.x, top: opened.y }} />
                <PopoutManager>
                    <Popout
                        opened
                        onOpenChange={(open) => {
                            if (!open) {
                                close();
                            }
                        }}
                    >
                        <Popout.Panel
                            width={260}
                            header={{ variant: "title", title: "Expand" }}
                            anchorX={point}
                            anchorY={point}
                            placement="right"
                            alignment="start"
                        >
                            <Popout.Content>
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        const types = splitList(expandWith.types);
                                        close();
                                        session.data
                                            .expand([opened.id], {
                                                depth: expandWith.depth,
                                                direction: expandWith.direction,
                                                limit: expandWith.limit,
                                                ...(types.length === 0 ? {} : { relationshipTypes: types }),
                                            })
                                            .catch(() => {
                                                store.set({ notice: { message: "Not expanded" } });
                                            });
                                    }}
                                >
                                    <ExpandFields value={expandWith} onChange={setExpandWith} />
                                    <div className="sv-actions">
                                        <Button size="xs" type="submit">
                                            Expand
                                        </Button>
                                    </div>
                                </form>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </PopoutManager>
            </>
        );
    }

    const hidden = hiddenNeighbors(session, opened.id);
    return (
        <Menu opened onClose={close} position="bottom-start">
            <Menu.Target>{anchor}</Menu.Target>
            <Menu.Dropdown aria-label="Node">
                {expandableSource(session, opened.id) === undefined ? null : (
                    <Menu.Item
                        closeMenuOnClick={false}
                        rightSection={hidden === null ? null : <span className="sv-badge">+{hidden}</span>}
                        onClick={() => {
                            setOpened({ ...opened, step: "expand" });
                        }}
                    >
                        Expand...
                    </Menu.Item>
                )}
                {collapsible(session, opened.id) ? (
                    <Menu.Item
                        onClick={() => {
                            collapseNode(store, session, opened.id);
                        }}
                    >
                        Collapse
                    </Menu.Item>
                ) : null}
            </Menu.Dropdown>
        </Menu>
    );
}
