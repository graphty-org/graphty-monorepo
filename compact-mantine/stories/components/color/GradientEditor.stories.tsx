import { Box, Code, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { type ReactNode, useEffect, useRef, useState } from "react";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.
import { ColorPickerPanel, type ColorStop, createColorStop, GradientEditor, LabelsProvider } from "../../../src";
import { ForceState, StateCell } from "../../helpers/force-state";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * An editor for a multi-stop linear gradient: stop handles over a gradient bar, one color
 * picker for the selected stop, a list of stops, and an optional direction row.
 *
 * ## When to use it
 *
 * | You need | Reach for |
 * |---|---|
 * | Several colors at positions along a line, and the angle they run at | **GradientEditor** |
 * | A picker that offers solid or gradient paint | [ColorPickerPanel](?path=/docs/components-color-colorpickerpanel--docs) with a GradientEditor in its `gradient` slot (see `InsideColorPickerPanel` below) |
 * | One color | [CompactColorInput](?path=/docs/components-color-compactcolorinput--docs) |
 * | A picture of a color mapping, not an editor for it | [RampRow](?path=/docs/components-color-ramprow--docs) with `variant="color"` |
 *
 * One stop is selected at a time, and the picker under the bar edits its color. Selecting a
 * stop -- its handle, its row's chit, or focus entering its row -- moves the picker to it. The
 * stop rows open nothing: a row's hex box edits the same color as text. The picker is a
 * ColorPickerPanel without opacity (a stop's color is `#RRGGBB`) and without the paint-type
 * bar, so a GradientEditor inside a ColorPickerPanel's `gradient` slot shows one paint-type bar.
 *
 * It needs no provider: nothing it draws opens a pop-out. It fills its container, and at 240
 * wide (a panel or a pop-over) it lands on Figma's pixels.
 *
 * ## Usage
 *
 * ```tsx
 * import { createColorStop, GradientEditor } from "@graphty/compact-mantine";
 *
 * const [stops, setStops] = useState([createColorStop(0, "#6366F1"), createColorStop(1, "#06B6D4")]);
 * const [angle, setAngle] = useState(90);
 *
 * <GradientEditor
 *     stops={stops}
 *     direction={angle}
 *     onChange={(nextStops, nextAngle) => {
 *         setStops(nextStops);
 *         setAngle(nextAngle);
 *     }}
 *     onChangeStart={beginUndo}
 *     onChangeEnd={commitUndo}
 * />
 * ```
 *
 * Build stops with `createColorStop`: every stop carries an `id`, which keeps the right controls
 * on the right stop as stops are added, removed and reordered. A drag -- of a handle, or in the
 * picker -- reports `onChangeStart` once, `onChange` on every step and `onChangeEnd` once, so a
 * whole drag can be one undo entry. A keyboard step or a typed commit is a complete gesture of
 * its own.
 *
 * ## Keyboard and accessibility
 *
 * - Each handle is a `slider` named "Stop N position": arrows move it 1% (Shift 10%), Home / End
 *   send it to an end, Delete or Backspace removes it. Focusing a handle selects its stop.
 * - A click on the bar adds a stop there, its color mixed from its neighbors; the "+" button is
 *   the keyboard route to a new stop (halfway between the last stop and the end).
 * - In a stop row: the position field steps with ArrowUp / ArrowDown (Shift 10) and commits typed
 *   values on Enter or blur; the chit is a toggle button (`aria-pressed` on the selected stop)
 *   that selects the stop; the hex box commits three or six hex digits on Enter or blur and
 *   reverts on Escape.
 * - The picker has ColorPickerPanel's keys: arrows on the saturation field and the hue slider.
 * - The angle is a `spinbutton` ("Gradient direction"); flip and rotate are named buttons.
 * - `minStops` and `maxStops` bound the list; at either bound the button that would cross it is
 *   disabled.
 * - Every string except the flip and rotate names (the `labels` prop) comes from
 *   `LabelsProvider`, and numbers are written in the reader's locale.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Column | 240 wide |
 * | Gradient bar | 208 x 24, radius 5, over a checkerboard |
 * | Stop handle | 16 x 16 square, 2px white border; selected ringed in the accent |
 * | Picker | full width under the bar, 16px body padding, no opacity |
 * | Stop row | 32 tall: position field 46 wide, paint field, 24px minus button |
 */
const meta: Meta<typeof GradientEditor> = {
    title: "Components/Color/GradientEditor",
    component: GradientEditor,
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <Box w={240} bg="var(--cm-bg)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof GradientEditor>;

const twoStops: ColorStop[] = [createColorStop(0, "#6366F1"), createColorStop(1, "#06B6D4")];

const fiveStops: ColorStop[] = [
    createColorStop(0, "#FF6B6B"),
    createColorStop(0.25, "#F7B731"),
    createColorStop(0.5, "#61D095"),
    createColorStop(0.75, "#5B8FF9"),
    createColorStop(1, "#9B59B6"),
];

/**
 * Selects a stop once on mount by pressing its row's chit, the way a reader would, so a static
 * story can show a stop other than the first selected.
 * @param props - Component props
 * @param props.index - the stop to select, from 0
 * @param props.children - the editor
 * @returns the editor, wrapped
 */
function SelectStop({ index, children }: { index: number; children: ReactNode }): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        ref.current
            ?.querySelectorAll<HTMLButtonElement>("[data-testid='gradient-editor-stop-chit']")
            .item(index)
            ?.click();
    }, [index]);
    return <div ref={ref}>{children}</div>;
}

