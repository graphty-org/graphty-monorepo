import React from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";

/**
 * The closed register of drawings allowed in a field's 16px slot.
 *
 * Nothing outside this list may be drawn there. The premise of the field is
 * that a small drawing can replace a word, which only works if the drawings are
 * a fixed set a reader can learn; a concept with no entry here keeps its word
 * instead.
 */
export type FieldGlyphName =
    | "sizeSmallest"
    | "sizeLargest"
    | "width"
    | "opacity"
    | "attribute"
    | "scaleSqrt"
    | "scaleLinear"
    | "scaleLog";

/**
 * The closed set of capital letters allowed in a field slot in place of a
 * glyph: `N` nodes, `E` edges, `W` weight, `D` depth, `K` k.
 */
export type FieldLetter = "N" | "E" | "W" | "D" | "K";

/**
 * Shared UI glyphs: the chevrons, the doors and the status marks the row types
 * draw outside a field's slot.
 */
export type UiGlyphName =
    | "chevronDown"
    | "chevronRight"
    | "chevronLeft"
    | "close"
    | "plus"
    | "minus"
    | "gear"
    | "warning"
    | "check"
    | "eye"
    | "refresh"
    | "copy"
    | "pin"
    | "info"
    | "reset";

/**
 * Every glyph name in the closed field register, in register order.
 */
export const FIELD_GLYPH_NAMES: readonly FieldGlyphName[] = [
    "sizeSmallest",
    "sizeLargest",
    "width",
    "opacity",
    "attribute",
    "scaleSqrt",
    "scaleLinear",
    "scaleLog",
];

/**
 * Every capital letter allowed in a field slot.
 */
export const FIELD_LETTERS: readonly FieldLetter[] = ["N", "E", "W", "D", "K"];

/**
 * Every shared UI glyph name.
 */
export const UI_GLYPH_NAMES: readonly UiGlyphName[] = [
    "chevronDown",
    "chevronRight",
    "chevronLeft",
    "close",
    "plus",
    "minus",
    "gear",
    "warning",
    "check",
    "eye",
    "refresh",
    "copy",
    "pin",
    "info",
    "reset",
];

/**
 * The attributes every glyph in the set carries: a 16px viewBox drawn as
 * 1.5px round strokes in the parent's own colour. Colour never comes from the
 * SVG.
 */
const SVG_ATTRIBUTES = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
} as const;

/**
 * The attributes that turn one shape of a glyph into its bound (filled) form.
 */
const FILL_ATTRIBUTES = {
    fill: "currentColor",
    stroke: "none",
} as const;

// The path data is copied verbatim from the design vocabulary, section 11.
// The bound form fills the glyph's closed shapes with `currentColor` and drops
// their stroke; the attribute tag additionally knocks its hole back out in the
// field's own surface, exactly as the mockup does. Glyphs drawn only from open
// curves -- the three scale curves -- have no fillable shape and draw the same
// either way.

/**
 * The inner shapes of each field glyph, in its hollow and its filled form.
 */
