import { Box, Button, DirectionProvider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import React, { useState } from "react";

import {
    LabelsProvider,
    PANEL_GRID,
    ProseBlock,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * The one place on a dense property panel where a sentence is allowed.
 *
 * **Purpose:** A property panel is built from rows, and a row of prose costs
 * as much space as three rows of controls. `ProseBlock` is where that space is
 * spent deliberately, in three fixed shapes: what a result says, how it falls
 * short of being exact, and what was run to produce it.
 *
 * **When to use:**
 * - `reading` -- the plain-language sentence under a result. Always on screen,
 *   never collapsed, at most two sentences
 * - `departure` -- one line saying how the result falls short of being exact
 *   and complete: approximated, or run over part of the data. Render it only
 *   when that is true, because its rarity is what makes it noticeable
 * - `runRecord` -- one line naming what was run and the settings that were not
 *   left at their defaults, shortened to fit, with an optional control that
 *   opens the rest
 *
 * **When not to use:**
 * - Not for an explanation of what a control does. An explanation that repeats
 *   what is already on screen should be deleted; one that adds something
 *   belongs in `InfoCircle`, a hover or a tap away
 * - Not for an empty-state message and not for a caption under a chart
 *
 * **Accessibility:**
 * - The reading is a paragraph with no role and no label, so a screen reader
 *   reads the sentence itself rather than a name standing in for it
 * - The departure line is a named `note`, so the severity that the yellow
 *   triangle draws is also stated in words. The triangle itself is hidden from
 *   assistive technology so the name is not read twice
 * - The run record's full line stays in the document even when it is visually
 *   shortened, and the control that opens it is described by that line
 * - `live` turns any of the three into a live region, for text that is filled
 *   in after the panel is already on screen
 *
 * **Internationalization:** the name of the departure note and the name of the
 * details control both come from `LabelsProvider`, so both can be translated.
 * The details chevron follows the text direction under Mantine's
 * `DirectionProvider`.
 *
 * **In development builds** the component warns in the console when a reading
 * grows past two sentences or 220 characters. It counts sentences by Unicode
 * sentence terminators rather than by full stops, so the warning behaves the
 * same in Japanese, Arabic and Hindi as it does in English. Nothing is logged
 * in a production build.
 */
const meta: Meta<typeof ProseBlock> = {
    title: "Showing Data/ProseBlock",
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
        (Story) => (
            <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProseBlock>;

/**
 * The reading: what the result says, in words the reader already has. It stays
 * on screen in full however tightly the rest of the panel is packed, and it is
 * never put behind a disclosure.
 */
export const Reading: Story = {
    args: {
        variant: "reading",
        children:
            "17 cats, 2 humans and 1 dog, connected by 43 relationships. Everyone is connected to everyone else through at most 4 steps.",
    },
};

/**
 * A reading about a single item rather than the whole graph. Two sentences is
 * the ceiling, not the target.
 */
export const ReadingAboutOneNode: Story = {
    args: {
        variant: "reading",
        children:
            "Mr_Whiskers sits on more shortest paths than any other cat: 41 of the 190 pairs route through him. Mrs_Henderson is next.",
    },
};

/**
 * The departure line, drawn **only when there is a departure**. It names what
 * the result is not -- approximate, or computed over part of the data -- and
 * never says that a result was exact, which is the default a reader already
 * assumes.
 *
 * A screen reader announces it as a note called "Departure" before reading the
 * line, so the warning is not carried by the yellow triangle alone.
 */
export const Departure: Story = {
    args: {
        variant: "departure",
        children: "Approximate (sample of 8). Largest connected part only, 18 of 20 nodes.",
    },
};

/**
 * The run record: the method, the settings that were changed from their
 * defaults, and the scope, on one line. The chevron opens whatever the rest of
 * the record is -- a timestamp, a duration, a library version.
 *
 * `onDetails` receives the event, so a consumer can read modifier keys or call
 * `preventDefault`. Open the Actions panel and click the chevron to see it.
 */
export const RunRecord: Story = {
    args: {
        variant: "runRecord",
        children: "Betweenness, weighted by Bridges, sample 8",
        onDetails: fn(),
    },
};

/**
 * The same line with nothing behind it. The chevron is drawn only when
 * `onDetails` is given, because a control that reveals nothing is a defect.
 */
export const RunRecordWithoutDetails: Story = {
    args: {
        variant: "runRecord",
        children: "Force directed, 300 iterations, seed 42",
    },
};

/**
 * A line longer than the panel is wide. The run record shortens rather than
 * wrapping: it is one line, and the rest of it lives behind the chevron.
 *
 * The whole line stays in the document, so a screen reader reads all of it, and
 * the chevron is described by it, so a keyboard reaches it too. Give a run
 * record `onDetails` whenever its line can outgrow the panel.
 */
export const RunRecordThatOverflows: Story = {
    args: {
        variant: "runRecord",
        children: "Betweenness, weighted by Bridges, endpoints included, sample 8, Radial layout, seed 42",
        onDetails: fn(),
    },
};

/**
 * The three in the order a results panel uses them: the reading, then the
 * departure line, then the run record.
 */
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
 * The same panel after a result that was exact, complete and unfiltered: the
 * departure line is simply absent.
 *
 * Its absence is the design. A line that appeared under every result, saying
 * "Exact", would be read once and then ignored, and the warning above would go
 * unnoticed with it.
 */
export const ExactRun: Story = {
    render: (): React.JSX.Element => (
        <Stack gap="md">
            <ProseBlock variant="reading">
                6 groups of cats. The largest has 9 members, and Chonky_Boy is in it.
            </ProseBlock>
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
 * Text that arrives after the panel does.
 *
 * With `live="polite"` a screen reader reads the new wording when the reader is
 * between announcements, instead of the sentence changing silently while they
 * are somewhere else on the page. The whole passage is re-read rather than only
 * the words that changed, which is the only sensible reading of a rewritten
 * sentence.
 *
 * The block has to be on the page before its text changes for a browser to
 * notice the change, so render it with its waiting text and replace the text
 * afterwards -- as this story does -- rather than adding the whole block at
 * once.
 */
export const AnnouncedWhenItArrives: Story = {
    render: (): React.JSX.Element => <ArrivingReading />,
};

/**
 * Every string the component produces, translated.
 *
 * `LabelsProvider` replaces the name of the departure note and the name of the
 * details control; anything left out keeps its English default. The text of the
 * passage itself is yours and is passed in as children, so it is translated
 * wherever the rest of your copy is.
 */
export const TranslatedLabels: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider locale="de-DE" labels={{ departure: "Abweichung", details: "Einzelheiten" }}>
            <Stack gap="md">
                <ProseBlock variant="reading">
                    17 Katzen, 2 Menschen und 1 Hund, verbunden durch 43 Beziehungen.
                </ProseBlock>
                <ProseBlock variant="departure">Naherungswert (Stichprobe von 8).</ProseBlock>
                <ProseBlock variant="runRecord" onDetails={fn()}>
                    Zwischenzentralitat, gewichtet nach Brucken, Stichprobe 8
                </ProseBlock>
            </Stack>
        </LabelsProvider>
    ),
};

/**
 * The same three passages with the text running right to left.
 *
 * The warning triangle moves to the other side of its line, the run record
 * shortens from the other end, and the details chevron points the other way.
 * Everything here is laid out with logical CSS properties, so it follows
 * Mantine's `DirectionProvider` with no separate styling.
 *
 * The copy is left in English on purpose: it makes the mirroring easy to see
 * without knowing the script.
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
