import { Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { FileSource, type FileSourceProps } from "../../../src";

/**
 * One way to get a file: type a URL, drop a file, or choose one in the browser's file picker,
 * drawn to fit the space it has.
 *
 * ## When to use it
 *
 * Reach for `FileSource` wherever a reader brings in a file or an address: a data import, a
 * background image, a map's tile address. Pick the variant for the space: `row` in a panel row,
 * `drop` in an empty page or dialog, `button` beside other actions, and `auto` (the default) to
 * switch between `row` and `drop` at 280px. For a drop anywhere on a page, use `useFileDrop` with
 * `"window"`; to open the picker from your own menu item, call `pickFiles`.
 *
 * ## Usage
 *
 * ```tsx
 * import { FileSource } from "@graphty/compact-mantine";
 *
 * <FileSource accept=".csv,.json" onFiles={([file]) => open(file)} onUrl={(url) => openUrl(url)} />
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - The URL field is a native `type="url"` field named "URL" (`fileUrl`). Enter sends a valid
 *   address to `onUrl`; anything else marks the field invalid and sends nothing.
 * - The upload button and the "Choose file" button (`fileChoose`, or `label`) open the browser's
 *   file picker.
 * - A drop is taken by the innermost `FileSource` or `useFileDrop` target, never twice.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | a 24px field with a 24px upload button in its end slot |
 * | Drop target | 1px dashed border, radius 5px, 16px by 8px padding, a 24px upload glyph |
 * | Gap between parts | 8px |
 * | `auto` | `row` below 280px wide, else `drop` |
 */
const meta: Meta<typeof FileSource> = {
    title: "Components/Inputs/FileSource",
    component: FileSource,
};

export default meta;
type Story = StoryObj<typeof FileSource>;

/**
 * A FileSource that writes what it received below itself.
 * @param props - the FileSource's props, less its two callbacks.
 * @returns the source and its last result.
 */
function Reporting(props: Omit<FileSourceProps, "onFiles" | "onUrl">): React.JSX.Element {
    const [got, setGot] = useState("");
    return (
        <>
            <FileSource
                {...props}
                onFiles={(files) => {
                    setGot(files.map((file) => file.name).join(", "));
                }}
                onUrl={setGot}
            />
            {got !== "" && (
                <Text size="xs" c="dimmed" mt={8}>
                    {got}
                </Text>
            )}
        </>
    );
}

/** `row`: a URL field with an upload button at its end; the whole row takes a drop. */
export const Row: Story = {
    render: () => (
        <div style={{ width: 240 }}>
            <Reporting variant="row" accept=".csv,.json" />
        </div>
    ),
};

/** `drop`: a dashed drop target with a "Choose file" button, and the URL field below it. */
export const Drop: Story = {
    render: () => (
        <div style={{ width: 320 }}>
            <Reporting variant="drop" url />
        </div>
    ),
};

/** `button`: one button that opens the file picker. */
export const ButtonVariant: Story = {
    name: "Button",
    render: () => <Reporting variant="button" />,
};

/** `auto` in a narrow space (200px): it draws the row. */
export const AutoNarrow: Story = {
    render: () => (
        <div style={{ width: 200 }}>
            <Reporting url />
        </div>
    ),
};

/** Disabled: every control is off and a drop is ignored. */
export const Disabled: Story = {
    render: () => (
        <div style={{ width: 320 }}>
            <Reporting variant="drop" url disabled />
        </div>
    ),
};
