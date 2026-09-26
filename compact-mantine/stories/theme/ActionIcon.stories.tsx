import { ActionIcon, Group, Stack, Text, Tooltip } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { UiGlyph } from "../../src";

/**
 * Mantine's ActionIcon, themed to Figma's icon buttons (design/figma-spec.md 4.3, 4.6): a 24 x 24
 * ghost (`subtle`, the default) with radius 5; `md` is 32 with 0 4px padding. `default` is the
 * secondary (a 1px translucent edge), `light` the "highlighted" look, `filled` the brand fill.
 * `aria-expanded="true"` (its popover is open) or `aria-pressed="true"` draws the selected ground
 * and a brand glyph. Inside `ActionIcon.Group` the icons join into Figma's 88 x 24 bar.
 */
const meta: Meta<typeof ActionIcon> = {
    title: "Compact Theme/Mantine Components/ActionIcon",
    component: ActionIcon,
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

/** Every look in every state, forced with `data-state`; plus disabled. */
export const States: Story = {
    render: () => (
        <Stack gap={8}>
            <Group gap={8} wrap="nowrap">
                <Text size="xs" w={140} />
                {[...STATES, "disabled"].map((s) => (
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
 * outer corners only; hover or press darkens one segment; focus rings inside. Two groups sit 8px
 * apart. The second row shows the forced hover, press and focus states.
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

export const Default: Story = {
    args: { children: plus, "aria-label": "Add fill" },
};

export const Loading: Story = {
    args: { children: plus, loading: true, "aria-label": "Loading" },
};

/** Non-primary colours keep Mantine's own derivation. */
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
