import { Box, DirectionProvider, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    AdvancedButton,
    DoorButton,
    LabelsProvider,
    PANEL_GRID,
    PanelField,
    TrailingSlot,
    UiGlyph,
} from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A small button that opens the advanced settings for a row or a section.
 *
 * **Purpose:** a panel row shows the one or two controls that are adjusted
 * often. Everything rarer goes behind this button, which opens a pop-out
 * holding the rest -- which is what keeps a row down to a single line without
 * losing the rest of the control.
 *
 * **When to use:**
 * - In the 24px trailing slot at the end of a row, or in a section header's
 *   actions
 * - Always beside something else, never on its own: a section whose only
 *   content is this button hides everything it does
 *
 * **The `changed` flag:** the button hides its own contents, so this is the
 * only signal a reader gets that something behind it is no longer at its
 * default. A changed button draws in the primary text colour instead of the
 * secondary one, and states the change in its accessible name, so a reader who
 * cannot see the difference in colour still hears it. Pass it from the same
 * state the pop-out edits.
 *
 * **Built on Mantine's `ActionIcon`**, so hover, active, disabled and loading
 * states, the focus ring, and Enter and Space activation all come from the same
 * place as the rest of your app.
 */
const meta: Meta<typeof AdvancedButton> = {
    title: "Building a Panel/AdvancedButton",
    component: AdvancedButton,
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
type Story = StoryObj<typeof AdvancedButton>;

/**
 * Everything behind the button is at its default: the gear draws in the
 * secondary text colour, and the button is named after what it opens.
 */
export const Default: Story = {
    args: {
        label: "Image export options",
        onClick: () => undefined,
    },
};

/**
 * Something behind the button has been changed from its default: the same gear
 * draws in the primary text colour, and the accessible name says so as well.
 * This difference is the whole point of the component.
 */
export const Changed: Story = {
    args: {
        label: "Image export options",
        changed: true,
        onClick: () => undefined,
    },
};

/**
 * The two states side by side, which is the only way to read the difference.
 * Hover the second one to hear its name: "Selection style has configured
 * values".
 */
export const BothStates: Story = {
    render: (): React.JSX.Element => (
        <Group gap={PANEL_GRID.TRIPLE_GAP}>
            <AdvancedButton label="Image export options" onClick={() => undefined} />
            <AdvancedButton label="Selection style" changed onClick={() => undefined} />
        </Group>
    ),
};

/**
 * A button with its own glyph rather than the gear, for a section whose extra
 * settings have a shape of their own.
 */
export const CustomIcon: Story = {
    args: {
        label: "Range and scale",
        icon: <UiGlyph name="chevronRight" size={PANEL_GRID.CHEVRON} />,
        onClick: () => undefined,
    },
};

/**
 * A button that cannot be used yet -- there is nothing behind it to open. It is
 * dimmed by the theme, refuses activation, and is skipped by the Tab key.
 */
export const Disabled: Story = {
    args: {
        label: "Image export options",
        disabled: true,
        onClick: () => undefined,
    },
};

/**
 * What is behind the button is still being worked out by a background job: the
 * glyph is replaced by a spinner, activation is refused, and the button reports
 * itself as busy to a screen reader.
 */
export const Loading: Story = {
    args: {
        label: "Degree distribution options",
        loading: true,
        onClick: () => undefined,
    },
};

/**
 * Where the button actually lives: the fixed 24px slot at the end of a row.
 */
export const InARow: Story = {
    render: (): React.JSX.Element => (
        <Group gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
            <PanelField label="Size by attribute" glyph="attribute" value="Age" bound select width={PANEL_GRID.BODY} />
            <TrailingSlot>
                <AdvancedButton label="Range and scale" changed onClick={() => undefined} />
            </TrailingSlot>
        </Group>
    ),
};

/**
 * The slot keeps its width whether or not it holds anything, so the last
 * control of every row lines up in one column. The middle row here has no
 * button and still ends level with the two that do -- that is the empty slot
 * doing its job, and the reason a row never simply leaves it out.
 */
export const EmptySlotKeepsTheColumn: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.GUTTER}>
            {[
                { label: "Node size", value: "1.0", trailing: true },
                { label: "Edge width", value: "0.5", trailing: false },
                { label: "Label size", value: "12", trailing: true },
            ].map((row) => (
                <Group key={row.label} gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.CONTROL_HEIGHT}>
                    <PanelField label={row.label} value={row.value} width={PANEL_GRID.BODY} />
                    <TrailingSlot>
                        {row.trailing ? <AdvancedButton label={`${row.label} options`} onClick={() => undefined} /> : null}
                    </TrailingSlot>
                </Group>
            ))}
        </Stack>
    ),
};

/**
 * The same row under a right-to-left direction. The slot writes no left or
 * right property of its own, so the row reverses and the button lands on the
 * other side without a single style changing.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <Box dir="rtl">
                <Group gap={PANEL_GRID.TRAIL_GAP} wrap="nowrap" h={PANEL_GRID.ROW_PITCH}>
                    <PanelField label="Size by attribute" glyph="attribute" value="Age" width={PANEL_GRID.BODY} />
                    <TrailingSlot>
                        <AdvancedButton label="Range and scale" changed onClick={() => undefined} />
                    </TrailingSlot>
                </Group>
            </Box>
        </DirectionProvider>
    ),
};

/**
 * Every string this library produces can be replaced. The sentence a changed
 * button adds to its own name comes from `LabelsProvider`, so a translated app
 * gets a translated name; hover the button to read it.
 */
export const TranslatedLabels: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider
            locale="fr-FR"
            labels={{ sectionHasConfiguredValues: (label: string): string => `${label} : valeurs modifiees` }}
        >
            <Group gap={PANEL_GRID.TRIPLE_GAP}>
                <AdvancedButton label="Exportation d'image" onClick={() => undefined} />
                <AdvancedButton label="Exportation d'image" changed onClick={() => undefined} />
            </Group>
        </LabelsProvider>
    ),
};

/**
 * The component used to be called `DoorButton`, and its `changed` flag used to
 * be called `deviates`. Both still work and mean exactly what they always did,
 * so nothing has to be rewritten to upgrade; new code should use
 * `AdvancedButton` and `changed`.
 */
export const FormerName: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={PANEL_GRID.GUTTER}>
            <Text size="xs" c="dimmed">
                {"<DoorButton deviates /> still renders the changed button."}
            </Text>
            <Group gap={PANEL_GRID.TRIPLE_GAP}>
                <DoorButton label="Image export options" onClick={() => undefined} />
                <DoorButton label="Selection style" deviates onClick={() => undefined} />
            </Group>
        </Stack>
    ),
};
