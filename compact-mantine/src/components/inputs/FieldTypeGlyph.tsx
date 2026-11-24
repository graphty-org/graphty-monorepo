import React from "react";

/** What kind of values a data field holds. */
export type DataFieldType = "number" | "string" | "boolean" | "date" | "category" | "id" | "other";

/** Props for the FieldTypeGlyph component. */
export interface FieldTypeGlyphProps {
    /** The field's type. */
    type: DataFieldType;
    /** Drawn size in pixels. @default 14 */
    size?: number;
}

/** One small drawing per type, on the 16-unit grid `FieldGlyph` and `UiGlyph` draw on. */
const TYPE_SHAPES: Record<DataFieldType, React.JSX.Element> = {
    number: <path d="M6.5 2.5 5.5 13.5M10.5 2.5l-1 11M3 6h10.5M2.5 10H13" />,
    string: <path d="M3.5 3.5h9M8 3.5v9M6.5 12.5h3" />,
    boolean: (
        <>
            <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
            <polyline points="5,8.25 7,10.25 11,5.75" />
        </>
    ),
    date: (
        <>
            <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
            <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
        </>
    ),
    category: (
        <>
            <path d="M2.5 7.2V3.5a1 1 0 0 1 1-1h3.7l6.3 6.3-4.7 4.7z" />
            <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" stroke="none" />
        </>
    ),
    id: (
        <>
            <circle cx="5.5" cy="10.5" r="3" />
            <path d="M7.6 8.4 13.5 2.5M11.5 4.5l1.5 1.5" />
        </>
    ),
    other: <circle cx="8" cy="8" r="1.75" fill="currentColor" stroke="none" />,
};

/**
 * A small drawing of a data field's type: `#` a number, a text mark a string, a checked box a
 * yes-or-no, a calendar a date, a tag a category, a key an id, a dot anything else. Drawn in
 * `currentColor` with 1px round strokes, as `FieldGlyph` is. Decorative: the row or field that
 * holds it carries the type word in its accessible name.
 * @param props - Component props
 * @param props.type - The field's type
 * @param props.size - Drawn size in pixels
 * @returns The glyph SVG
 */
export function FieldTypeGlyph({ type, size = 14 }: Readonly<FieldTypeGlyphProps>): React.JSX.Element {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            // A 1 CSS pixel stroke at any drawn size, as the field glyphs draw.
            strokeWidth={16 / size}
            aria-hidden="true"
            focusable="false"
            data-field-type={type}
            style={{ flex: "0 0 auto", display: "block" }}
        >
            {TYPE_SHAPES[type]}
        </svg>
    );
}
