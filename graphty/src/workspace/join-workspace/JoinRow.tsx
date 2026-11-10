import type { LoadedSource } from "@graphty/graphty-element/session";
import { Button } from "@mantine/core";
import React from "react";

import { joinWorkspaceOn } from "../features";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";

/**
 * The Sources tab's Join + row, above the per-source sections (the `join-workspace` experiment):
 * shown with two or more sources, joins included, so joins already made can be edited again; it
 * opens an empty join workspace.
 * @param props - Component props
 * @param props.sources - `data.sources()`.
 * @returns the row, or null.
 */
export function JoinRow({ sources }: Readonly<{ sources: readonly LoadedSource[] }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    if (!joinWorkspaceOn(session) || sources.length < 2) {
        return null;
    }
    return (
        <div className="jw-row">
            <Button
                size="compact-xs"
                variant="subtle"
                leftSection={<GLYPHS.join size={14} aria-hidden />}
                rightSection={<GLYPHS.add size={14} aria-hidden />}
                onClick={() => {
                    store.set({ joinWorkspace: { held: [] } });
                }}
            >
                Join
            </Button>
        </div>
    );
}
