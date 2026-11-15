import React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { IssuesList } from "./IssuesList";

/**
 * The maximized table's configuration column (spec section 3.5): the Issues list. Sources, Fields
 * and Filters are the Data place's, in the left panel beside it, so each shows once. Nothing when
 * the data has no issues, open, ignored or fixed.
 * @returns the column, or null
 */
export function MaximizedPanel(): React.JSX.Element | null {
    const { session } = useWorkspace();
    if (session === null || session.data.issues({ includeIgnored: true, includeFixed: true }).length === 0) {
        return null;
    }
    return (
        <aside className="ws-table-config" aria-label="Table configuration">
            <IssuesList />
        </aside>
    );
}
