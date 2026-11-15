import { ActionIcon, Button, Progress, Text, TextInput } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useLabels } from "../../i18n";
import { UiGlyph } from "../../icons";
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
}

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
        error,
        onDiscard,
        fill = false,
        autoFocus = false,
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

    const urlField = (rightSection?: React.ReactNode): React.JSX.Element => {
        const field = (
            <TextInput
                ref={urlInput}
                type="url"
                data-autofocus={autoFocus && drawn === "row" ? true : undefined}
                value={address}
                disabled={disabled}
                placeholder={urlName}
                aria-label={urlName}
                error={error ?? invalid}
                className="cm-file-url"
                rightSection={rightSection}
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
    } else if (drawn === "row") {
        body = showUrl
            ? urlField(
                  <ActionIcon
                      disabled={disabled}
                      title={chooseText}
                      aria-label={chooseText}
                      onClick={() => {
                          choose();
                      }}
                  >
                      {uploadGlyph}
                  </ActionIcon>,
              )
            : chooseButton(true);
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
        >
            {body}
            {progress === undefined ? null : (
                <Progress
                    size="xs"
                    value={progress === null ? 100 : Math.round(Math.min(1, Math.max(0, progress)) * 100)}
                    animated={progress === null}
                    striped={progress === null}
                    aria-label={labels.fileLoading}
                />
            )}
        </div>
    );
}
