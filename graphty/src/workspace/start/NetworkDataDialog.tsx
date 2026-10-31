import { FileSource } from "@graphty/compact-mantine";
import { Button, Kbd, Modal, Text, UnstyledButton, useComputedColorScheme } from "@mantine/core";
import type React from "react";

import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey } from "../keys/keys";
import { openServerForm } from "../server/commands";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { addUrl, openFiles } from "./open";

/** The workspace dialog id of Open network data. */
export const NETWORK_DIALOG = "network";

/**
 * The network sources the server form connects to: a badge, the name, what each is, and the
 * source the form opens on.
 */
const SOURCES = [
    { badge: "ND", name: "NDEx", what: "Public biology networks", kind: "ndex" },
    { badge: "N4j", name: "Neo4j", what: "Run a Cypher query", kind: "neo4j" },
    { badge: "API", name: "Web API", what: "JSON results as nodes and edges", kind: "rest" },
] as const;

/**
 * Open network data, the one door to data on the network: the start screen's "Open network data"
 * and the Sources "+" item Network data... both open it. Each network source opens the server
 * form on that source; a web address (or a file from this computer) is taken in as the start
 * screen's new project, or as the open project's next source. Open a file, with its key, is there
 * for a reader who came here with a file on this computer.
 * @returns The chooser, open while the workspace dialog is "network"
 */
export function NetworkDataDialog(): React.JSX.Element {
    const ctx = useWorkspace();
    const scheme = useComputedColorScheme("dark");
    const openDoor = useCommand("file.open");
    const openFileKey = openDoor?.command.keys?.[0];
    const opened = useWorkspaceState((state) => state.dialog === NETWORK_DIALOG);
    const close = (): void => {
        ctx.store.set((state) => (state.dialog === NETWORK_DIALOG ? { dialog: null } : {}));
    };
    return (
        <Modal.Root opened={opened} onClose={close} centered size={520} radius={16} padding={0}>
            <Modal.Overlay color="#0a0c12" backgroundOpacity={0.45} />
            <Modal.Content className="ws-land-net-content">
                <div className="ws-land-net" data-scheme={scheme}>
                    <header>
                        <Modal.Title component="h2">Open network data</Modal.Title>
                        <UnstyledButton className="ws-land-net-x" aria-label="Close" onClick={close}>
                            <GLYPHS.close aria-hidden />
                        </UnstyledButton>
                    </header>
                    <div className="ws-land-net-body">
                        <div className="ws-land-net-sources">
                            {SOURCES.map((source) => (
                                <UnstyledButton
                                    key={source.name}
                                    className="ws-land-net-source"
                                    onClick={() => {
                                        close();
                                        openServerForm(ctx.store, source.kind);
                                    }}
                                >
                                    <span className="ws-land-net-badge" aria-hidden>
                                        {source.badge}
                                    </span>
                                    <b>{source.name}</b>
                                    <small>{source.what}</small>
                                </UnstyledButton>
                            ))}
                        </div>
                        {/* The field's accessible name starts with these words (WCAG 2.5.3). */}
                        <Text size="sm" fw={500} aria-hidden>
                            Web address
                        </Text>
                        <FileSource
                            variant="row"
                            url
                            multiple
                            placeholder="Web address of a graph file"
                            openLabel="Open"
                            onUrl={(url) => {
                                close();
                                addUrl(ctx, url);
                            }}
                            onFiles={(files) => {
                                close();
                                openFiles(ctx, files);
                            }}
                        />
                        <Button
                            variant="default"
                            leftSection={<GLYPHS.openFile size={16} aria-hidden />}
                            rightSection={openFileKey === undefined ? undefined : <Kbd>{formatKey(openFileKey)}</Kbd>}
                            aria-keyshortcuts={openFileKey === undefined ? undefined : ariaKey(openFileKey)}
                            onClick={() => {
                                close();
                                openDoor?.run();
                            }}
                        >
                            Open a file
                        </Button>
                    </div>
                </div>
            </Modal.Content>
        </Modal.Root>
    );
}
