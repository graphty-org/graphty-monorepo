import React from "react";

import { PANEL_GRID } from "../../constants/panel";
import { useCompactStyles } from "../../theme/useCompactStyles";
import type { ChangeHandler } from "../../types/events";
import { Popout, usePopout } from "../popout";
import { EllipsizedName } from "../rows/EllipsizedName";
import { PanelField } from "../rows/PanelField";
import { useRovingFocus } from "../shell/roving";
import { FileSource } from "./FileSource";

/** An image the reader can pick. */
export interface ImagePickerItem {
    /** What `value` and `onChange` name it by. */
    id: string;
    /** What the reader reads: the tile's text and the field's value. */
    name: string;
    /** A URL to draw its thumbnail (an object URL, a data URL, an address). Picture glyph when absent. */
    src?: string;
}

/** The words ImagePicker draws and speaks. */
export interface ImagePickerLabels {
    /** The tile that picks no image, and the field's value with none: "None". */
    none: string;
    /** The tiles' heading and group name: "In this project". */
    library: string;
    /** The file chooser's button: "Choose picture". */
    choose: string;
    /** The address field's placeholder: "Picture address". */
    address: string;
    /** The address field's submit button: "Add". */
    add: string;
    /** The drop target's hint: "Or drop a picture here". */
    dropHint: string;
    /** The pop-out's close button: "Close <title>". */
    close: (label: string) => string;
}

/** The English words, used for any the caller leaves out. */
export const DEFAULT_IMAGE_PICKER_LABELS: ImagePickerLabels = {
    none: "None",
    library: "In this project",
    choose: "Choose picture",
    address: "Picture address",
    add: "Add",
    dropHint: "Or drop a picture here",
    close: (label) => `Close ${label}`,
};

/** Props for ImagePicker. */
export interface ImagePickerProps {
    /** The field's name: its caption above it in a `FieldRow` and its accessible name. */
    label: string;
    /** The picked image's id (or an address the caller keeps), or null for none. */
    value: string | null;
    /** The images offered, newest first as the caller orders them. */
    images: readonly ImagePickerItem[];
    /** Called with the picked image's id, or null for None. */
    onChange: ChangeHandler<string | null>;
    /** Files chosen or dropped; add them and pass them back in `images` (then call onChange). */
    onFiles?: (files: File[]) => void;
    /** An address typed and entered. */
    onUrl?: (url: string) => void;
    /** The files the chooser and the drop take. @default "image/*" */
    accept?: string;
    /** Offer "None", which picks null. @default true */
    clearable?: boolean;
    /** A load is running: the bar shows and the loader is disabled. */
    busy?: boolean;
    /** What went wrong with the last file or address, under the field. */
    error?: string;
    /** Caller content under the loader (such as a "Use as model" button). */
    footer?: React.ReactNode;
    /** The name shown for a `value` not in `images` (an address); the value itself when absent. */
    valueName?: string;
    /** The pop-out's title. @default label */
    title?: string;
    /** Whether the field cannot be used. */
    disabled?: boolean;
    /** One sentence saying why the field is off, used only while `disabled`. */
    disabledReason?: string;
    /** Replacement words. */
    labels?: Partial<ImagePickerLabels>;
}

/**
 * A picture glyph on the 16px glyph grid: a frame with a mountain and a sun.
 * @param props - Component props
 * @param props.size - Drawn size in pixels
 * @returns The glyph
 */
function PictureGlyph({ size = PANEL_GRID.GLYPH }: Readonly<{ size?: number }>): React.JSX.Element {
    // The glyph register's grid: a 16-unit box, round 1px strokes in currentColor at any size.
    const grid = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 16 / size };
    return (
        <svg
            {...grid}
            width={size}
            height={size}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            data-glyph="picture"
            className="cm-image-picker-glyph"
        >
            <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" />
            <path d="M2.5 11 L6 7.5 L9 10.5 L10.5 9 L13.5 12" />
            <circle cx="10.5" cy="6" r="1" />
        </svg>
    );
}

/**
 * A 16px thumbnail, or the picture glyph when there is nothing to draw.
 * @param props - Component props
 * @param props.src - the image's address
 * @returns The thumbnail
 */
function Thumb({ src }: Readonly<{ src: string | undefined }>): React.JSX.Element {
    return src === undefined ? (
        <PictureGlyph />
    ) : (
        <img className="cm-image-picker-thumb" src={src} alt="" aria-hidden width={16} height={16} />
    );
}

/** Props for the pop-out's body. */
interface PickerBodyProps extends ImagePickerProps {
    /** The words, defaults filled in. */
    words: ImagePickerLabels;
}

