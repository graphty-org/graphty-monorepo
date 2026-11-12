import React from "react";

import { GLYPHS } from "../glyphs";
import type { TypeGlyph } from "./words";

const TYPE_GLYPHS: Record<TypeGlyph, React.ReactNode> = {
    category: <GLYPHS.category size={14} aria-hidden />,
    text: <GLYPHS.text size={14} aria-hidden />,
    number: <GLYPHS.number size={14} aria-hidden />,
    ordinal: <GLYPHS.ordinal size={14} aria-hidden />,
    time: <GLYPHS.time size={14} aria-hidden />,
    "yes-no": <GLYPHS.yesNo size={14} aria-hidden />,
    unknown: <GLYPHS.unknown size={14} aria-hidden />,
    result: <GLYPHS.measure size={14} aria-hidden />,
};

/**
 * An attribute's type icon, which the attribute inspector's header draws.
 * @param props - Component props
 * @param props.glyph - The attribute's type glyph
 * @returns The icon
 */
export function TypeGlyphIcon({ glyph }: Readonly<{ glyph: TypeGlyph }>): React.JSX.Element {
    return <>{TYPE_GLYPHS[glyph]}</>;
}
