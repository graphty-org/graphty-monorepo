import { type RefObject, useEffect, useRef, useState } from "react";

import { acceptsFile } from "./pickFiles";

/** Options for `useFileDrop`. */
export interface UseFileDropOptions {
    /** The files taken, in the `accept` attribute's form (`.csv,text/*`). Every file when unset. */
    accept?: string;
    /** Whether only the first accepted file of a drop is taken. @default false (every file) */
    single?: boolean;
    /** Whether dropping is off. The browser then handles a drop as it would without the hook. */
    disabled?: boolean;
}

/** What `useFileDrop` reports. */
export interface FileDropState {
    /** Whether files are being dragged over the target now: draw the drop highlight while it is. */
    over: boolean;
}

/**
 * Whether a drag carries files (not text or a link).
 * @param event - the drag event.
 * @returns true when the drag holds files.
 */
function carriesFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes("Files") ?? false;
}

/**
 * Takes files dropped on an element, or anywhere in the window.
 *
 * A drop on a nested target is taken by the innermost one: the hook marks the drop handled
 * (`preventDefault`) and every outer hook, including a `"window"` one, leaves a handled drop alone.
 * A drop with no accepted file still stops the browser from opening the file in the tab.
 * @param target - the element that takes the drop, or `"window"` for the whole page.
 * @param onFiles - called with the accepted files of each drop (never empty).
 * @param options - which files, and whether dropping is off.
 * @returns whether files are being dragged over the target.
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * const { over } = useFileDrop(ref, (files) => open(files), { accept: ".csv" });
 * <div ref={ref} data-over={over || undefined}>...</div>
 * ```
 */
export function useFileDrop(
    target: RefObject<HTMLElement | null> | "window",
    onFiles: (files: File[]) => void,
    options: UseFileDropOptions = {},
): FileDropState {
    const { accept, single = false, disabled = false } = options;
    const [over, setOver] = useState(false);
    const latest = useRef({ onFiles, accept, single });
    latest.current = { onFiles, accept, single };

    useEffect(() => {
        const node: HTMLElement | Window | null = target === "window" ? globalThis.window : target.current;
        if (disabled || node === null) {
            setOver(false);
            return undefined;
        }
        // dragenter and dragleave fire for every child crossed; count them so moving over a
        // child does not end the highlight.
        let depth = 0;
        const enter = (event: DragEvent): void => {
            if (!carriesFiles(event)) {
                return;
            }
            depth += 1;
            setOver(true);
        };
        const leave = (event: DragEvent): void => {
            if (!carriesFiles(event)) {
                return;
            }
            depth = Math.max(0, depth - 1);
            if (depth === 0) {
                setOver(false);
            }
        };
        const dragOver = (event: DragEvent): void => {
            if (!carriesFiles(event) || event.defaultPrevented) {
                return;
            }
            // Without this the browser refuses the drop.
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = "copy";
            }
        };
        const drop = (event: DragEvent): void => {
            depth = 0;
            setOver(false);
            if (!carriesFiles(event) || event.defaultPrevented) {
                return;
            }
            event.preventDefault();
            const { onFiles: take, accept: wanted, single: one } = latest.current;
            const files = [...(event.dataTransfer?.files ?? [])].filter((file) => acceptsFile(file, wanted));
            if (files.length > 0) {
                take(one ? files.slice(0, 1) : files);
            }
        };
        const listeners: [string, (event: DragEvent) => void][] = [
            ["dragenter", enter],
            ["dragleave", leave],
            ["dragover", dragOver],
            ["drop", drop],
        ];
        for (const [type, listener] of listeners) {
            node.addEventListener(type, listener as EventListener);
        }
        return () => {
            for (const [type, listener] of listeners) {
                node.removeEventListener(type, listener as EventListener);
            }
        };
    }, [target, disabled]);

    return { over };
}
