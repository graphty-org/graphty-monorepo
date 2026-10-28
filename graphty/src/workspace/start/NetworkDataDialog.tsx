import { FileSource } from "@graphty/compact-mantine";
import { Modal, UnstyledButton } from "@mantine/core";
import type React from "react";

import { GLYPHS } from "../glyphs";

/** The network sources the server form connects to: a badge, the name, and what each is. */
const SOURCES = [
    { badge: "ND", name: "NDEx", what: "Public biology networks" },
    { badge: "N4j", name: "Neo4j", what: "Run a Cypher query" },
    { badge: "API", name: "Web API", what: "JSON results as nodes and edges" },
] as const;

/**
 * Open network data: the network sources, each of which opens the server form, and a web address
 * (or a file from this computer) to open.
 * @param props - Component props
 * @param props.opened - Whether the chooser is open
 * @param props.scheme - The page's color scheme
 * @param props.onClose - Closes it
 * @param props.onOpenLink - Opens the graph file at an address
 * @param props.onOpenFiles - Opens files chosen or dropped on the address row
 * @param props.onOpenServer - Opens the server form
 * @returns The chooser
 */
export function NetworkDataDialog({
    opened,
    scheme,
    onClose,
    onOpenLink,
    onOpenFiles,
    onOpenServer,
}: Readonly<{
    opened: boolean;
    scheme: "light" | "dark";
    onClose: () => void;
    onOpenLink: (url: string) => void;
    onOpenFiles: (files: File[]) => void;
    onOpenServer: () => void;
}>): React.JSX.Element {
    return (
        <Modal.Root opened={opened} onClose={onClose} centered size={520} radius={16} padding={0}>
            <Modal.Overlay color="#0a0c12" backgroundOpacity={0.45} />
            <Modal.Content className="ws-land-net-content">
                <div className="ws-land-net" data-scheme={scheme}>
                    <header>
                        <Modal.Title component="h2">Open network data</Modal.Title>
                        <UnstyledButton className="ws-land-net-x" aria-label="Close" onClick={onClose}>
                            <GLYPHS.close aria-hidden />
                        </UnstyledButton>
                    </header>
                    <div className="ws-land-net-body">
                        <div className="ws-land-net-sources">
                            {SOURCES.map((source) => (
                                <UnstyledButton key={source.name} className="ws-land-net-source" onClick={onOpenServer}>
                                    <span className="ws-land-net-badge" aria-hidden>
                                        {source.badge}
                                    </span>
                                    <b>{source.name}</b>
                                    <small>{source.what}</small>
                                </UnstyledButton>
                            ))}
                        </div>
                        <FileSource
                            variant="row"
                            url
                            multiple
                            placeholder="Web address of a graph file"
                            onUrl={onOpenLink}
                            onFiles={onOpenFiles}
                        />
                    </div>
                </div>
            </Modal.Content>
        </Modal.Root>
    );
}
