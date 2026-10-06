import { ModalFooter, ShortcutSheet } from "@graphty/compact-mantine";
import { Button, Modal, Stack, Text } from "@mantine/core";
import type React from "react";

import { formatKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { readBuildStamp } from "./buildStamp";

/**
 * Help > About: what the app is and which build this is (the build stamp).
 * @returns The dialog, open while the workspace dialog is "about"
 */
function AboutDialog(): React.JSX.Element {
    const { store } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "about");
    const stamp = readBuildStamp();
    const close = (): void => {
        store.set({ dialog: null });
    };
    return (
        <Modal opened={opened} onClose={close} title="About graphty">
            <Stack gap="xs">
                <Text size="sm">Graph visualization in your browser. Files are read on this computer.</Text>
                <Text size="sm" data-testid="build-stamp">
                    {stamp === null ? "Build: not stamped" : `Build ${stamp.commit}, release ${stamp.release}`}
                </Text>
            </Stack>
            <ModalFooter>
                <Button onClick={close}>Close</Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * Keyboard shortcuts: every built command that has a key, by its Quick actions home, on
 * compact-mantine's sheet docked at the window's foot.
 * @returns The sheet while the workspace dialog is "shortcuts", else nothing
 */
function ShortcutsDialog(): React.JSX.Element | null {
    const { store, registry } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "shortcuts");
    const close = (): void => {
        store.set({ dialog: null });
    };
    const groups = new Map<string, { label: string; keys: string[] }[]>();
    for (const command of registry.live) {
        if (command.keys !== undefined && command.keys.length > 0) {
            const rows = groups.get(command.group) ?? [];
            rows.push({ label: command.label, keys: command.keys.map(formatKey) });
            groups.set(command.group, rows);
        }
    }
    if (!opened) {
        return null;
    }
    return (
        <ShortcutSheet
            className="ws-shortcut-sheet"
            onClose={close}
            tabs={[
                {
                    value: "all",
                    label: "All",
                    groups: [...groups].map(([title, shortcuts]) => ({ title, shortcuts })),
                },
            ]}
        />
    );
}

/**
 * The Frame's own dialogs: About and Keyboard shortcuts.
 * @returns The dialogs
 */
export function HelpDialogs(): React.JSX.Element {
    return (
        <>
            <AboutDialog />
            <ShortcutsDialog />
        </>
    );
}
