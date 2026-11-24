import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState } from "react";

import { FieldRow, PanelLabelsProvider, PopoutManager } from "../../../src";
import { FontPicker, type FontPickerFont, type FontPickerProps } from "../../../src/components/inputs/FontPicker";
import interUrl from "../../../src/fonts/inter-latin-wght-normal.woff2";

/**
 * A field that picks a font family: the CSS generic families, the common fonts this browser can
 * draw, the fonts installed on this computer (where the browser offers them, after the reader asks)
 * and the caller's own, each drawn in its own face. A search box filters by word start; an optional
 * upload takes a font file.
 *
 * ## When to use it
 *
 * Wherever a reader picks a font (a label's face, a title's). compact-mantine never registers or
 * stores a font: an upload's bytes go to `onUpload`, the caller registers them (a `FontFace`, or a
 * library's own font store) and passes the font back in `fonts`, listed under "Uploaded". It needs a
 * `PopoutManager` above it.
 *
 * ## Usage
 *
 * ```tsx
 * const [font, setFont] = useState<string | null>("sans-serif");
 * <FontPicker label="Label font" value={font} onChange={setFont} />
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - The field opens on a click, Enter, Space or ArrowDown; focus lands in the search box.
 * - The search box owns the list (`aria-controls`, `aria-activedescendant`): ArrowUp / ArrowDown,
 *   Home / End move, Enter picks, Escape clears the search and then closes. The pick closes the
 *   pop-out and focus returns to the field.
 * - Options are grouped and labeled; the font in force is the checked option (`aria-selected`).
 * - "Show fonts on this computer" and "Upload font" are buttons after the list. A refused file says
 *   why in an alert.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Field | a 24px select field filling its slot |
 * | Pop-out | 240 wide, the list at most 280 tall |
 * | Rows | the listbox's 24px rows, each family drawn in its own face |
 */
const meta: Meta<typeof FontPicker> = {
    title: "Components/Inputs/FontPicker",
    component: FontPicker,
    decorators: [
        (Story) => (
            <PopoutManager>
                <Box w={192}>
                    <Story />
                </Box>
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof FontPicker>;

/**
 * A FontPicker holding its value in story state.
 * @param props - FontPicker's props, less the value
 * @returns The picker
 */
function Stateful(props: Omit<FontPickerProps, "value" | "onChange"> & { initial?: string }): React.JSX.Element {
    const { initial = "sans-serif", ...rest } = props;
    const [font, setFont] = useState<string | null>(initial);
    return <FontPicker {...rest} value={font} onChange={setFont} />;
}

/** The field alone, on the generic sans-serif family. */
export const Default: Story = {
    render: () => <Stateful label="Label font" />,
};

/** In a FieldRow with labels on: the caption sits above the field, never beside it. */
export const InFieldRow: Story = {
    render: () => (
        <PanelLabelsProvider showLabels>
            <FieldRow>
                <Stateful label="Label font" initial="serif" />
            </FieldRow>
        </PanelLabelsProvider>
    ),
};

/** Off, with the reason in its tooltip and description. */
export const Disabled: Story = {
    render: () => <Stateful label="Label font" disabled disabledReason="Labels are off" />,
};

/**
 * With uploads: Inter is registered by the story through `FontFace` and passed in `fonts`, and a
 * font the reader uploads is registered the same way and appended.
 */
export const WithUploads: Story = {
    render: function WithUploads() {
        const [fonts, setFonts] = useState<FontPickerFont[]>([]);
        const [font, setFont] = useState<string | null>("Inter Story");
        useEffect(() => {
            const face = new FontFace("Inter Story", `url(${interUrl})`);
            void face.load().then(() => {
                document.fonts.add(face);
                setFonts([{ family: "Inter Story", label: "Inter" }]);
            });
        }, []);
        return (
            <FontPicker
                label="Label font"
                value={font}
                onChange={setFont}
                fonts={fonts}
                onUpload={async ({ bytes, family }) => {
                    const face = new FontFace(family, bytes);
                    await face.load();
                    document.fonts.add(face);
                    setFonts((all) => [...all, { family }]);
                }}
            />
        );
    },
};

/** A held stack on no list: its first family shows, and is listed and checked at the end of Common fonts. */
export const HeldValueOffList: Story = {
    render: () => <Stateful label="Code font" initial="Fira Code, monospace" />,
};
