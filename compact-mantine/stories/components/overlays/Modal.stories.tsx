import { Box, Button, Group, Modal, type ModalProps, Stack, Text, Textarea, TextInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { ModalFooter } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Demo stories carry no play function; the assertions live on the `*Interactions` twin, hidden
// from the sidebar and the docs page and still run by the test runner and Chromatic.
const INTERACTION_TEST_TAGS = ["!dev", "!autodocs"];

/**
 * The modal dialog: Mantine's `Modal`, themed, plus `ModalFooter`, the button bar along its
 * bottom edge.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | Mantine `Modal` + `ModalFooter` | A short task the reader must finish or cancel before going on: name a version, confirm a delete |
 * | `Popout` | Settings the reader adjusts while still working on the page. A pop-out is not modal, can be dragged, and does not block the canvas |
 * | `Toast` | Telling the reader something happened, with at most one action; it asks nothing of them |
 *
 * ## Usage
 *
 * ```tsx
 * import { Button, Modal, TextInput } from "@mantine/core";
 * import { ModalFooter } from "@graphty/compact-mantine";
 *
 * <Modal opened={opened} onClose={close} title="Save to version history">
 *     <TextInput data-autofocus aria-label="Version title" />
 *     <ModalFooter>
 *         <Button variant="default" onClick={close}>Cancel</Button>
 *         <Button disabled={!valid}>Save</Button>
 *     </ModalFooter>
 * </Modal>
 * ```
 *
 * Put `ModalFooter` last inside the Modal, with the secondary action (Cancel) first and the
 * primary or danger action last. The theme draws no backdrop unless you pass `withOverlay`.
 *
 * ## Keyboard and accessibility
 *
 * - Opening moves focus to the element marked `data-autofocus` (else the first focusable one);
 *   Tab is trapped inside; Escape and the close button close it; focus returns to what opened it.
 * - The Modal is a `dialog` with `aria-modal="true"`, named by its `title`.
 * - A disabled primary action says the form is not ready; label the fields so the reason is
 *   findable.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Frame | 480px wide (`size` sm 320, lg 760), `--cm-bg`, radius 13px, elevation 500, centred |
 * | Header | 40px with a 1px divider; title 11/16 weight 550, 16px in; 24px close button |
 * | Body | padding 16px |
 * | Footer | 40px, 1px divider above, padding 0 8px 0 16px, 24px buttons end-aligned 8px apart |
 * | Motion | opens and closes in one frame |
 */
const meta: Meta<typeof ModalFooter> = {
    title: "Components/Overlays/Modal",
    component: ModalFooter,
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ModalFooter>;

/**
 * A modal held open inside a box of its own, so it sits on the docs page instead of covering it.
 * The box's `transform` makes it the containing block for the modal's fixed layers, and the
 * modal neither traps focus nor locks page scroll.
 * @param props - the box size and the modal props
 * @param props.width - the box width
 * @param props.height - the box height
 * @returns a contained, always-open modal
 */
function ContainedModal({
    width = 560,
    height = 280,
    ...props
}: Omit<ModalProps, "opened" | "onClose"> & { width?: number; height?: number }): React.JSX.Element {
    return (
        <Box style={{ position: "relative", transform: "translateZ(0)", width, height, overflow: "hidden" }}>
            <Modal
                opened
                onClose={() => undefined}
                withinPortal={false}
                trapFocus={false}
                lockScroll={false}
                returnFocus={false}
                {...props}
            />
        </Box>
    );
}

/** The default modal, 480px wide, ending in a ModalFooter with Cancel and Save. */
export const Default: Story = {
    // The footer's children are JSX, which the Controls table can only show as raw objects.
    argTypes: { children: { control: false } },
    args: {
        children: (
            <>
                <Button variant="default">Cancel</Button>
                <Button>Save</Button>
            </>
        ),
    },
    render: (args) => (
        <ContainedModal title="Save to version history">
            <TextInput aria-label="Version title" placeholder="Title" />
            <ModalFooter {...args} />
        </ContainedModal>
    ),
};

/**
 * Light and dark side by side: the default size with a disabled Save (the form is not ready),
 * and the small (320px) confirmation with a danger action and the optional backdrop.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={16}>
            <ContainedModal title="Save to version history" height={260}>
                <TextInput aria-label="Version title" placeholder="Title" />
                <ModalFooter>
                    <Button variant="default">Cancel</Button>
                    <Button disabled>Save</Button>
                </ModalFooter>
            </ContainedModal>
            <ContainedModal title="Delete comment" size="sm" withOverlay height={200}>
                <Text size="sm">Delete this comment thread? This cannot be undone.</Text>
                <ModalFooter>
                    <Button variant="default">Cancel</Button>
                    <Button color="red">Delete</Button>
                </ModalFooter>
            </ContainedModal>
        </Stack>
    ),
};

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

/**
 * The live modal: open it, and focus lands in the title field; Save enables once there is a
 * title; Escape closes it.
 */
export const OpenAndClose: Story = {
    render: function OpenAndCloseRender() {
        const [opened, setOpened] = useState(false);
        return (
            <Group>
                <Button variant="default" onClick={() => setOpened(true)}>
                    Save to version history...
                </Button>
                <SaveToVersionHistory opened={opened} onClose={() => setOpened(false)} />
            </Group>
        );
    },
};

/** The assertions for the live modal: focus on open, Save enables, Escape closes. */
export const OpenAndCloseInteractions: Story = {
    ...OpenAndClose,
    tags: INTERACTION_TEST_TAGS,
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
