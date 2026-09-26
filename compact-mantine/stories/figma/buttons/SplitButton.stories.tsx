import { Group, Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useEffect, useRef } from "react";

import { UiGlyph } from "../../../src";
import { SplitButton } from "../../../src/components/buttons";

/**
 * Two icon buttons joined into one control (design/figma-spec.md 4.5), Figma's "Present" +
 * "Prototype view": a 32 x 32 main half and a 16 x 32 chevron 1px apart. Hovering either half
 * lights both; the pressed half darkens; the chevron shows the selected ground and a brand caret
 * while its dark menu is open.
 */
const meta: Meta<typeof SplitButton> = {
    title: "Figma/Buttons/SplitButton",
    component: SplitButton,
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
            menuProps={props.open ? { opened: true } : undefined}
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

/** Rest, both halves lit on hover, the main half pressed (the chevron stays at hover), the chevron's focus ring, and the open chevron. */
export const States: Story = {
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
            <Stack gap={4} h={120}>
                <Text size="xs">menu open</Text>
                <Present open />
            </Stack>
        </Stack>
    ),
};

/** Click the chevron: its menu opens and it lights; Escape closes it and focus returns. */
export const Interactive: Story = {
    render: () => <Present />,
    play: async ({ canvasElement }) => {
        const chevron = within(canvasElement).getByRole("button", { name: "Prototype view" });
        await userEvent.click(chevron);
        await expect(chevron).toHaveAttribute("aria-expanded", "true");
        await userEvent.keyboard("{Escape}");
        await expect(chevron).toHaveAttribute("aria-expanded", "false");
    },
};
