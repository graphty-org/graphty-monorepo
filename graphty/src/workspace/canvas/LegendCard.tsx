import { DataRow, RampRow } from "@graphty/compact-mantine";
import type { GraphSession, LegendBlock } from "@graphty/graphty-element/session";
import { ColorSwatch, Paper, Stack, Text } from "@mantine/core";
import React, { useLayoutEffect, useRef } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { isSizeBlock, overflowLine, paintWords, rowName, sectionTitle, swatchName, swatchText } from "./legendWords";

/** Props for LegendCard. */
interface LegendCardProps {
    /** The blocks `styles.legend()` returned, bottom layer first. */
    blocks: readonly LegendBlock[];
    /** The session, to name the row behind each block. */
    session: GraphSession;
}

/**
 * One block as a ramp: a color bar painted with the block's own swatches, or the size wedge.
 * @param props - Component props
 * @param props.block - the block
 * @param props.title - its section title, the ramp's accessible name
 * @returns the ramp row
 */
function Ramp({ block, title }: Readonly<{ block: LegendBlock; title: string }>): React.JSX.Element {
    const firstSwatch = block.swatches.at(0);
    const lastSwatch = block.swatches.at(-1);
    const first = firstSwatch === undefined ? "" : swatchText(block, firstSwatch);
    const last = lastSwatch === undefined ? "" : swatchText(block, lastSwatch);
    if (isSizeBlock(block)) {
        return <RampRow label={title} min={first} max={last} variant="size" />;
    }
    const colors = block.swatches.flatMap((swatch) => (swatch.color === undefined ? [] : [swatch.color]));
    return (
        <RampRow
            label={title}
            min={first}
            max={last}
            variant="color"
            gradient={`linear-gradient(to right, ${colors.join(", ")})`}
        />
    );
}

/**
 * One block as a list: a row per value with what it paints -- a color chip, or a shape, line
 * pattern or size in words -- the Other row last. A color row's value is how many elements carry
 * it, when the element can say.
 * @param props - Component props
 * @param props.block - the block
 * @param props.layerName - the name of the layer behind the block, for a fixed-value row
 * @returns the rows
 */
function List({ block, layerName }: Readonly<{ block: LegendBlock; layerName?: string }>): React.JSX.Element {
    return (
        <>
            {block.swatches.map((swatch, index) => (
                <DataRow
                    key={`${String(index)}-${swatchText(block, swatch, layerName)}`}
                    name={swatchName(block, swatch, layerName)}
                    value={paintWords(swatch) ?? swatch.count}
                    icon={swatch.color === undefined ? undefined : <ColorSwatch color={swatch.color} size={12} />}
                />
            ))}
            {block.overflow === undefined ? null : (
                <Text size="xs" c="dimmed">
                    {overflowLine(block.overflow.hidden)}
                </Text>
            )}
        </>
    );
}

/** Room left between the card and the nearest node, in CSS pixels. */
const CARD_GAP = 12;

/**
 * Reports the card's box to the element as a view inset, on mount, on every resize of the card
 * or the canvas, and clears it when the card goes: on the left of a tall card, above a wide one,
 * whichever costs the canvas the smaller share. Above, the toolbar's height is kept at the bottom.
 * @returns The ref to put on the card.
 */
function useReservedMargin(): React.RefObject<HTMLElement | null> {
    const { store } = useWorkspace();
    const ref = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        const card = ref.current;
        const canvas = card?.parentElement;
        if (!card || !canvas) {
            return undefined;
        }
        const report = (): void => {
            const left = card.offsetLeft + card.offsetWidth + CARD_GAP;
            const top = card.offsetTop + card.offsetHeight + CARD_GAP;
            const byLeft = left / Math.max(1, canvas.clientWidth) <= top / Math.max(1, canvas.clientHeight);
            // Pushed down, the graph would run under the toolbar at the bottom: keep it clear too.
            const dock = canvas.querySelector<HTMLElement>(".ws-toolbar-dock");
            const bottom = byLeft || !dock ? undefined : canvas.clientHeight - dock.offsetTop + CARD_GAP;
            const next = byLeft ? { left } : { top, bottom };
            const now = store.get().viewInsets;
            if (now.left !== next.left || now.top !== next.top || now.bottom !== next.bottom) {
                store.set({ viewInsets: next });
            }
        };
        const observer = new ResizeObserver(report);
        observer.observe(card);
        observer.observe(canvas);
        report();
        return () => {
            observer.disconnect();
            store.set({ viewInsets: {} });
        };
    }, [store]);
    return ref;
}

/**
 * The legend card (tier1-design.md section 2.4): read-only, one section per channel a row paints
 * from the data, the row that wins on top. Each section is titled "<Property>: <row>".
 *
 * Not drawn yet: the sentence saying what a higher value means and the bound size range, which
 * the element does not publish (#912); and the element's departures (`block.facts`).
 * @param props - Component props
 * @param props.blocks - the element's legend blocks
 * @param props.session - the session
 * @returns the card
 */
export function LegendCard({ blocks, session }: Readonly<LegendCardProps>): React.JSX.Element {
    const ref = useReservedMargin();
    // The element lists the stack bottom first; the card reads top first, the winner first.
    const ordered = [...blocks].reverse();
    return (
        <Paper
            ref={ref}
            component="section"
            aria-label="Legend"
            className="ws-legend-card"
            withBorder
            shadow="xs"
            p="xs"
        >
            <Stack gap="xs">
                {ordered.map((block) => {
                    const title = sectionTitle(block, rowName(session, block));
                    const continuous = block.kind === "sequential" || block.kind === "diverging";
                    return (
                        <fieldset
                            key={`${block.layerId}-${block.channel}`}
                            aria-label={title}
                            className="ws-legend-section"
                        >
                            <Text size="xs" fw={500}>
                                {title}
                            </Text>
                            {continuous ? (
                                <Ramp block={block} title={title} />
                            ) : (
                                <List block={block} layerName={session.styles.get(block.layerId)?.name} />
                            )}
                        </fieldset>
                    );
                })}
            </Stack>
        </Paper>
    );
}
