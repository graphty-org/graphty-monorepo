import { Box, Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { Toast, ToastProvider, UiGlyph, useToast } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Demo stories carry no play function; the assertions live on the `*Interactions` twin, hidden
// from the sidebar and the docs page and still run by the test runner and Chromatic.
const INTERACTION_TEST_TAGS = ["!dev", "!autodocs"];

/**
 * A short message in a dark pill near the bottom of the window, which goes away on its own:
 * `Toast` draws one, `ToastProvider` and `useToast` place, time and replace it.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | `useToast().show(...)` | Confirming something that just happened ("Zoom to selection", "Copied"), with at most one action that acts on it |
 * | `Toast` on its own | Drawing the pill yourself, somewhere of your choosing |
 * | Mantine `Modal` | Something the reader must answer before going on |
 * | Text on the panel | A state that lasts, such as an error in a field: a toast is gone in seconds |
 *
 * ## Usage
 *
 * ```tsx
 * import { ToastProvider, useToast } from "@graphty/compact-mantine";
 *
 * <ToastProvider>
 *     <App />
 * </ToastProvider>
 *
 * // anywhere inside:
 * const toast = useToast();
 * toast.show("Zoom to selection");
 * toast.show({ message: "Large PNG ready", action: { label: "Copy to clipboard", onClick: copy } });
 * ```
 *
 * One toast at a time: a new one replaces the text and restarts the timer. It stays about 3s for
 * a message under 20 characters and about 6s for a longer one; a toast with an action stays until
 * it is dismissed or replaced. Pass `duration` to choose, and `bottom` on the provider to clear
 * your own bottom toolbar.
 *
 * ## Keyboard and accessibility
 *
 * - The message is `role="alert"`, so each toast is announced once when it appears.
 * - A toast with an action never times out, so the action stays reachable by keyboard for as long
 *   as the reader needs.
 * - The dismiss button is named by `closeLabel` (default "Dismiss").
 * - Hovering does not pause the timer; nothing in a timed toast must be read to go on.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Pill | 40px tall, radius 13px, padding 0 8px, `#2c2c2c` in both schemes |
 * | Message | 11/16 weight 550, white; optional 16px icon |
 * | Action | 24px tall, 1px `rgba(255,255,255,.1)` outline, radius 5px |
 * | Dismiss | a 33px segment with a 1px start border |
 * | Placement | centred, 76px above the window's bottom by default |
 */
const meta: Meta<typeof Toast> = {
    title: "Components/Overlays/Toast",
    component: Toast,
    subcomponents: { ToastProvider },
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Toast>;

/** One toast, drawn in place. Edit its message and options in Controls. */
export const Default: Story = {
    args: {
        message: "Zoom to selection",
        withCloseButton: false,
    },
};

/**
 * Every look, light and dark side by side (the pill stays dark in both): a message, with an
 * action, with an icon and the dismiss segment, and a long message.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={8} align="flex-start">
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
                long
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

/** The provider: press a button to show a toast; a new toast replaces the last and restarts its timer. */
export const WithProvider: Story = {
    render: () => (
        <ToastProvider bottom={24}>
            <Box style={{ height: 160 }}>
                <Buttons />
            </Box>
        </ToastProvider>
    ),
};

/** The assertions for the provider: one toast at a time, replaced by the next. */
export const WithProviderInteractions: Story = {
    ...WithProvider,
    tags: INTERACTION_TEST_TAGS,
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
