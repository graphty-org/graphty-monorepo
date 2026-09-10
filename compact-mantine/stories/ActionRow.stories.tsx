import { ActionIcon, Box, Button, DirectionProvider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { ActionRow, PANEL_GRID, PANEL_INK, UiGlyph } from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise the exports a consumer installs.
//
// The controls in these stories are plain Mantine ActionIcons rather than this
// package's own AdvancedButton, so that the stories exercise ActionRow alone.
// AdvancedButton drops into `actions` unchanged.

/**
 * A 32px row that reports what something is doing and holds the controls for
 * doing something about it.
 *
 * It is what lets every other row in a panel stay a value: no field, toggle or
 * data row has to grow an Apply, a Run or a Copy of its own, because the action
 * row at the end of the section holds them all.
 *
 * **When to use it**
 *
 * - For the verbs of a section: Run, Cancel, Recompute, Copy reading, a button
 *   that opens the advanced settings
 * - For a count, a status or a record of the last run that a reader scans
 *   rather than changes -- `20 nodes`, `Running, 40%`, `Ran 2 minutes ago`
 * - Never for a value the reader can edit; that is a `PanelField`
 *
 * **The hover split is the whole component.** A control that *acts* is hidden
 * until the row is reached, because a panel of resident verbs is a panel of
 * noise. Anything that *reports a state* is drawn always, because a state that
 * only appears on hover is a state nobody can scan a column for. A layers panel
 * is the model: the eye appears on hover, but a layer that is actually hidden
 * shows its crossed-out eye with no hover at all.
 *
 * Three things keep that split usable rather than merely tidy:
 *
 * - **A touch screen has no hover**, so where the pointer cannot hover every
 *   hidden control is drawn.
 * - **Hidden is not gone.** Hidden controls are faded out, never unmounted, so
 *   they keep their accessible names and their place in the tab order.
 * - **Focus reveals what hover reveals.** Tab into the row and its controls
 *   appear, so the keyboard route is the same route.
 *
 * Keep the word on a control that is genuinely a verb -- Run, Cancel, anything
 * destructive, anything ending in "anyway". Everything else is a 24px glyph
 * carrying its word as its tooltip and its accessible name.
 *
 * **Hover a row in these stories to see its controls, or press Tab.**
 */
const meta: Meta<typeof ActionRow> = {
    title: "Showing Data/ActionRow",
    component: ActionRow,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
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
type Story = StoryObj<typeof ActionRow>;

/**
 * A 24px glyph control: the shape every action that is not a verb takes.
 * @param root0 - Component props
 * @param root0.label - The word the glyph replaces, used as both tooltip and accessible name
 * @param root0.glyph - Which shared UI glyph to draw
 * @param root0.reports - Draw in the primary text colour, the way a control that reports a state does
 * @returns The icon button
 */
function GlyphAction({
    label,
    glyph,
    reports = false,
}: {
    label: string;
    glyph: "copy" | "eye" | "gear" | "pin" | "refresh";
    reports?: boolean;
}): React.JSX.Element {
    return (
        <ActionIcon title={label} aria-label={label} style={{ color: reports ? PANEL_INK.VALUE : PANEL_INK.CHROME }}>
            <UiGlyph name={glyph} />
        </ActionIcon>
    );
}

/**
 * The size of the graph on the left, and on the right a button onto the
 * advanced settings, a copy, and the one verb that keeps its word.
 *
 * At rest the row is the sentence `20 nodes` and nothing else. Hover it, or
 * press Tab.
 */
export const Default: Story = {
    args: {
        state: "20 nodes",
        actions: (
            <>
                <GlyphAction label="Parameters" glyph="gear" />
                <GlyphAction label="Copy reading" glyph="copy" />
                <Button px="md">Run</Button>
            </>
        ),
    },
};

/**
 * A row that only reports: the record of the last run, in the secondary text
 * colour, with nothing to press.
 */
export const StateOnly: Story = {
    args: {
        state: "Betweenness on 20 nodes, ran 2 minutes ago",
    },
};

/**
 * A row that only acts. With nothing to report, the cluster still ends at the
 * row's trailing edge.
 */
export const ActionsOnly: Story = {
    args: {
        actions: (
            <>
                <GlyphAction label="Recompute" glyph="refresh" />
                <Button px="md">Run</Button>
            </>
        ),
    },
};

/**
 * Reporting and acting, side by side.
 *
 * `Chonky_Boy` is hidden, so his crossed-out eye is **resident** -- it reports a
 * state, and a state that only appears on hover is a state the reader cannot
 * scan a column for. The copy and the settings button beside it only act, so
 * they wait for the hover.
 */
export const ResidentAndHidden: Story = {
    args: {
        state: "Chonky_Boy",
        actions: (
            <>
                <GlyphAction label="Node options" glyph="gear" />
                <GlyphAction label="Copy reading" glyph="copy" />
            </>
        ),
        residentActions: <GlyphAction label="Hidden. Show Chonky_Boy" glyph="eye" reports />,
    },
};

/**
 * A run in flight.
 *
 * `Cancel` is one of the verbs that keeps its text, and the progress it cancels
 * is the row's reading, so both are visible without reaching for the row.
 *
 * `busy` says the reading is fed by something that finishes later, which is
 * what makes a screen reader announce it each time it changes -- the same rule
 * every announcing component in this library follows. Set it on the one row
 * that reports progress rather than on every row of a list: a page of live
 * regions all talking at once is unusable.
 */
export const Running: Story = {
    args: {
        state: "Running, 40%",
        busy: true,
        actions: <Button px="md">Cancel</Button>,
        residentActions: <GlyphAction label="Pinned to the panel" glyph="pin" reports />,
    },
};

/**
 * A reading longer than the row. It truncates with an ellipsis rather than
 * wrapping: the row is 32px and stays 32px.
 *
 * The text itself is complete in the document, so a screen reader reads all of
 * it however little of it fits, and the pointer gets the whole thing as a
 * tooltip.
 */
export const LongState: Story = {
    args: {
        state: "Betweenness on 20 nodes, weighted by Bridges, force directed layout, ran 2 minutes ago",
        actions: <GlyphAction label="Copy reading" glyph="copy" />,
    },
};

/**
 * A reading that is an abbreviation of what it means.
 *
 * When the row cannot draw the whole thing -- because the reading is markup, or
 * because the short form is the one worth drawing -- pass `stateTitle` as well.
 * It becomes the tooltip, and it is what a screen reader reads in place of the
 * drawing, so the full reading is reachable without a pointer. A tooltip on its
 * own is not: it is unreachable by keyboard and by touch.
 */
export const AbbreviatedState: Story = {
    args: {
        state: "40%",
        stateTitle: "Betweenness running, 40% done, about 30 seconds left",
        busy: true,
        actions: <Button px="md">Cancel</Button>,
    },
};

/**
 * The controls held open while something opened from this row is still on
 * screen.
 *
 * Set `actionsVisible` to `true` for as long as a menu or a pop-out opened from
 * the row is open, so that the control which opened it does not vanish the
 * moment the pointer moves onto the thing it opened.
 */
export const HeldOpen: Story = {
    args: {
        state: "Mr_Whiskers",
        actionsVisible: true,
        actions: (
            <>
                <GlyphAction label="Node options" glyph="gear" />
                <GlyphAction label="Copy reading" glyph="copy" />
            </>
        ),
    },
};

/**
 * A selectable row.
 *
 * Giving the row an `onClick` turns its reading into a button that fills the
 * row's full 32px height, which is how a row is made selectable. The handler
 * receives the event, so shift-click for a range and the platform key for a
 * second selection are all readable, and a second argument says whether the
 * activation came from a pointer or from the keyboard -- worth knowing, because
 * a range selection has no meaning without a pointer.
 *
 * Clicking a control in the cluster never activates the row.
 */
export const Selectable: Story = {
    render: function SelectableRows(): React.JSX.Element {
        const names = ["Mr_Whiskers", "Mrs_Henderson", "Chonky_Boy"];
        const [selected, setSelected] = React.useState<string[]>([]);

        return (
            <Stack gap={0}>
                {names.map((name) => (
                    <ActionRow
                        key={name}
                        state={selected.includes(name) ? `${name} (selected)` : name}
                        onClick={(event) => {
                            // Shift adds to the selection instead of replacing
                            // it, which is only possible because the handler is
                            // given the event rather than no argument at all.
                            setSelected((current) =>
                                event.shiftKey ? [...new Set([...current, name])] : [name],
                            );
                        }}
                        actions={<GlyphAction label={`Copy ${name}`} glyph="copy" />}
                    />
                ))}
            </Stack>
        );
    },
};

/**
 * Three rows of the same list, stacked.
 *
 * Only the row under the pointer reveals its controls, which is the whole
 * reason the split exists. Every crossed-out eye stays drawn regardless:
 * `Mrs_Henderson` is hidden whether or not anyone is pointing at her.
 */
export const AList: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <ActionRow
                state="Mr_Whiskers"
                actions={<GlyphAction label="Copy reading" glyph="copy" />}
                residentActions={<GlyphAction label="Pinned to the panel" glyph="pin" reports />}
            />
            <ActionRow
                state="Mrs_Henderson"
                actions={<GlyphAction label="Copy reading" glyph="copy" />}
                residentActions={<GlyphAction label="Hidden. Show Mrs_Henderson" glyph="eye" reports />}
            />
            <ActionRow state="Chonky_Boy" actions={<GlyphAction label="Copy reading" glyph="copy" />} />
        </Stack>
    ),
};

/**
 * The same rows with the text running right to left.
 *
 * The reading starts at the right edge and the controls end at the left one,
 * without the component computing anything: the row is laid out in logical
 * properties, so one rule serves both directions. Wrap your app in Mantine's
 * `DirectionProvider` to get this everywhere.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Stack gap={0} dir="rtl">
                <ActionRow
                    state="20 nodes"
                    actions={
                        <>
                            <GlyphAction label="Copy reading" glyph="copy" />
                            <Button px="md">Run</Button>
                        </>
                    }
                    residentActions={<GlyphAction label="Pinned to the panel" glyph="pin" reports />}
                />
                <ActionRow state="Mr_Whiskers" onClick={() => undefined} />
            </Stack>
        </DirectionProvider>
    ),
};
