import { FileSource } from "@graphty/compact-mantine";
import { Modal, UnstyledButton, useComputedColorScheme } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { NETWORK_DIALOG, openServerForm, serverKinds } from "../server/commands";
import { kindName } from "../server/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import NETWORK_SAMPLES from "./network-samples.json";
import { addUrl, openFiles } from "./open";

/** The badge on each kind of network's card, and what the kind is. */
const CARD_WORDS: Readonly<Record<string, { readonly badge: string; readonly what: string }>> = {
    ndex: { badge: "ND", what: "Public biology networks" },
    neo4j: { badge: "N4j", what: "Run a Cypher query" },
    sparql: { badge: "SP", what: "Run a SPARQL query" },
    rest: { badge: "API", what: "JSON results as nodes and edges" },
};

/**
 * Open network data, the door to data on the network from the start page and from the Sources "+"
 * (Network data...): one card for each kind of network the start page has a sample of, and a Web
 * address card that shows the address field. From the start page a kind's card opens the app on an
 * empty project with the network form popped up on that kind, and a web address opens as a new
 * project; in a project a web address is added as a source, the way Paste of an address is.
 * @returns The chooser, open while the workspace dialog is "network"
 */
export function NetworkDataDialog(): React.JSX.Element {
    const ctx = useWorkspace();
    const { store } = ctx;
    const [address, setAddress] = useState(false);
    const addressRow = useRef<HTMLDivElement>(null);
    const scheme = useComputedColorScheme("dark");
    const opened = useWorkspaceState((state) => state.dialog === NETWORK_DIALOG);
    useEffect(() => {
        if (!opened) {
            setAddress(false);
        }
    }, [opened]);
    useEffect(() => {
        if (address) {
            addressRow.current?.querySelector("input")?.focus();
        }
    }, [address]);
    const close = (): void => {
        store.set((state) => (state.dialog === NETWORK_DIALOG ? { dialog: null } : {}));
    };
    const cards = NETWORK_SAMPLES.flatMap(({ source }) => {
        const entry = serverKinds().find((each) => each.id === source);
        const words = CARD_WORDS[source];
        return entry === undefined || words === undefined ? [] : [{ source, name: kindName(entry), ...words }];
    });
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
                            {cards.map((card) => (
                                <UnstyledButton
                                    key={card.source}
                                    className="ws-land-net-source"
                                    onClick={() => {
                                        close();
                                        openServerForm(store, card.source);
                                    }}
                                >
                                    <span className="ws-land-net-badge" aria-hidden>
                                        {card.badge}
                                    </span>
                                    <b>{card.name}</b>
                                    <small>{card.what}</small>
                                </UnstyledButton>
                            ))}
                            <UnstyledButton
                                className="ws-land-net-source"
                                aria-expanded={address}
                                onClick={() => {
                                    setAddress(true);
                                }}
                            >
                                <span className="ws-land-net-badge" aria-hidden>
                                    URL
                                </span>
                                <b>Web address</b>
                                <small>A graph file on the web</small>
                            </UnstyledButton>
                        </div>
                        {address ? (
                            <div ref={addressRow}>
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
                            </div>
                        ) : null}
                    </div>
                </div>
            </Modal.Content>
        </Modal.Root>
    );
}
