import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type { ScreenshotErrorCode, ScreenshotLegendSection } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Alert, Button, Input, Loader, Select, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { imageLegend, keyNames } from "../canvas/legendWords";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    backgroundRefusal,
    CUSTOM,
    failureWords,
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

/** The preview is captured this wide (height by the canvas's aspect), not at the canvas's size. */
const PREVIEW_WIDTH = 480;

/**
 * Why a size cannot be captured. `canCaptureScreenshot` gives a sentence but no code, so the app
 * cannot say which limit it hit; the gap is recorded with the Export dialog package.
 */
const SIZE_REFUSED = "this browser cannot make an image this size";

/**
 * The key an image carries: the legend card's sections exactly when the canvas shows the card --
 * one switch, the same words.
 * @param session - the session, or null.
 * @param legendShown - whether the canvas shows the legend card.
 * @returns the sections; none when the card is hidden.
 */
function imageKey(session: GraphSession | null, legendShown: boolean): ScreenshotLegendSection[] {
    return legendShown && session !== null ? imageLegend(session.styles.legend(), keyNames(session)) : [];
}

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
    | { kind: "failed"; words: string };

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
    const [preview, setPreview] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [refused, setRefused] = useState<Partial<Record<ImageSize, string>>>({});
    const [status, setStatus] = useState<Status>({ kind: "idle" });

    const cameras = session?.catalog.cameras().map((camera) => camera.id) ?? [];
    const preset = presetOf(choices);
    const backgroundReason = backgroundRefusal(choices.format, "transparent");

    // The preview: one small capture in the chosen format, drawn as the file will be drawn. The
    // object URL only shows it in an <img>; it is revoked when the preview changes or closes.
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        let url: string | null = null;
        // An explicit width wins over the options' 1x multiplier.
        const options = screenshotOptions({ ...choices, size: "1x" }, { blob: true });
        element
            .captureScreenshot({
                ...options,
                width: PREVIEW_WIDTH,
                legend: imageKey(session, legendShown),
                timing: { waitForSettle: false },
            })
            .then((result) => {
                if (!live) {
                    return;
                }
                url = URL.createObjectURL(result.blob);
                setPreview(url);
                setPreviewError(null);
            })
            .catch((error: unknown) => {
                if (live) {
                    setPreviewError(failureWords(error));
                }
            });
        return () => {
            live = false;
            if (url !== null) {
                URL.revokeObjectURL(url);
            }
        };
    }, [element, choices, session, legendShown]);

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
                return [size, check.supported ? undefined : SIZE_REFUSED] as const;
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
                legend: imageKey(session, legendShown),
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
                setStatus({ kind: "failed", words: failureWords(error) });
            }
        }
    };

    // ponytail: multiples only; the element tells no caller the canvas's pixel size without a
    // full-size capture (gap recorded with the Export dialog package).
    const pixels = (size: ImageSize): string => (size === "400x300" ? "400 x 300" : size);

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
                        {status.words}
                    </Alert>
                );
            default:
                return null;
        }
    })();

    const busy = status.kind === "capturing";

    return (
        <>
            <section className="ws-export-main" aria-label="Image">
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
