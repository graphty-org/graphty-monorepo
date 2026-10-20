import "../data-place/data-place.css";

import type { SourceKey } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { Fields } from "../data-place/Fields";
import { Sources } from "../data-place/Sources";
import { useWorkspace } from "../state/WorkspaceContext";
import { IssuesList } from "./IssuesList";

/**
 * The maximized table's configuration column (spec section 3.5): the same Sources and Fields the
 * Data place shows, then the flat Issues list. The selected source is the reader's pick, the
 * newest load until they pick one.
 * @returns the column
 */
export function MaximizedPanel(): React.JSX.Element {
    const { session } = useWorkspace();
    const [picked, setPicked] = useState<SourceKey | undefined>(undefined);
    const sources = session?.data.sources() ?? [];
    const selected = sources.find((each) => each.key === picked) ?? sources.at(-1);
    return (
        <aside className="ws-table-config" aria-label="Table configuration">
            <Sources sources={sources} selected={selected?.key} onSelect={setPicked} />
            <Fields source={selected} />
            <IssuesList />
        </aside>
    );
}
