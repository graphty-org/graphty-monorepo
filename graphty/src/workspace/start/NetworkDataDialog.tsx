import { Modal, UnstyledButton } from "@mantine/core";
import { Link, X } from "lucide-react";
import React, { useState } from "react";

/** The network sources being built (issue #2907): a badge, the name, and what each is. */
const SOURCES = [
    { badge: "ND", name: "NDEx", what: "Public biology networks" },
    { badge: "N4j", name: "Neo4j", what: "Run a Cypher query" },
    { badge: "API", name: "Web API", what: "JSON results as nodes and edges" },
] as const;

/**
 * Open network data: the sources that are on the way, and, for now, Open from a link, which opens
 * a graph file at a web address.
 * @param props - Component props
 * @param props.opened - Whether the chooser is open
 * @param props.scheme - The page's color scheme
 * @param props.onClose - Closes it
 * @param props.onOpenLink - Opens the graph file at an address
 * @returns The chooser
 */
export function NetworkDataDialog({
    opened,
    scheme,
    onClose,
    onOpenLink,
}: Readonly<{
    opened: boolean;
    scheme: "light" | "dark";
    onClose: () => void;
    onOpenLink: (url: string) => void;
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
                            <X aria-hidden />
                        </UnstyledButton>
                    </header>
                    <div className="ws-land-net-body">
                        <p className="ws-land-net-note">
                            Connecting to these sources is on the way. For now, open a graph file from a link.
                        </p>
                        <div className="ws-land-net-sources">
                            {SOURCES.map((source) => (
                                <UnstyledButton
                                    key={source.name}
                                    className="ws-land-net-source"
                                    onClick={() => {
                                        setSaid(
                                            `${source.name} is on the way. For now, paste the web address of a graph file.`,
                                        );
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
                        {said === null ? null : (
                            <p className="ws-land-net-note" role="status">
                                {said}
                            </p>
                        )}
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
                                <Link aria-hidden />
                                <input
                                    type="url"
                                    placeholder="Or paste a web address"
                                    aria-label="Web address of a graph file"
                                    value={address}
                                    onChange={(event) => {
                                        setAddress(event.currentTarget.value);
                                    }}
                                    data-autofocus
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
