import { Button, Text, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import type { Side } from "../style/cards";

/** The line's words per kind (the owner, 2026-11-23). */
const WORDS: Readonly<Record<Side, string>> = { node: "Select nodes...", edge: "Select edges..." };

/** How many the line's selection holds: drawn short ("All", "11 of 77"), said in full. */
export interface OpenLineCount {
    readonly short: string;
    readonly full: string;
}

/**
 * A style layer's Which nodes / Which edges at rest in the Style panel: one line, "Select nodes..."
 * and the open-in-new-window icon, that opens the selection's workspace, where the nodes or edges
 * the layer styles are picked (issue #6810). With a count (Style panel v2) the line also shows how
 * many it holds, so it is never empty.
 * @param props - Component props
 * @param props.side - nodes or edges
 * @param props.count - how many it holds (v2); left out, no count is drawn
 * @param props.onOpen - opens the workspace
 * @param props.children - anything kept on the line after it (a waiting step's Run)
 * @returns The line
 */
export function StyleOpenLine({
    side,
    count,
    onOpen,
    children,
}: Readonly<{ side: Side; count?: OpenLineCount; onOpen: () => void; children?: React.ReactNode }>): React.JSX.Element {
    const icon = <GLYPHS.openExternal size={14} aria-hidden />;
    const button = (
        <Button
            size="compact-sm"
            variant="subtle"
            color="gray"
            fullWidth
            justify="space-between"
            data-edit=""
            data-side={side}
            aria-label={count === undefined ? undefined : `${WORDS[side]} ${count.full}`}
            rightSection={
                count === undefined ? (
                    icon
                ) : (
                    <>
                        <Text span size="xs" c="dimmed" data-count="" mr={4}>
                            {count.short}
                        </Text>
                        {icon}
                    </>
                )
            }
            onClick={onOpen}
        >
            {WORDS[side]}
        </Button>
    );
    return (
        <div className="sel-open-line">
            {count === undefined ? (
                button
            ) : (
                <Tooltip label={`${WORDS[side]} ${count.full}`} position="bottom-start">
                    {button}
                </Tooltip>
            )}
            {children}
        </div>
    );
}
