import { Box, DirectionProvider } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { AdvancedButton, FieldRow, PANEL_GRID, PanelField, PanelLabelsProvider, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

/**
 * The row a property panel is mostly made of: one or two compact fields and a
 * fixed 24px slot at the end, 32px tall.
 *
 * A conventional form stacks a caption above each input, which costs a line of
 * the panel per value. A field row puts the caption inside the field as a glyph,
 * so a panel of twenty values comes out around half its usual height. The row
 * owns the widths and the gaps; each field owns everything inside its box.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | **FieldRow** | Any changeable value -- a number, a name, a choice, a color -- or two that are the two ends of one property, such as a smallest and a largest size. |
 * | **PanelField** | The field itself. A FieldRow lays out one or two of them; do not size them yourself. |
 * | **CompoundRow** | Two or three values that are parts of one thing (a color and its opacity), in one box. |
 * | **TrailingSlot** | You are laying out a row of your own by hand and need the same 24px end column. |
 *
 * ## Usage
 *
 * ```tsx
 * import { AdvancedButton, FieldRow, PanelField } from "@graphty/compact-mantine";
 *
 * <FieldRow
 *     groupLabel="Node size range"
 *     trailing={<AdvancedButton label="Range and scale" onClick={openRange} />}
 * >
 *     <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
 *     <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
 * </FieldRow>
 * ```
 *
 * The trailing slot is drawn whether or not it holds anything, which is what
 * makes a row with no extra control end level with one that has. Put the row's
 * one rare control there: an advanced settings button or a small reset. A
 * select's chevron is not one of those; it lives inside the field's box.
 *
 * **Control labels.** `PanelLabelsProvider showLabels` writes each field's word
 * as a caption above its column and the row grows to 50px. With
 * `labelPosition="inline"` a pair splits into two rows instead, each with its
 * word in a 72px column. Either way the word is printed once.
 *
 * ## Keyboard and accessibility
 *
 * - The row adds no tab stop; Tab moves through its fields and its trailing
 *   control in reading order.
 * - `groupLabel` gives the row the `group` role and that name, never drawn, so
 *   a screen reader announces the pair as one group. Use `aria-labelledby`
 *   instead when the name is already on screen. Unnamed, the row adds nothing
 *   to the accessibility tree.
 * - Every gap is a CSS logical property, so `dir="rtl"` needs no configuration.
 * - More than two fields is a mistake and warns in development.
 *
 * ## Measurements
 *
 * | Arrangement | Widths (px, inside the 216px content band) |
 * |---|---|
 * | Pair | 88 + 8 + 88 + 8 + 24 |
 * | One field beside a trailing control | 184 + 8 + 24 |
 * | One field alone | 192 + 24 (the field takes the 8px gap) |
 * | Row height | 32, a 24px control centered |
 * | With captions above | 50 (4 + 14 caption + 4 + 24 control + 4) |
 * | Inline label column | 72 + 8 gutter |
 */
const meta: Meta<typeof FieldRow> = {
    title: "Components/Panels and rows/FieldRow",
    component: FieldRow,
    parameters: {
        layout: "padded",
    },
    argTypes: {
        // Both take arbitrary markup, which no control can edit.
        children: { control: false },
        trailing: { control: false },
        labelPosition: { control: "inline-radio", options: ["above", "inline"] },
    },
    decorators: [
        // Every story sits in a 240px panel with a section's 16 | 8 content padding; States
        // lays out several panels side by side, so it brings its own.
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
type Story = StoryObj<typeof FieldRow>;

/**
 * Two fields on one row, 88px each with an 8px gutter. The trailing slot holds
 * nothing and is drawn anyway, so this row ends where every other row ends.
 */
export const Default: Story = {
    args: {
        groupLabel: "Node size range",
        children: (
            <>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </>
        ),
    },
};

/**
 * The row's arrangements, light and dark: a pair, one field beside a trailing
 * control (184), one field alone (192), the labeled row with a caption above
 * each column (50px), and the inline labels layout.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StoryStates>
            <StoryState name="Pair" padded>
                <FieldRow>
                    <PanelField label="X" value="100" />
                    <PanelField label="Y" value="40" />
                </FieldRow>
            </StoryState>
            <StoryState name="Body and trailing" padded>
                <FieldRow trailing={<AdvancedButton label="Range and scale" />}>
                    <PanelField label="Size by attribute" value="Betweenness" kind="select" />
                </FieldRow>
            </StoryState>
            <StoryState name="Alone" padded>
                <FieldRow>
                    <PanelField label="Layout" value="Force directed" kind="select" />
                </FieldRow>
            </StoryState>
            <StoryState name="Captions above" padded>
                <PanelLabelsProvider showLabels>
                    <FieldRow trailing={<AdvancedButton label="Individual corners" />}>
                        <PanelField label="Opacity" glyph="opacity" value="100%" />
                        <PanelField label="Corner radius" glyph="width" value="0" />
                    </FieldRow>
                </PanelLabelsProvider>
            </StoryState>
            <StoryState name="Inline labels" padded>
                <PanelLabelsProvider showLabels>
                    <FieldRow labelPosition="inline">
                        <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                        <PanelField label="Largest" glyph="sizeLargest" value="4.0" />
                    </FieldRow>
                </PanelLabelsProvider>
            </StoryState>
        </StoryStates>
    ),
};

/**
 * A pair with a reset in the trailing slot. A reset and an advanced settings
 * button are the two things that belong out there.
 */
export const PairWithReset: Story = {
    args: {
        groupLabel: "Node size range",
        trailing: (
            <AdvancedButton
                label="Clear node size"
                icon={<UiGlyph name="close" size={PANEL_GRID.CHEVRON} />}
                onClick={() => undefined}
            />
        ),
        children: (
            <>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </>
        ),
    },
};

/**
 * A selection whose members disagree: three nodes share an opacity but not a
 * size, so the size reads "Mixed" -- still editable, because setting it sets
 * all three. The row's trailing button keeps its ordinary icon ink, as Figma's
 * does beside "Mixed" fields: a multiple selection changes the values, not the
 * buttons. Only `changed` turns the gear to the brand color.
 */
export const MultiSelection: Story = {
    args: {
        trailing: <AdvancedButton label="Selection style" onClick={() => undefined} />,
        children: (
            <>
                <PanelField label="Node size" glyph="sizeLargest" value="2.5" mixed />
                <PanelField label="Node opacity" glyph="opacity" value="100" unit="%" />
            </>
        ),
    },
};

/**
 * Three unrelated rows on the 32px pitch. Every field's value begins 24px from
 * its own leading edge, which is what lets a stack of rows read as one column.
 */
export const Rhythm: Story = {
    render: (): React.JSX.Element => (
        <>
            <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                <PanelField label="Size by attribute" glyph="attribute" value="Age" bound kind="select" />
            </FieldRow>
            <FieldRow groupLabel="Node size range">
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </FieldRow>
            <FieldRow
                groupLabel="Edge appearance"
                trailing={<AdvancedButton label="Edge style options" onClick={() => undefined} />}
            >
                <PanelField label="Edge width" glyph="width" value="1.5" />
                <PanelField label="Edge opacity" glyph="opacity" value="60" unit="%" />
            </FieldRow>
        </>
    ),
};

/**
 * A pair of fields wired to local state, so the glyphs really do scrub.
 * @returns The scrubbable field row
 */
function ScrubbableRow(): React.JSX.Element {
    const [smallest, setSmallest] = React.useState(1);
    const [largest, setLargest] = React.useState(4);

    return (
        <FieldRow
            groupLabel="Node size range"
            trailing={
                <AdvancedButton
                    label="Clear node size"
                    icon={<UiGlyph name="close" size={PANEL_GRID.CHEVRON} />}
                    onClick={() => {
                        setSmallest(1);
                        setLargest(4);
                    }}
                />
            }
        >
            <PanelField
                label="Smallest node size"
                glyph="sizeSmallest"
                value={smallest.toFixed(1)}
                onScrub={(delta) => {
                    setSmallest((current) => Math.max(0.1, current + delta / 20));
                }}
            />
            <PanelField
                label="Largest node size"
                glyph="sizeLargest"
                value={largest.toFixed(1)}
                onScrub={(delta) => {
                    setLargest((current) => Math.max(0.1, current + delta / 20));
                }}
            />
        </FieldRow>
    );
}

/**
 * The glyph is also the handle: drag it left to go down and right to go up.
 * That is what earns a field the right to drop the caption above it.
 */
export const Scrubbable: Story = {
    render: (): React.JSX.Element => <ScrubbableRow />,
};

/**
 * The `showLabels` preference, off by default. Turned on, each column gets its
 * word as a 9px caption above the field and the row grows to 50px; the row's
 * trailing control stays level with the fields.
 */
export const WithLabels: Story = {
    render: (): React.JSX.Element => (
        <PanelLabelsProvider showLabels>
            <FieldRow
                groupLabel="Node size range"
                trailing={
                    <AdvancedButton
                        label="Clear node size"
                        icon={<UiGlyph name="close" size={PANEL_GRID.CHEVRON} />}
                        onClick={() => undefined}
                    />
                }
            >
                <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest" glyph="sizeLargest" value="4.0" />
            </FieldRow>
            <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                <PanelField label="Layout" value="Hierarchical" kind="select" />
            </FieldRow>
        </PanelLabelsProvider>
    ),
};

/**
 * The same preference with `labelPosition="inline"`: a pair becomes two rows of
 * one field each, the word in a 72px column, the trailing control on the first
 * row. Never a two-line stack.
 */
export const WithInlineLabels: Story = {
    render: (): React.JSX.Element => (
        <PanelLabelsProvider showLabels>
            <FieldRow
                groupLabel="Node size range"
                labelPosition="inline"
                trailing={
                    <AdvancedButton
                        label="Clear node size"
                        icon={<UiGlyph name="close" size={PANEL_GRID.CHEVRON} />}
                        onClick={() => undefined}
                    />
                }
            >
                <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest" glyph="sizeLargest" value="4.0" />
            </FieldRow>
        </PanelLabelsProvider>
    ),
};

/**
 * Right to left, with and without labels. Nothing is configured for it: the
 * gutter stays between the pair and the trailing slot stays at the end of the
 * row, reading from the start of the line.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <div dir="rtl">
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                    <PanelField label="Size by attribute" glyph="attribute" value="Age" bound kind="select" />
                </FieldRow>
                <FieldRow groupLabel="Node size range">
                    <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                    <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
                </FieldRow>
                <FieldRow>
                    <PanelField label="Layout" value="Force directed" kind="select" />
                </FieldRow>
                <PanelLabelsProvider showLabels>
                    <FieldRow groupLabel="Node size range">
                        <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                        <PanelField label="Largest" glyph="sizeLargest" value="4.0" />
                    </FieldRow>
                </PanelLabelsProvider>
            </div>
        </DirectionProvider>
    ),
};
