import { Button, Tooltip } from "@mantine/core";
import React, { useRef, useState } from "react";

import { UiGlyph } from "../../icons";

/**
 * Props for FileDrop.
 */
export interface FileDropProps {
    /** Names the drop zone for a screen reader ("Model files"). */
    label: string;
    /** The choose button's words ("Choose files"). */
    chooseLabel: string;
    /** The choose button's accessible name and tooltip, when it says more than its words. */
    chooseName?: string;
    /** Give it to draw a second button that chooses a whole folder ("Folder"). */
    folderLabel?: string;
    /** The folder button's accessible name and tooltip, when it says more than its words. */
    folderName?: string;
    /**
     * The file chooser's filter, as the `accept` of a file input (".glb,.gltf,image/png"). A drop is
     * not filtered: what arrives is the caller's to judge.
     */
    accept?: string;
    /** Whether more than one file can be chosen. Default true. */
    multiple?: boolean;
    /** Nothing can be chosen or dropped. */
    disabled?: boolean;
    /**
     * Files are being read: a press or a drop is ignored, but the buttons stay focusable and keep
     * focus (`aria-disabled`), and the zone is `aria-busy`, so a keyboard reader is not dropped to
     * the page while the files it chose load.
     */
    busy?: boolean;
    /**
     * The files the reader chose or dropped, never an empty list. A folder chosen with the folder
     * button gives every file in it, each with its `webkitRelativePath`. A drop also hands over its
     * `DataTransfer`, to be read before the handler returns (the browser empties it after), for a
     * caller that walks a dropped folder's entries.
     */
    onFiles: (files: File[], transfer?: DataTransfer) => void;
}

/**
 * A place to add files: a button that opens the file chooser, an optional button that chooses a
 * folder, and around them a zone that takes a drop, drawn highlighted while files are held over it.
 * Dropping is never the only way in: every drop target is also a button, reached with Tab and
 * pressed with Enter or Space.
 * @example
 * ```tsx
 * <FileDrop
 *     label="Model files"
 *     chooseLabel="Choose files"
 *     folderLabel="Folder"
 *     accept=".glb,.gltf,.obj,.stl,.zip"
 *     onFiles={(files) => { add(files); }}
 * />
 * ```
 * @param props - Component props
 * @returns The drop zone
 */
export function FileDrop(props: FileDropProps): React.JSX.Element {
    const {
        label,
        chooseLabel,
        chooseName,
        folderLabel,
        folderName,
        accept,
        multiple = true,
        disabled = false,
        busy = false,
        onFiles,
    } = props;
    const refuses = disabled || busy;
    const files = useRef<HTMLInputElement>(null);
    const folder = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);

    const take = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const chosen = [...(event.currentTarget.files ?? [])];
        // Cleared, so choosing the same file again is a change too.
        event.currentTarget.value = "";
        if (chosen.length > 0) {
            onFiles(chosen);
        }
    };

    return (
        <div
            role="group"
            aria-label={label}
            className="cm-file-drop"
            data-over={over || undefined}
            data-disabled={disabled || undefined}
            aria-busy={busy || undefined}
            onDragOver={(event) => {
                if (refuses) {
                    return;
                }
                // Without this the browser opens the dropped file instead.
                event.preventDefault();
                setOver(true);
            }}
            onDragLeave={(event) => {
                if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
                    setOver(false);
                }
            }}
            onDrop={(event) => {
                if (refuses) {
                    event.preventDefault();
                    return;
                }
                event.preventDefault();
                setOver(false);
                const dropped = [...event.dataTransfer.files];
                if (dropped.length > 0) {
                    onFiles(dropped, event.dataTransfer);
                }
            }}
        >
            <Tooltip label={chooseName ?? chooseLabel}>
                <Button
                    size="compact-xs"
                    variant="default"
                    disabled={disabled}
                    aria-disabled={busy || undefined}
                    leftSection={<UiGlyph name="upload" />}
                    aria-label={chooseName}
                    onClick={() => {
                        if (!refuses) {
                            files.current?.click();
                        }
                    }}
                >
                    {chooseLabel}
                </Button>
            </Tooltip>
            {folderLabel !== undefined && (
                <Tooltip label={folderName ?? folderLabel}>
                    <Button
                        size="compact-xs"
                        variant="default"
                        disabled={disabled}
                        aria-disabled={busy || undefined}
                        leftSection={<UiGlyph name="folder" />}
                        aria-label={folderName}
                        onClick={() => {
                            if (!refuses) {
                                folder.current?.click();
                            }
                        }}
                    >
                        {folderLabel}
                    </Button>
                </Tooltip>
            )}
            <input ref={files} type="file" hidden tabIndex={-1} accept={accept} multiple={multiple} onChange={take} />
            {folderLabel !== undefined && (
                <input
                    ref={folder}
                    type="file"
                    hidden
                    tabIndex={-1}
                    // React has no prop for it; the browser then lists the folder's files with their paths.
                    {...{ webkitdirectory: "" }}
                    onChange={take}
                />
            )}
        </div>
    );
}
