import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

/**
 * Re-renders on every visibility or data change.
 * @param session - the element's session, or null.
 * @returns a number that changes with each.
 */
export function useVisibilityVersion(session: GraphSession | null): number {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        const bump = (): void => {
            setVersion((v) => v + 1);
        };
        const offs = [session.on("visibility:changed", bump), session.on("project:changed", bump)];
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session]);
    return version;
}
