import React, { useState } from "react";

import { PANEL_GRID } from "../../constants/panel";
import { useCompactStyles } from "../../theme/useCompactStyles";
import { SearchInput } from "../inputs/SearchInput";
import { EllipsizedName } from "../rows/EllipsizedName";
import { ScrollArea } from "../ScrollArea";
import { useRovingFocus } from "../shell/roving";

// A list of named color sets to load into a picker's swatches: the Palettes tab of
// CompactColorInput's pop-out, or a surface of the caller's own. Each row is a button, its name
// above a strip of its colors as equal hard-stop segments over the checkerboard. The look is
// cm-palettes-* in src/theme/css/color-palettes.css.ts.
//
// Accessibility: the rows are one group with one Tab stop (useRovingFocus, ArrowUp / ArrowDown,
// Home / End); each is a toggle button (aria-pressed on the palette in force) named by the
// palette's name and size. The strip is decoration: the name carries the meaning.

/** A named set of colors. */
export interface ColorPalette {
    /** What the caller calls it; unique within the list. */
    id: string;
    /** The name drawn on its row. */
    name: string;
    /** Hex or hexa colors, in order. */
    colors: readonly string[];
}

/** Every string PaletteBrowser draws or announces, in English by default. */
export interface PaletteBrowserLabels {
    /** The search box's placeholder and name. */
    search: string;
    /** The list's name. */
    palettes: string;
    /** A row's accessible name: "Okabe Ito, 8 colors". */
    palette: (name: string, count: number) => string;
    /** Drawn when the search matches nothing. */
    noMatch: (typed: string) => string;
}

const DEFAULT_LABELS: PaletteBrowserLabels = {
    search: "Find palette",
    palettes: "Palettes",
    palette: (name, count) => `${name}, ${String(count)} ${count === 1 ? "color" : "colors"}`,
    noMatch: (typed) => `No palette matches "${typed}"`,
};

/** Props for PaletteBrowser. */
export interface PaletteBrowserProps {
    /** The palettes offered, in the order drawn. */
    palettes: readonly ColorPalette[];
    /** The palette whose colors are the swatches now, drawn as chosen. */
    value?: string | null;
    /** Called with the chosen palette; load its colors into your swatches. */
    onPick: (palette: ColorPalette) => void;
    /**
     * Show the search box from this many palettes.
     * @default 8
     */
    searchFrom?: number;
    /** Replace any of the English strings. */
    labels?: Partial<PaletteBrowserLabels>;
}

/** The list's tallest extent before it scrolls: ten rows of the panel's pitch. */
const LIST_MAX_HEIGHT = PANEL_GRID.ROW_PITCH * 10;

/**
 * A string as space-led lower-case words, so a word-start match is a substring test.
 * @param text - the text
 * @returns " word word"
 */
function words(text: string): string {
    return ` ${(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).join(" ")}`;
}

/**
 * Whether a typed search finds a name: each typed word starts a word of the name, in order.
 * @param name - the palette's name
 * @param typed - the search text
 * @returns true when it matches
 */
function matches(name: string, typed: string): boolean {
    return words(name).includes(words(typed.trim()).trimEnd());
}

/**
 * A list of named color sets, each drawn as its name above a strip of its colors. Picking one
 * calls `onPick`; loading its colors into swatches is the caller's (CompactColorInput does it
 * for its own picker when given `palettes`).
 * @param props - Component props
 * @param props.palettes - The palettes offered
 * @param props.value - The palette in force, drawn as chosen
 * @param props.onPick - Called with the chosen palette
 * @param props.searchFrom - Show the search box from this many palettes
 * @param props.labels - Replace any of the English strings
 * @returns The palette list
 * @example
 * ```tsx
 * const [swatches, setSwatches] = useState<readonly string[]>([]);
 * <PaletteBrowser palettes={PALETTES} onPick={(p) => { setSwatches(p.colors); }} />
 * ```
 */
export function PaletteBrowser({
    palettes,
    value,
    onPick,
    searchFrom = 8,
    labels: overrides,
}: Readonly<PaletteBrowserProps>): React.JSX.Element {
    useCompactStyles();
    const labels = { ...DEFAULT_LABELS, ...overrides };
    const [query, setQuery] = useState("");
    const roving = useRovingFocus<HTMLFieldSetElement>("vertical");
    const searchable = palettes.length >= searchFrom;
    const shown = searchable && query.trim() !== "" ? palettes.filter((p) => matches(p.name, query)) : palettes;

    return (
        <div className="cm-palettes" data-testid="palette-browser">
            {searchable && (
                <div className="cm-palettes-search">
                    <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder={labels.search}
                        aria-label={labels.search}
                    />
                </div>
            )}
            <ScrollArea mah={LIST_MAX_HEIGHT} type="auto" scrollbars="y">
                <fieldset aria-label={labels.palettes} className="cm-fieldset cm-palettes-list" {...roving}>
                    {shown.map((palette) => (
                        <button
                            key={palette.id}
                            type="button"
                            className="cm-palettes-row cm-focus-inside"
                            aria-pressed={palette.id === value}
                            aria-label={labels.palette(palette.name, palette.colors.length)}
                            onClick={() => {
                                onPick(palette);
                            }}
                        >
                            <EllipsizedName name={palette.name} className="cm-palettes-name" />
                            <span className="cm-palettes-strip" aria-hidden="true">
                                {palette.colors.map((color, index) => (
                                    <span key={`${String(index)}-${color}`} style={{ background: color }} />
                                ))}
                            </span>
                        </button>
                    ))}
                </fieldset>
            </ScrollArea>
            <output className="cm-palettes-empty">{shown.length === 0 ? labels.noMatch(query.trim()) : ""}</output>
        </div>
    );
}
