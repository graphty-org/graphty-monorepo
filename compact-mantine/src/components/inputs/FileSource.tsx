import { ActionIcon, Button, Group, Progress, Text, TextInput } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useLabels } from "../../i18n";
import { UiGlyph, type UiGlyphName } from "../../icons";
import { pickFiles } from "./pickFiles";
import { chosenFiles } from "./readDrop";
import { useFileDrop } from "./useFileDrop";

/**
 * How a `FileSource` is drawn:
 * - `row`: a URL field with an upload button at its end; the row takes a drop.
 * - `drop`: a dashed drop target with a "Choose file" button and, with `url`, a URL field.
 * - `button`: one "Choose file" button.
 * - `auto`: `row` while the space is narrower than 280px, else `drop`.
 */
export type FileSourceVariant = "row" | "drop" | "button" | "auto";

/** Below this width (CSS pixels) `variant="auto"` draws a row instead of a drop target. */
const AUTO_ROW_BELOW = 280;

/** Props for FileSource. */
export interface FileSourceProps {
    /** How it is drawn. @default "auto" */
    variant?: FileSourceVariant;
    /** The files offered and taken, in the `accept` attribute's form (`.csv,.json`, `image/*`). */
    accept?: string;
    /** Whether more than one file may be chosen or dropped at once. @default false */
    multiple?: boolean;
    /** Whether to show the URL field (`row` and `drop`). @default true when `onUrl` is set */
    url?: boolean;
    /**
     * Called with the chosen or dropped files (never empty), and, when a folder was chosen or
     * dropped (`folder`), each file by its path from the folder ("kit/car.obj").
     */
    onFiles: (files: File[], paths?: ReadonlyMap<string, File>) => void;
    /** Called with the address typed into the URL field when Enter is pressed and it is a valid URL. */
    onUrl?: (url: string) => void;
    /**
     * The text of the button that opens the picker, and the name of the row's upload button.
     * Defaults to the `fileChoose` label ("Choose file").
     */
    label?: string;
    /** The URL field's placeholder and accessible name. Defaults to the `fileUrl` label ("URL"). */
    placeholder?: string;
    /** Whether every control is off and drops are ignored. */
    disabled?: boolean;
    /** The address the URL field shows at first, and again whenever this value changes (the address in effect). */
    defaultValue?: string;
    /**
     * The text of a button beside the URL field that opens the address typed, as Enter does
     * (`row` and `drop`). No button when absent.
     */
    openLabel?: string;
    /**
     * Whether a folder may be given too (`drop` and `button`): a "Choose folder" button beside
     * "Choose file", and a folder dropped on it is walked. A folder's files are not filtered by
     * `accept`. @default false
     */
    folder?: boolean;
    /** The folder button's text. Defaults to the `fileChooseFolder` label ("Choose folder"). */
    folderLabel?: string;
    /** A caption under the drop target's buttons (`drop`): what it takes, such as its formats. */
    hint?: string;
    /**
     * How far a load has come, drawn as a thin bar under it: a fraction from 0 to 1, or null for a
     * load whose size is not known (a full moving bar). No bar when absent.
     */
    progress?: number | null;
    /**
     * What a load under way is doing, drawn above its bar (with `progress`): a word for its stage
     * ("Downloading") and, at the end of the line, how far it has come ("3.2 of 12.4 MB").
     */
    status?: { readonly label: string; readonly detail?: string };
    /** Called by a Cancel button drawn beside the status line while a load is under way (with `progress`). */
    onCancel?: () => void;
    /** The Cancel button's text. Defaults to the `fileCancel` label ("Cancel"). */
    cancelLabel?: string;
    /** Why the address in the URL field was refused, shown under the field and tied to it. */
    error?: string;
    /**
     * Called when Escape takes back an address typed into the URL field. Escape in an empty field,
     * or with no `onDiscard`, is left to the page (a dialog closes).
     */
    onDiscard?: () => void;
    /** Whether the drop target grows to fill the height its parent gives it (`drop`). @default false */
    fill?: boolean;
    /**
     * Whether its first control (the "Choose file" button, or the row's URL field) takes focus when
     * the Mantine Modal or Popover around it opens (`data-autofocus`). @default false
     */
    autoFocus?: boolean;
    /** The glyph on the row's choose-file button (`row`). @default "upload" */
    chooseGlyph?: UiGlyphName;
    /** The URL field's accessible name, when the placeholder says more than the name. Defaults to `placeholder`. */
    urlLabel?: string;
    /**
     * Whether files are being dragged over a larger target around it (the dialog it sits in), so
     * the row draws its drop cue too (`row`). The row draws the cue for a drag over itself when
     * `dropLabel` is given. @default false
     */
    dropping?: boolean;
    /**
     * What the row's drop cue says over its field while files are dragged over it (`row`). Without
     * it or `dropping`, a drag over the row only outlines the field. Defaults to the `fileDrop` label
     * ("Drop to load") when `dropping` is set.
     */
    dropLabel?: string;
    /**
     * What was loaded, drawn in place of the URL field and its buttons as one line: the name, a
     * glyph for its kind and an x that calls `onClear` (`row`; `drop` and `button` ignore it). The row
     * still takes a drop, which goes to `onFiles`. Not drawn while a load is under way (`progress`).
     */
    loaded?: { readonly name: string; readonly kind?: "file" | "folder" | "url" };
    /** Called by the x on the loaded line (`loaded`). Focus then moves to the URL field (or the choose button). */
    onClear?: () => void;
    /** The x's accessible name and tooltip (`loaded`). Defaults to the `fileRemove` label and the name ("Remove model.glb"). */
    clearLabel?: string;
}

