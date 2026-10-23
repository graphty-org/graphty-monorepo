import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/**
 * Whether a node size is bound to data: a drawn `node.size` legend block that reads a field.
 * Re-read after every style or project change.
 * @param session - the element's session, or null.
 * @returns true while node sizes encode values a reader compares.
 */
export function useSizeBound(session: GraphSession | null): boolean {
    const [bound, setBound] = useState(false);
    useEffect(() => {
        if (session === null) {
            setBound(false);
            return undefined;
        }
        const read = (): void => {
            setBound(
                session.styles.legend().some((block) => block.channel === "node.size" && block.field !== undefined),
            );
        };
        read();
        // A pass that paints many edits tells each in the same task: read the legend once, after.
        let queued = false;
        let live = true;
        const readSoon = (): void => {
            if (queued) {
                return;
            }
            queued = true;
            queueMicrotask(() => {
                queued = false;
                if (live) {
                    read();
                }
            });
        };
        const offs = [session.on("style:changed", readSoon), session.on("project:changed", readSoon)];
        return () => {
            live = false;
            offs.forEach((off) => {
                off();
            });
        };
    }, [session]);
    return bound;
}
