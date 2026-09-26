import { Box, Button, DirectionProvider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { LabelsProvider, PANEL_GRID, ProseBlock } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * The one place on a dense panel where a sentence is allowed, in three fixed shapes.
 *
 * A panel is built from rows, and a paragraph costs as much space as three rows of controls.
 * ProseBlock is where that space is spent on purpose:
 *
 * - `reading` -- what a result says, in plain language. Always on screen, never collapsed, at
 *   most two sentences.
 * - `departure` -- one line saying how the result falls short of exact: approximated, or run over
 *   part of the data. Render it only when that is true; its rarity is what makes it noticed.
 * - `runRecord` -- one line naming what was run and the settings not left at their defaults,
 *   shortened to fit, with an optional chevron that opens the rest.
 *
 * ## When to use it
 *
 * Reach for ProseBlock under a result. Reach for `InfoCircle` to explain what a control does (a
 * hover or tap away, not resident), for `ActionRow` for a one-line status with verbs beside it,
 * and for nothing at all when the sentence would repeat what is already on screen. Not for an
 * empty-state message or a caption under a chart.
 *
 * ## Usage
 *
 * ```tsx
 * import { ProseBlock } from "@graphty/compact-mantine";
 *
 * <ProseBlock variant="reading" live="polite">{summary}</ProseBlock>
 * {approximate && <ProseBlock variant="departure">Approximate (sample of 8).</ProseBlock>}
 * <ProseBlock variant="runRecord" onDetails={openRunRecord}>Betweenness, sample 8</ProseBlock>
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - The reading is a plain paragraph, with no role and no label, so the sentence itself is read.
 * - The departure line is a `note` named "Departure", so the severity the yellow triangle draws is
 *   also said in words; the triangle is hidden from assistive technology.
 * - The run record keeps its whole line in the document when it is shortened, and the details
 *   chevron (drawn only with `onDetails`) is a button described by that line. Tab reaches it;
 *   Enter and Space activate it.
 * - `live` makes any variant a live region, for text filled in after the panel is on screen;
 *   `busy` holds the announcement back while it is still being computed.
 * - The departure and details names come from `LabelsProvider`. The chevron follows the text
 *   direction.
 * - In development builds a reading longer than two sentences or 220 characters logs a warning,
 *   counting sentences by Unicode sentence terminators so it behaves the same in every script.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Text | 11/16 at weight 450 |
 * | Reading and run record | secondary text colour |
 * | Departure | primary text colour, beside a warning triangle |
 * | Run record | one line, ellipsised, chevron at the trailing edge |
 */
const meta: Meta<typeof ProseBlock> = {
    title: "Components/Data display/ProseBlock",
    component: ProseBlock,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    argTypes: {
        variant: {
            control: "inline-radio",
            options: ["reading", "departure", "runRecord"],
        },
        live: {
            control: "inline-radio",
            options: ["off", "polite", "assertive"],
        },
    },
    decorators: [
        // Every story sits in a 240px panel on the panel ground; States lays out several panels
        // side by side, so it brings its own.
        (Story, context): React.JSX.Element =>
            context.name === "States" ? (
                <Story />
            ) : (
                <Box w={PANEL_GRID.WIDTH} bg="var(--cm-bg)" py="xs" style={{ paddingInline: "16px 8px" }}>
                    <Story />
                </Box>
            ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProseBlock>;

/**
 * A reading: what the result says, in words the reader already has. Switch the variant in the
 * Controls table to see the other two shapes.
 */
export const Default: Story = {
    args: {
        variant: "reading",
        children:
            "17 cats, 2 humans and 1 dog, connected by 43 relationships. Everyone is connected to everyone else through at most 4 steps.",
    },
};

/** Every variant, light and dark side by side: the reading, the departure line and the run record. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StoryStates>
            <StoryState name="Reading" padded>
                <ProseBlock variant="reading">How often a node sits on the shortest path between two others.</ProseBlock>
            </StoryState>
            <StoryState name="Departure" padded>
                <ProseBlock variant="departure">Edge weights were ignored: the graph has none.</ProseBlock>
            </StoryState>
            <StoryState name="Run record, with details" padded>
                <ProseBlock variant="runRecord" onDetails={() => undefined}>
                    Ran on 20 nodes in 4 ms, 2 minutes ago
                </ProseBlock>
            </StoryState>
            <StoryState name="Run record, without details" padded>
                <ProseBlock variant="runRecord">Force directed, 300 iterations, seed 42</ProseBlock>
            </StoryState>
        </StoryStates>
    ),
};

/** A reading about a single item rather than the whole graph. Two sentences is the ceiling, not the target. */
export const ReadingAboutOneNode: Story = {
    args: {
        variant: "reading",
        children:
            "Mr_Whiskers sits on more shortest paths than any other cat: 41 of the 190 pairs route through him. Mrs_Henderson is next.",
    },
};

/**
 * The departure line, drawn only when there is a departure. It names what the result is not --
 * approximate, or computed over part of the data -- and never says a result was exact, which a
 * reader already assumes. A screen reader announces it as a note called "Departure".
 */
export const Departure: Story = {
    args: {
        variant: "departure",
        children: "Approximate (sample of 8). Largest connected part only, 18 of 20 nodes.",
    },
};

/**
 * The run record: the method, the settings changed from their defaults, and the scope, on one
 * line. The chevron opens the rest -- a timestamp, a duration, a library version. `onDetails`
 * receives the event, so modifier keys and `preventDefault` are available.
 */
export const RunRecord: Story = {
    args: {
        variant: "runRecord",
        children: "Betweenness, weighted by Bridges, sample 8",
        onDetails: fn(),
    },
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button"));
        await expect(args.onDetails).toHaveBeenCalledTimes(1);
    },
};

/** The same line with nothing behind it: no `onDetails`, so no chevron, because a control that reveals nothing is a defect. */
export const RunRecordWithoutDetails: Story = {
    args: {
        variant: "runRecord",
        children: "Force directed, 300 iterations, seed 42",
    },
};

/**
 * A run record longer than the panel. It shortens rather than wrapping; the whole line stays in
 * the document for a screen reader, and the chevron is described by it. Give a run record
 * `onDetails` whenever its line can outgrow the panel.
 */
export const RunRecordThatOverflows: Story = {
    args: {
        variant: "runRecord",
        children: "Betweenness, weighted by Bridges, endpoints included, sample 8, Radial layout, seed 42",
        onDetails: fn(),
    },
};

/** The three in the order a results panel uses them: the reading, the departure line, the run record. */
export const AllThreeVariants: Story = {
    render: (): React.JSX.Element => (
        <Stack gap="md">
            <ProseBlock variant="reading">
                Mr_Whiskers sits on more shortest paths than any other cat: 41 of the 190 pairs route through him.
                Mrs_Henderson is next.
            </ProseBlock>
            <ProseBlock variant="departure">
                Approximate (sample of 8). Largest connected part only, 18 of 20 nodes.
            </ProseBlock>
            <ProseBlock variant="runRecord" onDetails={fn()}>
                Betweenness, weighted by Bridges, sample 8
            </ProseBlock>
        </Stack>
    ),
};

/**
 * The same panel after a result that was exact and complete: the departure line is simply absent.
 * A line under every result saying "Exact" would be read once and then ignored, and the warning
 * would be ignored with it.
 */
export const ExactRun: Story = {
    render: (): React.JSX.Element => (
        <Stack gap="md">
            <ProseBlock variant="reading">6 groups of cats. The largest has 9 members, and Chonky_Boy is in it.</ProseBlock>
            <ProseBlock variant="runRecord" onDetails={fn()}>
                Groups (granularity 2.5)
            </ProseBlock>
        </Stack>
    ),
};

/** The two states the live-region demo below moves between. */
const CALCULATION_STATES = [
    "Calculating how central each cat is...",
    "Mr_Whiskers is the most central cat: 41 of the 190 shortest paths run through him.",
] as const;

/**
 * A reading that is replaced when a background calculation finishes.
 * @returns The demo
 */
function ArrivingReading(): React.JSX.Element {
    const [index, setIndex] = useState(0);

    return (
        <Stack gap="md">
            <ProseBlock variant="reading" live="polite">
                {CALCULATION_STATES[index]}
            </ProseBlock>
            <Button
                size="compact-xs"
                variant="default"
                onClick={(): void => {
                    setIndex((current) => (current + 1) % CALCULATION_STATES.length);
                }}
            >
                Finish the calculation
            </Button>
        </Stack>
    );
}

/**
 * Text that arrives after the panel does. With `live="polite"` a screen reader reads the new
 * wording between announcements. The block must be on the page before its text changes for a
 * browser to notice, so render it with its waiting text and replace the text afterwards, as here.
 */
export const AnnouncedWhenItArrives: Story = {
    render: (): React.JSX.Element => <ArrivingReading />,
};

/**
 * Translated. `LabelsProvider` replaces the name of the departure note and of the details control;
 * anything left out keeps its English default. The passage itself is yours, passed as children.
 */
export const Translated: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider locale="de-DE" labels={{ departure: "Abweichung", details: "Einzelheiten" }}>
            <Stack gap="md">
                <ProseBlock variant="reading">17 Katzen, 2 Menschen und 1 Hund, verbunden durch 43 Beziehungen.</ProseBlock>
                <ProseBlock variant="departure">Naherungswert (Stichprobe von 8).</ProseBlock>
                <ProseBlock variant="runRecord" onDetails={fn()}>
                    Zwischenzentralitat, gewichtet nach Brucken, Stichprobe 8
                </ProseBlock>
            </Stack>
        </LabelsProvider>
    ),
};

/**
 * Right to left. The warning triangle moves to the other side, the run record shortens from the
 * other end, and the chevron points the other way. The copy stays in English so the mirroring is
 * easy to see.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Stack gap="md">
                    <ProseBlock variant="reading">
                        17 cats, 2 humans and 1 dog, connected by 43 relationships. Everyone is connected to everyone
                        else through at most 4 steps.
                    </ProseBlock>
                    <ProseBlock variant="departure">
                        Approximate (sample of 8). Largest connected part only, 18 of 20 nodes.
                    </ProseBlock>
                    <ProseBlock variant="runRecord" onDetails={fn()}>
                        Betweenness, weighted by Bridges, endpoints included, sample 8, Radial layout, seed 42
                    </ProseBlock>
                </Stack>
            </Box>
        </DirectionProvider>
    ),
};
