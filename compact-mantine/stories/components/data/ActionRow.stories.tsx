import { ActionIcon, Box, Button, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React from "react";

import { ActionRow, PANEL_GRID, PANEL_INK, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

// Imported from "../../../src", the package's published entry point, so the stories exercise the
// exports a consumer installs.
//
// The controls here are plain Mantine ActionIcons rather than this package's AdvancedButton, so
// the stories exercise ActionRow alone. AdvancedButton drops into `actions` unchanged.

/**
 * A 32px row that reports what something is doing, and holds the controls for doing something
 * about it.
 *
 * It lets every other row in a panel stay a value: no field, toggle or data row grows an Apply, a
 * Run or a Copy of its own, because the action row at the end of the section holds them. The
 * state (`state`) sits at the leading edge in the secondary text colour; the controls
 * (`actions`) cluster at the trailing edge.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **ActionRow** | The verbs of a section (Run, Cancel, Recompute, Copy), and a count, status or record of the last run a reader scans: `20 nodes`, `Running, 40%`. |
 * | `DataRow` | A reading with a value, in a list of readings. |
 * | `ProseBlock` | A result that needs a sentence rather than a status. |
 * | `PanelField` | A value the reader edits. |
 *
 * ## Usage
 *
 * ```tsx
 * import { ActionIcon, Button } from "@mantine/core";
 * import { ActionRow, UiGlyph } from "@graphty/compact-mantine";
 *
 * <ActionRow
 *     state="20 nodes"
 *     busy={running}
 *     actions={
 *         <>
 *             <ActionIcon aria-label="Copy reading"><UiGlyph name="copy" /></ActionIcon>
 *             <Button px="md" onClick={run}>Run</Button>
 *         </>
 *     }
 * />
 * ```
 *
 * Keep the word on a control that is genuinely a verb -- Run, Cancel, anything destructive.
 * Everything else is a 24px glyph carrying its word as tooltip and accessible name.
 *
 * ## Showing the controls
 *
 * By default `actions` are always drawn, as on Figma's property rows. `reveal="hover"` hides them
 * until the row is hovered or focused, as on a layer row. Either way:
 *
 * - `residentActions` are never hidden: a control that reports a state (a crossed-out eye on a
 *   hidden item, a pin) must be scannable without hovering.
 * - Hidden is faded, never unmounted: hidden controls keep their names and their tab order, and
 *   Tab reveals exactly what hover reveals.
 * - Where the pointer cannot hover (touch), every control is drawn.
 * - `actionsVisible={true}` holds them open while a menu or pop-out opened from the row is up.
 *
 * ## Keyboard and accessibility
 *
 * - Each control is its own tab stop. Focus inside the row reveals a `reveal="hover"` cluster.
 * - With `onClick` the state becomes a button filling the row: Tab reaches it, Enter and Space
 *   activate it. A click on a control in the cluster never activates the row.
 * - The state ellipsises for the eye and stays whole for a screen reader. `stateTitle` gives the
 *   full reading when `state` is an abbreviation or markup; it is the tooltip and what is read.
 * - `busy` makes the state a live region, announced when it changes. Give it to the one row that
 *   reports progress, not to every row of a list.
 * - `disabled` dims the row and announces it as unavailable.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | 240 x 32, padding 0 8 0 16 |
 * | Controls | 24px buttons, 4px apart |
 * | Hover reveal | opacity 0 to 1 over 100ms, ease-out |
 * | State text | 11/16, secondary text colour |
 */
const meta: Meta<typeof ActionRow> = {
    title: "Components/Data display/ActionRow",
    component: ActionRow,
    argTypes: {
        state: { control: false },
        actions: { control: false },
        residentActions: { control: false },
    },
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        // Every story sits in a 240px panel on the panel ground; States lays out several panels
        // side by side, so it brings its own.
        (Story, context): React.JSX.Element =>
            context.name === "States" ? (
                <Story />
            ) : (
                <Box w={PANEL_GRID.WIDTH} bg="var(--cm-bg)" style={{ paddingInline: "16px 8px" }}>
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
 * The size of the graph on the left; on the right a settings button, a copy, and the one verb that
 * keeps its word. Try `reveal: "hover"` in the Controls table.
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
 * Every state, light and dark side by side: actions always drawn (the default), the hover reveal
 * at rest and held open, a resident control, disabled, and selectable.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => {
        const actions = <GlyphAction label="Copy reading" glyph="copy" />;
        return (
            <StoryStates>
                <StoryState name="Always (default)" padded>
                    <ActionRow state="20 nodes" actions={actions} />
                </StoryState>
                <StoryState name="Hover reveal, at rest" padded>
                    <ActionRow state="20 nodes" reveal="hover" actions={actions} />
                </StoryState>
                <StoryState name="Hover reveal, held open" padded>
                    <ActionRow state="20 nodes" reveal="hover" actionsVisible actions={actions} />
                </StoryState>
                <StoryState name="Resident control" padded>
                    <ActionRow
                        state="Chonky_Boy"
                        reveal="hover"
                        actions={actions}
                        residentActions={<GlyphAction label="Hidden. Show Chonky_Boy" glyph="eye" reports />}
                    />
                </StoryState>
                <StoryState name="Disabled" padded>
                    <ActionRow state="Not built yet" disabled actions={actions} />
                </StoryState>
                <StoryState name="Selectable" padded>
                    <ActionRow state="Betweenness" onClick={() => undefined} actions={actions} />
                </StoryState>
            </StoryStates>
        );
    },
};

/** A row that only reports: the record of the last run, with nothing to press. */
export const StateOnly: Story = {
    args: {
        state: "Betweenness on 20 nodes, ran 2 minutes ago",
    },
};

/** A row that only acts. With nothing to report, the cluster still ends at the row's trailing edge. */
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
 * Reporting and acting, with the hover reveal. `Chonky_Boy` is hidden, so his crossed-out eye is
 * resident: it reports a state, and a state that only appears on hover cannot be scanned for. The
 * copy and the settings button only act, so they wait for the hover or for Tab.
 */
export const ResidentAndHidden: Story = {
    args: {
        state: "Chonky_Boy",
        reveal: "hover",
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
 * A run in flight. `Cancel` keeps its word, and the progress it cancels is the row's reading.
 * `busy` makes the reading a live region, announced each time it changes.
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
 * A reading longer than the row. It ellipsises rather than wrapping -- the row stays 32px -- and
 * the whole text stays in the document and in the tooltip.
 */
export const LongState: Story = {
    args: {
        state: "Betweenness on 20 nodes, weighted by Bridges, force directed layout, ran 2 minutes ago",
        actions: <GlyphAction label="Copy reading" glyph="copy" />,
    },
};

/**
 * A reading that abbreviates what it means. `stateTitle` becomes the tooltip and what a screen
 * reader reads, so the full reading is reachable without a pointer.
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
 * Hover-revealed controls held open with `actionsVisible`, as for the life of a menu or pop-out
 * opened from the row, so the control that opened it does not vanish when the pointer moves onto
 * what it opened.
 */
export const HeldOpen: Story = {
    args: {
        state: "Mr_Whiskers",
        reveal: "hover",
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
 * A row made selectable with `onClick`. The handler receives the event, so Shift adds to the
 * selection here, and whether a pointer or the keyboard activated it. A click on the copy button
 * never activates the row.
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
                        state={name}
                        onClick={(event) => {
                            setSelected((current) => (event.shiftKey ? [...new Set([...current, name])] : [name]));
                        }}
                        actions={<GlyphAction label={`Copy ${name}`} glyph="copy" />}
                    />
                ))}
                <Text size="xs" c={PANEL_INK.CHROME} mt="xs">
                    {selected.length === 0 ? "Nothing selected" : `Selected: ${selected.join(", ")}`}
                </Text>
            </Stack>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: "Copy Mrs_Henderson" }));
        await expect(canvas.getByText("Nothing selected")).toBeInTheDocument();
        await userEvent.click(canvas.getByRole("button", { name: "Mrs_Henderson" }));
        await expect(canvas.getByText("Selected: Mrs_Henderson")).toBeInTheDocument();
    },
};

/**
 * Three rows of a list with the hover reveal. Only the row under the pointer shows its copy button;
 * every resident control stays drawn -- `Mrs_Henderson` is hidden whether or not anyone points at
 * her.
 */
export const AList: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <ActionRow
                state="Mr_Whiskers"
                reveal="hover"
                actions={<GlyphAction label="Copy reading" glyph="copy" />}
                residentActions={<GlyphAction label="Pinned to the panel" glyph="pin" reports />}
            />
            <ActionRow
                state="Mrs_Henderson"
                reveal="hover"
                actions={<GlyphAction label="Copy reading" glyph="copy" />}
                residentActions={<GlyphAction label="Hidden. Show Mrs_Henderson" glyph="eye" reports />}
            />
            <ActionRow state="Chonky_Boy" reveal="hover" actions={<GlyphAction label="Copy reading" glyph="copy" />} />
        </Stack>
    ),
};

/**
 * Right to left. The reading starts at the right edge and the controls end at the left, with
 * nothing computed: the row is laid out in logical properties.
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
