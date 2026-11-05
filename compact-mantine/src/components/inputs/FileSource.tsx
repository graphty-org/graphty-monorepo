import { ActionIcon, Button, TextInput } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useLabels } from "../../i18n";
import { UiGlyph } from "../../icons";
import { pickFiles } from "./pickFiles";
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
    /** Called with the chosen or dropped files (never empty). */
    onFiles: (files: File[]) => void;
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

    const choose = (): void => {
        void pickFiles({ accept, multiple }).then((files) => {
            if (files.length > 0) {
                onFiles(files);
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
                value={address}
                disabled={disabled}
                placeholder={urlName}
                aria-label={urlName}
                error={invalid}
                className="cm-file-url"
                rightSection={rightSection}
                onChange={(event) => {
                    setAddress(event.currentTarget.value);
                    setInvalid(false);
                }}
                onKeyDown={(event) => {
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
            onClick={choose}
        >
            {chooseText}
        </Button>
    );

    let body: React.ReactNode;
    if (drawn === "button") {
        body = chooseButton(true);
    } else if (drawn === "row") {
        body = showUrl
            ? urlField(
                  <ActionIcon disabled={disabled} title={chooseText} aria-label={chooseText} onClick={choose}>
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
                    {chooseButton(false)}
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
        >
            {body}
        </div>
    );
}