const FIELD_GLYPH_SHAPES: Record<FieldGlyphName, (filled: boolean) => React.JSX.Element> = {
    sizeSmallest: (filled) => (
        <>
            <circle cx="5" cy="11" r="2.5" {...(filled ? FILL_ATTRIBUTES : {})} />
            <circle cx="10.5" cy="6.5" r="4" {...(filled ? FILL_ATTRIBUTES : {})} />
        </>
    ),
    sizeLargest: (filled) => (
        <>
            <circle cx="4.5" cy="11.5" r="1.75" {...(filled ? FILL_ATTRIBUTES : {})} />
            <circle cx="10" cy="6" r="5" {...(filled ? FILL_ATTRIBUTES : {})} />
        </>
    ),
    width: (filled) => (
        <>
            <line x1="2.5" y1="8" x2="13.5" y2="8" />
            <polyline points="5,5.5 2.5,8 5,10.5" {...(filled ? FILL_ATTRIBUTES : {})} />
            <polyline points="11,5.5 13.5,8 11,10.5" {...(filled ? FILL_ATTRIBUTES : {})} />
        </>
    ),
    opacity: (filled) => {
        if (filled) {
            return <circle cx="8" cy="8" r="5.5" {...FILL_ATTRIBUTES} />;
        }

        return (
            <>
                <circle cx="8" cy="8" r="5.5" />
                <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" {...FILL_ATTRIBUTES} />
            </>
        );
    },
    attribute: (filled) => {
        if (filled) {
            return (
                <>
                    <path d="M2.5 7.2V3.5a1 1 0 0 1 1-1h3.7l6.3 6.3-4.7 4.7z" {...FILL_ATTRIBUTES} />
                    {/*
                        The hole in the filled tag is knocked back out in the
                        colour of the field behind it. It goes through `style`
                        rather than the `fill` attribute because `SURFACE` is a
                        `light-dark()` value, which resolves in CSS but not
                        reliably in an SVG presentation attribute.
                    */}
                    <circle cx="5.5" cy="5.5" r="0.75" style={{fill: PANEL_INK.SURFACE}} stroke="none" />
                </>
            );
        }

        return (
            <>
                <path d="M2.5 7.2V3.5a1 1 0 0 1 1-1h3.7l6.3 6.3-4.7 4.7z" />
                <circle cx="5.5" cy="5.5" r="0.75" />
            </>
        );
    },
    scaleSqrt: () => <path d="M2.5 13.5C4.5 5 8 2.5 13.5 2.5" />,
    scaleLinear: () => <line x1="2.5" y1="13.5" x2="13.5" y2="2.5" />,
    scaleLog: () => <path d="M2.5 13.5C8 13.5 11.5 11 13.5 2.5" />,
};

// Copied verbatim from the design vocabulary: the row-type snippets of section
// 11, plus the gear of 14.1, the pin of 12 and the circled i of 6.7.
//
// Three are not verbatim, and all three are deliberate:
//
// - `chevronLeft` has no snippet of its own inside a row, so it is the exact
//   mirror of `chevronRight` rather than the larger header chevron of 14.3.
// - `reset` is the same X as `close`: the vocabulary spells the reset
//   affordance as the 12px X of the number input, so the two differ by their
//   title, not by their drawing.
// - `minus` is the horizontal bar of `plus`, so that a control which adds and
//   a control which removes are drawn at one weight.

/**
 * The inner shapes of each shared UI glyph.
 */
const UI_GLYPH_SHAPES: Record<UiGlyphName, React.JSX.Element> = {
    chevronDown: <polyline points="4,6 8,10 12,6" />,
    chevronRight: <polyline points="6,4 10,8 6,12" />,
    chevronLeft: <polyline points="10,4 6,8 10,12" />,
    close: (
        <>
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
        </>
    ),
    plus: (
        <>
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
        </>
    ),
    minus: <line x1="3" y1="8" x2="13" y2="8" />,
    gear: (
        <>
            <circle cx="8" cy="8" r="2.25" />
            <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
        </>
    ),
    warning: (
        <>
            <path d="M8 2.5l6 11H2z" />
            <line x1="8" y1="6.5" x2="8" y2="9.5" />
            <line x1="8" y1="11.5" x2="8" y2="11.75" />
        </>
    ),
    check: <polyline points="3.5,8.5 6.5,11.5 12.5,5" />,
    eye: (
        <>
            <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" />
            <circle cx="8" cy="8" r="2" />
        </>
    ),
    refresh: (
        <>
            <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
            <polyline points="2.5,2.5 2.5,6 6,6" />
        </>
    ),
    copy: (
        <>
            <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
            <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
        </>
    ),
    pin: (
        <>
            <path d="M6 2.5h4l-.5 3.5 2 2.5H4.5l2-2.5z" />
            <line x1="8" y1="8.5" x2="8" y2="13.5" />
        </>
    ),
    info: (
        <>
            <circle cx="8" cy="8" r="6.5" />
            <line x1="8" y1="7" x2="8" y2="11.5" />
            <line x1="8" y1="4.5" x2="8" y2="4.75" />
        </>
    ),
    reset: (
        <>
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
        </>
    ),
};

