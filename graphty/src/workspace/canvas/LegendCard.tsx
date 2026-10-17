import { DataRow, RampRow } from "@graphty/compact-mantine";
import type { GraphSession, LegendBlock } from "@graphty/graphty-element/session";
import { ColorSwatch, Paper, Stack, Text } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { CatalogGlyph } from "../style/ValueField";
import { isSizeBlock, keyNames, keySections, overflowLine, swatchName, swatchText, swatchValue } from "./legendWords";

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

/** How large a node's picture is drawn in a key row, in CSS pixels. */
const PICTURE_PX = 16;

/**
 * A key row's picture of what it paints: a node shape drawn by graphty-element as its nodes are
 * (`nodeThumbnail`, a mid gray: the color is another row's), the catalog glyph until it is ready
 * and for every other kind.
 * @param props - Component props
 * @param props.channel - the block's channel
 * @param props.value - what the row paints
 * @returns The picture
 */
function ShapePicture({
    channel,
    value,
}: Readonly<{ channel: LegendBlock["channel"]; value: unknown }>): React.JSX.Element {
    const { element } = useWorkspace();
    const [src, setSrc] = useState<string | null>(null);
    const shape = channel === "node.shape" && typeof value === "string" ? value : null;
    useEffect(() => {
        if (shape === null || element === null) {
            return undefined;
        }
        let live = true;
        element
            .nodeThumbnail({ shape, size: PICTURE_PX * Math.ceil(window.devicePixelRatio || 1) })
            .then((url) => {
                if (live) {
                    setSrc(url);
                }
            })
            .catch(() => {
                // The glyph stays.
            });
        return () => {
            live = false;
        };
    }, [element, shape]);
    return src === null || shape === null ? (
        <CatalogGlyph channel={channel} value={value} />
    ) : (
        <img src={src} alt="" width={PICTURE_PX} height={PICTURE_PX} data-node-picture="" />
    );
}

/**
 * One block as a list: a row per value with what it paints -- a color chip; a shape, line pattern
 * or arrow as its picture and its name; or a size in words -- the Other row last. A color row's value is how many elements carry
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
                    value={swatchValue(block, swatch, entry)}
                    icon={
                        swatch.color === undefined ? (
                            // A node shape as the canvas draws it; a line pattern or arrow as the
                            // picture the Style tab's picker draws.
                            <ShapePicture channel={block.channel} value={swatch.paints} />
                        ) : (
                            <ColorSwatch className="ws-legend-chit" color={swatch.color} size={12} />
                        )
                    }
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
 * A new inset moves nothing drawn; the next fit (zoom to fit, a new layout) keeps the graph clear of it.
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
            // A canvas hidden behind a page (no box at all) measures nothing: insets read off it are not the
            // card's, and handed to the element they moved the drawing once the canvas came back.
            if (canvas.getClientRects().length === 0) {
                return;
            }
            const left = card.offsetLeft + card.offsetWidth + CARD_GAP;
            const top = card.offsetTop + card.offsetHeight + CARD_GAP;
            const byLeft = left / Math.max(1, canvas.clientWidth) <= top / Math.max(1, canvas.clientHeight);
            // Pushed down, the graph would run under the toolbar at the bottom: keep it clear too.
            const dock = canvas.querySelector<HTMLElement>(".ws-toolbar-dock");
            const bottom = byLeft || !dock ? undefined : canvas.clientHeight - dock.offsetTop + CARD_GAP;
            const next = byLeft ? { left } : { top, bottom };
            const now = store.get().viewInsets;
            if (now.left !== next.left || now.top !== next.top || now.bottom !== next.bottom) {
                // The drawing never moves for the card: a card that grows over a node (a Color line
                // added) or a canvas that comes back from a page (a cancelled file page) left the
                // reader's view re-framed with nothing asked. The insets only shape the next fit.
                store.set({ viewInsets: next });
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
 * Within this much of the card's cap, the card grows to its content rather than scrolling: a
 * scrollbar for a few pixels of one row hides a sliver and helps no one.
 */
const SLACK_PX = 32;

/**
 * How many pixels of the card's content would show cut at its bottom edge, scrolled to the top:
 * the part of the line (a section title, a row, a ramp) that crosses the edge.
 * @param card - the card.
 * @returns the pixels to take off the card's height so no line shows cut, or 0.
 */
function cutAtBottom(card: HTMLElement): number {
    const box = card.getBoundingClientRect();
    const edge = card.clientTop + card.clientHeight - Number.parseFloat(getComputedStyle(card).paddingBottom);
    const lines = card.querySelectorAll<HTMLElement>(".ws-legend-section > *");
    for (const line of lines) {
        const rect = line.getBoundingClientRect();
        const top = rect.top - box.top + card.scrollTop;
        if (top < edge && top + rect.height > edge + 0.5) {
            return edge - top;
        }
    }
    return 0;
}

/**
 * Watches the card's overflow as it resizes; lets a card that runs only a little over its cap
 * grow to fit, and stops a card that scrolls at a line's edge, so no line shows cut in half.
 * @param ref - the card.
 * @returns whether it scrolls.
 */
function useScrolls(ref: React.RefObject<HTMLElement | null>): boolean {
    const [scrolls, setScrolls] = useState(false);
    useLayoutEffect(() => {
        const card = ref.current;
        if (!card) {
            return undefined;
        }
        const measure = (): void => {
            // Back to the stylesheet's cap first, so a card that grew re-measures against it.
            card.style.maxHeight = "";
            const over = card.scrollHeight - card.clientHeight;
            const room = (card.parentElement?.clientHeight ?? 0) - card.offsetTop * 2;
            if (over > 0 && over <= SLACK_PX && card.offsetHeight + over <= room) {
                card.style.maxHeight = `${String(card.offsetHeight + over)}px`;
            } else if (over > 0) {
                const cut = cutAtBottom(card);
                if (cut > 0) {
                    card.style.maxHeight = `${String(card.offsetHeight - cut)}px`;
                }
            }
            setScrolls(card.scrollHeight - card.clientHeight > 1);
        };
        const observer = new ResizeObserver(measure);
        observer.observe(card);
        if (card.parentElement) {
            observer.observe(card.parentElement);
        }
        for (const child of card.children) {
            observer.observe(child);
        }
        measure();
        return () => {
            observer.disconnect();
        };
    }, [ref]);
    return scrolls;
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
    const scrolls = useScrolls(ref);
    // The element lists the stack bottom first; the card reads top first, the winner first.
    const sections = keySections(blocks, keyNames(session));
    return (
        <Paper
            ref={ref}
            component="section"
            aria-label="Legend"
            className="ws-legend-card"
            // A key that scrolls takes focus, so the keyboard can scroll it too; its scrollbar says
            // that more lies below.
            tabIndex={scrolls ? 0 : undefined}
            withBorder
            shadow="xs"
            p="xs"
        >
            <Stack gap="xs">
                {sections.map(({ title, block, entry, merged }) => {
                    const continuous = block.kind === "sequential" || block.kind === "diverging";
                    return (
                        <fieldset
                            key={`${block.layerId}-${block.channel}`}
                            aria-label={title}
                            className="ws-legend-section"
                        >
                            {/* A run's one highlight is one line: its chip beside the run's name. */}
                            {!merged && (
                                <Text size="xs" fw={500}>
                                    {title}
                                </Text>
                            )}
                            {continuous ? (
                                <Ramp block={block} title={title} />
                            ) : (
                                <List block={block} entry={merged ? title : entry} />
                            )}
                        </fieldset>
                    );
                })}
            </Stack>
        </Paper>
    );
}
