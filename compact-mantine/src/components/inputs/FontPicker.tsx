import { Button } from "@mantine/core";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

import { useCollator } from "../../i18n";
import { useCompactStyles } from "../../theme/useCompactStyles";
import type { ChangeHandler } from "../../types/events";
import { matchesWordStart } from "../../utils/word-start";
import { usePopout } from "../popout";
import { FileSource } from "./FileSource";
import {
    askedLocalFamilies,
    canDraw,
    COMMON_FAMILIES,
    fileStem,
    firstFamily,
    type FontFormat,
    fontFormatOf,
    GENERIC_FAMILIES,
    localFontsGranted,
    localFontsSupported,
    queryLocalFamilies,
    quoteFamily,
} from "./fontFamilies";
import { ListboxCheck } from "./listbox";
import { PickerPopout } from "./PickerPopout";
import { SearchInput } from "./SearchInput";
import { useFileDrop } from "./useFileDrop";

/** A font the caller adds to the list, such as one the reader uploaded. */
export interface FontPickerFont {
    /** The CSS family name the value takes when it is picked. */
    family: string;
    /** What the list shows; `family` when absent. */
    label?: string;
}

/** A font file the reader chose or dropped, read into memory. */
export interface FontPickerUpload {
    /** The file as chosen. */
    file: File;
    /** Its bytes. */
    bytes: Uint8Array;
    /** From its ending. */
    format: FontFormat;
    /** A family name to register it under: the file name without its ending. */
    family: string;
}

/** The words FontPicker shows and speaks. */
export interface FontPickerLabels {
    /** The heading of the caller's fonts. */
    uploaded: string;
    /** The heading of the fonts installed on this computer. */
    local: string;
    /** The heading of the common fonts. */
    common: string;
    /** The heading of the CSS generic families. */
    generic: string;
    /** The button that lists the fonts installed on this computer. */
    showLocal: string;
    /** The button that opens the file picker for a font. */
    upload: string;
    /** The search box's placeholder and name. */
    search: string;
    /** What the list says when nothing matches what was typed. */
    noMatch: (typed: string) => string;
    /** Why a file was refused. */
    refusedFile: (name: string) => string;
}

const DEFAULT_LABELS: FontPickerLabels = {
    uploaded: "Uploaded",
    local: "On this computer",
    common: "Common fonts",
    generic: "Generic families",
    showLocal: "Show fonts on this computer",
    upload: "Upload font",
    search: "Find font",
    noMatch: (typed) => `No font matches "${typed}"`,
    refusedFile: (name) => `${name} is not a font file. Use .ttf, .otf, .woff or .woff2.`,
};

/** The files the upload offers. */
const FONT_ACCEPT = ".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2";

/** Props for the FontPicker component. */
export interface FontPickerProps {
    /** The field's name: its accessible name, the pop-out's title and FieldRow's caption above it. */
    label: string;
    /** The CSS font-family value, a single family or a stack. A stack shows as its first family. */
    value: string | null;
    /** Called with the picked family. */
    onChange: ChangeHandler<string>;
    /** The caller's fonts, listed first under "Uploaded". */
    fonts?: readonly FontPickerFont[];
    /** Offer an upload; called once per accepted file. No upload control when absent. */
    onUpload?: (upload: FontPickerUpload) => void | Promise<void>;
    /** Offer the fonts installed on this computer (Local Font Access API, where the browser has it). @default true */
    localFonts?: boolean;
    /** Replace the built-in common list. */
    families?: readonly string[];
    /** Shown while no font is picked. */
    placeholder?: string;
    /** Whether the field cannot be used. */
    disabled?: boolean;
    /** Why it cannot be used. */
    disabledReason?: string;
    /** Words to replace. */
    labels?: Partial<FontPickerLabels>;
}

/** One option of the list. */
interface FontOption {
    family: string;
    label: string;
}

/** A labeled group of options. */
interface FontGroup {
    key: string;
    label: string;
    options: FontOption[];
}

/**
 * The groups in their order, each family listed once (by the first group that lists it), and the
 * value in force added to the end of the common fonts when no group lists it.
 * @param sources - the groups before deduplication
 * @param held - the family in force, or ""
 * @param commonKey - the key of the group a held family off every list joins
 * @returns the groups that list anything
 */
function buildGroups(sources: FontGroup[], held: string, commonKey: string): FontGroup[] {
    const seen = new Set<string>();
    const groups = sources.map((group) => ({
        ...group,
        options: group.options.filter((option) => {
            const key = option.family.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        }),
    }));
    if (held !== "" && !seen.has(held.toLowerCase())) {
        groups.find((group) => group.key === commonKey)?.options.push({ family: held, label: held });
    }
    return groups.filter((group) => group.options.length > 0);
}

