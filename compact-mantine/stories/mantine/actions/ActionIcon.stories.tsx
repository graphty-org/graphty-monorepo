import { ActionIcon, Group, Stack, Text, Tooltip } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `ActionIcon`, themed as Figma's icon buttons: a 24 x 24 ghost button by default, and
 * Figma's joined bar when several sit in an `ActionIcon.Group`. Every prop is Mantine's: see
 * [ActionIcon on mantine.dev](https://mantine.dev/core/action-icon/).
 *
 * The theme maps Mantine's variants onto Figma's looks: `subtle` (the default) is the ghost,
 * `default` the secondary with a 1px translucent edge, `light` the highlighted look, `filled` the
 * brand fill. `aria-expanded="true"` (its pop-out is open) or `aria-pressed="true"` draws the
 * selected ground and a brand glyph. For a button that holds an on/off state, use
 * `ToggleIconButton` (Components/Actions).
 *
 * ## Usage
 *
 * ```tsx
 * import { ActionIcon, Tooltip } from "@mantine/core";
 * import { UiGlyph } from "@graphty/compact-mantine";
 *
 * <Tooltip label="Add fill">
 *     <ActionIcon aria-label="Add fill"><UiGlyph name="plus" /></ActionIcon>
 * </Tooltip>
 * ```
 *
 * Give every icon-only button an `aria-label` and a tooltip. Keyboard focus draws a 1px ring
 * outside the button; inside a joined group the ring sits inside.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Box | 24 x 24 (`sm`, the default); 32 x 32 (`md`); radius 5px |
 * | Glyph | 12px nominal in a 24px box |
 * | Joined group | three buttons in one 88 x 24 bar, square inner corners, no gap |
 */
const meta: Meta<typeof ActionIcon> = {
    title: "Themed Mantine/Actions/ActionIcon",
    component: ActionIcon,
    tags: ["autodocs"],
    argTypes: { children: { control: false } },
};

export default meta;
type Story = StoryObj<typeof ActionIcon>;

const plus = <UiGlyph name="plus" />;
const STATES = ["rest", "hover", "press", "focus"] as const;

const ROWS = [
    { name: "ghost (subtle)", props: {} },
    { name: "secondary (default)", props: { variant: "default" } },
    { name: "highlighted (light)", props: { variant: "light" } },
    { name: "filled", props: { variant: "filled" } },
    { name: "open (aria-expanded)", props: { "aria-expanded": true, "aria-haspopup": "dialog" } },
    { name: "ghost md (32)", props: { size: "md" } },
] as const;

/** A ghost icon button; use Controls to change its variant and size. */
export const Default: Story = {
    args: { children: plus, "aria-label": "Add fill", variant: "subtle", size: "sm" },
};

/**
 * Every look in every state (hover, press and focus forced with `data-state`), then disabled and
 * loading. Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={8}>
            <Group gap={8} wrap="nowrap">
                <Text size="xs" w={140} />
                {[...STATES, "disabled", "loading"].map((s) => (
                    <Text key={s} size="xs" w={40}>
                        {s}
                    </Text>
                ))}
            </Group>
            {ROWS.map(({ name, props }) => (
                <Group key={name} gap={8} wrap="nowrap">
                    <Text size="xs" w={140}>
                        {name}
                    </Text>
                    {STATES.map((state) => (
                        <Group key={state} w={40}>
                            <ActionIcon {...props} aria-label={`Add fill, ${state}`} data-state={state === "rest" ? undefined : state}>
                                {plus}
                            </ActionIcon>
                        </Group>
                    ))}
                    <Group w={40}>
                        <ActionIcon {...props} aria-label="Add fill, disabled" disabled>
                            {plus}
                        </ActionIcon>
                    </Group>
                    <Group w={40}>
                        <ActionIcon {...props} aria-label="Add fill, loading" loading>
                            {plus}
                        </ActionIcon>
                    </Group>
                </Group>
            ))}
        </Stack>
    ),
};

const ALIGN = [
    { label: "Align left", glyph: "alignLeft", shortcut: "Alt+A" },
    { label: "Align horizontal centers", glyph: "alignCenterH", shortcut: "Alt+H" },
    { label: "Align right", glyph: "alignRight", shortcut: "Alt+D" },
] as const;

const VALIGN = [
    { label: "Align top", glyph: "alignTop", shortcut: "Alt+W" },
    { label: "Align vertical centers", glyph: "alignCenterV", shortcut: "Alt+V" },
    { label: "Align bottom", glyph: "alignBottom", shortcut: "Alt+S" },
] as const;

/**
 * The joined bar: three momentary buttons in one 88 x 24 bar on the secondary ground, 1px seams,
 * outer corners only; hover or press darkens one segment, and the focus ring sits inside. Two
 * groups sit 8px apart. The second row shows the forced hover, press and focus states. The play
 * function tabs to the first button and checks the ring is drawn inside it.
 */
export const JoinedGroup: Story = {
    render: () => (
        <Stack gap={8}>
            <Group gap={8}>
                {[ALIGN, VALIGN].map((set) => (
                    <ActionIcon.Group key={set[0].label}>
                        {set.map((b) => (
                            <Tooltip key={b.label} label={`${b.label}  ${b.shortcut}`}>
                                <ActionIcon variant="default" aria-label={b.label}>
                                    <UiGlyph name={b.glyph} />
                                </ActionIcon>
                            </Tooltip>
                        ))}
                    </ActionIcon.Group>
                ))}
            </Group>
            <ActionIcon.Group>
                {(["hover", "press", "focus"] as const).map((state, i) => (
                    <ActionIcon key={state} variant="default" aria-label={`${ALIGN[i].label}, ${state}`} data-state={state}>
                        <UiGlyph name={ALIGN[i].glyph} />
                    </ActionIcon>
                ))}
            </ActionIcon.Group>
        </Stack>
    ),
    play: async ({ canvasElement }) => {
        const first = within(canvasElement).getByRole("button", { name: "Align left" });
        await userEvent.tab();
        await expect(first).toHaveFocus();
        await expect(getComputedStyle(first).outlineOffset).toBe("-1px");
    },
};

/** A color other than the primary keeps Mantine's own derivation. */
export const Colors: Story = {
    render: () => (
        <Group gap="xs">
            <ActionIcon variant="light" color="green" aria-label="Green">
                {plus}
            </ActionIcon>
            <ActionIcon variant="light" color="red" aria-label="Red">
                {plus}
            </ActionIcon>
            <ActionIcon variant="filled" color="grape" aria-label="Grape">
                {plus}
            </ActionIcon>
        </Group>
    ),
};