/** Two stops and the direction row, with the first stop selected in the picker. */
export const Default: Story = {
    args: {
        defaultStops: twoStops,
        defaultDirection: 90,
        showDirection: true,
    },
};

/**
 * Every state, light and dark side by side: the first stop selected with the picker under the
 * bar, the second stop selected (its chit pressed, the picker on its color), a stop's hex box
 * being edited (focus forced), a focused handle (forced), and five stops with add disabled.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: function StatesStory() {
        const redBlue = [createColorStop(0, "#FF4D4D"), createColorStop(1, "#4D4DFF")];
        return (
            <Stack gap={16}>
                <StateCell label="Rest (first stop selected), direction row">
                    <GradientEditor defaultStops={redBlue} defaultDirection={90} />
                </StateCell>
                <StateCell label="Second stop selected">
                    <SelectStop index={1}>
                        <GradientEditor defaultStops={redBlue} showDirection={false} />
                    </SelectStop>
                </StateCell>
                <StateCell label="Second stop's hex box being edited">
                    <SelectStop index={1}>
                        <ForceState state="focus" selector=".cm-gradient-stop:nth-child(2) .cm-paint-field">
                            <GradientEditor defaultStops={redBlue} showDirection={false} />
                        </ForceState>
                    </SelectStop>
                </StateCell>
                <StateCell label="Focused handle">
                    <ForceState state="focus" selector=".cm-gradient-handle">
                        <GradientEditor defaultStops={redBlue} showDirection={false} />
                    </ForceState>
                </StateCell>
                <StateCell label="Five stops: add disabled">
                    <GradientEditor defaultStops={fiveStops} showDirection={false} />
                </StateCell>
            </Stack>
        );
    },
};

/**
 * Selecting a stop: pressing the second row's chit marks it pressed, and the picker moves to that stop's color.
 */
export const SelectingAStop: Story = {
    args: {
        defaultStops: twoStops,
        showDirection: false,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const chits = canvas.getAllByRole("button", { name: "Color swatch" });
        await expect(chits[0]).toHaveAttribute("aria-pressed", "true");
        await userEvent.click(chits[1]);
        await expect(chits[1]).toHaveAttribute("aria-pressed", "true");
        await expect(chits[0]).toHaveAttribute("aria-pressed", "false");
        await expect(canvas.getByRole("textbox", { name: "Color value" })).toHaveValue("06B6D4");
    },
};

/**
 * Typing a stop's color: `22C55E` and Enter in the second row's hex box give the stop that
 * color, and the picker, now on that stop, follows.
 */
export const TypingAStopColor: Story = {
    args: {
        defaultStops: twoStops,
        showDirection: false,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const hex = canvas.getAllByRole("textbox", { name: "Color hex value" })[1];
        await userEvent.clear(hex);
        await userEvent.type(hex, "22C55E{Enter}");
        await expect(hex).toHaveValue("22C55E");
        await expect(canvas.getByRole("textbox", { name: "Color value" })).toHaveValue("22C55E");
    },
};

/**
 * Inside a ColorPickerPanel's `gradient` slot, the way a fill picker offers solid or gradient
 * paint. The outer panel draws the one paint-type bar; the editor's own picker draws only the
 * picker body.
 */
export const InsideColorPickerPanel: Story = {
    render: function InsideStory() {
        const [paintType, setPaintType] = useState<"solid" | "gradient">("gradient");
        const [solid, setSolid] = useState("#6366F1FF");
        return (
            <div className="cm-popover-surface" style={{ width: 240, paddingBottom: 0 }}>
                <ColorPickerPanel
                    value={solid}
                    onChange={setSolid}
                    paintType={paintType}
                    onPaintTypeChange={setPaintType}
                    gradient={<GradientEditor defaultStops={twoStops} defaultDirection={90} />}
                />
            </div>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getAllByRole("radio", { name: "Gradient" })).toHaveLength(1);
        await expect(canvas.getAllByTestId("color-picker-panel")).toHaveLength(2);
        await expect(canvas.getByTestId("gradient-editor")).toBeInTheDocument();
    },
};

