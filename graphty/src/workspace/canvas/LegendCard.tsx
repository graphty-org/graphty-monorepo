import { DataRow, RampRow } from "@graphty/compact-mantine";
import type { GraphSession, LegendBlock } from "@graphty/graphty-element/session";
import { ColorSwatch, Paper, Stack, Text } from "@mantine/core";
import React from "react";

import { isSizeBlock, overflowLine, paintWords, sectionTitle, swatchName } from "./legendWords";

/** Props for LegendCard. */
interface LegendCardProps {
    /** The blocks `styles.legend()` returned, bottom layer first. */
    blocks: readonly LegendBlock[];
    /** The session, to name the row behind each block. */
    session: GraphSession;
}

/**
 * The name of the row that paints a block: its run's name, else its layer's.
 * @param session - the session.
 * @param block - the block.
 * @returns the name.
 */
function rowName(session: GraphSession, block: LegendBlock): string {
    const run = block.runId === undefined ? undefined : session.runs.get(block.runId);
    return run?.label ?? session.styles.get(block.layerId)?.name ?? block.layerId;
}

/**
 * One block as a ramp: a color bar painted with the block's own swatches, or the size wedge.
 * @param props - Component props
 * @param props.block - the block
 * @param props.title - its section title, the ramp's accessible name
 * @returns the ramp row
 */
function Ramp({ block, title }: { block: LegendBlock; title: string }): React.JSX.Element {
    const first = block.swatches.at(0)?.label ?? "";
    const last = block.swatches.at(-1)?.label ?? "";
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
 * @returns the rows
 */
function List({ block }: { block: LegendBlock }): React.JSX.Element {
    return (
        <>
            {block.swatches.map((swatch, index) => (
                <DataRow
                    key={`${String(index)}-${swatch.label}`}
                    name={swatchName(swatch)}
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

/**
 * The legend card (tier1-design.md section 2.4): read-only, one section per channel a row paints
 * from the data, the row that wins on top. Each section is titled "<Property>: <row>".
 *
 * Not drawn yet: the sentence saying what a higher value means and the bound size range, which
 * the element does not publish (#912); and the element's departures, which it publishes only as
 * English sentences (#867), while the app writes every word a reader sees.
 * @param props - Component props
 * @param props.blocks - the element's legend blocks
 * @param props.session - the session
 * @returns the card
 */
export function LegendCard({ blocks, session }: LegendCardProps): React.JSX.Element {
    // The element lists the stack bottom first; the card reads top first, the winner first.
    const ordered = [...blocks].reverse();
    return (
        <Paper component="section" aria-label="Legend" className="ws-legend-card" withBorder shadow="xs" p="xs">
            <Stack gap="xs">
                {ordered.map((block) => {
                    const title = sectionTitle(block, rowName(session, block));
                    const continuous = block.kind === "sequential" || block.kind === "diverging";
                    return (
                        <div key={`${block.layerId}-${block.channel}`} aria-label={title} role="group">
                            <Text size="xs" fw={500}>
                                {title}
                            </Text>
                            {continuous ? <Ramp block={block} title={title} /> : <List block={block} />}
                        </div>
                    );
                })}
            </Stack>
        </Paper>
    );
}
