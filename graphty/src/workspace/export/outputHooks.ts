import type { ScreenshotOptions } from "@graphty/graphty-element";
import { VIDEO_FORMATS } from "@graphty/graphty-element/session";
import { useEffect, useState } from "react";

import { allowlisted, count } from "../../lib/analytics";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { failureWords, IMAGE_EXTENSIONS, type ImageSize, refusalWords } from "./choices";

/** The formats `export_done` may name: the element's video formats and the app's image formats. */
const VIDEO_FORMAT_IDS: ReadonlySet<string> = new Set(VIDEO_FORMATS);
const IMAGE_FORMAT_IDS: ReadonlySet<string> = new Set(Object.keys(IMAGE_EXTENSIONS));

/** The hooks and helpers the Image and Video outputs share, in both the generic Export dialog and a camera's or tour's. */

type Element = ReturnType<typeof useWorkspace>["element"];

/**
 * What an image output reads from the workspace: the element, its session, the project's name and
 * whether the canvas shows the legend.
 * @returns the four
 */
export function useImageContext(): ReturnType<typeof useWorkspace> & { project: string; legendShown: boolean } {
    const workspace = useWorkspace();
    const project = useWorkspaceState((state) => state.project?.name ?? "untitled");
    const legendShown = useWorkspaceState((state) => state.legendShown);
    return { ...workspace, project, legendShown };
}

/** What a finished recording says about itself. */
interface RecordingMetadata {
    readonly format: string;
    readonly framesDropped: number;
}

/**
 * Closes a finished recording's dialog with its notice: the file, and the frames dropped if any.
 * @param name - the file name asked for, ending ".webm"
 * @param metadata - the recording's format and dropped frames
 * @param onDone - closes the dialog with a notice
 */
export function recorded(
    name: string,
    metadata: RecordingMetadata,
    onDone: (message: string, file?: string) => void,
): void {
    const file = name.replace(/\.webm$/, `.${metadata.format}`);
    const dropped = metadata.framesDropped;
    count("export_done", {
        kind: "video",
        format: allowlisted(metadata.format, VIDEO_FORMAT_IDS),
        destination: "download",
    });
    onDone(dropped > 0 ? `Exported ${file}, ${String(dropped)} frames dropped` : `Exported ${file}`, file);
}

/** The capture options for some image choices. */
type BuildOptions<C> = (
    choices: C,
    destination: NonNullable<ScreenshotOptions["destination"]>,
    downloadFilename?: string,
) => ScreenshotOptions;

export const SIZES: readonly ImageSize[] = ["1x", "2x", "4x", "400x300"];

/** The preview is captured this wide (height by the canvas's aspect), not at the canvas's size. */
const PREVIEW_WIDTH = 480;

/** What the image footer is doing. */
export type CaptureStatus =
    | { kind: "idle" }
    | { kind: "capturing" }
    | { kind: "settle-timeout"; destination: "download" | "clipboard" }
    | { kind: "clipboard-refused" }
    | { kind: "failed"; words: string };

/**
 * The preview: one small capture in the chosen format, drawn as the file will be drawn. The object
 * URL only shows it in an <img>; it is revoked when the preview changes or closes.
 * @param element - the element, or null.
 * @param choices - the image choices.
 * @param build - the choices' capture options.
 * @param legend - the capture's legend option; keep it stable between renders.
 * @returns the preview's URL and why it failed.
 */
export function useImagePreview<C extends { size: ImageSize }>(
    element: Element,
    choices: C,
    build: BuildOptions<C>,
    legend: ScreenshotOptions["legend"],
): { preview: string | null; previewError: string | null } {
    const [preview, setPreview] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        let url: string | null = null;
        // An explicit width wins over the options' 1x multiplier.
        const options = build({ ...choices, size: "1x" }, {});
        element
            .captureScreenshot({ ...options, width: PREVIEW_WIDTH, legend, timing: { waitForSettle: false } })
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
    }, [element, choices, build, legend]);
    return { preview, previewError };
}

/**
 * The sizes the element refuses for these choices, each with its reason.
 * @param element - the element, or null.
 * @param choices - the image choices.
 * @param build - the choices' capture options.
 * @returns the refused sizes.
 */
export function useRefusedSizes<C extends { size: ImageSize }>(
    element: Element,
    choices: C,
    build: BuildOptions<C>,
): Partial<Record<ImageSize, string>> {
    const [refused, setRefused] = useState<Partial<Record<ImageSize, string>>>({});
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        void Promise.all(
            SIZES.map(async (size) => {
                const check = await element.canCaptureScreenshot(build({ ...choices, size }, {}));
                return [size, check.reason === undefined ? undefined : refusalWords(check.reason)] as const;
            }),
        ).then((entries) => {
            if (live) {
                setRefused(Object.fromEntries(entries.filter(([, reason]) => reason !== undefined)));
            }
        });
        return () => {
            live = false;
        };
    }, [element, choices, build]);
    return refused;
}

/** What useImageCapture asks for. */
interface CaptureAsk<C> {
    readonly element: Element;
    readonly choices: C;
    readonly build: BuildOptions<C>;
    readonly legend: ScreenshotOptions["legend"];
    /** The file name. */
    readonly name: string;
    readonly onDone: (message: string, file?: string) => void;
}

/**
 * The footer's state and the capture it runs: a download or a copy through the element's
 * `captureScreenshot`, then the dialog closes with a notice.
 * @param ask - what to capture
 * @returns the status, its setter and the capture
 */
export function useImageCapture<C>(ask: CaptureAsk<C>): {
    status: CaptureStatus;
    setStatus: (status: CaptureStatus) => void;
    capture: (destination: "download" | "clipboard", waitForSettle?: boolean) => Promise<void>;
} {
    const [status, setStatus] = useState<CaptureStatus>({ kind: "idle" });
    const { element, choices, build, legend, name, onDone } = ask;
    const capture = async (destination: "download" | "clipboard", waitForSettle = true): Promise<void> => {
        if (element === null) {
            return;
        }
        setStatus({ kind: "capturing" });
        try {
            const options = build(choices, { [destination]: true }, name);
            const result = await element.captureScreenshot({
                ...options,
                legend,
                timing: { waitForSettle },
            });
            if (destination === "clipboard" && result.clipboardStatus !== "success") {
                setStatus({ kind: "clipboard-refused" });
                return;
            }
            count("export_done", {
                kind: "image",
                format: allowlisted(options.format, IMAGE_FORMAT_IDS),
                destination,
            });
            if (destination === "clipboard") {
                onDone("Copied the image");
            } else {
                onDone(`Exported ${name}`, name);
            }
        } catch (error) {
            if (error instanceof Error && "code" in error && error.code === "E_NOT_SETTLED") {
                setStatus({ kind: "settle-timeout", destination });
            } else {
                setStatus({ kind: "failed", words: failureWords(error, true) });
            }
        }
    };
    return { status, setStatus, capture };
}
