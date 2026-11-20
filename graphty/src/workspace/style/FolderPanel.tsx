import React from "react";

import { findTreeRow } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import { MultiRowPanel } from "./MultiRowPanel";
import { useStyleVersion } from "./useStyleVersion";

/**
 * A folder's panel: the Style panel acting on every layer in it, through nested folders at every
 * depth (B4, bulk editing). The tree already lists the folder's rows, so the panel does not.
 * @param props - Component props
 * @param props.id - the folder's id
 * @returns The panel
 */
export function FolderPanel({ id }: Readonly<{ id: string }>): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const found = findTreeRow(session.styles.tree(), id);
    // A gone or empty folder has nothing to style; the Style sidebar draws no note (#8739).
    if (found === undefined || found.row.children.length === 0) {
        return null;
    }
    return <MultiRowPanel ids={[id]} />;
}