/** The glyph the loaded line draws for each kind of source. */
const LOADED_GLYPH: Record<"file" | "folder" | "url", UiGlyphName> = { file: "file", folder: "folder", url: "link" };

/** The characters of a long loaded name kept whole at its end, so a cut name still shows its extension. */
const LOADED_TAIL = 8;

/**
 * The width of an element, kept current with a ResizeObserver.
 * @param ref - the element.
 * @param on - whether to measure at all.
 * @returns its width in CSS pixels, or undefined before the first measure.
 */
function useWidth(ref: React.RefObject<HTMLElement | null>, on: boolean): number | undefined {
    const [width, setWidth] = useState<number | undefined>(undefined);
    useLayoutEffect(() => {
        const node = ref.current;
        if (!on || node === null) {
            return undefined;
        }
        setWidth(node.getBoundingClientRect().width);
        const observer = new ResizeObserver(([entry]) => {
            setWidth(entry.contentRect.width);
        });
        observer.observe(node);
        return () => {
            observer.disconnect();
        };
    }, [ref, on]);
    return width;
}

/**
 * A load's bar, with its status line and Cancel when given. A load whose size is not known draws a
 * full moving bar announced with no value (ARIA's indeterminate progress bar), never as 100%.
 * @param props - Component props
 * @param props.progress - a fraction from 0 to 1, or null when the size is not known
 * @param props.label - the bar's accessible name
 * @param props.status - the stage and how far it has come
 * @param props.onCancel - stops the load
 * @param props.cancelLabel - the Cancel button's text
 * @returns The bar
 */
function LoadBar({
    progress,
    label,
    status,
    onCancel,
    cancelLabel,
}: Readonly<{
    progress: number | null;
    label: string;
    status: FileSourceProps["status"];
    onCancel: (() => void) | undefined;
    cancelLabel: string;
}>): React.JSX.Element {
    const bar =
        progress === null ? (
            <Progress.Root size="xs" role="progressbar" aria-label={label}>
                <Progress.Section value={100} animated striped withAria={false} />
            </Progress.Root>
        ) : (
            <Progress size="xs" value={Math.round(Math.min(1, Math.max(0, progress)) * 100)} aria-label={label} />
        );
    if (status === undefined && onCancel === undefined) {
        return bar;
    }
    return (
        <div className="cm-file-progress">
            <Group gap={4} justify="space-between" wrap="nowrap">
                <Text size="xs" span>
                    {status?.label}
                </Text>
                <Group gap={4} wrap="nowrap">
                    {status?.detail === undefined ? null : (
                        <Text size="xs" span className="cm-file-hint">
                            {status.detail}
                        </Text>
                    )}
                    {onCancel === undefined ? null : (
                        <Button size="compact-xs" variant="default" onClick={onCancel}>
                            {cancelLabel}
                        </Button>
                    )}
                </Group>
            </Group>
            {bar}
        </div>
    );
}

