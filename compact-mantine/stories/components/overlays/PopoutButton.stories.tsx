import { Box, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { ControlGroup, Popout, PopoutButton, PopoutManager, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Imported from "../../../src", the package's published entry point, so a story stops compiling
// if an export is dropped.

// Demo stories carry no play function: Storybook runs one as soon as a story loads, so a demo
// that drove itself opened and closed its own panel on every visit. The assertions live on the
// `*Interactions` twins, hidden from the sidebar and the docs page and still run by the test
// runner and Chromatic.
const INTERACTION_TEST_TAGS = ["!dev", "!autodocs"];

// On the docs page every story renders in its own iframe (docs.story.inline false). Inline, a
// story sits inside Storybook's zoom wrapper, which carries a CSS transform, and a transformed
// ancestor moves the panels' position: fixed box, so open panels drew away from their triggers.

/**
 * The icon button that opens a pop-out and shows, while the panel is up, that it is open.
 *
 * ## When to use it
 *
 * Reach for `PopoutButton` as the trigger of a `Popout`: inside `Popout.Trigger` it reads the
 * pop-out's state, so a column of them says at a glance which panel is on screen. Reach for a
 * plain Mantine `ActionIcon` for a button that runs an action and opens nothing, and for
 * `ToggleIconButton` for a button that switches something on and off.
 *
 * ## Usage
 *
 * ```tsx
 * import { Popout, PopoutButton, UiGlyph } from "@graphty/compact-mantine";
 *
 * <Popout>
 *     <Popout.Trigger>
 *         <PopoutButton icon={<UiGlyph name="gear" />} aria-label="Stroke settings" />
 *     </Popout.Trigger>
 *     <Popout.Panel width={240} header={{ variant: "title", title: "Stroke settings" }}>
 *         <Popout.Content>...</Popout.Content>
 *     </Popout.Panel>
 * </Popout>
 * ```
 *
 * It must sit inside a `Popout` (and so inside a `PopoutManager`). Every `ActionIcon` prop but
 * `variant` and `children` is forwarded: `size`, `disabled`, `aria-label`, `data-*`.
 *
 * ## Keyboard and accessibility
 *
 * - A real `button`: Enter and Space open and close the panel.
 * - `Popout.Trigger` sets `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`; the
 *   open look is drawn from `aria-expanded="true"`, so it cannot disagree with what is announced.
 * - Give it an `aria-label` naming the panel it opens: an icon has no accessible name.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Size | 24 x 24 (`size="sm"`, the default), radius 5px |
 * | Glyph | 12px |
 * | Rest | transparent (the ghost icon button) |
 * | Open | selected ground `#e5f4ff` light / `#394360` dark, brand-coloured glyph |
 */
const meta: Meta<typeof PopoutButton> = {
    title: "Components/Overlays/PopoutButton",
    component: PopoutButton,
    argTypes: { icon: { control: false } },
    parameters: {
        layout: "centered",
        docs: { story: { inline: false, height: "320px" } },
    },
    decorators: [
        (Story) => (
            <PopoutManager>
                <Story />
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PopoutButton>;

/** A PopoutButton inside a Popout. Click it: it takes the open look while its panel is up. */
export const Default: Story = {
    args: {
        "aria-label": "Open settings",
        icon: <UiGlyph name="gear" size={12} />,
        size: "sm",
        disabled: false,
    },
    render: function DefaultRender(args) {
        return (
            <Box p="xl">
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton {...args} />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Settings" }} placement="right" gap={8}>
                        <Popout.Content>
                            <Text size="sm">Panel content</Text>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Box>
        );
    },
};

/**
 * One state per cell: a closed pop-out keeps the button at rest, a pop-out held open draws the
 * open look, and a disabled button is dimmed. Each cell has its own manager so two can be open.
 * @param props - the caption and the pop-out
 * @param props.caption - the state the cell shows
 * @param props.children - the pop-out
 * @returns the cell
 */
function Cell({ caption, children }: { caption: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <Stack gap={8} align="center" w={72}>
            <PopoutManager>{children}</PopoutManager>
            <Text size="xs" c="dimmed">
                {caption}
            </Text>
        </Stack>
    );
}

/** Every state, light and dark side by side: rest, open and disabled. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group gap={16} align="flex-start" wrap="nowrap">
            <Cell caption="Rest">
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<UiGlyph name="gear" size={12} />} aria-label="Rest" />
                    </Popout.Trigger>
                </Popout>
            </Cell>
            <Cell caption="Open">
                <Popout defaultOpened>
                    <Popout.Trigger>
                        <PopoutButton icon={<UiGlyph name="gear" size={12} />} aria-label="Open" />
                    </Popout.Trigger>
                </Popout>
            </Cell>
            <Cell caption="Disabled">
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<UiGlyph name="gear" size={12} />} aria-label="Disabled" disabled />
                    </Popout.Trigger>
                </Popout>
            </Cell>
        </Group>
    ),
};

/** The assertions for the default button: rest, open look while the panel is up, Escape. */
export const DefaultInteractions: Story = {
    ...Default,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const button = canvas.getByRole("button", { name: "Open settings" });
        await expect(button).toBeInTheDocument();
        await expect(button).toHaveAttribute("data-variant", "subtle");
        await expect(button).toHaveAttribute("aria-expanded", "false");

        await userEvent.click(button);

        // Still the ghost variant, drawn open by the theme from aria-expanded
        await expect(button).toHaveAttribute("aria-expanded", "true");
        await expect(button).toHaveAttribute("data-open", "true");

        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();

        await userEvent.keyboard("{Escape}");

        await expect(button).toHaveAttribute("data-variant", "subtle");
        await expect(button).toHaveAttribute("aria-expanded", "false");
    },
};

/** A bordered 240px box standing in for a sidebar. */
const SIDEBAR_BOX = {
    backgroundColor: "var(--cm-bg)",
    border: "1px solid var(--cm-border)",
    borderRadius: 8,
} as const;

/**
 * Where it usually lives: in a ControlGroup's `actions`, with `Popout.Anchor` on the sidebar so
 * the panel meets the sidebar's edge rather than the button.
 */
export const InControlGroup: Story = {
    render: function InControlGroupRender() {
        return (
            <Popout.Anchor>
                <Box w={240} p="sm" style={SIDEBAR_BOX}>
                    <Popout>
                        <ControlGroup
                            label="Appearance"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="gear" size={12} />}
                                        aria-label="Open appearance settings"
                                    />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Click the button to open settings
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel width={280} header={{ variant: "title", title: "Appearance Settings" }} placement="left">
                            <Popout.Content>
                                <Text size="sm">Appearance options would go here</Text>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </Box>
            </Popout.Anchor>
        );
    },
};

/**
 * Several buttons on one sidebar: each keeps its own open look, and opening one pop-out closes
 * the others, so only one button is ever lit.
 */
export const MultipleButtons: Story = {
    render: function MultipleButtonsRender() {
        const rows = [
            { label: "Settings", glyph: "gear", name: "Open settings", body: "General settings" },
            { label: "Appearance", glyph: "eye", name: "Open appearance", body: "Colors and themes" },
            { label: "Advanced", glyph: "refresh", name: "Open advanced", body: "Advanced options" },
        ] as const;

        return (
            <Popout.Anchor>
                <Box w={240} p="sm" style={SIDEBAR_BOX}>
                    <Stack gap="xs">
                        {rows.map((row) => (
                            <Popout key={row.label}>
                                <ControlGroup
                                    label={row.label}
                                    bleed
                                    actions={
                                        <Popout.Trigger>
                                            <PopoutButton icon={<UiGlyph name={row.glyph} size={12} />} aria-label={row.name} />
                                        </Popout.Trigger>
                                    }
                                >
                                    <Text size="xs" c="dimmed" p="sm">
                                        {row.body}
                                    </Text>
                                </ControlGroup>
                                <Popout.Panel width={200} header={{ variant: "title", title: row.label }} placement="left">
                                    <Popout.Content>
                                        <Text size="sm">{row.label} panel</Text>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        ))}
                    </Stack>
                </Box>
            </Popout.Anchor>
        );
    },
};

/** The assertions for several buttons on one sidebar. */
export const MultipleButtonsInteractions: Story = {
    ...MultipleButtons,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const settingsBtn = canvas.getByRole("button", { name: "Open settings" });
        const appearanceBtn = canvas.getByRole("button", { name: "Open appearance" });
        const advancedBtn = canvas.getByRole("button", { name: "Open advanced" });

        await expect(settingsBtn).toHaveAttribute("data-variant", "subtle");
        await expect(appearanceBtn).toHaveAttribute("data-variant", "subtle");
        await expect(advancedBtn).toHaveAttribute("data-variant", "subtle");

        await userEvent.click(settingsBtn);
        await expect(settingsBtn).toHaveAttribute("aria-expanded", "true");
        await expect(appearanceBtn).toHaveAttribute("aria-expanded", "false");
        await expect(advancedBtn).toHaveAttribute("aria-expanded", "false");

        // Opening a sibling closes the first
        await userEvent.click(appearanceBtn);
        await expect(settingsBtn).toHaveAttribute("aria-expanded", "false");
        await expect(appearanceBtn).toHaveAttribute("aria-expanded", "true");
        await expect(advancedBtn).toHaveAttribute("aria-expanded", "false");

        await userEvent.click(advancedBtn);
        await expect(settingsBtn).toHaveAttribute("aria-expanded", "false");
        await expect(appearanceBtn).toHaveAttribute("aria-expanded", "false");
        await expect(advancedBtn).toHaveAttribute("aria-expanded", "true");

        await userEvent.keyboard("{Escape}");
        await expect(advancedBtn).toHaveAttribute("aria-expanded", "false");
    },
};
