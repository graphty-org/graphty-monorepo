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
        // Once per repaint, however many edits it carried.
        const offs = [session.on("style:batch-changed", read), session.on("project:changed", read)];
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session]);
    return bound;
}
