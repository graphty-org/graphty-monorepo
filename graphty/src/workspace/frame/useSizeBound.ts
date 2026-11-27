import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useRef, useState } from "react";

import { useWorkspaceState } from "../state/WorkspaceContext";

/**
 * Whether a node size is bound to data: a drawn `node.size` legend block that reads a field.
 * Re-read after every style or project change, except while the selection workspace is open:
 * picking which nodes a layer holds changes no binding, and the legend read cost a third of a
 * second per edit on 50,000 nodes (ws-polish 2). It is read again when the workspace closes, and
 * under a workspace that was open before the work was in (one a reload brought back) until it is.
 * @param session - the element's session, or null.
 * @returns true while node sizes encode values a reader compares.
 */
export function useSizeBound(session: GraphSession | null): boolean {
    // on reload: fresh: read: read from graphty-element's legend
    const [bound, setBound] = useState(false);
    const paused = useWorkspaceState((state) => state.selectionWorkspace !== null);
    // Read with a legend in it: a workspace a reload brought back open (issue #9655) opens before
    // the work is in, so it is read until the legend is there, then paused as under any open workspace.
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
            if (paused && readOpen.current) {
                return;
            }
            const legend = session.styles.legend();
            readOpen.current ||= legend.length > 0;
            setBound(legend.some((block) => block.channel === "node.size" && block.field !== undefined));
        };
        read();
        // Once per repaint, however many edits it carried; a data edit once the pass has prepared it.
        const offs = [
            session.on("style:batch-changed", read, { afterFrame: true }),
            session.on("project:derived", read, { afterFrame: true }),
        ];
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session, paused]);
    return bound;
}
