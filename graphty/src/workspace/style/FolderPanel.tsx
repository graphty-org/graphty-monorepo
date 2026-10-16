import React from "react";

import { findTreeRow } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import { MultiRowPanel } from "./MultiRowPanel";
import { StateLine } from "./StylePanel";
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
    if (found === undefined) {
        return <StateLine>This row is gone</StateLine>;
    }
    if (found.row.children.length === 0) {
        return <StateLine>Empty: drag rows onto the folder to put them in it</StateLine>;
    }
    return <MultiRowPanel ids={[id]} />;
}
