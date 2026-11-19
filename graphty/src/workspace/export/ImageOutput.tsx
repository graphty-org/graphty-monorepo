import { Select, Text } from "@mantine/core";
import React, { useMemo } from "react";

import { imageKey } from "../canvas/legendWords";
import {
    backgroundRefusal,
    fileName,
    IMAGE_EXTENSIONS,
    type ImageChoices,
    type ImageSize,
    presetOf,
    screenshotOptions,
} from "./choices";
import { useImageCapture, useImageContext, useImagePreview, useRefusedSizes } from "./outputHooks";
import { ImageBody, ImageLookFields, PresetSelect } from "./outputParts";

/** The app's words for the element's camera ids; another id shows as itself. */
const VIEW_LABELS: Readonly<Record<string, string>> = {
    current: "Current view",
    fitToGraph: "Whole graph",
    topView: "Top",
    sideView: "Side",
    frontView: "Front",
    isometric: "Isometric",
};

/** Props for ImageOutput. */
interface ImageOutputProps {
    choices: ImageChoices;
    onChange: (choices: ImageChoices) => void;
    onCancel: () => void;
    /** Closes the dialog with a notice, and lists the file under Recent. */
    onDone: (message: string, file?: string) => void;
}

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
    const { element, session, project, legendShown } = useImageContext();
    const legend = useMemo(() => (legendShown ? imageKey(session) : []), [legendShown, session]);

    const cameras = session?.catalog.cameras().map((camera) => camera.id) ?? [];
    const preset = presetOf(choices);
    const backgroundReason = backgroundRefusal(choices.format, "transparent");

    const { preview, previewError } = useImagePreview(element, choices, screenshotOptions, legend);
    const refused = useRefusedSizes(element, choices, screenshotOptions);
    const name = fileName(project, VIEW_LABELS[choices.view] ?? choices.view, IMAGE_EXTENSIONS[choices.format]);
    const { status, setStatus, capture } = useImageCapture({
        element,
        choices,
        build: screenshotOptions,
        legend,
        name,
        onDone,
    });

    const set = (change: Partial<ImageChoices>): void => {
        setStatus({ kind: "idle" });
        const next = { ...choices, ...change };
        onChange(backgroundRefusal(next.format, next.background) === null ? next : { ...next, background: "canvas" });
    };

    // ponytail: multiples only; the element tells no caller the canvas's pixel size without a
    // full-size capture (gap recorded with the Export dialog package).
    const pixels = (size: ImageSize): string => (size === "400x300" ? "400 x 300" : size);

    return (
        <ImageBody
            status={status}
            preview={preview}
            previewError={previewError}
            transparent={choices.background === "transparent"}
            name={name}
            blocked={refused[choices.size] !== undefined}
            onCancel={onCancel}
            capture={capture}
            fields={
                <>
                    <div>
                        <Text fw={550} size="md" role="heading" aria-level={3}>
                            Image
                        </Text>
                    </div>
                    <div className="ws-export-fields">
                        <PresetSelect preset={preset?.id} onPick={set} />
                        <Select
                            label="View"
                            data={["current", ...cameras].map((id) => ({ value: id, label: VIEW_LABELS[id] ?? id }))}
                            value={choices.view}
                            allowDeselect={false}
                            onChange={(view) => {
                                set({ view: view ?? "current" });
                            }}
                        />
                        <ImageLookFields
                            choices={choices}
                            refused={refused}
                            sizeLabel={pixels}
                            backgroundReason={backgroundReason}
                            set={set}
                        />
                    </div>
                </>
            }
        />
    );
}
