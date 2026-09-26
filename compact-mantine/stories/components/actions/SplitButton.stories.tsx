import { Group, Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useEffect, useRef } from "react";

import { SplitButton, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Two icon buttons joined into one control: a main action, and a chevron that opens a menu of
 * related choices. Figma's "Present" + "Prototype view" in the file header is the model.
 *
 * Hovering either half lights both, so the pair reads as one control; the pressed half darkens
 * on its own. While the menu is open the chevron takes the selected ground and a brand caret.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | `SplitButton` | there is one default action most people want, and a few variations of it one click further away |
 * | Mantine `Menu` on a `Button` or `ActionIcon` | there is no default action: the button only opens the list |
 * | `ComboInput` | the chevron sits on a text field and picks a value for it, not an action |
 *
 * ## Usage
 *
 * ```tsx
 * import { Menu } from "@mantine/core";
 * import { SplitButton, UiGlyph } from "@graphty/compact-mantine";
 *
 * <SplitButton
 *     icon={<UiGlyph name="caretRight" />}
 *     label="Present"
 *     menuLabel="Prototype view"
 *     onClick={present}
 * >
 *     <Menu.Item onClick={present}>Present</Menu.Item>
 *     <Menu.Item onClick={preview}>Preview</Menu.Item>
 * </SplitButton>
 * ```
 *
 * The children are the menu's contents (`Menu.Item`, `Menu.Label`, `Menu.Divider`).
 * `menuProps` reaches the Mantine `Menu`: `position`, `offset`, or `opened` and `onChange` to
 * control it.
 *
 * ## Keyboard and accessibility
 *
 * - A `role="group"` named by `label`, holding two real buttons, each with its own name and
 *   tooltip (`label` and `menuLabel`).
 * - Tab reaches each half in turn. Enter or Space on the main half runs the action; on the
 *   chevron it opens the menu.
 * - The chevron carries `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. In the open
 *   menu the arrow keys move between items and Escape closes it and returns focus to the chevron.
 *
 * ## Measurements
 *
 * | Part | `size="md"` (default) | `size="sm"` |
 * |---|---|---|
 * | Main half | 32 x 32, radius 5px 0 0 5px, 24px glyph box | 24 tall |
 * | Chevron half | 16 x 32, radius 0 5px 5px 0, 5 x 3 caret | 24 tall |
 * | Gap between halves | 1px | 1px |
 */
const meta: Meta<typeof SplitButton> = {
    title: "Components/Actions/SplitButton",
    component: SplitButton,
    tags: ["autodocs"],
    argTypes: {
        icon: { control: false },
        children: { control: false },
        size: { control: "inline-radio", options: ["sm", "md"] },
    },
    parameters: {
        // Room below the button for the open menu.
        layout: "padded",
    },
};

export default meta;
type Story = StoryObj<typeof SplitButton>;

const menu = (
    <>
        <Menu.Item>Present</Menu.Item>
        <Menu.Item>Preview</Menu.Item>
    </>
);

function Present(props: { state?: string; open?: boolean }): React.JSX.Element {
    return (
        <SplitButton
            icon={<UiGlyph name="caretRight" />}
            label="Present"
            menuLabel="Prototype view"
            data-state={props.state}
            // An open menu renders in place, so each half of the light and dark pair keeps its own.
            menuProps={props.open ? { opened: true, withinPortal: false } : undefined}
        >
            {menu}
        </SplitButton>
    );
}

/**
 * A split button with one half forced into a state, the same `data-state` hook the theme reads.
 * The halves are rendered inside SplitButton, so the attribute is set on them after mount.
 */
function ForcedHalf(props: { half: "main" | "chevron"; state: "press" | "focus" }): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        ref.current?.querySelector(`.cm-split-${props.half}`)?.setAttribute("data-state", props.state);
    }, [props.half, props.state]);
    return (
        <div ref={ref}>
            <Present state={props.state === "press" ? "hover" : undefined} />
        </div>
    );
}

/** The "Present" split button. Click the chevron to open its menu; use Controls to change its props. */
export const Default: Story = {
    args: {
        icon: <UiGlyph name="caretRight" />,
        label: "Present",
        menuLabel: "Prototype view",
        size: "md",
        disabled: false,
        children: menu,
    },
};

/**
 * Rest, both halves lit on hover, the main half pressed (the chevron stays at hover), the
 * chevron's focus ring, and the open chevron with its menu. Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={12}>
            <Group gap={24}>
                <Stack gap={4}>
                    <Text size="xs">rest</Text>
                    <Present />
                </Stack>
                <Stack gap={4}>
                    <Text size="xs">hover</Text>
                    <Present state="hover" />
                </Stack>
                <Stack gap={4}>
                    <Text size="xs">main pressed</Text>
                    <ForcedHalf half="main" state="press" />
                </Stack>
                <Stack gap={4}>
                    <Text size="xs">chevron focus</Text>
                    <ForcedHalf half="chevron" state="focus" />
                </Stack>
            </Group>
            {/* The menu opens bottom-end, towards the start; the margin keeps it inside its half. */}
            <Stack gap={4} h={120} ms={136}>
                <Text size="xs">menu open</Text>
                <Present open />
            </Stack>
        </Stack>
    ),
};

/** The `sm` size: both halves 24px tall, to sit in a 32px panel row beside 24px controls. */
export const Small: Story = {
    args: { ...Default.args, size: "sm" },
};

/**
 * Click the chevron: its menu opens and it lights; Escape closes it and focus returns to the
 * chevron. Enter on the focused chevron opens the menu again.
 */
export const Keyboard: Story = {
    render: () => <Present />,
    play: async ({ canvasElement }) => {
        const chevron = within(canvasElement).getByRole("button", { name: "Prototype view" });
        await userEvent.click(chevron);
        await expect(chevron).toHaveAttribute("aria-expanded", "true");
        await userEvent.keyboard("{Escape}");
        await expect(chevron).toHaveAttribute("aria-expanded", "false");
        await waitFor(() => expect(chevron).toHaveFocus());
        await userEvent.keyboard("{Enter}");
        await expect(chevron).toHaveAttribute("aria-expanded", "true");
        await userEvent.keyboard("{Escape}");
        await expect(chevron).toHaveAttribute("aria-expanded", "false");
    },
};