/**
 * Props for the FieldGlyph component.
 */
export interface FieldGlyphProps {
    /** Which glyph of the closed field register to draw. */
    name: FieldGlyphName;
    /** a bound glyph draws filled; a fixed literal draws hollow */
    filled?: boolean;
    /** Drawn size in pixels. Defaults to the 14px glyph size of the 16px slot. */
    size?: number;
}

/**
 * A glyph from the closed register, drawn in a field's 16px slot.
 *
 * The glyph is the field's label: it replaces the word that a label-above-field
 * stack used to spend a line on. It is decorative to assistive technology --
 * the field itself carries the word as its title and accessible name.
 * @param props - Component props
 * @param props.name - Which glyph of the closed field register to draw
 * @param props.filled - Draw the bound form: the glyph's closed shapes fill with the current colour, which is how a field says its value comes from a data attribute rather than from a fixed literal
 * @param props.size - Drawn size in pixels, defaulting to the 14px glyph size
 * @returns The field glyph SVG
 */
export function FieldGlyph({ name, filled = false, size = PANEL_GRID.GLYPH }: FieldGlyphProps): React.JSX.Element {
    return (
        <svg
            width={size}
            height={size}
            {...SVG_ATTRIBUTES}
            aria-hidden="true"
            focusable="false"
            data-glyph={name}
            data-filled={filled ? "true" : "false"}
            style={{ flex: "0 0 auto", display: "block" }}
        >
            {FIELD_GLYPH_SHAPES[name](filled)}
        </svg>
    );
}

/**
 * Props for the UiGlyph component.
 */
export interface UiGlyphProps {
    /** Which shared UI glyph to draw. */
    name: UiGlyphName;
    /** Drawn size in pixels. Defaults to the 14px glyph size. */
    size?: number;
}

/**
 * A shared UI glyph: a chevron, a door, a verb or a status mark.
 *
 * Decorative to assistive technology; the control that holds it carries the
 * title and the accessible name.
 * @param props - Component props
 * @param props.name - Which shared UI glyph to draw
 * @param props.size - Drawn size in pixels, defaulting to the 14px glyph size
 * @returns The UI glyph SVG
 */
export function UiGlyph({ name, size = PANEL_GRID.GLYPH }: UiGlyphProps): React.JSX.Element {
    return (
        <svg
            width={size}
            height={size}
            {...SVG_ATTRIBUTES}
            aria-hidden="true"
            focusable="false"
            data-glyph={name}
            style={{ flex: "0 0 auto", display: "block" }}
        >
            {UI_GLYPH_SHAPES[name]}
        </svg>
    );
}

/**
 * Whether a value names a glyph in the closed field register.
 *
 * A field's `glyph` prop takes a register name, one of the five capital
 * letters, or an arbitrary node such as a colour swatch; this is how a row type
 * tells the first case from the third.
 * @param value - The candidate glyph
 * @returns True when the value is a name in the closed field register
 */
export function isFieldGlyphName(value: unknown): value is FieldGlyphName {
    return typeof value === "string" && (FIELD_GLYPH_NAMES as readonly string[]).includes(value);
}

/**
 * Whether a value is one of the five capital letters allowed in a field slot.
 *
 * A letter draws as an 11px capital in the secondary text colour instead of an
 * SVG, for a concept no drawing stands for.
 * @param value - The candidate glyph
 * @returns True when the value is one of `N`, `E`, `W`, `D` or `K`
 */
export function isFieldLetter(value: unknown): value is FieldLetter {
    return typeof value === "string" && (FIELD_LETTERS as readonly string[]).includes(value);
}
