import { Box, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import {
    FIELD_GLYPH_NAMES,
    FIELD_LETTERS,
    FieldGlyph,
    type FieldGlyphName,
    type FieldLetter,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    UI_GLYPH_NAMES,
    UiGlyph,
    type UiGlyphName,
} from "../src";

// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * Every drawing the library uses, with its name and what it means.
 *
 * The premise of these components is that a small picture can take the place of
 * a word: a caption drawn inside a field's own box costs no height, while a
 * caption stacked above it costs a whole line. That only works if the pictures
 * are a small, fixed, learnable set -- so there are two registers, and nothing
 * outside them is drawn.
 *
 * - **Field glyphs** are the eight drawings allowed inside a field's 16px slot,
 *   where they stand in for the field's label. `FIELD_GLYPH_NAMES` lists them.
 * - **UI glyphs** are the fifteen shared marks drawn everywhere else: chevrons,
 *   a gear, a close, a plus. `UI_GLYPH_NAMES` lists them.
 *
 * Both components take a `name` and an optional `size`, are drawn from 1.5px
 * strokes on a 16px canvas at 14px by default, and take their colour from
 * whatever contains them -- so a glyph inside a disabled control dims with it,
 * and a glyph on a selected tile inverts with it. Both are hidden from assistive
 * technology, because the control around them already carries the name.
 *
 * If a concept has no drawing, it keeps its word. That is the whole rule, and it
 * is why the registers are closed.
 */
const meta: Meta<typeof FieldGlyph> = {
    title: "Glyphs/Glyph Gallery",
    component: FieldGlyph,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
};

export default meta;
type Story = StoryObj<typeof FieldGlyph>;

/** What each field glyph means, in the order the register lists them. */
const FIELD_GLYPH_MEANINGS: Record<FieldGlyphName, string> = {
    sizeSmallest: "The low end of a size range: the smallest a thing gets.",
    sizeLargest: "The high end of a size range: the largest a thing gets.",
    width: "A width or a thickness -- of a line, a stroke, a gap.",
    opacity: "How opaque something is, from clear through to solid.",
    attribute: "The value is read from a data attribute rather than typed.",
    scaleSqrt: "A square-root mapping, which spreads out the low end of a range.",
    scaleLinear: "A straight mapping: equal steps in give equal steps out.",
    scaleLog: "A logarithmic mapping, which compresses the high end of a range.",
};

/** What each capital letter stands for when a field shows one instead of a drawing. */
const FIELD_LETTER_MEANINGS: Record<FieldLetter, string> = {
    N: "A count of nodes.",
    E: "A count of edges.",
    W: "A weight.",
    D: "A depth, or a number of hops.",
    K: "The parameter conventionally called k.",
};

/** What each shared UI glyph means. */
const UI_GLYPH_MEANINGS: Record<UiGlyphName, string> = {
    chevronDown: "An open section. Activating it folds the section away.",
    chevronRight: "A closed section, in a left-to-right interface.",
    chevronLeft: "A closed section, in a right-to-left interface: the mirror of chevronRight.",
    close: "Dismiss this panel.",
    plus: "Add one -- a colour stop, a rule -- or set up a section that is still empty.",
    minus: "Remove one. Drawn at the same weight as plus, so adding and removing match.",
    gear: "Advanced settings, opened in a pop-out.",
    warning: "A caveat: the result is approximate, or covers only part of the data.",
    check: "Done, or on.",
    eye: "Whether something is drawn.",
    refresh: "Run it again.",
    copy: "Copy to the clipboard.",
    pin: "Keep this on screen.",
    info: "An explanation, revealed on hover, on focus or on tap.",
    reset: "Return this value to its default. The same drawing as close: the two differ by their accessible name, not by their shape.",
};

/** The narrowest one entry in the gallery grid is allowed to be. */
const CARD_WIDTH = 260;

/** How wide the gallery grows before it stops adding columns. */
const GALLERY_MAX_WIDTH = 900;

/** The side of the tile a glyph is drawn on, which is the field's own 24px box. */
const TILE = PANEL_GRID.CONTROL_HEIGHT;

/**
 * One entry: the drawing or drawings, the name to pass, and the meaning.
 * @param root0 - Component props
 * @param root0.name - The name to pass to the glyph component
 * @param root0.meaning - What the drawing means
 * @param root0.children - The drawing, or the hollow and filled pair
 * @returns One gallery entry
 */
function GlyphCard({
    name,
    meaning,
    children,
}: {
    name: string;
    meaning: string;
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <Box
            style={{
                display: "flex",
                gap: PANEL_GRID.GUTTER,
                alignItems: "flex-start",
            }}
        >
            <Box style={{display: "flex", gap: 4, flex: "0 0 auto"}}>{children}</Box>
            <Box style={{minWidth: 0}}>
                <Text size="sm" c={PANEL_INK.VALUE} ff="monospace">
                    {name}
                </Text>
                <Text size="xs" c={PANEL_INK.CHROME}>
                    {meaning}
                </Text>
            </Box>
        </Box>
    );
}

/**
 * The 24px tile a glyph is drawn on, painted in the colour of a field so that
 * the drawings read the way they will in a panel.
 * @param root0 - Component props
 * @param root0.children - The glyph to draw
 * @returns The tile
 */
function Tile({children}: {children: React.ReactNode}): React.JSX.Element {
    return (
        <Box
            style={{
                width: TILE,
                height: TILE,
                borderRadius: "var(--mantine-radius-sm)",
                background: PANEL_INK.SURFACE,
                color: PANEL_INK.CHROME,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {children}
        </Box>
    );
}

/**
 * A grid of gallery entries, three to a row on a wide screen and fewer as the
 * page narrows.
 * @param root0 - Component props
 * @param root0.caption - What the drawings in the leading column or columns are
 * @param root0.children - The entries
 * @returns The grid, under its caption
 */
function Gallery({caption, children}: {caption: string; children: React.ReactNode}): React.JSX.Element {
    return (
        <Stack gap={PANEL_GRID.GUTTER} style={{maxWidth: GALLERY_MAX_WIDTH}}>
            <Text size="xs" c={PANEL_INK.CHROME}>
                {caption}
            </Text>
            <Box
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(auto-fill, minmax(${String(CARD_WIDTH)}px, 1fr))`,
                    gap: PANEL_GRID.PAD_LEFT,
                }}
            >
                {children}
            </Box>
        </Stack>
    );
}

/**
 * The eight field glyphs, each drawn twice: hollow on the left, filled on the
 * right.
 *
 * **Hollow means the value is the reader's own.** A number they typed, a colour
 * they picked, a default nobody has touched.
 *
 * **Filled means the value is bound to data.** The field is showing what an
 * attribute says rather than a fixed number, so the same panel with a different
 * node selected will show something else. Pass `bound` to a `PanelField` and its
 * glyph fills in; pass `filled` to draw one directly.
 *
 * The three scale curves are drawn from open strokes and have no closed shape to
 * fill, so they look the same either way. That is expected, not a bug: a scale
 * is never bound to data.
 */
export const FieldGlyphs: Story = {
    render: (): React.JSX.Element => (
        <Gallery caption="Hollow on the left, filled on the right.">
            {FIELD_GLYPH_NAMES.map((name) => (
                <GlyphCard key={name} name={name} meaning={FIELD_GLYPH_MEANINGS[name]}>
                    <Tile>
                        <FieldGlyph name={name} />
                    </Tile>
                    <Tile>
                        <FieldGlyph name={name} filled />
                    </Tile>
                </GlyphCard>
            ))}
        </Gallery>
    ),
};

/**
 * The five capital letters a field may show when a concept has no drawing.
 *
 * They are the last resort, and the register is deliberately tiny: a letter is
 * only readable as a label when there are few enough of them to learn, and a
 * sixth would make the set a code rather than a vocabulary. Pass one as a
 * field's `glyph` exactly as you would a drawing.
 */
export const FieldLetters: Story = {
    render: (): React.JSX.Element => (
        <Gallery caption="Each letter shown in the field it would appear in.">
            {FIELD_LETTERS.map((letter) => (
                <GlyphCard key={letter} name={`"${letter}"`} meaning={FIELD_LETTER_MEANINGS[letter]}>
                    <PanelField
                        label={FIELD_LETTER_MEANINGS[letter]}
                        glyph={letter}
                        kind="number"
                        width={PANEL_GRID.FIELD}
                        defaultValue={12}
                    />
                </GlyphCard>
            ))}
        </Gallery>
    ),
};

/**
 * The fifteen shared marks, drawn everywhere except inside a field's slot.
 *
 * Two of them repay a second look. `close` and `reset` are the same drawing,
 * because dismissing a panel and clearing a value are the same gesture to a
 * reader; they are told apart by the name each one is given, not by their shape.
 * And `minus` is the horizontal bar of `plus`, so a control that adds and a
 * control that removes sit at the same visual weight.
 */
export const UiGlyphs: Story = {
    render: (): React.JSX.Element => (
        <Gallery caption="Fifteen marks, drawn everywhere except inside a field's slot.">
            {UI_GLYPH_NAMES.map((name) => (
                <GlyphCard key={name} name={name} meaning={UI_GLYPH_MEANINGS[name]}>
                    <Tile>
                        <UiGlyph name={name} />
                    </Tile>
                </GlyphCard>
            ))}
        </Gallery>
    ),
};

/**
 * The glyphs doing their job: standing in for the caption a field would
 * otherwise stack above itself.
 *
 * Every field here is 24px tall, and every value starts 24px from the field's
 * leading edge, because the 16px slot holding the drawing is what puts it there.
 * That is the whole saving: four labelled values in the height two
 * caption-above-input pairs would have taken.
 *
 * The last field is bound to an attribute, so its glyph is filled.
 */
export const InAField: Story = {
    render: (): React.JSX.Element => (
        <Box w={PANEL_GRID.WIDTH}>
            <Stack gap={PANEL_GRID.GUTTER}>
                <Box style={{display: "flex", gap: PANEL_GRID.GUTTER}}>
                    <PanelField label="Smallest node size" glyph="sizeSmallest" kind="number" defaultValue={1} />
                    <PanelField label="Largest node size" glyph="sizeLargest" kind="number" defaultValue={4} />
                </Box>
                <Box style={{display: "flex", gap: PANEL_GRID.GUTTER}}>
                    <PanelField label="Edge width" glyph="width" kind="number" defaultValue={2} />
                    <PanelField label="Opacity" glyph="opacity" kind="number" unit="%" defaultValue={80} />
                </Box>
                <PanelField
                    label="Size attribute"
                    glyph="attribute"
                    bound
                    width={PANEL_GRID.BODY}
                    defaultValue="degree"
                />
            </Stack>
        </Box>
    ),
};

/**
 * Sizes. Both components draw at 14px by default, which is the size that fits a
 * field's 16px slot, and both take a `size` in pixels for anywhere else.
 *
 * Colour is never set by the drawing: it is `currentColor`, inherited from
 * whatever contains it. Set the colour on the parent, and a glyph dims with a
 * disabled control and inverts on a selected one without being told to.
 */
export const Sizes: Story = {
    render: (): React.JSX.Element => (
        <Box style={{display: "flex", gap: PANEL_GRID.PAD_LEFT, alignItems: "flex-end"}}>
            {[12, 14, 20, 32, 48].map((size) => (
                <Box key={size} style={{textAlign: "center", color: PANEL_INK.VALUE}}>
                    <UiGlyph name="gear" size={size} />
                    <Text size="xs" c={PANEL_INK.CHROME}>
                        {size}px
                    </Text>
                </Box>
            ))}
            <Box style={{textAlign: "center", color: PANEL_INK.ACCENT}}>
                <UiGlyph name="gear" size={32} />
                <Text size="xs" c={PANEL_INK.CHROME}>
                    inherited
                </Text>
            </Box>
        </Box>
    ),
};
