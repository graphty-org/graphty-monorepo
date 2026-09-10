import { Box, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
    ControlSection,
    ControlSubGroup,
    PANEL_GRID,
    StyleNumberInput,
    StyleSelect,
    ToggleRow,
} from "../src";

/**
 * A collapsible sub-group of controls, lighter than a section.
 *
 * **Purpose:** Holds the settings most readers never open, one level below a
 * section: text effects under a label section, easing under an animation
 * section.
 *
 * **When to use:**
 * - Inside a `ControlSection`, for controls that belong to the section's
 *   subject but are not the ones people reach for
 * - Never as the only thing in a section. A section whose entire content is one
 *   closed sub-group is two chevrons where one would do
 *
 * **Key features:**
 * - Deliberately quieter than a section: no rule above it, a 10px name in the
 *   secondary text colour, and a smaller chevron
 * - Built on Mantine's `Accordion`, so the header is one real button carrying
 *   the open state and the controls it reveals are a named region it points at.
 *   The chevron is drawn text, not a button of its own
 * - Controlled with `opened` and `onOpenChange`, or uncontrolled with
 *   `defaultOpened`
 * - The chevron follows the text direction, so it points the way the content
 *   will open in a right-to-left interface too
 */
const meta: Meta<typeof ControlSubGroup> = {
    title: "Building a Panel/ControlSubGroup",
    component: ControlSubGroup,
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
type Story = StoryObj<typeof ControlSubGroup>;

const EASINGS = [
    { value: "linear", label: "Linear" },
    { value: "ease-in-out", label: "Ease in out" },
    { value: "spring", label: "Spring" },
];

/**
 * Closed, which is how a sub-group starts unless you say otherwise. The chevron
 * points along the text direction, towards what it will reveal.
 */
export const Default: Story = {
    args: {
        label: "Text effects",
        children: (
            <>
                <ToggleRow label="Outline" />
                <ToggleRow label="Shadow" />
            </>
        ),
    },
};

/**
 * Open from the start. The chevron turns down and the controls are a region
 * named by the header, so a screen reader can jump straight into them.
 */
export const Opened: Story = {
    args: {
        label: "Text effects",
        defaultOpened: true,
        children: (
            <>
                <ToggleRow label="Outline" defaultChecked />
                <ToggleRow label="Shadow" />
                <StyleNumberInput label="Halo width" defaultValue={2} min={0} max={8} />
            </>
        ),
    },
};

/**
 * Where a sub-group belongs: inside a section, under the controls people
 * actually reach for.
 */
export const InsideASection: Story = {
    render: () => (
        <ControlSection label="Labels">
            <ToggleRow label="Labels" defaultChecked />
            <StyleSelect label="Easing" defaultValue="linear" options={EASINGS} />
            <ControlSubGroup label="Text effects">
                <ToggleRow label="Outline" />
                <ToggleRow label="Shadow" />
            </ControlSubGroup>
        </ControlSection>
    ),
};

/**
 * Driven from your own state. `onOpenChange` is given the new state first and
 * the event that caused it second, so one sub-group can close another, or a
 * change can be recorded in an undo history.
 */
export const Controlled: Story = {
    render: function ControlledSubGroups() {
        const [open, setOpen] = useState<string | null>("effects");

        return (
            <Stack gap={4}>
                <ControlSubGroup
                    label="Text effects"
                    opened={open === "effects"}
                    onOpenChange={(opened) => {
                        setOpen(opened ? "effects" : null);
                    }}
                >
                    <ToggleRow label="Outline" />
                    <ToggleRow label="Shadow" />
                </ControlSubGroup>
                <ControlSubGroup
                    label="Animation"
                    opened={open === "animation"}
                    onOpenChange={(opened) => {
                        setOpen(opened ? "animation" : null);
                    }}
                >
                    <StyleSelect label="Easing" defaultValue="linear" options={EASINGS} />
                    <StyleNumberInput label="Duration" defaultValue={200} min={0} max={2000} suffix="ms" />
                </ControlSubGroup>
            </Stack>
        );
    },
};

/**
 * A name too long for the panel shortens with an ellipsis. The whole name stays
 * in the document and in the header button's accessible name, so it is read out
 * in full however narrow the panel is.
 */
export const LongLabel: Story = {
    args: {
        label: "Text effects, outlines and drop shadows",
        children: <ToggleRow label="Outline" />,
    },
};
