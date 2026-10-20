import { Box, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { FileDrop, PANEL_GRID } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * A place to add files: a button that opens the file chooser, an optional button that chooses a
 * whole folder, and around them a dashed zone that takes a drop.
 *
 * ## When to use it
 *
 * Reach for `FileDrop` wherever a reader adds files to a panel or a pop-over -- models, a model's
 * missing parts, a picture. Dropping is never the only way in: the buttons do the same with the
 * keyboard. Reach for a plain `Button` that opens a chooser when a drop makes no sense there.
 *
 * ## Usage
 *
 * ```tsx
 * import { FileDrop } from "@graphty/compact-mantine";
 *
 * <FileDrop
 *     label="Model files"
 *     chooseLabel="Choose files"
 *     chooseName="Choose model files"
 *     folderLabel="Folder"
 *     folderName="Choose model folder"
 *     accept=".glb,.gltf,.obj,.stl,.zip"
 *     onFiles={(files) => { add(files); }}
 * />
 * ```
 *
 * `onFiles(files, transfer?)` gets every file chosen or dropped, never an empty list. A folder
 * chosen with the folder button gives each file with its `webkitRelativePath`; a drop also hands
 * over its `DataTransfer`, for a caller that walks a dropped folder (read it before returning).
 * `accept` filters the chooser only.
 *
 * ## Keyboard and accessibility
 *
 * - Each button is one Tab stop; Enter or Space opens the chooser.
 * - The zone is a `group` named by `label`; `chooseName` and `folderName` name the buttons when
 *   their words say less ("Choose files" is "Choose model files").
 * - While files are held over the zone it is drawn selected (`data-over`).
 */
const meta: Meta<typeof FileDrop> = {
    title: "Components/Inputs/FileDrop",
    component: FileDrop,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
    decorators: [
        (Story) => (
            <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof FileDrop>;

/** Model files: files, a folder or a .zip. */
export const Default: Story = {
    args: {
        label: "Model files",
        chooseLabel: "Choose files",
        chooseName: "Choose model files",
        folderLabel: "Folder",
        folderName: "Choose model folder",
        accept: ".glb,.gltf,.obj,.stl,.zip",
        onFiles: () => undefined,
    },
};

/** A picture: one file, no folder. */
export const OneFile: Story = {
    args: {
        label: "Picture file",
        chooseLabel: "Choose picture",
        accept: "image/png,image/jpeg,image/webp",
        multiple: false,
        onFiles: () => undefined,
    },
};

/**
 * At rest, held over (forced with `data-over`, as a drag sets it) and disabled, light and dark.
 * @returns the states
 */
function States(): React.JSX.Element {
    const states = [
        { name: "Rest", over: false, disabled: false },
        { name: "Files held over", over: true, disabled: false },
        { name: "Disabled", over: false, disabled: true },
    ];
    return (
        <Stack gap={12}>
            {states.map((state) => (
                <Stack key={state.name} gap={4}>
                    <Text size="xs" c="dimmed">
                        {state.name}
                    </Text>
                    <Box
                        ref={(node: HTMLDivElement | null) => {
                            node?.querySelector(".cm-file-drop")?.toggleAttribute("data-over", state.over);
                        }}
                    >
                        <FileDrop
                            label={`Model files, ${state.name}`}
                            chooseLabel="Choose files"
                            folderLabel="Folder"
                            disabled={state.disabled}
                            onFiles={() => undefined}
                        />
                    </Box>
                </Stack>
            ))}
        </Stack>
    );
}

/** Every state, light and dark side by side. */
export const AllStates: Story = {
    parameters: BOTH_SCHEMES,
    render: (): React.JSX.Element => <States />,
};
