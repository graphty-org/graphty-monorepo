import { DataRow, RampRow } from "@graphty/compact-mantine";
import type { GraphSession, LegendBlock } from "@graphty/graphty-element/session";
import { ColorSwatch, Paper, Stack, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { CatalogGlyph } from "../style/ValueField";
import { colorName } from "../style/words";
import {
    belowLine,
    isSizeBlock,
    keyNames,
    keySections,
    NOTHING_KEYED,
    overflowLine,
    swatchName,
    swatchText,
    swatchValue,
} from "./legendWords";

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
                if (live) {
                    setSrc("");
                }
            });
        return () => {
            live = false;
        };
    }, [element, shape]);
    if (shape !== null && element !== null && src === null) {
        // Marked while the picture is drawn, so a story or a test can wait for the final key.
        return (
            <span data-node-picture-pending="" style={{ display: "inline-flex" }}>
                <CatalogGlyph channel={channel} value={value} />
            </span>
        );
    }
    return src === null || src === "" || shape === null ? (
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
                            // The chip is read with its color word, so the entry is not a name alone;
                            // a pointer hovering it sees the same word.
                            <Tooltip label={colorName(swatch.color.slice(0, 7))}>
                                <ColorSwatch
                                    className="ws-legend-chit"
                                    color={swatch.color}
                                    size={12}
                                    role="img"
                                    aria-label={colorName(swatch.color.slice(0, 7))}
                                />
                            </Tooltip>
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

/**
 * Within this much of the card's cap, the card grows to its content rather than scrolling: a
 * scrollbar for a few pixels of one row hides a sliver and helps no one.
 */
const SLACK_PX = 32;

/**
 * How tall the line at the card's foot is that says how many entries lie below: it covers the
 * bottom of what the card shows.
 * @param card - the card.
 * @returns its height, or 0 while the card shows none.
 */
function footOf(card: HTMLElement): number {
    return card.querySelector<HTMLElement>(":scope > .ws-legend-more")?.offsetHeight ?? 0;
}

/**
 * How many pixels of the card's content would show cut at its bottom edge, scrolled to the top:
 * the part of the line (a section title, a row, a ramp) that crosses the edge.
 * @param card - the card.
 * @returns the pixels to take off the card's height so no line shows cut, or 0.
 */
function cutAtBottom(card: HTMLElement): number {
    const box = card.getBoundingClientRect();
    const edge =
        card.clientTop + card.clientHeight - Number.parseFloat(getComputedStyle(card).paddingBottom) - footOf(card);
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
 * How many of the card's entries lie below what it shows: a value's row, or a ramp's section,
 * that ends past the card's bottom edge as it is scrolled now.
 * @param card - the card.
 * @returns the count, 0 when every entry shows.
 */
function entriesBelow(card: HTMLElement): number {
    const edge = card.getBoundingClientRect().top + card.clientTop + card.clientHeight - footOf(card);
    const entries = [
        ...card.querySelectorAll<HTMLElement>(".ws-legend-section .cm-data-row"),
        ...[...card.querySelectorAll<HTMLElement>(".ws-legend-section")].filter(
            (section) => section.querySelector(".cm-data-row") === null,
        ),
    ];
    return entries.filter((entry) => entry.getBoundingClientRect().bottom > edge + 0.5).length;
}

/**
 * Watches the card's overflow as it resizes; lets a card that runs only a little over its cap
 * grow to fit, and stops a card that scrolls at a line's edge, so no line shows cut in half.
 * @param ref - the card.
 * @returns whether it scrolls, and how many entries lie below what it shows.
 */
function useScrolls(ref: React.RefObject<HTMLElement | null>): { scrolls: boolean; below: number } {
    const [scrolls, setScrolls] = useState(false);
    const [below, setBelow] = useState(0);
    const remeasure = useRef<(() => void) | null>(null);
    // After every render: the line at the foot comes and goes with what it counts, and the card's
    // own size does not change when it does.
    useLayoutEffect(() => {
        remeasure.current?.();
    });
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
            const scrolling = card.scrollHeight - card.clientHeight > 1;
            setScrolls(scrolling);
            setBelow(scrolling ? entriesBelow(card) : 0);
        };
        const onScroll = (): void => {
            setBelow(entriesBelow(card));
        };
        card.addEventListener("scroll", onScroll);
        const observer = new ResizeObserver(measure);
        observer.observe(card);
        if (card.parentElement) {
            observer.observe(card.parentElement);
        }
        for (const child of card.children) {
            observer.observe(child);
        }
        measure();
        remeasure.current = measure;
        return () => {
            remeasure.current = null;
            card.removeEventListener("scroll", onScroll);
            observer.disconnect();
        };
    }, [ref]);
    return { scrolls, below };
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
    const ref = useRef<HTMLElement>(null);
    const { scrolls, below } = useScrolls(ref);
    // The element lists the stack bottom first; the card reads top first, the winner first.
    const names = keyNames(session);
    const sections = keySections(blocks, names);
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
                {sections.length === 0 ? (
                    <Text size="xs" c="dimmed">
                        {NOTHING_KEYED}
                    </Text>
                ) : null}
                {sections.map(({ title, block, entry, merged, scope, covered }) => {
                    const continuous = block.kind === "sequential" || block.kind === "diverging";
                    return (
                        <fieldset
                            key={`${block.layerId}-${block.channel}`}
                            // Named once: a merged section's one row already says its title, and a
                            // titled section's heading line is hidden from a screen reader, which
                            // hears the title as the section's name.
                            aria-label={merged ? undefined : title}
                            className="ws-legend-section"
                        >
                            {/* A run's one highlight is one line: its chip beside the run's name. */}
                            {!merged && (
                                <Text size="xs" fw={500} aria-hidden="true">
                                    {title}
                                </Text>
                            )}
                            {continuous ? (
                                <Ramp block={block} title={title} />
                            ) : (
                                <List block={block} entry={merged ? title : entry} />
                            )}
                            {scope === null ? null : (
                                <Text size="xs" c="dimmed">
                                    {scope}
                                </Text>
                            )}
                            {covered === null ? null : (
                                <Text size="xs" c="dimmed">
                                    {covered}
                                </Text>
                            )}
                        </fieldset>
                    );
                })}
            </Stack>
            {/* A key that scrolls says how much lies below; a scrollbar alone is easy to miss. */}
            {below > 0 ? (
                <Text size="xs" c="dimmed" className="ws-legend-more">
                    {belowLine(below)}
                </Text>
            ) : null}
        </Paper>
    );
}
