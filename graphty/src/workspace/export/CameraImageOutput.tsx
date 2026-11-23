import type { ScreenshotLegendPosition, ScreenshotOptions } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Checkbox, Select } from "@mantine/core";
import React, { useEffect, useMemo, useState } from "react";

import { imageKey } from "../canvas/legendWords";
import {
    type CameraImageChoices,
    cameraScreenshotOptions,
    factWords,
    fileName,
    IMAGE_EXTENSIONS,
    type ImageFormat,
    type ImageSize,
} from "./choices";
import { useImageCapture, useImageContext, useImagePreview, useRefusedSizes } from "./outputHooks";
import { ImageBody, ImageLookFields, PresetSelect } from "./outputParts";
import { viewChoice } from "./viewChoice";
import { ViewSelect } from "./ViewSelect";

/** The corners the key can sit in, in the app's words. */
const CORNERS: readonly { value: ScreenshotLegendPosition; label: string }[] = [
    { value: "top-left", label: "Top left" },
    { value: "top-right", label: "Top right" },
    { value: "bottom-left", label: "Bottom left" },
    { value: "bottom-right", label: "Bottom right" },
];

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

/** Props for CameraImageOutput. */
interface CameraImageOutputProps {
    choices: CameraImageChoices;
    onChange: (choices: CameraImageChoices) => void;
    onCancel: () => void;
    /** Closes the dialog with a notice, and lists the file under Recent. */
    onDone: (message: string, file?: string) => void;
    /** Whether it opens with its heading: in the list of outputs, not alone as a camera's Export image... */
    heading?: boolean;
}

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
 * @param props.heading - Whether it opens with its heading
 * @returns The output's body and footer
 */
export function CameraImageOutput({
    choices,
    onChange,
    onCancel,
    onDone,
    heading = false,
}: Readonly<CameraImageOutputProps>): React.JSX.Element {
    const { element, session, project, legendShown } = useImageContext();
    // The transparency check's answer, kept with the format it was asked for: an answer for
    // another format is stale and must not reset the background.
    const [backgroundCheck, setBackgroundCheck] = useState<{ format: ImageFormat; reason: string | null } | null>(null);
    const backgroundReason = backgroundCheck?.format === choices.format ? backgroundCheck.reason : null;

    const views = viewChoice(element, session, choices.view);
    const { chosen } = views;
    const legendOn = choices.legend ?? legendShown;
    const legend = useMemo(() => keyOption(legendOn, choices.corner, session), [legendOn, choices.corner, session]);

    const { preview, previewError } = useImagePreview(element, choices, cameraScreenshotOptions, legend);
    const refused = useRefusedSizes(element, choices, cameraScreenshotOptions);
    const name = fileName(project, chosen.label, IMAGE_EXTENSIONS[choices.format]);
    const { status, setStatus, capture } = useImageCapture({
        element,
        choices,
        build: cameraScreenshotOptions,
        legend,
        name,
        onDone,
    });

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

    const set = (change: Partial<CameraImageChoices>): void => {
        setStatus({ kind: "idle" });
        onChange({ ...choices, ...change });
    };

    const canvas = element?.getCanvasSize() ?? null;

    return (
        <ImageBody
            heading={heading}
            status={status}
            preview={preview}
            previewError={previewError}
            transparent={choices.background === "transparent"}
            name={name}
            blocked={refused[choices.size] !== undefined || chosen.reason !== null}
            onCancel={onCancel}
            capture={capture}
            fields={
                <div className="ws-export-fields">
                    <PresetSelect preset={choices.preset} onPick={set} />
                    <ViewSelect
                        views={views}
                        onChange={(view) => {
                            set({ view });
                        }}
                    />
                    <ImageLookFields
                        choices={choices}
                        refused={refused}
                        sizeLabel={(size) => sizeLabel(size, canvas)}
                        backgroundReason={backgroundReason}
                        set={set}
                    />
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
            }
        />
    );
}
