import { Button, Group, Paper, Text } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { discardRecovered, restoreRecovered } from "./autosave";
import { recoveredSentence } from "./words";

/**
 * The start screen's offer of work kept from an earlier visit: Restore opens it again, Discard
 * deletes it. Drawn only while there is such work.
 * @returns The offer, or nothing
 */
export function RecoveredWork(): React.JSX.Element | null {
    const { store } = useWorkspace();
    const entry = useWorkspaceState((state) => state.recovered);
    if (entry === null) {
        return null;
    }
    return (
        <Paper component="section" withBorder p="sm" className="ws-start-recovered" aria-label="Unsaved work">
            <Group gap="sm" wrap="nowrap" justify="space-between">
                <div>
                    <Text size="sm" fw={600}>
                        <GLYPHS.recovered size={14} aria-hidden /> Unsaved work from your last visit
                    </Text>
                    <Text size="xs" c="dimmed">
                        {recoveredSentence(entry)}
                    </Text>
                </div>
                <Group gap="xs" wrap="nowrap">
                    <Button
                        size="compact-sm"
                        onClick={() => {
                            restoreRecovered(store, entry);
                        }}
                    >
                        Restore
                    </Button>
                    <Button
                        size="compact-sm"
                        variant="subtle"
                        onClick={() => {
                            void discardRecovered(store, entry);
                        }}
                    >
                        Discard
                    </Button>
                </Group>
            </Group>
        </Paper>
    );
}
