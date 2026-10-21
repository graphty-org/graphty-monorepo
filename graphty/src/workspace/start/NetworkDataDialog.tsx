import { Modal, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";

/** The network sources the server form connects to: a badge, the name, and what each is. */
const SOURCES = [
    { badge: "ND", name: "NDEx", what: "Public biology networks" },
    { badge: "N4j", name: "Neo4j", what: "Run a Cypher query" },
    { badge: "API", name: "Web API", what: "JSON results as nodes and edges" },
] as const;

/**
 * Open network data: the network sources, each of which opens the server form, and Open from a
 * link, which opens a graph file at a web address.
 * @param props - Component props
 * @param props.opened - Whether the chooser is open
 * @param props.scheme - The page's color scheme
 * @param props.onClose - Closes it
 * @param props.onOpenLink - Opens the graph file at an address
 * @param props.onOpenServer - Opens the server form
 * @returns The chooser
 */
export function NetworkDataDialog({
    opened,
    scheme,
    onClose,
    onOpenLink,
    onOpenServer,
}: Readonly<{
    opened: boolean;
    scheme: "light" | "dark";
    onClose: () => void;
    onOpenLink: (url: string) => void;
    onOpenServer: () => void;
}>): React.JSX.Element {
    const [address, setAddress] = useState("");
    const [said, setSaid] = useState<string | null>(null);
    const trimmed = address.trim();
    const valid = trimmed !== "" && URL.canParse(trimmed, globalThis.location.href);

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
                        {said === null ? null : <output className="ws-land-net-note">{said}</output>}
                        <form
                            className="ws-land-net-addr"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (valid) {
                                    onOpenLink(new URL(trimmed, globalThis.location.href).href);
                                } else {
                                    setSaid("Paste the web address of a graph file first.");
                                }
                            }}
                        >
                            <label className="ws-land-net-field">
                                <GLYPHS.webAddress aria-hidden />
                                <input
                                    type="url"
                                    placeholder="Or paste a web address"
                                    aria-label="Web address of a graph file"
                                    value={address}
                                    onChange={(event) => {
                                        setAddress(event.currentTarget.value);
                                    }}
                                />
                            </label>
                            <button type="submit" className="ws-land-net-open">
                                Open
                            </button>
                        </form>
                    </div>
                </div>
            </Modal.Content>
        </Modal.Root>
    );
}
