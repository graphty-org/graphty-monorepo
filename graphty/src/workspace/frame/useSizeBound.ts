import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useRef, useState } from "react";

import { useWorkspaceState } from "../state/WorkspaceContext";

/**
 * Whether a node size is bound to data: a drawn `node.size` legend block that reads a field.
 * Re-read after every style or project change, except while the selection workspace is open:
 * picking which nodes a layer holds changes no binding, and the legend read cost a third of a
 * second per edit on 50,000 nodes (ws-polish 2). It is read again when the workspace closes, and
 * under a workspace that was open before any reading (one a reload brought back).
 * @param session - the element's session, or null.
 * @returns true while node sizes encode values a reader compares.
 */
export function useSizeBound(session: GraphSession | null): boolean {
    const [bound, setBound] = useState(false);
    const paused = useWorkspaceState((state) => state.selectionWorkspace !== null);
    // Read with no workspace open yet: a workspace a reload brought back open (issue #9655) has no
    // earlier reading to keep, so it is read under it until the workspace first closes.
    const readOpen = useRef(false);
    useEffect(() => {
        if (paused && readOpen.current) {
            return undefined;
        }
        if (session === null) {
            setBound(false);
            return undefined;
        }
        const read = (): void => {
            readOpen.current ||= !paused && session.data.statistics().nodeCount > 0;
            setBound(
                session.styles.legend().some((block) => block.channel === "node.size" && block.field !== undefined),
            );
        };
        read();
        // Once per repaint, however many edits it carried; a data edit once the pass has prepared it.
        const offs = [session.on("style:batch-changed", read), session.on("project:derived", read)];
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session, paused]);
    return bound;
}
