import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type {
    Graphty as GraphtyElement,
    ScreenshotLegendPosition,
    ScreenshotLegendSection,
    ScreenshotOptions,
} from "@graphty/graphty-element";
import { SCREENSHOT_PRESET_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { type GraphSession, isGraphtyError } from "@graphty/graphty-element/session";
import { Alert, Button, Checkbox, Input, Loader, Select, Stack, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { dataBlocks, imageLegend, keyNames } from "../canvas/legendWords";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { cameraViewName, viewProblemWords } from "../toolbar/viewWords";
import {
    CUSTOM,
    factWords,
    failureWords,
    fileName,
    IMAGE_EXTENSIONS,
    type ImageChoices,
    type ImageFormat,
    type ImageSize,
    PRESET_LABELS,
    presetChoices,
    presetOf,
    refusalWords,
    screenshotOptions,
} from "./choices";

const SIZES: readonly ImageSize[] = ["1x", "2x", "4x", "400x300"];

/** The preview is captured this wide (height by the canvas's aspect), not at the canvas's size. */
const PREVIEW_WIDTH = 480;

/** The View list's entry for the reader's own camera. */
const CURRENT = "current";

/** The corners the key can sit in, in the app's words. */
const CORNERS: readonly { value: ScreenshotLegendPosition; label: string }[] = [
    { value: "top-left", label: "Top left" },
    { value: "top-right", label: "Top right" },
    { value: "bottom-left", label: "Bottom left" },
    { value: "bottom-right", label: "Bottom right" },
];

/**
 * The key an image carries when the canvas shows the legend card: the card's sections, in the
 * same words.
 * @param session - the session, or null.
 * @returns the sections; none without a session.
 */
function imageKey(session: GraphSession | null): ScreenshotLegendSection[] {
    return session === null ? [] : imageLegend(dataBlocks(session), keyNames(session));
}

/**
 * The capture's `legend` option: the legend card's sections in the chosen corner, or no key.
 * @param on - whether the image carries the key.
 * @param corner - the corner.
 * @param session - the session, or null.
 * @returns the option.
 */
function keyOption(
    on: boolean,
    corner: ScreenshotLegendPosition,
    session: GraphSession | null,
): ScreenshotOptions["legend"] {
    return on ? { position: corner, sections: imageKey(session) } : false;
}

/** One entry of the View list: a value, its words, and why it cannot be used now. */
interface ViewEntry {
    readonly value: string;
    readonly label: string;
    readonly view: string | null;
    readonly reason: string | null;
}

/**
 * The View list: the current camera, then the camera views, then the saved views (the order the
 * element resolves a name), each judged by the element's `viewProblem`.
 * @param element - the element, or null.
 * @param session - the session, or null.
 * @returns the entries by group.
 */
function viewEntries(
    element: GraphtyElement | null,
    session: GraphSession | null,
): { current: ViewEntry; cameras: ViewEntry[]; saved: ViewEntry[] } {
    const cameras = (session?.catalog.cameras() ?? []).map(({ id, plainName }) => ({
        value: `camera:${id}`,
        label: cameraViewName(id, plainName),
        view: id,
        reason: viewProblemWords(element?.viewProblem(id) ?? null),
    }));
    const saved = [...(session?.views.keys() ?? [])].map((name) => ({
        value: `saved:${name}`,
        label: name,
        view: name,
        reason: viewProblemWords(element?.viewProblem(name, { saved: true }) ?? null, true),
    }));
    return { current: { value: CURRENT, label: "Current camera", view: null, reason: null }, cameras, saved };
}

/**
 * A size's words with the pixels it makes: "2x 2560 x 1440".
 * @param size - the size.
 * @param canvas - the canvas's size in device pixels, or null before the element is up.
 * @returns the label.
 */
function sizeLabel(size: ImageSize, canvas: { width: number; height: number } | null): string {
    if (size === "400x300") {
        return "400 x 300";
    }
    if (canvas === null) {
        return size;
    }
    const times = Number.parseInt(size);
    return `${size} ${String(canvas.width * times)} x ${String(canvas.height * times)}`;
}

/** Props for ImageOutput. */
interface ImageOutputProps {
    choices: ImageChoices;
    onChange: (choices: ImageChoices) => void;
    onCancel: () => void;
    /** Closes the dialog with a notice, and lists the file under Recent. */
    onDone: (message: string, file?: string) => void;
}

/** What the footer is doing. */
type Status =
    | { kind: "idle" }
    | { kind: "capturing" }
    | { kind: "settle-timeout"; destination: "download" | "clipboard" }
    | { kind: "clipboard-refused" }
    | { kind: "failed"; words: string };

/**
 * The Image output: preset, view, size, format, background and legend, a preview the element
 * draws, and Cancel, Copy and Export. Every capture is graphty-element's `captureScreenshot`; a
 * view its `viewProblem` refuses, and a size or a transparent background its
 * `canCaptureScreenshot` refuses, is disabled with the element's reason.
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
    // The transparency check's answer, kept with the format it was asked for: an answer for
    // another format is stale and must not reset the background.
    const [backgroundCheck, setBackgroundCheck] = useState<{ format: ImageFormat; reason: string | null } | null>(null);
    const backgroundReason = backgroundCheck?.format === choices.format ? backgroundCheck.reason : null;
    const [status, setStatus] = useState<Status>({ kind: "idle" });

    const views = viewEntries(element, session);
    const found =
        choices.view === null
            ? views.current
            : (views.cameras.find((entry) => entry.view === choices.view) ??
              views.saved.find((entry) => entry.view === choices.view));
    // A chosen view that is gone (removed, renamed, another project) stays chosen and shows the
    // element's reason, so the field says why the capture would fail instead of hiding the choice.
    const missing: ViewEntry | null =
        found === undefined && choices.view !== null
            ? {
                  value: `missing:${choices.view}`,
                  label: choices.view,
                  view: choices.view,
                  reason: viewProblemWords(element?.viewProblem(choices.view, { saved: true }) ?? null, true),
              }
            : null;
    const chosen = found ?? missing ?? views.current;
    const saved = missing === null ? views.saved : [...views.saved, missing];
    const entries = [views.current, ...views.cameras, ...saved];
    const preset = presetOf(choices);
    const legendOn = choices.legend ?? legendShown;

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
                legend: keyOption(legendOn, choices.corner, session),
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
                    setPreviewError(failureWords(error, true));
                }
            });
        return () => {
            live = false;
            if (url !== null) {
                URL.revokeObjectURL(url);
            }
        };
    }, [element, choices, session, legendOn]);

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
                return [size, check.reason === undefined ? undefined : refusalWords(check.reason)] as const;
            }),
        ).then((checks) => {
            if (live) {
                setRefused(Object.fromEntries(checks.filter(([, reason]) => reason !== undefined)));
            }
        });
        return () => {
            live = false;
        };
    }, [element, choices]);

    // Whether this format keeps a transparent background: the element's rule, from its check.
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        void element
            .canCaptureScreenshot({ format: choices.format, transparentBackground: true })
            .then(({ reason }) => {
                if (live) {
                    setBackgroundCheck({
                        format: choices.format,
                        reason: reason?.code === "E_BAD_COMMAND" ? factWords(reason) : null,
                    });
                }
            });
        return () => {
            live = false;
        };
    }, [element, choices.format]);

    // A format that cannot keep transparency draws on the canvas color.
    useEffect(() => {
        if (backgroundReason !== null && choices.background === "transparent") {
            onChange({ ...choices, background: "canvas" });
        }
    }, [backgroundReason, choices, onChange]);

    const set = (change: Partial<ImageChoices>): void => {
        setStatus({ kind: "idle" });
        onChange({ ...choices, ...change });
    };

    const name = fileName(project, chosen.label, IMAGE_EXTENSIONS[choices.format]);

    const capture = async (destination: "download" | "clipboard", waitForSettle = true): Promise<void> => {
        if (element === null) {
            return;
        }
        setStatus({ kind: "capturing" });
        try {
            const result = await element.captureScreenshot({
                ...screenshotOptions(choices, { [destination]: true }, name),
                legend: keyOption(legendOn, choices.corner, session),
                timing: { waitForSettle },
            });
            if (destination === "clipboard" && result.clipboardStatus !== "success") {
                setStatus({ kind: "clipboard-refused" });
                return;
            }
            if (destination === "clipboard") {
                onDone("Copied the image");
            } else {
                onDone(`Exported ${name}`, name);
            }
        } catch (error) {
            if (isGraphtyError(error) && error.code === "E_NOT_SETTLED") {
                setStatus({ kind: "settle-timeout", destination });
            } else {
                setStatus({ kind: "failed", words: failureWords(error, true) });
            }
        }
    };

    const canvas = element?.getCanvasSize() ?? null;

    const callout = (() => {
        switch (status.kind) {
            case "settle-timeout":
                return <Alert color="yellow" title="Layout still moving" />;
            case "clipboard-refused":
                return <Alert color="yellow" title="Copy refused by the browser" />;
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
    const blocked = busy || refused[choices.size] !== undefined || chosen.reason !== null;

    return (
        <>
            <section className="ws-export-main" aria-label="Image">
                <div>
                    <Text fw={550} size="md" role="heading" aria-level={3}>
                        Image
                    </Text>
                </div>
                <div className="ws-export-fields">
                    <Select
                        label="Preset"
                        data={[
                            ...SCREENSHOT_PRESET_DESCRIPTORS.map(({ id }) => ({ value: id, label: PRESET_LABELS[id] })),
                            CUSTOM,
                        ]}
                        value={preset?.id ?? CUSTOM}
                        allowDeselect={false}
                        onChange={(id) => {
                            const chosen = SCREENSHOT_PRESET_DESCRIPTORS.find((entry) => entry.id === id);
                            if (chosen !== undefined) {
                                set(presetChoices(chosen));
                            }
                        }}
                    />
                    <Select
                        label="View"
                        data={[
                            { value: CURRENT, label: views.current.label },
                            ...[
                                { group: "Camera views", items: views.cameras },
                                { group: "Saved views", items: saved },
                            ]
                                .filter(({ items }) => items.length > 0)
                                .map(({ group, items }) => ({
                                    group,
                                    items: items.map((entry) => ({
                                        value: entry.value,
                                        label: entry.label,
                                        disabled: entry.reason !== null,
                                    })),
                                })),
                        ]}
                        value={chosen.value}
                        error={chosen.reason ?? undefined}
                        allowDeselect={false}
                        renderOption={({ option }) => {
                            const reason = entries.find((entry) => entry.value === option.value)?.reason;
                            return reason === null || reason === undefined ? (
                                option.label
                            ) : (
                                <Stack gap={0}>
                                    <Text size="xs">{option.label}</Text>
                                    <Text size="xs" c="dimmed">
                                        {reason}
                                    </Text>
                                </Stack>
                            );
                        }}
                        onChange={(value) => {
                            set({ view: entries.find((entry) => entry.value === value)?.view ?? null });
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
                                label: sizeLabel(size, canvas),
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
                    <Checkbox
                        label="Legend"
                        checked={legendOn}
                        onChange={(event) => {
                            set({ legend: event.currentTarget.checked });
                        }}
                    />
                    <Select
                        label="Corner"
                        data={CORNERS}
                        value={choices.corner}
                        disabled={!legendOn}
                        allowDeselect={false}
                        onChange={(corner) => {
                            const picked = CORNERS.find((entry) => entry.value === corner);
                            if (picked !== undefined) {
                                set({ corner: picked.value });
                            }
                        }}
                    />
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
                        <Button variant="default" disabled={blocked} onClick={() => void capture("clipboard")}>
                            Copy
                        </Button>
                        <Button disabled={blocked} onClick={() => void capture("download")}>
                            Export
                        </Button>
                    </>
                )}
            </ModalFooter>
        </>
    );
}
