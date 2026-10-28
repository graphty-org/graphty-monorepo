import { Box, Group, Stack, TextInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import type React from "react";
import { expect, within } from "storybook/test";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.
import { ComboInput, CompactColorInput, PanelField, PopoutManager } from "../../../src";
import { StateCell } from "../../helpers/force-state";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * The three states every style field is in, drawn the same way by each kind of field: a number
 * (`PanelField` of kind number, and `ComboInput` with a placeholder), a select (`PanelField` with
 * choices), a color
 * (`CompactColorInput`, as a field and as a chip) and a text box.
 *
 * | State   | Drawn                                                              | Read out                       |
 * |---------|--------------------------------------------------------------------|--------------------------------|
 * | Not set | what is in force without it, as Figma draws a value or placeholder | "Size, not set, 10"            |
 * | Set     | the value in the body ink                                           | "Node color, set here"         |
 * | Mixed   | the word "Mixed" in the value's ink (Figma), and no color swatch    | "Size, Mixed"                  |
 *
 * The state is in the field's name, not in a gray or a slant Figma does not draw. A field that is
 * empty has no value, so a number field reads its words, not a 0 nobody set.
 *
 * A text box takes the same not-set look with `data-is-default="true"` while it shows its
 * placeholder.
 *
 * The chip form of the color (`variant="chip"`) is the swatch alone, 24 px square, for a row that
 * names its color beside it (an effect, a category of a varied value). Its name says the state and
 * the color; Mixed draws a dash, not a color.
 */
const meta: Meta = {
    title: "Components/Inputs/Field States",
    parameters: { layout: "padded" },
    decorators: [
        (Story) => (
            <PopoutManager>
                <Box w={520} p={16} bg="var(--cm-bg)">
                    <Story />
                </Box>
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj;

const SHAPES = [
    { value: "icosphere", label: "Icosphere" },
    { value: "box", label: "Box" },
];

type FieldState = "not set" | "set" | "mixed";

/**
 * One field of every kind in one state.
 * @param props - Component props
 * @param props.state - which state to draw
 * @returns the row of fields
 */
function Row({ state }: Readonly<{ state: FieldState }>): React.JSX.Element {
    const set = state === "set";
    const mixed = state === "mixed";
    let comboPlaceholder: string | undefined = "1";
    if (mixed) {
        comboPlaceholder = "Mixed";
    } else if (set) {
        comboPlaceholder = undefined;
    }
    return (
        <Stack gap={8}>
            <Group gap={8} wrap="nowrap" align="flex-end">
                <Box w={96}>
                    <PanelField
                        kind="number"
                        label="Size"
                        value={set ? 4 : null}
                        placeholder="10"
                        mixed={mixed}
                        width="fill"
                    />
                </Box>
                <Box w={120}>
                    <PanelField
                        label="Shape"
                        value={set ? "box" : null}
                        placeholder="Icosphere"
                        data={SHAPES}
                        mixed={mixed}
                        width="fill"
                    />
                </Box>
                <CompactColorInput
                    label="Color"
                    color={set ? "#D55E00" : undefined}
                    defaultColor="#3388FF"
                    showOpacity={false}
                    mixed={mixed}
                    width={120}
                />
            </Group>
            <Group gap={8} wrap="nowrap" align="flex-end">
                <ComboInput
                    label={`Width, ${state}`}
                    numeric
                    options={[]}
                    variant="outlined"
                    value={set ? 2 : ""}
                    placeholder={comboPlaceholder}
                    width={96}
                />
                <TextInput
                    size="xs"
                    variant="outlined"
                    label="Text"
                    w={120}
                    placeholder={mixed ? "Mixed" : "Valjean"}
                    defaultValue={set ? "Javert" : ""}
                    data-is-default={set ? "false" : "true"}
                />
                <CompactColorInput
                    aria-label="Group 3"
                    variant="chip"
                    color={set ? "#D55E00" : undefined}
                    defaultColor="#3388FF"
                    showOpacity={false}
                    mixed={mixed}
                />
            </Group>
        </Stack>
    );
}

/**
 * Not set, set and Mixed, one row of every field kind each, light and dark side by side. Every
 * field draws Figma's ink, upright; no Mixed color draws a swatch.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={16}>
            <StateCell label="Not set">
                <Row state="not set" />
            </StateCell>
            <StateCell label="Set">
                <Row state="set" />
            </StateCell>
            <StateCell label="Mixed">
                <Row state="mixed" />
            </StateCell>
        </Stack>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const [notSetChip] = canvas.getAllByRole("button", { name: "Group 3 color, not set, drawn #3388FF" });
        const box = notSetChip.getBoundingClientRect();
        await expect(box.width).toBeGreaterThanOrEqual(24);
        await expect(box.height).toBeGreaterThanOrEqual(24);
        await expect(
            canvas.getAllByRole("button", { name: "Group 3 color, set here, #D55E00" }).length,
        ).toBeGreaterThan(0);
        await expect(canvas.getAllByRole("button", { name: "Group 3 color, Mixed" }).length).toBeGreaterThan(0);
        await expect(canvas.getAllByRole("textbox", { name: "Color, set here" }).length).toBeGreaterThan(0);
    },
};

/**
 * Under a locked panel (`aria-disabled` on an ancestor) every field dims alike: its text, its
 * swatch, the opacity handle and its reset.
 */
export const Locked: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <div aria-disabled="true">
            <Stack gap={8}>
                <CompactColorInput label="Color" color="#D55E00" opacity={80} defaultColor="#3388FF" width={156} />
                <PanelField kind="number" label="Size" value={4} />
                <PanelField label="Shape" value="box" data={SHAPES} />
            </Stack>
        </div>
    ),
};
