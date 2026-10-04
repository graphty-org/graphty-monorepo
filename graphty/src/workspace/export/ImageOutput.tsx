import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type { ScreenshotErrorCode } from "@graphty/graphty-element";
import { Alert, Button, Input, Loader, Select, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    backgroundRefusal,
    CUSTOM,
    fileName,
    IMAGE_EXTENSIONS,
    IMAGE_PRESETS,
    type ImageChoices,
    type ImageFormat,
    type ImageSize,
    presetOf,
    SAVED_LOCALLY,
    screenshotOptions,
} from "./choices";

/** The error graphty-element throws when the layout does not settle before a capture. */
const SETTLE_TIMEOUT: `${ScreenshotErrorCode.LAYOUT_SETTLE_TIMEOUT}` = "LAYOUT_SETTLE_TIMEOUT";

/** The app's words for the element's camera ids; another id shows as itself. */
const VIEW_LABELS: Readonly<Record<string, string>> = {
    current: "Current view",
    fitToGraph: "Whole graph",
    topView: "Top",
    sideView: "Side",
    frontView: "Front",
    isometric: "Isometric",
};

const SIZES: readonly ImageSize[] = ["1x", "2x", "4x", "400x300"];

/** Props for ImageOutput. */
interface ImageOutputProps {
    choices: ImageChoices;
    onChange: (choices: ImageChoices) => void;
    onCancel: () => void;
    /** Closes the dialog with a notice. */
    onDone: (message: string) => void;
}

/** What the footer is doing. */
type Status =
    | { kind: "idle" }
    | { kind: "capturing" }
    | { kind: "settle-timeout"; destination: "download" | "clipboard" }
    | { kind: "clipboard-refused" }
    | { kind: "failed"; message: string };

/**
 * The Image output: preset, size, format, view and background, a preview the element draws, and
 * Cancel, Copy and Export. Every capture is graphty-element's `captureScreenshot`; a size its
 * `canCaptureScreenshot` refuses is disabled with the element's reason.
 * @param props - Component props
 * @param props.choices - The image choices
 * @param props.onChange - Called with new choices
 * @param props.onCancel - Closes the dialog
 * @param props.onDone - Closes the dialog with a notice
 * @returns The output's body and footer
 */