/** At the default upper bound of five stops, so the add button is disabled. */
export const AtMaximumStops: Story = {
    args: {
        defaultStops: fiveStops,
        defaultDirection: 180,
        showDirection: true,
    },
};

/** Without the direction row, for a gradient whose angle is decided somewhere else. */
export const WithoutDirection: Story = {
    args: {
        defaultStops: twoStops,
        showDirection: false,
    },
};

/** Bounds of the caller's own choosing: up to eight stops, and never fewer than three. */
export const CustomBounds: Story = {
    args: {
        defaultStops: [createColorStop(0, "#FF6B6B"), createColorStop(0.5, "#F7B731"), createColorStop(1, "#5B8FF9")],
        minStops: 3,
        maxStops: 8,
        showDirection: false,
    },
};

/**
 * Driven from the page's own state, with the result drawn underneath. Both halves of the
 * gradient arrive on every change, so the handler never works out which one moved.
 */
export const Controlled: Story = {
    render: function ControlledStory() {
        const [stops, setStops] = useState<ColorStop[]>(twoStops);
        const [angle, setAngle] = useState(90);

        return (
            <Stack gap="xs">
                <GradientEditor
                    stops={stops}
                    direction={angle}
                    onChange={(nextStops, nextAngle) => {
                        setStops(nextStops);
                        setAngle(nextAngle);
                    }}
                />
                <Box
                    h={32}
                    mx={16}
                    style={{
                        borderRadius: 5,
                        background: `linear-gradient(${angle}deg, ${stops
                            .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
                            .join(", ")})`,
                    }}
                />
            </Stack>
        );
    },
};

/**
 * One drag, one undo entry: the log shows what a consumer's history would see. A drag of a
 * handle or in the picker is bracketed by a single start and a single end, however many steps it
 * passes through.
 */
export const CoalescedIntoOneUndoEntry: Story = {
    render: function CoalescedStory() {
        const [log, setLog] = useState<string[]>([]);
        const record = (line: string): void => {
            setLog((entries) => [...entries.slice(-6), line]);
        };

        return (
            <Stack gap="xs">
                <GradientEditor
                    defaultStops={twoStops}
                    defaultDirection={90}
                    onChangeStart={() => {
                        record("begin transaction");
                    }}
                    onChange={(stops) => {
                        record(`step: ${stops.map((stop) => stop.color).join(" ")}`);
                    }}
                    onChangeEnd={(stops) => {
                        record(`commit transaction: ${stops.map((stop) => stop.color).join(" ")}`);
                    }}
                />
                <Text size="xs" c="dimmed" px={16}>
                    History
                </Text>
                <Stack gap={2} px={16}>
                    {log.map((line, index) => (
                        <Code key={`${line}-${String(index)}`} block fz={10}>
                            {line}
                        </Code>
                    ))}
                </Stack>
            </Stack>
        );
    },
};

/**
 * The keyboard on a handle: Shift+ArrowRight moves the focused handle 10%, and the position field follows.
 */
export const HandleKeyboard: Story = {
    args: {
        defaultStops: twoStops,
        showDirection: false,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const handle = canvas.getByRole("slider", { name: "Stop 1 position" });
        handle.focus();
        await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
        await expect(handle).toHaveAttribute("aria-valuenow", "10");
        await expect(canvas.getAllByRole("textbox", { name: "Stop 1 position" })[0]).toHaveValue("10%");
    },
};

/**
 * Every string comes from `LabelsProvider`, including the degree suffix on the angle, and
 * numbers are written in the locale it is given.
 */
export const Translated: Story = {
    render: function TranslatedStory() {
        return (
            <LabelsProvider
                locale="fr-FR"
                labels={{
                    colorStops: "Etapes de couleur",
                    addColorStop: "Ajouter une etape",
                    removeColorStop: (position) => `Supprimer l'etape ${position}`,
                    colorStopPosition: (position) => `Position de l'etape ${position}`,
                    direction: "Sens",
                    gradientDirection: "Sens du degrade",
                    colorSwatch: "Nuancier",
                    colorHexValue: "Valeur hexadecimale",
                    resetToDefault: (label) => `Retablir ${label}`,
                    degrees: (value) => `${value} deg`,
                }}
            >
                <GradientEditor defaultStops={twoStops} defaultDirection={90} />
            </LabelsProvider>
        );
    },
};

/**
 * Laid out right to left. The rows mirror; the bar keeps its left-to-right ramp, because it draws
 * the gradient's own 0% to 100%, not the reading order.
 */
export const RightToLeft: Story = {
    render: function RightToLeftStory() {
        return (
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <div dir="rtl">
                    <GradientEditor defaultStops={twoStops} defaultDirection={90} />
                </div>
            </DirectionProvider>
        );
    },
};
