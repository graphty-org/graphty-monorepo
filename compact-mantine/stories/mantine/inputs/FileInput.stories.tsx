import { FileInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `FileInput`, themed as Figma's filled field. Only the look changes. Every prop is
 * Mantine's: see [FileInput on mantine.dev](https://mantine.dev/core/file-input/).
 *
 * ## Usage
 *
 * ```tsx
 * import { FileInput } from "@mantine/core";
 *
 * <FileInput label="Upload file" placeholder="Click to select" accept=".json" onChange={setFile} w={184} />
 * ```
 *
 * The field is a button that opens the system file picker (Enter or Space). Its name comes from
 * `label`, or from `aria-label`.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px, radius 5px |
 * | Text | 11/16, weight 450, inset 8px |
 */
const meta: Meta<typeof FileInput> = {
    title: "Themed Mantine/Inputs/FileInput",
    component: FileInput,
    tags: ["autodocs"],
    args: {
        w: 184,
    },
};

export default meta;
type Story = StoryObj<typeof FileInput>;

/** A labeled file field; click it to pick a file. */
export const Default: Story = {
    args: {
        label: "Upload file",
        placeholder: "Click to select",
    },
};

/**
 * Every state: rest, hover and focus (forced with `data-state`), disabled, invalid, the outlined
 * variant and a label. Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} /> },
                { state: "hover", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} data-state="hover" /> },
                { state: "focus", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} data-state="focus" /> },
                { state: "disabled", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} disabled /> },
                { state: "invalid", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} error="File too large" /> },
                { state: "outlined", node: <FileInput aria-label="FileInput" placeholder="Pick a file" w={184} variant="outlined" /> },
                { state: "with label", node: <FileInput label="Label" placeholder="Pick a file" w={184} /> },
            ]}
        />
    ),
};

/** A description under the label, in the secondary text color. */
export const WithDescription: Story = {
    args: {
        label: "Upload file",
        description: "Max 5MB",
        placeholder: "Upload",
    },
};

/** `multiple` accepts several files. */
export const Multiple: Story = {
    args: {
        label: "Upload files",
        multiple: true,
        placeholder: "Select files",
    },
};

/** `clearable` adds the 16px inline clear once a file is chosen. */
export const Clearable: Story = {
    args: {
        label: "Upload file",
        clearable: true,
        placeholder: "Clearable",
    },
};
