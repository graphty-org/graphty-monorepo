import { Button } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import type { Side } from "../style/cards";

/** The line's words per kind (the owner, 2026-11-11). */
const WORDS: Readonly<Record<Side, string>> = { node: "Style Nodes...", edge: "Style Edges..." };

/**
 * A style layer's Which nodes / Which edges at rest in the Style panel: one line, "Style Nodes..."
 * and the open-in-new-window icon, that opens the selection's workspace, where the nodes or edges
 * the layer styles are picked (issue #6810).
 * @param props - Component props
 * @param props.side - nodes or edges
 * @param props.onOpen - opens the workspace
 * @param props.children - anything kept on the line after it (a waiting step's Run)
 * @returns The line
 */
export function StyleOpenLine({
    side,
    onOpen,
    children,
}: Readonly<{ side: Side; onOpen: () => void; children?: React.ReactNode }>): React.JSX.Element {
    return (
        <div className="sel-open-line">
            <Button
                size="compact-sm"
                variant="subtle"
                color="gray"
                fullWidth
                justify="space-between"
                data-edit=""
                data-side={side}
                rightSection={<GLYPHS.openExternal size={14} aria-hidden />}
                onClick={onOpen}
            >
                {WORDS[side]}
            </Button>
            {children}
        </div>
    );
}
