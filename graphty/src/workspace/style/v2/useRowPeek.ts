/**
 * A Style panel v2 row's hover highlight (design/ui/style-panel-v2/design.md, section 2.4): while the
 * pointer is over a row, graphty-element's transient peek shows the elements its layer styles; leaving the
 * row clears it. Nothing is saved or undone.
 */

import { useEffect, useRef } from "react";

import { useWorkspaceState } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";

/**
 * The row element's pointer handlers: see the file header. Off while the reader's "Highlight on hover"
 * setting is off, and for several rows edited together or a row with no layer yet.
 * @param ctx - the row.
 * @returns the handlers.
 */
export function useRowPeek(ctx: RowContext): {
    readonly onMouseEnter: () => void;
    readonly onMouseLeave: () => void;
} {
    const on = useWorkspaceState((state) => state.styleHoverHighlight);
    const peeking = useRef(false);
    const { session } = ctx;
    const layer = ctx.many === undefined ? [...ctx.layers].reverse().find((each) => !each.locked) : undefined;
    // A row that goes away under the pointer takes its highlight with it.
    useEffect(
        () => () => {
            if (peeking.current) {
                peeking.current = false;
                session.selection.peek(null).catch(() => undefined);
            }
        },
        [session],
    );
    return {
        onMouseEnter: () => {
            if (on && layer !== undefined) {
                peeking.current = true;
                session.selection.peek({ layer: layer.id }).catch(() => undefined);
            }
        },
        onMouseLeave: () => {
            if (peeking.current) {
                peeking.current = false;
                session.selection.peek(null).catch(() => undefined);
            }
        },
    };
}
