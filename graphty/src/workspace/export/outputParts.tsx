import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import { SCREENSHOT_PRESET_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { Alert, Button, Input, Loader, Select, Text } from "@mantine/core";
import React from "react";

import {
    type CameraImageChoices,
    CUSTOM,
    type ImageFormat,
    type ImageSize,
    PRESET_LABELS,
    presetChoices,
} from "./choices";
import { type CaptureStatus, SIZES } from "./outputHooks";

/** The controls the Image and Video outputs share, in both the generic Export dialog and a camera's or tour's. */

type ImageBackground = CameraImageChoices["background"];

/**
 * The Preset select: the element's screenshot presets, or Custom.
 * @param props - Component props
 * @param props.preset - the matching preset's id, or undefined for Custom
 * @param props.onPick - called with the preset's choices
 * @returns the select
 */
export function PresetSelect({
    preset,
    onPick,
}: Readonly<{
    preset: string | undefined;
    onPick: (look: ReturnType<typeof presetChoices>) => void;
}>): React.JSX.Element {
    return (
        <Select
            label="Preset"
            data={[...SCREENSHOT_PRESET_DESCRIPTORS.map(({ id }) => ({ value: id, label: PRESET_LABELS[id] })), CUSTOM]}
            value={preset ?? CUSTOM}
            allowDeselect={false}
            onChange={(id) => {
                const chosen = SCREENSHOT_PRESET_DESCRIPTORS.find((entry) => entry.id === id);
                if (chosen !== undefined) {
                    onPick(presetChoices(chosen));
                }
            }}
        />
    );
}

/**
 * The Size, Format and Background rows; a size or transparency the element refuses is disabled
 * with its reason.
 * @param props - Component props
 * @param props.choices - the image choices
 * @param props.refused - the refused sizes
 * @param props.sizeLabel - a size's words
 * @param props.backgroundReason - why transparency is refused, or null
 * @param props.set - changes the choices
 * @returns the rows
 */
export function ImageLookFields({
    choices,
    refused,
    sizeLabel,
    backgroundReason,
    set,
}: Readonly<{
    choices: { size: ImageSize; format: ImageFormat; background: ImageBackground };
    refused: Partial<Record<ImageSize, string>>;
    sizeLabel: (size: ImageSize) => string;
    backgroundReason: string | null;
    set: (change: { size?: ImageSize; format?: ImageFormat; background?: ImageBackground }) => void;
}>): React.JSX.Element {
    return (
        <>
            <Input.Wrapper
                className="ws-export-wide"
                size="xs"
                label="Size"
                description={
                    Object.keys(refused).length > 0
                        ? Object.entries(refused)
                              .map(([size, reason]) => `${size}: ${reason}`)
                              .join(". ")
                        : undefined
                }
            >
                <SegmentedControl
                    fullWidth
                    value={choices.size}
                    data={SIZES.map((size) => ({
                        value: size,
                        label: sizeLabel(size),
                        disabled: refused[size] !== undefined,
                    }))}
                    onChange={(size) => {
                        set({ size: size as ImageSize });
                    }}
                />
            </Input.Wrapper>
            <Input.Wrapper size="xs" label="Format">
                <SegmentedControl
                    fullWidth
                    value={choices.format}
                    data={[
                        { value: "png", label: "PNG" },
                        { value: "jpeg", label: "JPEG" },
                        { value: "webp", label: "WebP" },
                    ]}
                    onChange={(format) => {
                        set({ format: format as ImageFormat });
                    }}
                />
            </Input.Wrapper>
            <Input.Wrapper size="xs" label="Background" description={backgroundReason ?? undefined}>
                <SegmentedControl
                    fullWidth
                    value={choices.background}
                    data={[
                        { value: "canvas", label: "Canvas color" },
                        { value: "transparent", label: "Transparent", disabled: backgroundReason !== null },
                    ]}
                    onChange={(background) => {
                        set({ background: background === "transparent" ? "transparent" : "canvas" });
                    }}
                />
            </Input.Wrapper>
        </>
    );
}

/**
 * The capture's callout, the preview, and the footer's Cancel, Copy and Export (Capture now and
 * Try again while the layout is still moving).
 * @param props - Component props
 * @param props.status - the footer's status
 * @param props.preview - the preview's URL, or null
 * @param props.previewError - why the preview failed, or null
 * @param props.transparent - whether the image has a transparent background
 * @param props.name - the file name
 * @param props.blocked - whether Copy and Export are disabled
 * @param props.onCancel - closes the dialog
 * @param props.capture - runs a capture
 * @param props.fields - the fields above the callout
 * @returns the section and the footer
 */
export function ImageBody({
    status,
    preview,
    previewError,
    transparent,
    name,
    blocked,
    onCancel,
    capture,
    fields,
}: Readonly<{
    status: CaptureStatus;
    preview: string | null;
    previewError: string | null;
    transparent: boolean;
    name: string;
    blocked: boolean;
    onCancel: () => void;
    capture: (destination: "download" | "clipboard", waitForSettle?: boolean) => Promise<void>;
    fields: React.ReactNode;
}>): React.JSX.Element {
    const busy = status.kind === "capturing";
    const callout = (() => {
        switch (status.kind) {
            case "settle-timeout":
                return <Alert color="yellow" title="Layout still moving" />;
            case "clipboard-refused":
                return <Alert color="yellow" title="Copy refused by the browser" />;
            case "failed":
                // Mantine's Alert carries role="alert".
                return (
                    <Alert color="red" title="The image was not saved">
                        {status.words}
                    </Alert>
                );
            default:
                return null;
        }
    })();
    return (
        <>
            <section className="ws-export-main" aria-label="Image">
                {fields}
                {callout}
                <div className="ws-export-preview" data-transparent={transparent}>
                    {preview === null ? (
                        <Text size="sm" c="dimmed">
                            {previewError === null
                                ? "Drawing the preview..."
                                : `The preview could not be made. ${previewError}`}
                        </Text>
                    ) : (
                        <img src={preview} alt={`Preview of ${name}`} />
                    )}
                </div>
            </section>
            <ModalFooter className="ws-export-footer">
                <Text size="sm" c="dimmed" className="ws-export-note">
                    {busy ? (
                        <>
                            <Loader size="xs" /> Capturing
                        </>
                    ) : null}
                </Text>
                <Button variant="default" onClick={onCancel}>
                    Cancel
                </Button>
                {status.kind === "settle-timeout" ? (
                    <>
                        <Button variant="default" onClick={() => void capture(status.destination, false)}>
                            Capture now
                        </Button>
                        <Button onClick={() => void capture(status.destination)}>Try again</Button>
                    </>
                ) : (
                    <>
                        <Button variant="default" disabled={busy || blocked} onClick={() => void capture("clipboard")}>
                            Copy
                        </Button>
                        <Button disabled={busy || blocked} onClick={() => void capture("download")}>
                            Export
                        </Button>
                    </>
                )}
            </ModalFooter>
        </>
    );
}

/**
 * The video's 3 / 5 / 10 s Length row.
 * @param props - Component props
 * @param props.seconds - the length
 * @param props.disabled - whether it is disabled
 * @param props.onChange - called with the new length
 * @returns the row
 */
export function LengthField({
    seconds,
    disabled,
    onChange,
}: Readonly<{ seconds: number; disabled?: boolean; onChange: (seconds: number) => void }>): React.JSX.Element {
    return (
        <Input.Wrapper size="xs" label="Length">
            <SegmentedControl
                fullWidth
                value={String(seconds)}
                disabled={disabled}
                data={["3", "5", "10"].map((value) => ({ value, label: `${value} s` }))}
                onChange={(value) => {
                    onChange(Number(value));
                }}
            />
        </Input.Wrapper>
    );
}

/**
 * The video's 30 / 60 fps Frame rate row.
 * @param props - Component props
 * @param props.fps - the frame rate
 * @param props.disabled - whether it is disabled
 * @param props.onChange - called with the new frame rate
 * @returns the row
 */
export function FrameRateField({
    fps,
    disabled,
    onChange,
}: Readonly<{ fps: number; disabled?: boolean; onChange: (fps: 30 | 60) => void }>): React.JSX.Element {
    return (
        <Input.Wrapper size="xs" label="Frame rate">
            <SegmentedControl
                fullWidth
                value={String(fps)}
                disabled={disabled}
                data={[
                    { value: "30", label: "30 fps" },
                    { value: "60", label: "60 fps" },
                ]}
                onChange={(value) => {
                    onChange(value === "60" ? 60 : 30);
                }}
            />
        </Input.Wrapper>
    );
}

/**
 * The video footer: Cancel, or Stop while recording, and Record.
 * @param props - Component props
 * @param props.recording - whether a recording runs
 * @param props.note - the footer's note
 * @param props.disabled - whether Record is disabled
 * @param props.onStop - stops the recording
 * @param props.onCancel - closes the dialog
 * @param props.onRecord - starts the recording
 * @returns the footer
 */
export function RecordFooter({
    recording,
    note,
    disabled,
    onStop,
    onCancel,
    onRecord,
}: Readonly<{
    recording: boolean;
    note: React.ReactNode;
    disabled: boolean;
    onStop: () => void;
    onCancel: () => void;
    onRecord: () => void;
}>): React.JSX.Element {
    return (
        <ModalFooter className="ws-export-footer">
            <Text size="sm" c="dimmed" className="ws-export-note">
                {note}
            </Text>
            {recording ? (
                <Button variant="default" onClick={onStop}>
                    Stop
                </Button>
            ) : (
                <Button variant="default" onClick={onCancel}>
                    Cancel
                </Button>
            )}
            <Button disabled={disabled} onClick={onRecord}>
                Record
            </Button>
        </ModalFooter>
    );
}
