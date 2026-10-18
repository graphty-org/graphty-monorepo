import { ModalFooter, PageList } from "@graphty/compact-mantine";
import { Button, Kbd, Modal, Stack, Text, Title } from "@mantine/core";
import React, { useState } from "react";

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
 * Keyboard shortcuts: every built command that has a key, in a centered two-column dialog like
 * Settings -- "All" plus one entry per command group on the left, that group's rows on the right.
 * @returns The dialog, open while the workspace dialog is "shortcuts"
 */
function ShortcutsDialog(): React.JSX.Element {
    const { store, registry } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "shortcuts");
    const [current, setCurrent] = useState("all");
    const close = (): void => {
        store.set({ dialog: null });
    };
    const groups = new Map<string, { label: string; keys: string[] }[]>();
    for (const command of registry.live) {
        const keys = [...(command.keys ?? []), ...(command.rowKeys ?? [])];
        if (keys.length > 0) {
            const rows = groups.get(command.group) ?? [];
            rows.push({ label: command.label, keys: keys.map(formatKey) });
            groups.set(command.group, rows);
        }
    }
    const shown = current === "all" ? [...groups] : [...groups].filter(([group]) => group === current);
    const title = current === "all" ? "All" : current;
    return (
        <Modal opened={opened} onClose={close} title="Keyboard shortcuts" size="lg">
            <div className="ws-dialog-columns">
                <PageList
                    label="Shortcut groups"
                    items={[
                        { id: "all", name: "All" },
                        ...[...groups.keys()].map((group) => ({ id: group, name: group })),
                    ]}
                    current={current}
                    onCurrentChange={setCurrent}
                />
                <section className="ws-dialog-page ws-shortcuts" aria-label={title}>
                    {shown.map(([group, rows]) => (
                        <div key={group}>
                            <Title order={2} size="sm" mb={4}>
                                {group}
                            </Title>
                            {rows.map((row) => (
                                <div className="ws-shortcut-row" key={`${row.label} ${row.keys.join(" ")}`}>
                                    <Text size="sm">{row.label}</Text>
                                    <span>
                                        {row.keys.map((key) => (
                                            <Kbd key={key}>{key}</Kbd>
                                        ))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </section>
            </div>
            <ModalFooter>
                <Button onClick={close}>Done</Button>
            </ModalFooter>
        </Modal>
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
