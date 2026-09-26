import { Box, Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { Toast, ToastProvider, useToast } from "../../../src/components/overlays/Toast";
import { UiGlyph } from "../../../src/icons";

/**
 * Figma's toast (design/figma-spec.md 8.6): a 40px pill, #2c2c2c in both themes, radius 13, the
 * toast shadow, 11/16 550 white text; an optional outlined 24px action and an optional dismiss
 * segment. One at a time, instant in and out, about 3 s short / 6 s long, never with an action.
 */
const meta: Meta = {
    title: "Figma/Overlays/Toast",
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** Every look side by side. */
export const States: Story = {
    render: () => (
        <Stack gap={16} align="flex-start">
            <Text size="sm" c="dimmed">
                message
            </Text>
            <Toast message="Zoom to selection" />
            <Text size="sm" c="dimmed">
                with an action
            </Text>
            <Toast message="Large PNG ready for copy" action={{ label: "Copy to clipboard", onClick: () => undefined }} />
            <Text size="sm" c="dimmed">
                with an icon and the dismiss segment
            </Text>
            <Toast message="Rulers visible" icon={<UiGlyph name="eye" size={16} />} withCloseButton />
            <Text size="sm" c="dimmed">
                an error, long
            </Text>
            <Toast message="Variable names must be unique within a collection" />
        </Stack>
    ),
};

function Buttons(): React.JSX.Element {
    const toast = useToast();
    return (
        <Group gap={8}>
            <Button variant="default" onClick={() => toast.show("Zoom to selection")}>
                Short toast
            </Button>
            <Button
                variant="default"
                onClick={() =>
                    toast.show({
                        message: "Large PNG ready for copy",
                        action: { label: "Copy to clipboard", onClick: () => toast.hide() },
                    })
                }
            >
                Toast with action
            </Button>
        </Group>
    );
}

/** The provider: a new toast replaces the last and restarts its timer. */
export const Interactive: Story = {
    render: () => (
        <ToastProvider bottom={24}>
            <Box style={{ height: 240 }}>
                <Buttons />
            </Box>
        </ToastProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole("button", { name: "Short toast" }));
        await waitFor(() => expect(body.getByRole("alert")).toHaveTextContent("Zoom to selection"));
        await userEvent.click(canvas.getByRole("button", { name: "Toast with action" }));
        await waitFor(() => expect(body.getAllByRole("alert")).toHaveLength(1));
        await expect(body.getByRole("alert")).toHaveTextContent("Large PNG ready for copy");
    },
};
