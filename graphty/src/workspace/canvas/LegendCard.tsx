import { DataRow, RampRow } from "@graphty/compact-mantine";
import type { GraphSession, LegendBlock } from "@graphty/graphty-element/session";
import { ColorSwatch, Paper, Stack, Text } from "@mantine/core";
import React, { useLayoutEffect, useRef } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { isSizeBlock, keyNames, keySections, overflowLine, paintWords, swatchName, swatchText } from "./legendWords";

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
 * @param props.entry - the entry of a fixed-value row ("On the path")
 * @returns the rows
 */
function List({ block, entry }: Readonly<{ block: LegendBlock; entry: string }>): React.JSX.Element {
    return (
        <>
            {block.swatches.map((swatch, index) => (
                <DataRow
                    key={`${String(index)}-${swatchText(block, swatch, entry)}`}
                    name={swatchName(block, swatch, entry)}
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
 * A new inset moves nothing drawn; only when the card now hides a node is the graph framed again.
 * @returns The ref to put on the card.
 */
function useReservedMargin(): React.RefObject<HTMLElement | null> {
    const { store, element } = useWorkspace();
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
                // The drawing stays put unless the card now hides a node; then it is framed clear of
                // the card. The fit lands on the next frame, after the new insets reach the element.
                const box = {
                    x: card.offsetLeft,
                    y: card.offsetTop,
                    width: card.offsetWidth,
                    height: card.offsetHeight,
                };
                if (element?.autoFrame === true && element.nodesInRect(box).length > 0) {
                    element.zoomToFit();
                }
            }
        };
        // A card that comes up with the graph (a project opening) waits for the element's own
        // framing of it to land first, as a card made later does: an inset set before that framing
        // shrinks it, so the reopened project would be framed smaller than it was saved.
        const reportWhenFramed = (): void => {
            if (element !== null && !element.isFrameStable) {
                element.addEventListener("graph-frame-stable", report, { once: true });
                return;
            }
            report();
        };
        const observer = new ResizeObserver(reportWhenFramed);
        observer.observe(card);
        observer.observe(canvas);
        reportWhenFramed();
        return () => {
            element?.removeEventListener("graph-frame-stable", report);
            observer.disconnect();
            store.set({ viewInsets: {} });
        };
    }, [store, element]);
    return ref;
}

/**
 * The legend card (tier1-design.md section 2.4): read-only, one section per channel a row paints
 * from the data, the row that wins on top. Each section is titled "<Property>: <row>"; a run's
 * node and edge highlight in one color share one section titled by the run.
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
    const sections = keySections(blocks, keyNames(session));
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
                {sections.map(({ title, block, entry }) => {
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
                            {continuous ? <Ramp block={block} title={title} /> : <List block={block} entry={entry} />}
                        </fieldset>
                    );
                })}
            </Stack>
        </Paper>
    );
}
