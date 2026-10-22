import { Button, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { unitOf } from "./timeActions";
import { windowWords } from "./timeWords";
import { useTimeVersion } from "./useTimeVersion";

/**
 * The header's time chip, beside the filter chip, while a time window is on: what the canvas is
 * limited to ("Mar 10, 2025 - Mar 16, 2025"). It opens the Data place, where the Time section is.
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
        <Tooltip label="Time window">
            <Button
                variant="subtle"
                size="compact-xs"
                aria-label={`Time: ${words}`}
                leftSection={<GLYPHS.time size={12} aria-hidden />}
                onClick={() => {
                    store.set({ page: "panels", place: "data" });
                }}
            >
                {words}
            </Button>
        </Tooltip>
    );
}
