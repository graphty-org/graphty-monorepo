import { Box, Button, Modal, Text, Textarea, TextInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { ModalFooter } from "../../../src/components/overlays/ModalFooter";

/**
 * Figma's modal (design/figma-spec.md 8.5): 480 wide (sm 320, lg 760), --cm-bg, radius 13,
 * elevation 500, centred, no backdrop unless asked for. A 40px header with a 1px divider, the
 * title 11/16 550 16px in, a 24px close 8px from the top and end; body padding 16; a 40px
 * footer with a 1px top divider and end-aligned buttons 8 apart. Opens in one frame.
 */
const meta: Meta = {
    title: "Figma/Overlays/Modal",
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** "Save to version history": a title field (focused on open), a description, Cancel and Save. */
function SaveToVersionHistory({ opened, onClose }: { opened: boolean; onClose: () => void }): React.JSX.Element {
    const [title, setTitle] = useState("");
    return (
        <Modal opened={opened} onClose={onClose} title="Save to version history">
            <TextInput
                data-autofocus
                aria-label="Version title"
                placeholder="Title"
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
            />
            <Textarea aria-label="Version description" placeholder="Describe what changed" mt={16} rows={3} />
            <ModalFooter>
                <Button variant="default" onClick={onClose}>
                    Cancel
                </Button>
                <Button disabled={title.length === 0}>Save</Button>
            </ModalFooter>
        </Modal>
    );
}

/** The default modal, held open. */
export const States: Story = {
    render: () => <SaveToVersionHistory opened onClose={() => undefined} />,
};

/** The small (320) confirmation with a danger action and the optional backdrop. */
export const ConfirmWithBackdrop: Story = {
    render: () => (
        <Modal opened onClose={() => undefined} title="Delete comment" size="sm" withOverlay>
            <Text size="sm">Delete this comment thread? This cannot be undone.</Text>
            <ModalFooter>
                <Button variant="default">Cancel</Button>
                <Button color="red">Delete</Button>
            </ModalFooter>
        </Modal>
    ),
};

/** Open, type (Save enables), Escape closes. */
export const Interactive: Story = {
    render: function InteractiveModal() {
        const [opened, setOpened] = useState(false);
        return (
            <Box p={24}>
                <Button variant="default" onClick={() => setOpened(true)}>
                    Save to version history...
                </Button>
                <SaveToVersionHistory opened={opened} onClose={() => setOpened(false)} />
            </Box>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole("button", { name: /Save to version history/ }));
        const title = await body.findByRole("textbox", { name: "Version title" });
        await waitFor(() => expect(title).toHaveFocus());
        await expect(body.getByRole("button", { name: "Save" })).toBeDisabled();
        await userEvent.keyboard("v");
        await expect(body.getByRole("button", { name: "Save" })).toBeEnabled();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    },
};
