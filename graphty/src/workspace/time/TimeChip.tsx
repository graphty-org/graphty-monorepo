import { ActionIcon, Button, Group, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { focusBrush, reportTimeError, unitOf } from "./timeActions";
import { windowWords } from "./timeWords";
import { useTimeVersion } from "./useTimeVersion";

/**
 * The header's time chip, beside the filter chip, while a time window is on: what the canvas is
 * limited to ("Mar 10, 2025 - Mar 16, 2025"). A click puts focus on the dock's brush; its x shows
 * all time again. Its width is fixed and its figures tabular, so the chips after it stay put while
 * time plays.
 * @returns the chip, or nothing.
 */
export function TimeChip(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useTimeVersion(session);
    const window = session?.time.current ?? null;
    if (session === null || window === null || session.time.field === null) {
        return null;
    }
    const words = windowWords(window, unitOf(session));
    return (
        <Group gap={0} wrap="nowrap" className="tl-chip">
            <Tooltip label={`Time: ${words}`}>
                <Button
                    variant="subtle"
                    size="compact-xs"
                    className="tl-chip-words"
                    aria-label={`Time: ${words}`}
                    leftSection={<GLYPHS.time size={12} aria-hidden />}
                    onClick={focusBrush}
                >
                    {words}
                </Button>
            </Tooltip>
            <Tooltip label="Clear the time window">
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label="Clear the time window"
                    onClick={() => {
                        session.time.pause();
                        session.time.window(null).then(() => undefined, reportTimeError(store));
                    }}
                >
                    <GLYPHS.close size={12} aria-hidden />
                </ActionIcon>
            </Tooltip>
        </Group>
    );
}