export function ImageOutput({ choices, onChange, onCancel, onDone }: Readonly<ImageOutputProps>): React.JSX.Element {
    const { element, session } = useWorkspace();
    const project = useWorkspaceState((state) => state.project?.name ?? "untitled");
    const legendShown = useWorkspaceState((state) => state.legendShown);
    const [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [refused, setRefused] = useState<Partial<Record<ImageSize, string>>>({});
    const [status, setStatus] = useState<Status>({ kind: "idle" });

    const cameras = session?.catalog.cameras().map((camera) => camera.id) ?? [];
    const preset = presetOf(choices);
    const backgroundReason = backgroundRefusal(choices.format, "transparent");

    // The preview: one capture at the canvas's own size, drawn as the file will be drawn.
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        let url: string | null = null;
        const options = screenshotOptions({ ...choices, size: "1x" }, { blob: true });
        element
            .captureScreenshot({ ...options, timing: { waitForSettle: false } })
            .then((result) => {
                if (!live) {
                    return;
                }
                url = URL.createObjectURL(result.blob);
                setPreview({ url, width: result.metadata.width, height: result.metadata.height });
                setPreviewError(null);
            })
            .catch((error: unknown) => {
                if (live) {
                    setPreviewError(error instanceof Error ? error.message : String(error));
                }
            });
        return () => {
            live = false;
            if (url !== null) {
                URL.revokeObjectURL(url);
            }
        };
    }, [element, choices]);

    // The sizes the element refuses for this format, each with its reason.
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        void Promise.all(
            SIZES.map(async (size) => {
                const check = await element.canCaptureScreenshot(
                    screenshotOptions({ ...choices, size }, { blob: true }),
                );
                return [size, check.supported ? undefined : check.reason] as const;
            }),
        ).then((entries) => {
            if (live) {
                setRefused(Object.fromEntries(entries.filter(([, reason]) => reason !== undefined)));
            }
        });
        return () => {
            live = false;
        };
    }, [element, choices]);

    const set = (change: Partial<ImageChoices>): void => {
        setStatus({ kind: "idle" });
        const next = { ...choices, ...change };
        onChange(backgroundRefusal(next.format, next.background) === null ? next : { ...next, background: "canvas" });
    };

    const name = fileName(project, VIEW_LABELS[choices.view] ?? choices.view, IMAGE_EXTENSIONS[choices.format]);

    const capture = async (destination: "download" | "clipboard", waitForSettle = true): Promise<void> => {
        if (element === null) {
            return;
        }
        setStatus({ kind: "capturing" });
        try {
            const result = await element.captureScreenshot({
                ...screenshotOptions(choices, { [destination]: true }, name),
                timing: { waitForSettle },
            });
            if (destination === "clipboard" && result.clipboardStatus !== "success") {
                setStatus({ kind: "clipboard-refused" });
                return;
            }
            onDone(destination === "clipboard" ? "Copied the image" : `Exported ${name}`);
        } catch (error) {
            if (error instanceof Error && "code" in error && error.code === SETTLE_TIMEOUT) {
                setStatus({ kind: "settle-timeout", destination });
            } else {
                setStatus({ kind: "failed", message: error instanceof Error ? error.message : String(error) });
            }
        }
    };

    const pixels = (size: ImageSize): string => {
        if (size === "400x300") {
            return "400 x 300";
        }
        if (preview === null) {
            return size;
        }
        const times = Number.parseInt(size);
        return `${size} (${String(preview.width * times)} x ${String(preview.height * times)})`;
    };

    const callout = (() => {
        switch (status.kind) {
            case "settle-timeout":
                return (
                    <Alert color="yellow" title="The layout is still moving">
                        It did not settle in time. Capture it as it is now, or try again.
                    </Alert>
                );
            case "clipboard-refused":
                return (
                    <Alert color="yellow" title="The browser did not allow copying">
                        Use Export to save the image as a file instead.
                    </Alert>
                );
            case "failed":
                return (
                    <Alert color="red" title="The image was not saved" role="alert">
                        {status.message}
                    </Alert>
                );
            default:
                // graphty-element does not draw the legend into a capture yet (issue #133).
                return legendShown ? (
                    <Alert color="gray" title="The legend is not in the image" role="note">
                        The legend card on the canvas is not drawn into exported images yet.
                    </Alert>
                ) : null;
        }
    })();

    const busy = status.kind === "capturing";

    return (
        <>
            <div className="ws-export-main">
                <div>
                    <Text fw={550} size="md" role="heading" aria-level={3}>
                        Image
                    </Text>
                    <Text size="sm" c="dimmed">
                        A picture of the drawing, {pixels(choices.size)}, {choices.format.toUpperCase()}
                        {choices.view === "current" ? "" : "; your own camera does not move"}
                    </Text>
                </div>
                <div className="ws-export-fields">
                    <Select
                        label="Preset"
                        data={[...IMAGE_PRESETS.map(({ id, label }) => ({ value: id, label })), CUSTOM]}
                        value={preset?.id ?? CUSTOM}
                        allowDeselect={false}
                        onChange={(id) => {
                            const chosen = IMAGE_PRESETS.find((entry) => entry.id === id);
                            if (chosen !== undefined) {
                                set(chosen.choices);
                            }
                        }}
                    />
                    <Select
                        label="View"
                        data={["current", ...cameras].map((id) => ({ value: id, label: VIEW_LABELS[id] ?? id }))}
                        value={choices.view}
                        allowDeselect={false}
                        onChange={(view) => {
                            set({ view: view ?? "current" });
                        }}
                    />
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
                                label: pixels(size),
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
                </div>
                {callout}
                <div className="ws-export-preview" data-transparent={choices.background === "transparent"}>
                    {preview === null ? (
                        <Text size="sm" c="dimmed">
                            {previewError === null ? "Drawing the preview..." : `No preview: ${previewError}`}
                        </Text>
                    ) : (
                        <img src={preview.url} alt={`Preview of ${name}`} />
                    )}
                </div>
            </div>
            <ModalFooter className="ws-export-footer">
                <Text size="sm" c="dimmed" className="ws-export-note">
                    {busy ? (
                        <>
                            <Loader size="xs" /> Waiting for the layout to settle, then capturing
                        </>
                    ) : (
                        SAVED_LOCALLY
                    )}
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
                        <Button
                            variant="default"
                            disabled={busy || refused[choices.size] !== undefined}
                            onClick={() => void capture("clipboard")}
                        >
                            Copy
                        </Button>
                        <Button
                            disabled={busy || refused[choices.size] !== undefined}
                            onClick={() => void capture("download")}
                        >
                            Export
                        </Button>
                    </>
                )}
            </ModalFooter>
        </>
    );
}
