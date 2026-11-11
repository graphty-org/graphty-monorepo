import type { LoadedSource } from "@graphty/graphty-element/session";
import type React from "react";

import { GLYPHS } from "../glyphs";

/** The glyph of each kind of load. */
export const KIND_ICONS: Readonly<Record<LoadedSource["kind"], React.ReactNode>> = {
    file: <GLYPHS.file size={14} aria-hidden />,
    url: <GLYPHS.webAddress size={14} aria-hidden />,
    server: <GLYPHS.server size={14} aria-hidden />,
    sample: <GLYPHS.sampleSource size={14} aria-hidden />,
    join: <GLYPHS.webAddress size={14} aria-hidden />,
};
