import { Box, DirectionProvider } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    AdvancedButton,
    FieldRow,
    PANEL_GRID,
    PanelField,
    PanelLabelsProvider,
    UiGlyph,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * The row a dense property panel is mostly made of: one or two compact fields
 * and a fixed slot at the end.
 *
 * **Why it exists.** A conventional form stacks a caption above its input,
 * which costs a line of the panel for every value. A field row puts the caption
 * inside the field instead, as a glyph, so the row stands 32px tall rather than
 * 37 and a panel of twenty values comes out around half its usual height.
 *
 * **How the width is spent.** The row owns the widths and the gaps; each field
 * owns everything inside its own box. Whichever arrangement you pick, the row
 * fills exactly the same 256px band, so a column of unrelated rows still reads
 * as one grid:
 *
 * - two fields side by side: `108 + 8 + 108 + 8 + 24`
 * - one field beside a trailing control: `224 + 8 + 24`
 * - one field alone: `232 + 24` -- with no control to be held apart from, the
 *   field takes the 8px gap for itself
 *
 * **When to reach for it.** Any changeable value: a number, a name, a choice, a
 * colour. Put two fields on one row when they are two ends of one property, such
 * as a smallest and a largest size, and name the pair with `groupLabel` so a
 * screen reader announces it as one group. Use `CompoundRow` instead when two
 * values are parts of a single control, and `DataRow` for the reader's own
 * strings rather than for settings.
 *
 * **The trailing slot** is drawn whether or not it holds anything, which is what
 * makes a row with no extra control end level with a row that has one. It is for
 * the row's one rare control -- an advanced settings button, or a small reset. A
 * select's chevron is not one of those: it belongs inside the field's own box.
 *
 * **Right to left** needs no configuration. Every gap is written as a CSS
 * logical property, so under `dir="rtl"` the gutter stays between the pair and
 * the trailing slot stays at the end of the row. See the *Right To Left* story.
 *
 * **Control labels.** `PanelLabelsProvider` turns on a preference that writes
 * each control's word beside it. A row holding two fields then splits into two
 * rows of one field each, with the word in a 76px column -- never into a
 * two-line stack. See the *With Labels* story.
 */
const meta: Meta<typeof FieldRow> = {
    title: "Building a Panel/FieldRow",
    component: FieldRow,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    argTypes: {
        // Both take arbitrary markup, which no control can edit. Their
        // descriptions come from the props' own documentation, so nothing is
        // restated here.
        children: { control: false },
        trailing: { control: false },
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
type Story = StoryObj<typeof FieldRow>;

/**
 * Two fields on one row, at 108px each with an 8px gutter between them. The
 * trailing slot holds nothing and is drawn anyway, so this row ends exactly
 * where every other row in the panel ends.
 */
export const Default: Story = {
    args: {
        children: (
            <>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </>
        ),
    },
};

/**
 * The same pair with `groupLabel` set. Nothing changes on screen; the row now
 * carries the WAI-ARIA `group` role and that name, so a screen reader announces
 * "Node size range" once before reading either field instead of reading two
 * unrelated values. Name a pair whenever the two fields are two ends of one
 * property.
 */
export const NamedGroup: Story = {
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
 * One 224px field beside an advanced settings button. The filled glyph says the
 * size is driven by the `Betweenness` attribute rather than set to a fixed
 * number, and the chevron that opens the attribute list sits inside the field's
 * box. The button opens the settings almost nobody changes -- here, the range
 * the attribute is mapped onto and the scale it is mapped with.
 */
export const SingleWithAdvancedSettings: Story = {
    args: {
        trailing: <AdvancedButton label="Range and scale" onClick={() => undefined} />,
        children: <PanelField label="Size by attribute" glyph="attribute" value="Betweenness" bound select />,
    },
};

/**
 * One field with nothing trailing. The field spans 232 rather than 224: with no
 * control to be held apart from, it absorbs the 8px gap, and the row still ends
 * where the others do.
 */
export const SingleAlone: Story = {
    args: {
        children: <PanelField label="Layout" value="Force directed" select />,
    },
};

/**
 * A selection whose members disagree. Three selected nodes share an opacity but
 * not a size, so the size reads "Mixed" -- in the ordinary value colour, and
 * still editable, because setting it sets all three. The advanced settings
 * button is marked `changed`, which both darkens it and says so in its
 * accessible name.
 */
export const MultiSelection: Story = {
    args: {
        trailing: <AdvancedButton label="Selection style" changed onClick={() => undefined} />,
        children: (
            <>
                <PanelField label="Node size" glyph="sizeLargest" value="2.5" mixed />
                <PanelField label="Node opacity" glyph="opacity" value="100" unit="%" />
            </>
        ),
    },
};

/**
 * Three rows on the 32px pitch. Every field's value begins 24px from its own
 * leading edge whatever the row holds, which is what lets a stack of unrelated
 * rows read as one column.
 */
export const Rhythm: Story = {
    render: (): React.JSX.Element => (
        <>
            <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                <PanelField label="Size by attribute" glyph="attribute" value="Age" bound select />
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
 * The glyph is also the handle: drag it to change the value, left to go down and
 * right to go up. That is what earns a field the right to drop the caption above
 * it. Drag either glyph to size the nodes.
 */
export const Scrubbable: Story = {
    render: (): React.JSX.Element => <ScrubbableRow />,
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
 * The same three rows with the text direction reversed. Nothing here is
 * configured for it: every gap the row spends is a CSS logical property, so the
 * gutter stays between the pair, the trailing slot stays at the end of the row,
 * and all three arrangements still spend exactly 256px.
 *
 * Set the direction the way you would in your own app -- a `dir` attribute, or
 * Mantine's `DirectionProvider` -- and compare this story with *Rhythm* above.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <div dir="rtl">
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                    <PanelField label="Size by attribute" glyph="attribute" value="Age" bound select />
                </FieldRow>
                <FieldRow groupLabel="Node size range">
                    <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                    <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
                </FieldRow>
                <FieldRow>
                    <PanelField label="Layout" value="Force directed" select />
                </FieldRow>
            </div>
        </DirectionProvider>
    ),
};

/**
 * The `showLabels` preference, which is off by default. When a consumer turns it
 * on -- typically from a setting of their own -- every control writes its word
 * beside its glyph, and a row holding two fields becomes two rows of one field
 * each: the word in a 76px column in the secondary text colour, the field
 * filling what is left, and the row's one trailing control staying on the first
 * of the two rows. Never a two-line stack, and the word is printed once, by the
 * column.
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
        </PanelLabelsProvider>
    ),
};

/**
 * A single field with the same preference on keeps its one row: there is no pair
 * to split, so the word joins the glyph inside the box instead of taking a
 * column of its own.
 */
export const SingleWithLabels: Story = {
    render: (): React.JSX.Element => (
        <PanelLabelsProvider showLabels>
            <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={() => undefined} />}>
                <PanelField label="Layout" value="Hierarchical" select />
            </FieldRow>
        </PanelLabelsProvider>
    ),
};

/**
 * The labelled rows with the direction reversed as well. The column, the field
 * and the trailing slot come out in the same order they do above, reading from
 * the start of the line rather than from the left of it.
 */
export const LabelsRightToLeft: Story = {
    render: (): React.JSX.Element => (
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <div dir="rtl">
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
                </PanelLabelsProvider>
            </div>
        </DirectionProvider>
    ),
};
