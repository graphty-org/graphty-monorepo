import { ResultRow, SearchInput } from "@graphty/compact-mantine";
import type { FindContainsRow, FindValueRow } from "@graphty/graphty-element";
import type { GraphSession, Layer, LayerId } from "@graphty/graphty-element/session";
import { Stack, Text } from "@mantine/core";
import React, { useId, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { attributeName } from "./words";

/** One offer of the find field: a live rule, or the fixed list of what it holds now. */
interface Offer {
    /** What the row says. */
    readonly words: string;
    /** The selector picking it gives the layer. */
    readonly selector: Layer["selector"];
}

/**
 * Counts elements in words: "3 nodes", "1 edge".
 * @param n - how many.
 * @param kind - nodes or edges.
 * @returns the words.
 */
function countWords(n: number, kind: "node" | "edge"): string {
    return `${String(n)} ${kind}${n === 1 ? "" : "s"}`;
}

/**
 * The offers for one find row: the element's rule for it, live, then the elements it holds now.
 * @param session - the element's session.
 * @param row - a contains row or a value row of `session.find`.
 * @param test - how the rule reads: "contains bob", "is Bob".
 * @returns the two offers.
 */
function offersOf(session: GraphSession, row: FindContainsRow | FindValueRow, test: string): Offer[] {
    const kinds = row.kind === "node" ? "Nodes" : "Edges";
    const ids = "nodes" in row.target ? row.target.nodes : undefined;
    const edges = "edges" in row.target ? row.target.edges : undefined;
    const these = row.count === 1 ? `This ${row.kind}` : `These ${countWords(row.count, row.kind)}`;
    return [
        {
            words: `${kinds} where ${attributeName(session, row.path)} ${test}, ${countWords(row.count, row.kind)}`,
            selector: { match: "rule", where: row.rule },
        },
        { words: these, selector: { match: "ids", nodes: ids ?? [], edges: edges ?? [] } },
    ];
}

/**
 * The Which elements section of a reader's own layer: how many elements it paints, and a find
 * field that offers each thing it finds as a live rule ("Nodes where name contains bob, 3 nodes")
 * or as the fixed list it holds now ("These 3 nodes"). Every rule is the one graphty-element built
 * for that find row; the field only words and arranges them.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.layer - the layer, any part of its row
 * @returns The section
 */
export function WhichElements({
    session,
    layer,
}: Readonly<{ session: GraphSession; layer: LayerId }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [text, setText] = useState("");
    const [active, setActive] = useState(0);
    const listId = useId();
    const parts = session.styles.parts(layer);
    const ids = [parts?.node, parts?.edge].filter((id): id is LayerId => id !== undefined);
    const kinds = new Set(ids.map((id) => session.styles.get(id)?.target ?? "node"));
    const painted = ids
        .map((id) => countWords(session.styles.counts(id).matched, session.styles.get(id)?.target ?? "node"))
        .join(", ");

    // Asked again each render, so a data change is never stale; find's index is kept per revision.
    // Only what the layer paints is offered: a nodes layer gets node rules.
    const found = text.trim() === "" ? null : session.find(text);
    const offers: Offer[] = [
        ...(found?.contains ?? [])
            .filter((row) => kinds.has(row.kind))
            .flatMap((row) => offersOf(session, row, `contains ${row.text}`)),
        ...(found?.values ?? [])
            .filter((row) => kinds.has(row.kind))
            .flatMap((row) => offersOf(session, row, `is ${String(row.value)}`)),
    ];

    const pick = async (offer: Offer): Promise<void> => {
        setText("");
        setActive(0);
        try {
            await session.transaction("Which elements", async (tx) => {
                for (const id of ids) {
                    await tx.styles.update(id, { selector: offer.selector });
                }
            });
        } catch {
            store.set({ notice: { message: "That rule could not be used for this layer" } });
        }
    };

    const optionId = (i: number): string => `${listId}-${String(i)}`;
    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (offers.length === 0) {
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive(Math.min(active + 1, offers.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(Math.max(active - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            void pick(offers[Math.min(active, offers.length - 1)]);
        }
    };

    return (
        <Stack gap={4} data-testid="which-elements">
            <Text size="xs" fw={600}>
                Which elements
            </Text>
            <Text size="xs" role="status">
                Paints {painted}
            </Text>
            <SearchInput
                value={text}
                onChange={(next) => {
                    setText(next);
                    setActive(0);
                }}
                onKeyDown={onKeyDown}
                aria-label="Find elements"
                placeholder="Find elements..."
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={offers.length > 0}
                aria-controls={offers.length > 0 ? listId : undefined}
                aria-activedescendant={offers.length > 0 ? optionId(Math.min(active, offers.length - 1)) : undefined}
            />
            {offers.length > 0 && (
                <div // NOSONAR(S6819): the popup of an ARIA combobox on a text box; a native select cannot be one
                    id={listId}
                    role="listbox"
                    aria-label="Ways to pick elements"
                >
                    {offers.map((offer, i) => (
                        <ResultRow
                            key={optionId(i)}
                            id={optionId(i)}
                            name={offer.words}
                            icon={
                                offer.selector.match === "rule" ? (
                                    <GLYPHS.filter size={14} />
                                ) : (
                                    <GLYPHS.node size={14} />
                                )
                            }
                            current={i === Math.min(active, offers.length - 1)}
                            onClick={() => {
                                void pick(offer);
                            }}
                        />
                    ))}
                </div>
            )}
        </Stack>
    );
}
