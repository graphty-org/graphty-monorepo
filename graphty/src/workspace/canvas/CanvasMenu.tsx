import "./canvas.css";

import { ContextMenu } from "@graphty/compact-mantine";
import type { NodeId } from "@graphty/graphty-element/session";
import React, { useRef, useState } from "react";

import { Sections } from "../frame/menus";
import { useSessionVersion } from "../inspector/hooks";
import { resolveInspected } from "../inspector/inspected";
import { MENUS } from "../inspector/kindMenus";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/** What a press on empty canvas offers. */
const EMPTY_CANVAS = ["view.fit", "view.frame-selection", "selection.clear"] as const;

/** How long after Shift+F10 a `contextmenu` event is that key press, not a pointer (ms). */
const KEYBOARD_ECHO_MS = 500;

/**
 * The canvas's context menu: a right-click, a touch-and-hold or Shift+F10 on the graph. Over a
 * node it first selects that node (unless it is already selected), then lists the same commands
 * as the inspector's "..." for what is now selected; over empty canvas it lists Fit, Frame
 * selection and Clear selection. From the keyboard it lists the commands for the selection.
 * @param props - Component props
 * @param props.children - The element the menu opens over
 * @returns The canvas, with the menu attached
 */
export function CanvasMenu({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
    const { session, element } = useWorkspace();
    const inspected = useWorkspaceState((state) => state.inspected);
    // The menu's rows read the selection, which the press changes after the menu opens.
    useSessionVersion(session);
    // The node the menu opened over, or null for empty canvas.
    const [overNode, setOverNode] = useState<NodeId | null>(null);
    const keyAt = useRef(-Infinity);

    const select = (node: NodeId): void => {
        if (session !== null && !session.selection.nodes.includes(node)) {
            void session.selection.apply({ nodes: [node] });
        }
    };

    let ids: readonly string[] = EMPTY_CANVAS;
    if (overNode !== null && session !== null) {
        const { nodes, edges } = session.selection;
        // A neighborhood is the one row kind a node's menu keeps: Grow by one hop acts on it.
        // Until the press's own selection lands, the menu is that one node's.
        const kind = nodes.includes(overNode)
            ? resolveInspected(inspected?.kind === "neighborhood" ? inspected : null, { nodes, edges }).kind
            : "node";
        ids = MENUS[kind] ?? EMPTY_CANVAS;
    }

    return (
        <ContextMenu
            target={
                <div
                    className="ws-canvas-surface"
                    onKeyDown={(event) => {
                        if ((event.shiftKey && event.key === "F10") || event.key === "ContextMenu") {
                            keyAt.current = performance.now();
                            setOverNode(session?.selection.nodes[0] ?? null);
                        }
                    }}
                    onContextMenu={(event) => {
                        // The browser's own contextmenu event for the key press that opened the menu.
                        if (performance.now() - keyAt.current < KEYBOARD_ECHO_MS) {
                            return;
                        }
                        const rect = event.currentTarget.getBoundingClientRect();
                        const hit = element?.elementAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
                        const node = hit?.kind === "node" ? hit.id : null;
                        setOverNode(node);
                        if (node !== null) {
                            select(node);
                        }
                    }}
                >
                    {children}
                </div>
            }
        >
            <Sections sections={[ids]} />
        </ContextMenu>
    );
}
