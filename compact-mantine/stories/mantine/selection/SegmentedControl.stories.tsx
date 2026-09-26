import { SegmentedControl, VisuallyHidden } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { AdvancedButton, ControlSection, PANEL_GRID, TrailingSlot, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";
import { StoryPanel } from "../../helpers/story-panel";

/**
 * Mantine's `SegmentedControl`, themed as Figma's segmented controls: the panel track (the
 * default), the toolbar mode switch (`variant="toolbar"`, a raised thumb) and the loose paint-type
 * row (`variant="loose"`). Every prop is Mantine's: see
 * [SegmentedControl on mantine.dev](https://mantine.dev/core/segmented-control/).
 *
 * ## When to use it
 *
 * Reach for SegmentedControl when the reader picks one of two to six options that are all worth
 * seeing at once, especially options that draw well as pictures (alignment, shape, direction).
 * For more options, or options that need words, use `Select` (Components/Inputs). For on/off use
 * `ToggleRow` (Components/Selection).
 *
 * It replaces `IconGroupRow`, removed in 0.9.0: put a glyph and a `VisuallyHidden` word in each
 * option and the row's extra control in a `TrailingSlot`, as `PicturesInAPanelRow` below shows.
 *
 * ## Usage
 *
 * ```tsx
 * import { SegmentedControl, VisuallyHidden } from "@mantine/core";
 * import { UiGlyph } from "@graphty/compact-mantine";
 *
 * <SegmentedControl
 *     aria-label="Text alignment"
 *     value={align}
 *     onChange={setAlign}
 *     data={[
 *         { value: "left", label: <><UiGlyph name="alignLeft" /><VisuallyHidden>Left</VisuallyHidden></> },
 *         { value: "center", label: <><UiGlyph name="alignCenterH" /><VisuallyHidden>Center</VisuallyHidden></> },
 *     ]}
 * />
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - A group of native radios: Tab enters at the checked option, the arrow keys move the
 *   selection, Tab leaves. The pointer selects on pointer-down, as Figma does.
 * - Name the group with `aria-label`. Each option is named by its label, so an option that shows
 *   only a glyph needs a `VisuallyHidden` word.
 * - Keyboard focus draws a 1px ring on the checked face.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Panel track | 24px tall, radius 5px, no padding; 88px or 184px wide, options share it equally |
 * | Checked face | `--cm-bg` with a 1px inset `--cm-segment-edge`, no hover fill, no slide |
 * | Toolbar | 32px tall, padding 2px, 28 x 28 options, a raised thumb with radius 3px |
 * | Loose | 24 x 24 options 4px apart, no track |
 */
const meta: Meta<typeof SegmentedControl> = {
    title: "Themed Mantine/Selection/SegmentedControl",
    component: SegmentedControl,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

/** A text track; use Controls to change its options, `fullWidth`, `variant` or `disabled`. */
export const Default: Story = {
    args: {
        data: ["Basic", "Dynamic", "Brush"],
        "aria-label": "Stroke style",
    },
};

const ALIGN = [
    { value: "left", label: <UiGlyph name="alignLeft" /> },
    { value: "center", label: <UiGlyph name="alignCenterH" /> },
    { value: "right", label: <UiGlyph name="alignRight" /> },
];

const MODES = [
    { value: "draw", label: <UiGlyph name="rectangle" /> },
    { value: "design", label: <UiGlyph name="frame" /> },
    { value: "motion", label: <UiGlyph name="rotate" /> },
    { value: "dev", label: <UiGlyph name="text" /> },
];

/**
 * Every look and state: the panel track at 88 and 184 wide, with text, focused, disabled and
 * read-only; the toolbar mode switch; and the loose row. Light and dark side by side. The play
 * function focuses the marked group so its ring shows.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            hug
            columns={200}
            cells={[
                ["panel, icons, 88", <SegmentedControl w={88} data={ALIGN} />],
                ["panel, icons, 184", <SegmentedControl w={184} data={[...ALIGN, { value: "justify", label: <UiGlyph name="more" /> }]} />],
                ["panel, text", <SegmentedControl data={["Basic", "Dynamic", "Brush"]} />],
                ["panel, focus", <div data-story-focus><SegmentedControl w={88} data={ALIGN} defaultValue="center" /></div>],
                ["panel, disabled", <SegmentedControl w={88} data={ALIGN} disabled />],
                ["panel, read-only", <SegmentedControl w={88} data={ALIGN} readOnly />],
                ["toolbar", <SegmentedControl variant="toolbar" data={MODES} defaultValue="design" />],
                ["loose", <SegmentedControl variant="loose" data={ALIGN} />],
            ]}
        />
    ),
    play: focusMarked,
};

const PICTURES = [
    { value: "left", glyph: "alignLeft", word: "Left" },
    { value: "center", glyph: "alignCenterH", word: "Center" },
    { value: "right", glyph: "alignRight", word: "Right" },
] as const;

/**
 * The recipe that replaces `IconGroupRow`: a `fullWidth` SegmentedControl whose options are a
 * glyph plus a `VisuallyHidden` word, next to a `TrailingSlot`, in a 32px row inside a
 * `ControlSection`. The track fills the 184px body and the trailing button lands in the 24px
 * column every other panel row ends with. Light and dark side by side. Each option is named by its word, and Tab lands on the checked option.
 */
export const PicturesInAPanelRow: Story = {
    parameters: BOTH_SCHEMES,
    render: function Render() {
        const [align, setAlign] = useState<string>("left");
        return (
            <StoryPanel>
                <ControlSection label="Text">
                    <div style={{ display: "flex", alignItems: "center", gap: PANEL_GRID.TRAIL_GAP, height: PANEL_GRID.ROW_PITCH }}>
                        <SegmentedControl
                            fullWidth
                            aria-label="Text alignment"
                            value={align}
                            onChange={setAlign}
                            data={PICTURES.map(({ value, glyph, word }) => ({
                                value,
                                label: (
                                    <>
                                        <UiGlyph name={glyph} />
                                        <VisuallyHidden>{word}</VisuallyHidden>
                                    </>
                                ),
                            }))}
                            style={{ flex: "1 1 auto", minWidth: 0 }}
                        />
                        <TrailingSlot>
                            <AdvancedButton label="Text options" onClick={() => undefined} />
                        </TrailingSlot>
                    </div>
                </ControlSection>
            </StoryPanel>
        );
    },
    play: async ({ canvasElement }) => {
        // BOTH_SCHEMES renders the story twice; check the first (light) copy.
        const group = within(canvasElement).getAllByRole("radiogroup", { name: "Text alignment" })[0];
        await expect(group.getBoundingClientRect().width).toBe(PANEL_GRID.BODY);
        const left = within(group).getByRole("radio", { name: "Left" });
        await expect(left).toBeChecked();
        // Tab in, as a reader does: the checked option is the group's one Tab stop. (The arrow
        // keys are native radio behaviour, which the simulated keyboard here does not perform;
        // tests/figma/selection.browser.test.tsx drives them with real key presses.)
        for (let i = 0; i < 10 && canvasElement.ownerDocument.activeElement !== left; i++) {
            await userEvent.tab();
        }
        await expect(left).toHaveFocus();
        const center = within(group).getByRole<HTMLInputElement>("radio", { name: "Center" });
        const centerLabel = center.labels?.[0];
        if (!centerLabel) {
            throw new Error("the Center option has no label");
        }
        await userEvent.click(centerLabel);
        await waitFor(() => expect(center).toBeChecked());
    },
};

/** `fullWidth` stretches the options to fill the width it is given. */
export const FullWidth: Story = {
    args: {
        data: ["Yes", "No", "Maybe"],
        fullWidth: true,
        w: PANEL_GRID.BODY,
        "aria-label": "Answer",
    },
};

/** Five text options share a wider track equally. */
export const FiveOptions: Story = {
    args: {
        data: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        w: 300,
        "aria-label": "Day",
    },
};