/** Props of the pop-out's body. */
interface BodyProps extends Omit<FontPickerProps, "labels" | "placeholder" | "disabled" | "disabledReason"> {
    labels: FontPickerLabels;
    held: string;
}

/**
 * The pop-out's content: the search box, the grouped list and the actions. Mounted while the
 * pop-out is open, so opening it is this component's mount.
 * @param props - Component props
 * @param props.label - The field's name, which names the list
 * @param props.held - The family in force, or ""
 * @param props.onChange - Called with the picked family
 * @param props.fonts - The caller's fonts
 * @param props.onUpload - Takes an uploaded font
 * @param props.localFonts - Whether to offer the installed fonts
 * @param props.families - The common fonts
 * @param props.labels - The words
 * @returns The content
 */
function FontPickerBody({
    label,
    held,
    onChange,
    fonts = [],
    onUpload,
    localFonts = true,
    families = COMMON_FAMILIES,
    labels,
}: Readonly<BodyProps>): React.JSX.Element {
    const { close } = usePopout();
    const collator = useCollator();
    const listId = useId();
    const root = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState("");
    const [local, setLocal] = useState<readonly string[] | null>(null);
    const [offerLocal, setOfferLocal] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    // The installed fonts: listed at once when already granted or asked for, otherwise offered as
    // a button (the API wants the reader's own click).
    useEffect(() => {
        if (!localFonts || !localFontsSupported()) {
            return undefined;
        }
        let live = true;
        const show = (found: readonly string[] | null): void => {
            if (live) {
                setLocal(found);
                setOfferLocal(false);
            }
        };
        const asked = askedLocalFamilies();
        if (asked === undefined) {
            void localFontsGranted().then((granted) => {
                if (granted) {
                    void queryLocalFamilies().then(show);
                } else if (live) {
                    setOfferLocal(true);
                }
            });
        } else {
            void asked.then(show);
        }
        return () => {
            live = false;
        };
    }, [localFonts]);

    const groups = useMemo(() => {
        const plain = (list: readonly string[]): FontOption[] => list.map((family) => ({ family, label: family }));
        return buildGroups(
            [
                {
                    key: "uploaded",
                    label: labels.uploaded,
                    options: fonts.map((font) => ({ family: font.family, label: font.label ?? font.family })),
                },
                {
                    key: "local",
                    label: labels.local,
                    options: plain([...(local ?? [])].sort((a, b) => collator.compare(a, b))),
                },
                { key: "common", label: labels.common, options: plain(families.filter((family) => canDraw(family))) },
                { key: "generic", label: labels.generic, options: plain(GENERIC_FAMILIES) },
            ],
            held,
            "common",
        );
    }, [fonts, local, families, held, labels, collator]);

    const shown = groups
        .map((group) => ({
            ...group,
            options: group.options.filter(
                (option) => matchesWordStart(option.label, query) || matchesWordStart(option.family, query),
            ),
        }))
        .filter((group) => group.options.length > 0);
    const flat = shown.flatMap((group) => group.options);
    const heldKey = held.toLowerCase();
    const [active, setActive] = useState(() => flat.findIndex((option) => option.family.toLowerCase() === heldKey));
    const optionId = (index: number): string => `${listId}-${String(index)}`;

    useEffect(() => {
        if (active >= 0) {
            document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
        }
    });

    const pick = (family: string, event?: React.SyntheticEvent): void => {
        onChange(family, event);
        close();
    };

    const take = async (files: File[]): Promise<void> => {
        const [file] = files;
        const format = fontFormatOf(file.name);
        if (format === undefined || onUpload === undefined) {
            setError(labels.refusedFile(file.name));
            return;
        }
        setError(undefined);
        setBusy(true);
        const family = fileStem(file.name);
        try {
            await onUpload({ file, bytes: new Uint8Array(await file.arrayBuffer()), format, family });
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : String(failure));
            return;
        } finally {
            setBusy(false);
        }
        pick(family);
    };
    useFileDrop(
        root,
        (files) => {
            void take(files);
        },
        { single: true, disabled: onUpload === undefined || busy },
    );

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        const last = flat.length - 1;
        const moves: Record<string, () => number> = {
            ArrowDown: () => (active >= last ? 0 : active + 1),
            ArrowUp: () => (active <= 0 ? last : active - 1),
            Home: () => 0,
            End: () => last,
        };
        const move = moves[event.key] as (() => number) | undefined;
        if (move !== undefined && flat.length > 0) {
            event.preventDefault();
            setActive(move());
        } else if (event.key === "Enter" && active >= 0 && active <= last) {
            event.preventDefault();
            pick(flat[active].family, event);
        }
    };

    let index = -1;
    return (
        <div ref={root} className="cm-font-picker">
            <div className="cm-font-picker-search">
                <SearchInput // eslint-disable-line jsx-a11y/prefer-tag-over-role -- the search box of an ARIA combobox whose popup holds grouped, styled rows; a datalist cannot
                    data-autofocus
                    value={query}
                    onChange={(next) => {
                        setQuery(next);
                        setActive(next.trim() === "" ? -1 : 0);
                    }}
                    placeholder={labels.search}
                    aria-label={labels.search}
                    role="combobox"
                    aria-expanded
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={active >= 0 && active < flat.length ? optionId(active) : undefined}
                    onKeyDown={onKeyDown}
                />
            </div>
            <div className="cm-listbox cm-menu-surface cm-font-picker-list">
                <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- the popup of an ARIA combobox with grouped rows; a native select cannot be one
                    id={listId}
                    role="listbox"
                    aria-label={label}
                >
                    {shown.map((group) => (
                        <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- a group of options inside an ARIA listbox; optgroup works only inside a native select
                            key={group.key}
                            role="group"
                            aria-labelledby={`${listId}-${group.key}`}
                            className="cm-listbox-group"
                        >
                            <div id={`${listId}-${group.key}`} className="cm-listbox-group-label">
                                {group.label}
                            </div>
                            {group.options.map((option) => {
                                index += 1;
                                const at = index;
                                const checked = option.family.toLowerCase() === heldKey;
                                return (
                                    <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- an option of an ARIA combobox popup drawn in its own face; a native option cannot be styled
                                        key={option.family}
                                        id={optionId(at)}
                                        role="option"
                                        tabIndex={-1}
                                        aria-selected={checked}
                                        data-checked={checked || undefined}
                                        data-combobox-selected={at === active || undefined}
                                        className="cm-menu-row cm-listbox-option"
                                        onMouseDown={(event) => {
                                            // Focus stays in the search box, which owns the list.
                                            event.preventDefault();
                                        }}
                                        // Focus stays in the search box; tabIndex -1 lets a tool that
                                        // does move focus here still pick with Enter.
                                        onClick={(event) => {
                                            pick(option.family, event);
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                pick(option.family, event);
                                            }
                                        }}
                                    >
                                        <ListboxCheck />
                                        <span
                                            className="cm-listbox-label"
                                            style={{ fontFamily: quoteFamily(option.family) }}
                                        >
                                            {option.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
                {flat.length === 0 ? (
                    <output className="cm-font-picker-empty">{labels.noMatch(query.trim())}</output>
                ) : null}
            </div>
            {offerLocal || onUpload !== undefined ? (
                <div className="cm-font-picker-actions">
                    {offerLocal ? (
                        <Button
                            variant="default"
                            onClick={() => {
                                void queryLocalFamilies().then((found) => {
                                    setLocal(found);
                                    setOfferLocal(false);
                                });
                            }}
                        >
                            {labels.showLocal}
                        </Button>
                    ) : null}
                    {onUpload === undefined ? null : (
                        <FileSource
                            variant="button"
                            label={labels.upload}
                            accept={FONT_ACCEPT}
                            disabled={busy}
                            progress={busy ? null : undefined}
                            onFiles={(files) => {
                                void take(files);
                            }}
                        />
                    )}
                    {error === undefined ? null : (
                        <div className="cm-field-error" role="alert">
                            {error}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}

/**
 * A field that picks a font family: the browser's generic families, the common fonts this browser
 * can draw, the fonts installed on this computer (where the browser offers them) and the caller's
 * own, each drawn in its own face, with a search box and an optional upload. Generic: compact-mantine
 * never registers or stores a font; an upload's bytes go to `onUpload`, and the caller registers
 * them and passes the font back in `fonts`.
 * @param props - Component props
 * @returns The picker
 * @example
 * ```tsx
 * const [font, setFont] = useState<string | null>("sans-serif");
 * <FontPicker label="Label font" value={font} onChange={setFont} />
 * ```
 */
export function FontPicker(props: Readonly<FontPickerProps>): React.JSX.Element {
    useCompactStyles();
    const { label, value, placeholder, disabled, disabledReason, labels: labelsProp } = props;
    const labels = { ...DEFAULT_LABELS, ...labelsProp };
    const held = value === null ? "" : firstFamily(value);
    return (
        <PickerPopout
            label={label}
            value={held}
            placeholder={placeholder}
            disabled={disabled}
            disabledReason={disabledReason}
        >
            {() => <FontPickerBody {...props} labels={labels} held={held} />}
        </PickerPopout>
    );
}
