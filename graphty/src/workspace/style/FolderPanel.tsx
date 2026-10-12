import { ToggleIconButton } from "@graphty/compact-mantine";
import { Group, Stack, UnstyledButton } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { orNotice } from "../graph-place/actions";
import { findTreeRow } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import { SelectionColors } from "./SelectionColors";
import { StateLine } from "./StylePanel";
import { useStyleVersion } from "./useStyleVersion";

/**
 * A folder's panel (tier3 design, section 2.2): a folder paints nothing, so it shows its rows in
 * paint order, top first, each with its eye and opening itself on a click, then the Selection
 * colors of everything in it.
 * @param props - Component props
 * @param props.id - the folder's id
 * @returns The panel
 */
export function FolderPanel({ id }: Readonly<{ id: string }>): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    useStyleVersion(session, element);
    if (session === null) {
        return null;
    }
    const found = findTreeRow(session.styles.tree(), id);
    if (found === undefined) {
        return <StateLine>This row is gone</StateLine>;
    }
    const rows = [...found.row.children].reverse();
    return (
        <Stack gap={0}>
            {rows.length === 0 ? (
                <StateLine>Empty: drag rows onto the folder to put them in it</StateLine>
            ) : (
                <Stack gap={0} py={4} role="list" aria-label={`In ${found.row.name}`}>
                    {rows.map((row) => {
                        const Glyph = row.kind === "folder" ? GLYPHS.folder : GLYPHS.layer;
                        return (
                            <Group key={row.id} role="listitem" gap={0} wrap="nowrap" pr={8}>
                                <UnstyledButton
                                    className="ws-style-tree-foot-row cm-focus-inside"
                                    style={{ flex: 1, opacity: row.hidden ? 0.5 : undefined }}
                                    onClick={() => {
                                        store.set({
                                            inspected: {
                                                kind: row.kind === "folder" ? "folder-row" : "layer-row",
                                                id: row.id,
                                            },
                                        });
                                    }}
                                >
                                    <Glyph size={14} aria-hidden /> {row.name}
                                </UnstyledButton>
                                <ToggleIconButton
                                    variant="swap"
                                    label={`Hide ${row.name}`}
                                    checked={row.hidden}
                                    icon={<GLYPHS.show size={14} />}
                                    checkedIcon={<GLYPHS.hide size={14} />}
                                    onChange={(hide) => {
                                        void orNotice(store, `hide ${row.name}`, session.styles.hideRow(row.id, hide));
                                    }}
                                />
                            </Group>
                        );
                    })}
                </Stack>
            )}
            <SelectionColors rowIds={[id]} />
        </Stack>
    );
}