/**
 * One way to get a file: a URL, a drop or the file picker, drawn to fit the space it has.
 *
 * Built from Mantine's TextInput, ActionIcon and Button at their compact sizes. The URL field is a
 * native `type="url"` field, checked when Enter is pressed: a valid address goes to `onUrl`, and
 * anything else marks the field invalid and calls nothing.
 * @example
 * ```tsx
 * <FileSource accept=".csv,.json" onFiles={([file]) => open(file)} onUrl={(url) => fetchFrom(url)} />
 * ```
 * @param props - see FileSourceProps.
 * @returns the file source.
 */
export function FileSource(props: Readonly<FileSourceProps>): React.JSX.Element {
    const {
        variant = "auto",
        accept,
        multiple = false,
        url,
        onFiles,
        onUrl,
        label,
        placeholder,
        disabled = false,
        defaultValue = "",
        openLabel,
        folder = false,
        folderLabel,
        hint,
        progress,
        status,
        onCancel,
        cancelLabel,
        error,
        onDiscard,
        fill = false,
        autoFocus = false,
        chooseGlyph = "upload",
        urlLabel,
        dropping = false,
        dropLabel,
        loaded,
        onClear,
        clearLabel,
    } = props;
    const labels = useLabels();
    const root = useRef<HTMLDivElement>(null);
    const width = useWidth(root, variant === "auto");
    const autoVariant = (width ?? 0) < AUTO_ROW_BELOW ? "row" : "drop";
    const drawn = variant === "auto" ? autoVariant : variant;
    const { over } = useFileDrop(root, onFiles, {
        accept,
        single: !multiple,
        disabled: disabled || drawn === "button",
        folders: folder,
    });
    const [address, setAddress] = useState(defaultValue);
    // The address in effect changed (written, undone, another project): the field shows it.
    useEffect(() => {
        setAddress(defaultValue);
    }, [defaultValue]);
    const [invalid, setInvalid] = useState(false);
    const showUrl = url ?? onUrl !== undefined;
    const chooseText = label ?? labels.fileChoose;
    const urlName = placeholder ?? labels.fileUrl;
    const showLoaded = loaded !== undefined && progress === undefined && drawn === "row";
    const dropCue = drawn === "row" && (dropping || (over && dropLabel !== undefined));
    // The x took the loaded line away: focus goes to what came back in its place.
    const refocus = useRef(false);
    useEffect(() => {
        if (refocus.current && !showLoaded) {
            refocus.current = false;
            root.current?.querySelector<HTMLElement>("input, button")?.focus();
        }
    }, [showLoaded]);

    const choose = (inFolder = false): void => {
        void pickFiles({ accept, multiple, folder: inFolder }).then((files) => {
            if (files.length > 0) {
                const { paths } = chosenFiles(files);
                onFiles(files, paths);
            }
        });
    };

    const uploadGlyph = <UiGlyph name="upload" size={16} />;

    // The typed address goes to onUrl when it is one; anything else marks the field invalid.
    const submit = (field: HTMLInputElement | null): void => {
        const value = (field?.value ?? address).trim();
        if (value === "" || field?.validity.valid === false) {
            setInvalid(value !== "");
            return;
        }
        onUrl?.(value);
    };
    const urlInput = useRef<HTMLInputElement>(null);

    const urlField = (rightSection?: React.ReactNode, rightSectionWidth?: number): React.JSX.Element => {
        const field = (
            <TextInput
                ref={urlInput}
                type="url"
                data-autofocus={autoFocus && drawn === "row" ? true : undefined}
                value={address}
                disabled={disabled}
                placeholder={urlName}
                aria-label={urlLabel ?? urlName}
                error={error ?? invalid}
                className="cm-file-url"
                rightSection={rightSection}
                rightSectionWidth={rightSectionWidth}
                onChange={(event) => {
                    setAddress(event.currentTarget.value);
                    setInvalid(false);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Escape" && onDiscard !== undefined && address !== "") {
                        // Takes the typing back; the page's own Escape (closing a dialog) waits for the next one.
                        event.preventDefault();
                        event.stopPropagation();
                        setAddress("");
                        setInvalid(false);
                        onDiscard();
                        return;
                    }
                    if (event.key !== "Enter") {
                        return;
                    }
                    event.preventDefault();
                    submit(event.currentTarget);
                }}
            />
        );
        return openLabel === undefined ? (
            field
        ) : (
            <div className="cm-file-url-row">
                {field}
                <Button
                    variant="default"
                    disabled={disabled}
                    onClick={() => {
                        submit(urlInput.current);
                    }}
                >
                    {openLabel}
                </Button>
            </div>
        );
    };

    // The drop target draws its own large glyph above the button, so the button there has none.
    const chooseButton = (withGlyph: boolean): React.JSX.Element => (
        <Button
            variant="default"
            disabled={disabled}
            leftSection={withGlyph ? uploadGlyph : undefined}
            data-autofocus={autoFocus ? true : undefined}
            onClick={() => {
                choose();
            }}
        >
            {chooseText}
        </Button>
    );
    const folderButton = (withGlyph: boolean): React.JSX.Element | null =>
        folder ? (
            <Button
                variant="default"
                disabled={disabled}
                leftSection={withGlyph ? <UiGlyph name="folder" size={16} /> : undefined}
                onClick={() => {
                    choose(true);
                }}
            >
                {folderLabel ?? labels.fileChooseFolder}
            </Button>
        ) : null;
    const buttons = (withGlyph: boolean): React.JSX.Element =>
        folder ? (
            <div className="cm-file-buttons">
                {chooseButton(withGlyph)}
                {folderButton(withGlyph)}
            </div>
        ) : (
            chooseButton(withGlyph)
        );

    let body: React.ReactNode;
    if (drawn === "button") {
        body = buttons(true);
    } else if (showLoaded) {
        const clearName = clearLabel ?? `${labels.fileRemove} ${loaded.name}`;
        const cut = loaded.name.length > LOADED_TAIL * 2 ? loaded.name.length - LOADED_TAIL : loaded.name.length;
        body = (
            <div className="cm-file-loaded" title={loaded.name}>
                <UiGlyph name={LOADED_GLYPH[loaded.kind ?? "file"]} size={16} />
                <span className="cm-file-loaded-name">
                    <span className="cm-file-loaded-head">{loaded.name.slice(0, cut)}</span>
                    {loaded.name.slice(cut)}
                </span>
                <ActionIcon
                    disabled={disabled}
                    title={clearName}
                    aria-label={clearName}
                    onClick={() => {
                        refocus.current = true;
                        onClear?.();
                    }}
                >
                    <UiGlyph name="close" size={10} />
                </ActionIcon>
            </div>
        );
    } else if (drawn === "row") {
        const chooseIcon = (
            <ActionIcon
                disabled={disabled}
                title={chooseText}
                aria-label={chooseText}
                onClick={() => {
                    choose();
                }}
            >
                <UiGlyph name={chooseGlyph} size={16} />
            </ActionIcon>
        );
        // A row that also takes a folder carries its icon beside the file icon; a row that does not looks as before.
        const folderText = folderLabel ?? labels.fileChooseFolder;
        const icons = folder ? (
            <Group gap={0} wrap="nowrap">
                {chooseIcon}
                <ActionIcon
                    disabled={disabled}
                    title={folderText}
                    aria-label={folderText}
                    onClick={() => {
                        choose(true);
                    }}
                >
                    <UiGlyph name="folder" size={16} />
                </ActionIcon>
            </Group>
        ) : (
            chooseIcon
        );
        body = showUrl ? urlField(icons, folder ? 48 : undefined) : chooseButton(true);
    } else {
        body = (
            <>
                <div className="cm-file-drop-target">
                    <span className="cm-file-drop-glyph">
                        <UiGlyph name="upload" size={24} />
                    </span>
                    {buttons(false)}
                    {hint === undefined ? null : (
                        <Text className="cm-file-hint" span>
                            {hint}
                        </Text>
                    )}
                </div>
                {showUrl && urlField()}
            </>
        );
    }

    return (
        <div
            ref={root}
            className="cm-file-source"
            data-variant={drawn}
            data-over={over || undefined}
            data-disabled={disabled || undefined}
            data-fill={fill || undefined}
            data-dropping={dropCue || undefined}
        >
            {body}
            {dropCue ? (
                <div className="cm-file-drop-cue" aria-hidden="true">
                    <UiGlyph name={chooseGlyph} size={12} />
                    {dropLabel ?? labels.fileDrop}
                </div>
            ) : null}
            {progress === undefined ? null : (
                <LoadBar
                    progress={progress}
                    label={labels.fileLoading}
                    status={status}
                    onCancel={onCancel}
                    cancelLabel={cancelLabel ?? labels.fileCancel}
                />
            )}
        </div>
    );
}
