import { Modal, UnstyledButton, useComputedColorScheme } from "@mantine/core";
import type React from "react";

import { GLYPHS } from "../glyphs";
import { openServerForm, serverKinds } from "../server/commands";
import { kindName } from "../server/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import NETWORK_SAMPLES from "./network-samples.json";

/** The workspace dialog id of Open network data. */
export const NETWORK_DIALOG = "network";

/** The badge on each kind of network's card, and what the kind is. */
const CARD_WORDS: Readonly<Record<string, { readonly badge: string; readonly what: string }>> = {
    ndex: { badge: "ND", what: "Public biology networks" },
    neo4j: { badge: "N4j", what: "Run a Cypher query" },
    sparql: { badge: "SP", what: "Run a SPARQL query" },
    rest: { badge: "API", what: "JSON results as nodes and edges" },
};

/**
 * Open network data, the start page's door to data on the network: one card for each kind of
 * network the start page has a sample of. A card opens the app on an empty project with the
 * network form popped up on that kind.
 * @returns The chooser, open while the workspace dialog is "network"
 */
export function NetworkDataDialog(): React.JSX.Element {
    const { store } = useWorkspace();
    const scheme = useComputedColorScheme("dark");
    const opened = useWorkspaceState((state) => state.dialog === NETWORK_DIALOG);
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
                        </div>
                    </div>
                </div>
            </Modal.Content>
        </Modal.Root>
    );
}
