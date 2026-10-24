import type { AccelerationStatus } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";

/**
 * Where graphty-element's GPU acceleration stands, as the element reports it, kept current from
 * its `graphty-capabilities-change` event.
 * @returns the element's acceleration status, or null before the element has come up.
 */
export function useAccelerationStatus(): AccelerationStatus | null {
    const { element, session } = useWorkspace();
    const [status, setStatus] = useState<AccelerationStatus | null>(() => session?.capabilities.acceleration ?? null);
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        const update = (): void => {
            setStatus(element.session.capabilities.acceleration);
        };
        update();
        element.addEventListener("graphty-capabilities-change", update);
        return () => {
            element.removeEventListener("graphty-capabilities-change", update);
        };
    }, [element]);
    return status;
}
