import type { GraphSession, StyleRow } from "@graphty/graphty-element/session";
import { Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { kindGlyphWords, paintedTarget } from "./rows";

/**
 * A style tree row's kind glyph: a folder, or what a layer paints -- a dot for nodes, a line for
 * edges, a dot on a line for both -- each one icon at one size and stroke, so no kind reads dimmer
 * than another. The tree, the inspector's header and a folder's list of rows all draw this one.
 * Its tooltip says what it stands for ("Paints nodes and edges"); never where the layer came from.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.row - the row
 * @param props.size - the icon's size in pixels
 * @returns The glyph, hidden from assistive technology (the row's name says its kind)
 */
export function KindGlyph({
    session,
    row,
    size = 14,
}: Readonly<{ session: GraphSession; row: StyleRow; size?: number }>): React.JSX.Element {
    let Glyph = GLYPHS.layer;
    if (row.kind === "folder") {
        Glyph = GLYPHS.folder;
    } else {
        const target = paintedTarget(session, row.id);
        if (target === "node") {
            Glyph = GLYPHS.node;
        } else if (target === "edge") {
            Glyph = GLYPHS.edge;
        } else if (target === "both") {
            Glyph = GLYPHS.bothKinds;
        }
    }
    return (
        <Tooltip label={kindGlyphWords(session, row)}>
            <span data-kind-glyph="" style={{ display: "inline-flex", flexShrink: 0 }}>
                <Glyph size={size} aria-hidden />
            </span>
        </Tooltip>
    );
}
