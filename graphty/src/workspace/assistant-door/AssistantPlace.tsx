import React, { Suspense, useEffect } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { assistantOn } from "./commands";

const AssistantPanel = React.lazy(() => import("../assistant/AssistantPanel"));

/**
 * The Assistant place: its panel while the element has the experiment on, nothing until the element
 * reports, and the Graph place when it reports off (a tab reloaded without `?features=assistant`
 * keeps this place in session storage).
 * @returns The panel, or nothing
 */
export function AssistantPlace(): React.JSX.Element | null {
    const { element, store } = useWorkspace();
    const on = assistantOn(element);
    useEffect(() => {
        if (on === false) {
            store.set({ place: "graph" });
        }
    }, [on, store]);
    return on === true ? (
        <Suspense fallback={null}>
            <AssistantPanel />
        </Suspense>
    ) : null;
}
