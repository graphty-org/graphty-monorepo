import { Popout, PopoutManager } from "@graphty/compact-mantine";
import type { NodeId } from "@graphty/graphty-element/session";
import { Button } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { EXPAND_DEFAULTS, EXPAND_DIALOG, type ServerFormState, splitList } from "./commands";
import { ExpandFields } from "./ServerForm";

/** Where the rows are open: the node, and its point in the window. */
interface Opened {
    readonly id: NodeId;
    readonly x: number;
    readonly y: number;
}

/**
 * Expand's rows for a node a server load brought (spec section 3.9): depth, direction, edge types
 * and limit, beside the node. The node's Expand... (the canvas menu, the inspector's "..." and
 * Quick actions, command `node.expand`) opens them for the selected node; Collapse is a command too.
 * @returns the rows, drawn only while open.
 */
export function NodeMenu(): React.JSX.Element | null {
    const { element, session, store } = useWorkspace();
    const dialog = useWorkspaceState((state) => state.dialog);
    const [opened, setOpened] = useState<Opened | null>(null);
    const [expandWith, setExpandWith] = useState<ServerFormState["expandWith"]>(EXPAND_DEFAULTS);
    const point = useRef<HTMLSpanElement>(null);

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
        });
    }, [dialog, element, session, store]);

    if (opened === null || session === null) {
        return null;
    }
    const close = (): void => {
        setOpened(null);
    };

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
                        closeLabel="Close Expand"
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