/**
 * The pop-out's body: the tiles, the loader, the caller's footer. Inside the Popout, so a pick
 * can close it and send focus back to the field.
 * @param props - the picker's props and its words
 * @returns The body
 */
function PickerBody(props: Readonly<PickerBodyProps>): React.JSX.Element {
    const { value, images, onChange, onFiles, onUrl, error, footer, words } = props;
    const { accept = "image/*", clearable = true, busy = false } = props;
    const { close } = usePopout();
    const roving = useRovingFocus<HTMLDivElement>("vertical");
    const pick = (id: string | null, event: React.MouseEvent): void => {
        onChange(id, event);
        close(event);
    };
    const tile = (id: string | null, name: string, glyph: React.ReactNode): React.JSX.Element => (
        <button
            key={id === null ? "none" : `image:${id}`}
            type="button"
            className="cm-image-picker-tile cm-focus-inside"
            aria-pressed={id === value}
            data-autofocus={id === value ? true : undefined}
            onClick={(event) => {
                pick(id, event);
            }}
        >
            {glyph}
            <EllipsizedName name={name} className="cm-image-picker-name" />
        </button>
    );
    const loads = onFiles !== undefined || onUrl !== undefined;
    return (
        <div className="cm-image-picker-body">
            {clearable || images.length > 0 ? (
                // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- an ARIA group naming a list of tile buttons; a fieldset would draw its own border and legend
                <div role="group" aria-label={words.library} className="cm-image-picker-tiles" {...roving}>
                    {clearable ? tile(null, words.none, <PictureGlyph />) : null}
                    {images.length > 0 ? (
                        <span className="cm-caption cm-image-picker-heading" aria-hidden="true">
                            {words.library}
                        </span>
                    ) : null}
                    {images.map((image) => tile(image.id, image.name, <Thumb src={image.src} />))}
                </div>
            ) : null}
            {loads ? (
                <FileSource
                    submitOnBlur
                    barUnderField
                    variant="drop"
                    url={onUrl !== undefined}
                    accept={accept}
                    label={words.choose}
                    placeholder={words.address}
                    openLabel={words.add}
                    hint={words.dropHint}
                    progress={busy ? null : undefined}
                    disabled={busy}
                    error={error}
                    onFiles={(files) => {
                        onFiles?.(files);
                    }}
                    onUrl={onUrl}
                />
            ) : null}
            {footer}
        </div>
    );
}

/**
 * A field that picks an image: the picked image's thumbnail and name, opening a pop-out with the
 * images offered as tiles, "None", and a loader for a file, a drop or an address.
 *
 * compact-mantine keeps no images: the caller adds what `onFiles` and `onUrl` report, passes the
 * result back in `images`, and owns every `src`.
 * @param props - Component props
 * @returns The field and its pop-out
 * @example
 * ```tsx
 * const [images, setImages] = useState<ImagePickerItem[]>([]);
 * const [picked, setPicked] = useState<string | null>(null);
 * <ImagePicker label="Picture" value={picked} images={images} onChange={setPicked}
 *     onFiles={(files) => {
 *         const added = files.map((f) => ({ id: f.name, name: f.name, src: URL.createObjectURL(f) }));
 *         setImages((all) => [...added, ...all]);
 *         setPicked(added[0].id);
 *     }} />
 * ```
 */
export function ImagePicker(props: Readonly<ImagePickerProps>): React.JSX.Element {
    useCompactStyles();
    const { label, value, images, valueName, title, disabled = false, disabledReason, labels } = props;
    const words = { ...DEFAULT_IMAGE_PICKER_LABELS, ...labels };
    const picked = value === null ? undefined : images.find((image) => image.id === value);
    let shown = words.none;
    if (value !== null) {
        shown = picked?.name ?? valueName ?? value;
    }
    const heading = title ?? label;
    return (
        <div className="cm-image-picker">
            <Popout>
                <Popout.Trigger>
                    <PanelField
                        kind="select"
                        width="fill"
                        label={`${label}, ${shown}`}
                        value={shown}
                        glyph={<Thumb src={picked?.src} />}
                        disabled={disabled}
                        disabledReason={disabledReason}
                    />
                </Popout.Trigger>
                <Popout.Panel
                    width={PANEL_GRID.POPOVER_WIDTH}
                    header={{ variant: "title", title: heading }}
                    closeLabel={words.close(heading)}
                >
                    <Popout.Content>
                        <PickerBody {...props} words={words} />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        </div>
    );
}
