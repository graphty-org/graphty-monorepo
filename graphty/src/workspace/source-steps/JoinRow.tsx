import React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { openJoinWorkspace } from "./join";
import { JoinList } from "./JoinList";

/**
 * "Join +" below the data sources (the source-steps experiment), built as "Filter +" is: its "+" opens
 * the join workspace, with its key (Shift+J) shown beside it.
 * @returns the row
 */
export function JoinRow(): React.JSX.Element {
    const { store } = useWorkspace();
    return (
        <JoinList
            rows={[]}
            current={null}
            onSelect={() => undefined}
            onAdd={() => {
                openJoinWorkspace(store);
            }}
        />
    );
}
